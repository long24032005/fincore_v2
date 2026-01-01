'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";

import { plaidClient } from '@/lib/plaid';
import { revalidatePath } from "next/cache";
import { createDwollaCustomer, addFundingSource } from './dwolla.actions';
import { createWalletId } from './migration.actions';

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    const { database } = await createAdminClient();

    const user = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    )

    return parseStringify(user.documents[0]);
  } catch (error) {
    console.log(error)
  }
}

export const signIn = async ({ email, password }: signInProps) => {
  try {
    const { account } = await createAdminClient();
    const session = await account.createEmailPasswordSession(email, password);

    if (!session) {
      console.error('signIn: Failed to create session');
      return null;
    }

    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    const user = await getUserInfo({ userId: session.userId });

    if (!user) {
      console.error('signIn: Failed to get user info');
      return null;
    }

    return parseStringify(user);
  } catch (error) {
    console.error('signIn Error:', error);
    return null;
  }
}

export const signUp = async ({ password, ...userData }: SignUpParams) => {
  const { email, firstName, lastName } = userData;

  let newUserAccount;

  try {
    const { account, database } = await createAdminClient();

    // Create Appwrite user account
    try {
      newUserAccount = await account.create(
        ID.unique(),
        email,
        password,
        `${firstName} ${lastName}`
      );
    } catch (accountError: any) {
      console.error('signUp: Error creating user account', accountError);

      // Handle specific Appwrite errors
      if (accountError.code === 409) {
        return { error: true, message: 'This email is already registered. Please sign in instead.' };
      }

      return { error: true, message: 'Failed to create account. Please try again.' };
    }

    if (!newUserAccount) {
      return { error: true, message: 'Failed to create account. Please try again.' };
    }

    // Format dateOfBirth to strict "YYYY-MM-DD" format required by Dwolla
    let formattedDateOfBirth: string;
    try {
      const dateObj = new Date(userData.dateOfBirth);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date');
      }
      formattedDateOfBirth = dateObj.toISOString().split('T')[0];
    } catch (dateError) {
      console.error('signUp: Failed to parse dateOfBirth:', userData.dateOfBirth);

      // Fallback: if it already looks like YYYY-MM-DD, use it directly
      if (typeof userData.dateOfBirth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(userData.dateOfBirth)) {
        formattedDateOfBirth = userData.dateOfBirth;
      } else {
        // Delete the Appwrite account we just created
        try {
          const { account: adminAccount } = await createAdminClient();
          await adminAccount.delete(newUserAccount.$id);
        } catch { }

        return {
          error: true,
          message: 'Invalid date format. Please use YYYY-MM-DD (e.g., 1990-12-31).'
        };
      }
    }

    console.log('signUp: Formatted dateOfBirth for Dwolla:', formattedDateOfBirth);

    // Create Dwolla customer
    const dwollaCustomerData = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      dateOfBirth: formattedDateOfBirth,
      ssn: userData.ssn,
      address1: userData.address1,
      city: userData.city,
      state: userData.state,
      postalCode: userData.postalCode,
      type: 'personal' as const
    };

    const dwollaCustomerUrl = await createDwollaCustomer(dwollaCustomerData);

    if (!dwollaCustomerUrl) {
      console.error('signUp: Error creating Dwolla customer');

      // Delete the Appwrite account we just created
      try {
        const { account: adminAccount } = await createAdminClient();
        await adminAccount.delete(newUserAccount.$id);
      } catch { }

      return {
        error: true,
        message: 'Failed to set up payment account. Please check your information and try again.'
      };
    }

    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    // Generate unique wallet ID
    const walletId = await createWalletId();

    // Create user document in database
    const newUser = await database.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      {
        ...userData,
        userId: newUserAccount.$id,
        dwollaCustomerId,
        dwollaCustomerUrl,
        balance: 0, // Initialize e-wallet balance
        walletId, // Unique wallet ID for wallet transfers
      }
    );

    // Create session
    const session = await account.createEmailPasswordSession(email, password);

    if (!session) {
      console.error('signUp: Failed to create session');
      return { error: true, message: 'Account created but failed to sign in. Please try signing in manually.' };
    }

    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify(newUser);
  } catch (error: any) {
    console.error('signUp Error:', error);

    // Clean up: try to delete the account if it was created
    if (newUserAccount?.$id) {
      try {
        const { account: adminAccount } = await createAdminClient();
        await adminAccount.delete(newUserAccount.$id);
      } catch (cleanupError) {
        console.error('Failed to cleanup account:', cleanupError);
      }
    }

    return {
      error: true,
      message: error.message || 'Sign up failed. Please check your information and try again.'
    };
  }
}

