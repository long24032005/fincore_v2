'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify, extractId } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";

import { plaidClient } from '@/lib/plaid';
import { revalidatePath } from "next/cache";
import { createDwollaCustomer, addFundingSource } from './dwolla.actions';
import { createWalletId } from './migration.actions';

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
  APPWRITE_TRANSACTION_COLLECTION_ID: TRANSACTION_COLLECTION_ID,
} = process.env;

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    const { database } = await createAdminClient();

    const user = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    )

    return user.documents[0] ? parseStringify(user.documents[0]) : null;
  } catch (error) {
    console.log(error)
  }
}

/**
 * Get user by their Appwrite document ID (the $id field)
 * Used for auto-lookup of recipient email in transfers
 */
export const getUserById = async (documentId: string) => {
  try {
    const { database } = await createAdminClient();
    const user = await database.getDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      documentId
    );
    return parseStringify(user);
  } catch (error) {
    console.error("getUserById error:", error);
    return null;
  }
}

/**
 * 🎯 ADVANCED RESOLUTION LOGIC - Get user by Email, Wallet ID, Bank Account ID, OR Bank Shareable ID
 * Used for auto-resolving recipient details during transfer (mimics QR Transfer behavior)
 * @param identifier - User's email, walletId, bank appwriteItemId, OR bank shareable ID
 * @returns User object with $id, firstName, lastName, walletId, email, etc.
 */