export async function getLoggedInUser() {
  try {
    const sessionClient = await createSessionClient();

    // If createSessionClient fails or returns no account, return null immediately
    if (!sessionClient || !sessionClient.account) {
      console.log('getLoggedInUser: No valid session client');
      return null;
    }

    const { account } = sessionClient;
    const result = await account.get();

    if (!result || !result.$id) {
      console.log('getLoggedInUser: No valid account result');
      return null;
    }

    const user = await getUserInfo({ userId: result.$id });

    // Only call parseStringify if user exists to avoid JSON "undefined" error
    if (!user) {
      console.log('getLoggedInUser: User info not found');
      return null;
    }

    return parseStringify(user);
  } catch (error) {
    console.log('getLoggedInUser Error:', error);
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();

    cookies().delete('appwrite-session');

    await account.deleteSession('current');
  } catch (error) {
    return null;
  }
}

export const createLinkToken = async (user: User) => {
  try {
    const tokenParams = {
      user: {
        client_user_id: user.$id
      },
      client_name: `${user.firstName} ${user.lastName}`,
      products: ['auth', 'transactions'] as Products[],
      language: 'en',
      country_codes: ['US'] as CountryCode[],
    }

    const response = await plaidClient.linkTokenCreate(tokenParams);

    return parseStringify({ linkToken: response.data.link_token })
  } catch (error) {
    console.log(error);
  }
}

export const createBankAccount = async ({
  userId,
  bankId,
  accountId,
  accessToken,
  fundingSourceUrl,
  shareableId,
}: createBankAccountProps) => {
  try {
    const { database } = await createAdminClient();

    const bankAccount = await database.createDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      ID.unique(),
      {
        userId,
        bankId,
        accountId,
        accessToken,
        fundingSourceUrl,
        shareableId,
      }
    )

    return parseStringify(bankAccount);
  } catch (error) {
    console.log(error);
  }
}

export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {
  try {
    // Exchange public token for access token and item ID
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Get account information from Plaid using the access token
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accountData = accountsResponse.data.accounts[0];

    // Create a processor token for Dwolla using the access token and account ID
    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };

    const processorTokenResponse = await plaidClient.processorTokenCreate(request);
    const processorToken = processorTokenResponse.data.processor_token;

    // Create a funding source URL for the account using the Dwolla customer ID, processor token, and shareableId ID
    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accountData.name,
    });

    // If the funding source URL is not created, throw an error
    if (!fundingSourceUrl) throw Error;

    // Create a bank account using the user ID, item ID, account ID, access token, funding source URL, and shareableId ID
    await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      shareableId: encryptId(accountData.account_id),
    });

    // Revalidate the path to reflect the changes
    revalidatePath("/");

    // Return a success message
    return parseStringify({
      publicTokenExchange: "complete",
    });
  } catch (error) {
    console.error("An error occurred while creating exchanging token:", error);
  }
}

export const getBanks = async ({ userId }: getBanksProps) => {
  try {
    const { database } = await createAdminClient();

    const banks = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    )

    return parseStringify(banks.documents);
  } catch (error) {
    console.log(error)
  }
}

export const getBank = async ({ documentId }: getBankProps) => {
  try {
    const { database } = await createAdminClient();

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('$id', [documentId])]
    )

    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.log(error)
  }
}

// NEW: Get bank by appwriteItemId (which is actually the $id)
export const getBankByAppwriteItemId = async (appwriteItemId: string) => {
  try {
    const { database } = await createAdminClient();

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('$id', [appwriteItemId])]
    )

    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.log(error)
  }
}

export const getBankByAccountId = async ({ accountId }: getBankByAccountIdProps) => {
  try {
    const { database } = await createAdminClient();

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('accountId', [accountId])]
    )

    if (bank.total !== 1) return null;

    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.log(error)
  }
}