export const getUserByIdentifier = async (identifier: string) => {
  try {
    if (!identifier || identifier.trim() === '') {
      console.log('getUserByIdentifier: Empty identifier provided');
      return null;
    }

    const { database } = await createAdminClient();

    // 🔍 STEP 1: Try searching by Email
    console.log(`🔍 Step 1: Searching by Email (${identifier})...`);
    let result = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('email', identifier)]
    );

    if (result.documents.length > 0) {
      console.log('✅ User found by Email');
      return parseStringify(result.documents[0]);
    }

    // 🔍 STEP 2: Try searching by Wallet ID
    console.log(`🔍 Step 2: Searching by WalletID (${identifier})...`);
    result = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('walletId', identifier)]
    );

    if (result.documents.length > 0) {
      console.log('✅ User found by WalletID');
      return parseStringify(result.documents[0]);
    }

    // 🏦 STEP 3 (NEW - BANK ACCOUNT ID RESOLUTION): Try direct Bank Account lookup
    console.log(`🔍 Step 3: Attempting to resolve as Bank Account ID (${identifier})...`);
    try {
      // Query the accounts collection by $id (document ID)
      const bankResult = await database.listDocuments(
        DATABASE_ID!,
        BANK_COLLECTION_ID!,
        [Query.equal('$id', identifier)]
      );

      if (bankResult.documents.length > 0) {
        const bankAccount = bankResult.documents[0] as any;
        console.log(`✅ Found bank account by $id! Owner userId: ${bankAccount.userId}`);

        // Get the User who owns this bank account
        // 🔧 FIX: Sanitize userId to prevent [object Object] error
        const ownerUser = await getUserInfo({ userId: extractId(bankAccount.userId) });

        if (ownerUser) {
          console.log(`✅ Successfully resolved Bank Account ID → User: ${ownerUser.firstName} ${ownerUser.lastName}`);
          return ownerUser;
        }
      } else {
        console.log('⚠️ Bank account not found by $id');
      }
    } catch (bankLookupError) {
      console.log('⚠️ Bank Account ID lookup failed:', bankLookupError);
    }

    // 🎯 STEP 4 (BANK SHAREABLE ID - "QR LOGIC"): Try to decode as Bank Shareable ID
    console.log(`🔍 Step 4: Attempting to resolve as Bank Shareable ID (${identifier})...`);
    try {
      const { decryptId } = await import('../utils');
      const accountId = decryptId(identifier);

      console.log(`🔓 Decrypted to accountId: ${accountId}`);

      // Query the accounts collection where accountId matches
      const bankAccount = await getBankByAccountId({ accountId });

      if (bankAccount && bankAccount.userId) {
        console.log(`✅ Found bank account! Owner userId (RAW):`, bankAccount.userId);
        console.log(`🔧 Type of userId:`, typeof bankAccount.userId);

        // Found the bank! Now get the User who owns it
        // 🔧 FIX: bankAccount.userId might be a full user object or just a string ID
        // If it's an object, extract the actual userId field; otherwise use it directly
        const sanitizedUserId = typeof bankAccount.userId === 'object'
          ? (bankAccount.userId.userId || bankAccount.userId.$id)
          : bankAccount.userId;
        console.log(`🧹 AFTER sanitization:`, sanitizedUserId);

        const ownerUser = await getUserInfo({ userId: sanitizedUserId });

        if (ownerUser) {
          console.log(`✅ Successfully resolved Bank Shareable ID → User: ${ownerUser.firstName} ${ownerUser.lastName}`);
          return ownerUser;
        }
      } else {
        console.log('⚠️ Bank account not found for decrypted accountId');
      }
    } catch (decryptError) {
      // Not a valid shareable ID, continue
      console.log('⚠️ Not a valid Bank Shareable ID (decrypt failed)');
    }

    // 🚫 STEP 5: All resolution attempts failed
    console.log(`❌ getUserByIdentifier: No user found for identifier: ${identifier}`);
    return null;
  } catch (error) {
    console.error("getUserByIdentifier error:", error);
    return null;
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

export const seedUserTransactions = async (userId: string, email: string, database: any) => {
  const emailLower = email.toLowerCase();
  let scenario: 'conservative' | 'aggressive' | 'balanced' = 'balanced';
  
  if (emailLower.includes('thantrong')) {
    scenario = 'conservative';
  } else if (emailLower.includes('maohiem')) {
    scenario = 'aggressive';
  }
  
  console.log(`🌱 [Seeding] Seeding transactions and banks for user ${userId} using scenario: ${scenario}`);

  // Create bank accounts for the user automatically in BANK_COLLECTION_ID
  const vcbBank = await database.createDocument(
    DATABASE_ID!,
    BANK_COLLECTION_ID!,
    ID.unique(),
    {
      userId,
      bankId: "Vietcombank",
      accountId: `101${Math.floor(1000000 + Math.random() * 9000000)}`,
      accessToken: `mock_access_token_vcb_${userId}`,
      fundingSourceUrl: `https://api-sandbox.dwolla.com/funding-sources/mock_vcb_${userId}`,
      shareableId: encryptId(`vcb_shareable_${userId}`),
    }
  );

  const tcbBank = await database.createDocument(
    DATABASE_ID!,
    BANK_COLLECTION_ID!,
    ID.unique(),
    {
      userId,
      bankId: "Techcombank",
      accountId: `102${Math.floor(1000000 + Math.random() * 9000000)}`,
      accessToken: `mock_access_token_tcb_${userId}`,
      fundingSourceUrl: `https://api-sandbox.dwolla.com/funding-sources/mock_tcb_${userId}`,
      shareableId: encryptId(`tcb_shareable_${userId}`),
    }
  );

  console.log(`🏦 [Seeding] Created linked bank accounts for user: Vietcombank (${vcbBank.$id}), Techcombank (${tcbBank.$id})`);
  
  const transactionsToCreate = [];
  
  if (scenario === 'conservative') {
    // 2 Payroll deposits (Wallet channel)
    transactionsToCreate.push({ name: "Nạp tiền lương tháng 4 - Fincore Corp", amount: "25000000", senderId: "system_payroll", receiverId: userId, category: "Wallet Top-up", status: "Success", senderBankId: "", receiverBankId: "", channel: "wallet" });
    transactionsToCreate.push({ name: "Nạp tiền lương tháng 5 - Fincore Corp", amount: "25000000", senderId: "system_payroll", receiverId: userId, category: "Wallet Top-up", status: "Success", senderBankId: "", receiverBankId: "", channel: "wallet" });

    // 4 Utility bills paid on time (split across banks)
    transactionsToCreate.push({ name: "Thanh toán Điện lực EVN HCMC", amount: "1250000", senderId: userId, receiverId: "utility_provider", category: "Utilities", status: "Success", senderBankId: vcbBank.$id, receiverBankId: "", channel: "online" });
    transactionsToCreate.push({ name: "Thanh toán Nước sinh hoạt SAWACO", amount: "280000", senderId: userId, receiverId: "utility_provider", category: "Utilities", status: "Success", senderBankId: tcbBank.$id, receiverBankId: "", channel: "online" });
    transactionsToCreate.push({ name: "Thanh toán Internet Viettel Telecom", amount: "250000", senderId: userId, receiverId: "utility_provider", category: "Utilities", status: "Success", senderBankId: vcbBank.$id, receiverBankId: "", channel: "online" });
    transactionsToCreate.push({ name: "Thanh toán Phí quản lý chung cư Vinhomes", amount: "1100000", senderId: userId, receiverId: "utility_provider", category: "Utilities", status: "Success", senderBankId: tcbBank.$id, receiverBankId: "", channel: "online" });

    // 24 other transactions. Total spend = 10,000,000.
    transactionsToCreate.push({ name: "Mua thực phẩm sạch WinMart+", amount: "500000", senderId: userId, receiverId: "merchant_partner", category: "Shopping", status: "Success", senderBankId: vcbBank.$id, receiverBankId: "", channel: "online" });
    transactionsToCreate.push({ name: "Mua sách nhà sách Fahasa", amount: "500000", senderId: userId, receiverId: "merchant_partner", category: "Shopping", status: "Success", senderBankId: tcbBank.$id, receiverBankId: "", channel: "online" });

    const conservativePool = [
      { name: "Mua thuốc nhà thuốc Pharmacity", category: "Personal Care" },
      { name: "Đặt xe GrabBike đi làm", category: "Transportation" },
      { name: "Đi taxi Mai Linh công vụ", category: "Transportation" },
      { name: "Mua thuốc nhà thuốc An Khang", category: "Personal Care" }
    ];
    for (let i = 0; i < 22; i++) {
      const template = conservativePool[i % conservativePool.length];
      const useBank = i % 3 === 0 ? vcbBank.$id : (i % 3 === 1 ? tcbBank.$id : "");
      const baseAmt = 409000;
      const factor = 0.75 + (i % 10) * 0.05; // deterministic average ~0.975
      const amountStr = (Math.round((baseAmt * factor) / 1000) * 1000).toString();

      transactionsToCreate.push({
        name: template.name,
        amount: amountStr,
        senderId: userId,
        receiverId: "merchant_partner",
        category: template.category,
        status: "Success",
        senderBankId: useBank,
        receiverBankId: "",
        channel: useBank ? "online" : "wallet"
      });
    }

  } else if (scenario === 'aggressive') {
    // Top-ups
    transactionsToCreate.push({ name: "Nạp tiền ví Fincore từ Vietcombank", amount: "20000000", senderId: userId, receiverId: userId, category: "Wallet Top-up", status: "Success", senderBankId: vcbBank.$id, receiverBankId: "", channel: "wallet" });

    // Immediate cash out: Vietcombank withdrawal
    transactionsToCreate.push({ name: "Rút tiền nhanh ATM Vietcombank", amount: "13000000", senderId: userId, receiverId: "merchant_partner", category: "Withdrawal", status: "Success", senderBankId: vcbBank.$id, receiverBankId: "", channel: "online" });

    // Utility bills paid late
    transactionsToCreate.push({ name: "Thanh toán Điện lực EVN HCMC (Trễ hạn phạt)", amount: "1850000", senderId: userId, receiverId: "utility_provider", category: "Utilities", status: "Success", senderBankId: vcbBank.$id, receiverBankId: "", channel: "online" });

    // 40 transactions. Total spending: 20,000,000.
    for (let i = 0; i < 13; i++) {
      const useBank = i % 3 === 0 ? vcbBank.$id : (i % 3 === 1 ? tcbBank.$id : "");
      const baseAmt = 1000000;
      const factor = 0.65 + (i % 8) * 0.1; // average: 1.0
      const amountStr = (Math.round((baseAmt * factor) / 1000) * 1000).toString();

      transactionsToCreate.push({
        name: i % 2 === 0 ? "Mua sắm bốc đồng Shopee Tech Store" : "Săn sale Lazada Flagship Store",
        amount: amountStr,
        senderId: userId,
        receiverId: "shopee_merchant",
        category: "Shopping",
        status: "Success",
        senderBankId: useBank,
        receiverBankId: "",
        channel: useBank ? "online" : "wallet"
      });
    }

    const aggressiveNonShoppingPool = [
      { name: "Nạp thẻ game Steam Wallet VIP", category: "Entertainment" },
      { name: "Thanh toán hóa đơn Bar/Pub The Alley", category: "Entertainment" },
      { name: "Đặt vé máy bay Bamboo Airways", category: "Travel" },
      { name: "Xem phim CGV Gold Class VIP", category: "Entertainment" }
    ];
    for (let i = 0; i < 27; i++) {
      const template = aggressiveNonShoppingPool[i % aggressiveNonShoppingPool.length];
      const useBank = i % 3 === 0 ? vcbBank.$id : (i % 3 === 1 ? tcbBank.$id : "");
      const baseAmt = 259259;
      const factor = 0.8 + (i % 5) * 0.1; // average: 1.0
      const amountStr = (Math.round((baseAmt * factor) / 1000) * 1000).toString();

      transactionsToCreate.push({
        name: template.name,
        amount: amountStr,
        senderId: userId,
        receiverId: "merchant_partner",
        category: template.category,
        status: "Success",
        senderBankId: useBank,
        receiverBankId: "",
        channel: useBank ? "online" : "wallet"
      });
    }

  } else {
    // Balanced
    transactionsToCreate.push({ name: "Nạp tiền ví Fincore từ Techcombank", amount: "15000000", senderId: userId, receiverId: userId, category: "Wallet Top-up", status: "Success", senderBankId: tcbBank.$id, receiverBankId: "", channel: "wallet" });

    // Immediate cash out
    transactionsToCreate.push({ name: "Rút tiền nhanh ATM Techcombank", amount: "3000000", senderId: userId, receiverId: "merchant_partner", category: "Withdrawal", status: "Success", senderBankId: tcbBank.$id, receiverBankId: "", channel: "online" });

    // Utility bills
    transactionsToCreate.push({ name: "Thanh toán Điện lực EVN", amount: "850000", senderId: userId, receiverId: "utility_provider", category: "Utilities", status: "Success", senderBankId: vcbBank.$id, receiverBankId: "", channel: "online" });
    transactionsToCreate.push({ name: "Thanh toán Tiền nước SAWACO", amount: "180000", senderId: userId, receiverId: "utility_provider", category: "Utilities", status: "Success", senderBankId: tcbBank.$id, receiverBankId: "", channel: "online" });

    for (let i = 0; i < 5; i++) {
      const useBank = i % 3 === 0 ? vcbBank.$id : (i % 3 === 1 ? tcbBank.$id : "");
      const baseAmt = 1050000;
      const factor = 0.8 + (i % 5) * 0.1; // average: 1.0
      const amountStr = (Math.round((baseAmt * factor) / 1000) * 1000).toString();

      transactionsToCreate.push({
        name: "Chi tiêu thiết yếu siêu thị Lotte Mart",
        amount: amountStr,
        senderId: userId,
        receiverId: "grocery_merchant",
        category: "Shopping",
        status: "Success",
        senderBankId: useBank,
        receiverBankId: "",
        channel: useBank ? "online" : "wallet"
      });
    }

    const balancedNonShoppingPool = [
      { name: "Mua thực phẩm chức năng Watson", category: "Personal Care" },
      { name: "Xem phim cuối tuần CGV Cinema", category: "Entertainment" },
      { name: "Đặt xe GrabCar đi công tác", category: "Transportation" },
      { name: "Cà phê Highlands Coffee gặp đối tác", category: "Food and Drink" }
    ];
    for (let i = 0; i < 30; i++) {
      const template = balancedNonShoppingPool[i % balancedNonShoppingPool.length];
      const useBank = i % 3 === 0 ? vcbBank.$id : (i % 3 === 1 ? tcbBank.$id : "");
      const baseAmt = 325000;
      const factor = 0.7 + (i % 7) * 0.1; // average: 1.0
      const amountStr = (Math.round((baseAmt * factor) / 1000) * 1000).toString();

      transactionsToCreate.push({
        name: template.name,
        amount: amountStr,
        senderId: userId,
        receiverId: "merchant_partner",
        category: template.category,
        status: "Success",
        senderBankId: useBank,
        receiverBankId: "",
        channel: useBank ? "online" : "wallet"
      });
    }
  }
  
  // Create all documents in Appwrite
  for (const txn of transactionsToCreate) {
    try {
      await database.createDocument(
        DATABASE_ID!,
        TRANSACTION_COLLECTION_ID!,
        ID.unique(),
        {
          name: txn.name,
          amount: txn.amount,
          senderId: txn.senderId,
          senderBankId: txn.senderBankId || "",
          receiverId: txn.receiverId,
          receiverBankId: txn.receiverBankId || "",
          email: emailLower,
          channel: txn.channel || "online",
          category: txn.category,
          status: txn.status
        }
      );
    } catch (e: any) {
      console.error(`❌ [Seeding] Error creating document: ${e.message}`);
    }
  }
  console.log(`✅ [Seeding] Completed seeding ${transactionsToCreate.length} transactions for user ${userId}`);
};

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

    // Generate unique wallet ID
    const walletId = await createWalletId();

    // Xác định số dư ban đầu dựa trên kịch bản email (đã được chia đều)
    let initialBalance = 13000000; // Balanced (default): 13M
    if (email.toLowerCase().includes('thantrong')) {
      initialBalance = 35000000; // Conservative: 35M
    } else if (email.toLowerCase().includes('maohiem')) {
      initialBalance = 2000000; // Aggressive: 2M
    }

    // Create user document in database
    const newUser = await database.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      {
        ...userData,
        userId: newUserAccount.$id,
        balance: initialBalance, // Initialize e-wallet balance (VND)
        walletId, // Unique wallet ID for wallet transfers
      }
    );

    // Bơm dữ liệu giao dịch giả lập tự động
    await seedUserTransactions(newUser.$id, email, database);

    // Create session
    const session = await account.createEmailPasswordSession(email, password);

    if (!session) {
      console.error('signUp: Failed to create session');
      return { error: true, message: 'Account created but failed to sign in. Please try signing in manually.' };
    }

    try {
      (await cookies()).set("appwrite-session", session.secret, {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: true,
      });
    } catch (cookieError) {
      console.warn("⚠️ [signUp] Cookies set failed (likely running outside request context):", cookieError);
    }

    return parseStringify(newUser);
  } catch (error: any) {
    console.error('signUp Error:', error);

    // Clean up: try to delete the account if it was created
    if (newUserAccount?.$id) {
      try {
        const { user } = await createAdminClient();
        await user.delete(newUserAccount.$id);
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

    (await cookies()).delete('appwrite-session');

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
  accountId,
  bankName,
}: exchangePublicTokenProps) => {
  try {
    // Generate mock details or use custom provided ones
    const cleanAccountId = accountId || Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const cleanBankName = bankName || "Vietcombank";
    
    const mockAccessToken = `mock_access_token_${cleanAccountId}`;
    const mockFundingSourceUrl = `https://api-sandbox.dwolla.com/funding-sources/mock_${cleanAccountId}`;
    
    // Create bank account using the user ID, bank name as bankId, account ID, access token, funding source URL, and shareableId ID
    await createBankAccount({
      userId: user.$id,
      bankId: cleanBankName, // We store the bankName in bankId
      accountId: cleanAccountId,
      accessToken: mockAccessToken,
      fundingSourceUrl: mockFundingSourceUrl,
      shareableId: encryptId(cleanAccountId),
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