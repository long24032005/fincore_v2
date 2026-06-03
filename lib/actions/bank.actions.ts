"use server";

import { Query } from "node-appwrite";
import { parseStringify } from "../utils";
import { getTransactionsByBankId } from "./transaction.actions";
import { getBanks, getBank } from "./user.actions";
import { createAdminClient } from "../appwrite";

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const TRANSACTION_COLLECTION_ID = process.env.APPWRITE_TRANSACTION_COLLECTION_ID;

// Get multiple bank accounts
export const getAccounts = async ({ userId }: getAccountsProps) => {
  try {
    // get banks from db
    const banks = await getBanks({ userId });
    if (!banks) {
      return parseStringify({ data: [], totalBanks: 0, totalCurrentBalance: 0 });
    }

    const accounts = await Promise.all(
      banks.map(async (bank: Bank) => {
        const startingBalance = 100000000; // 100,000,000 VND starting balance
        
        // Fetch transaction history to calculate ledger balance
        const transferTransactionsData = await getTransactionsByBankId({
          bankId: bank.$id,
        });
        const transfers = transferTransactionsData.documents || [];

        let totalIncoming = 0;
        let totalOutgoing = 0;

        transfers.forEach((t: any) => {
          const amt = Number(t.amount) || 0;
          if (t.status === 'Success') {
            if (t.receiverBankId === bank.$id) {
              totalIncoming += amt;
            }
            if (t.senderBankId === bank.$id) {
              totalOutgoing += amt;
            }
          }
        });

        // Compute current balance
        const currentBalance = startingBalance + totalIncoming - totalOutgoing;

        const account = {
          id: bank.accountId,
          availableBalance: currentBalance,
          currentBalance: currentBalance,
          institutionId: bank.bankId, // Bank Name (e.g., Vietcombank)
          name: bank.bankId,
          officialName: `${bank.bankId} Sandbox Account`,
          mask: bank.accountId.slice(-4),
          type: "depository",
          subtype: "checking",
          appwriteItemId: bank.$id,
          shareableId: bank.shareableId,
        };

        return account;
      })
    );

    const totalBanks = accounts.length;
    const totalCurrentBalance = accounts.reduce((total, account) => {
      return total + account.currentBalance;
    }, 0);

    return parseStringify({ data: accounts, totalBanks, totalCurrentBalance });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
    return parseStringify({ data: [], totalBanks: 0, totalCurrentBalance: 0 });
  }
};

// Get one bank account
export const getAccount = async ({ appwriteItemId }: getAccountProps) => {
  try {
    // get bank from db
    const bank = await getBank({ documentId: appwriteItemId });
    if (!bank) return null;

    const startingBalance = 100000000; // 100,000,000 VND

    // get transfer transactions from appwrite
    const transferTransactionsData = await getTransactionsByBankId({
      bankId: bank.$id,
    });
    const transfers = transferTransactionsData.documents || [];

    let totalIncoming = 0;
    let totalOutgoing = 0;

    const transferTransactions = transfers.map((t: any) => {
      const amt = Number(t.amount) || 0;
      if (t.status === 'Success') {
        if (t.receiverBankId === bank.$id) {
          totalIncoming += amt;
        }
        if (t.senderBankId === bank.$id) {
          totalOutgoing += amt;
        }
      }
      return {
        id: t.$id,
        name: t.name!,
        amount: t.amount!,
        date: t.$createdAt,
        paymentChannel: t.channel,
        category: t.category,
        type: t.senderBankId === bank.$id ? "debit" : "credit",
        status: t.status,
      };
    });

    const currentBalance = startingBalance + totalIncoming - totalOutgoing;

    const account = {
      id: bank.accountId,
      availableBalance: currentBalance,
      currentBalance: currentBalance,
      institutionId: bank.bankId,
      name: bank.bankId,
      officialName: `${bank.bankId} Sandbox Account`,
      mask: bank.accountId.slice(-4),
      type: "depository",
      subtype: "checking",
      appwriteItemId: bank.$id,
      shareableId: bank.shareableId,
    };

    // Sort transactions by date (most recent first)
    const allTransactions = [...transferTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return parseStringify({
      data: account,
      transactions: allTransactions,
    });
  } catch (error) {
    console.error("An error occurred while getting the account:", error);
    return null;
  }
};

// Get bank info (Institution)
export const getInstitution = async ({
  institutionId,
}: getInstitutionProps) => {
  try {
    return parseStringify({
      institution_id: institutionId,
      name: institutionId,
    });
  } catch (error) {
    console.error("An error occurred while getting the institution:", error);
    return null;
  }
};

// Get transactions (Mock implementation returning empty list as transfer actions handle transaction listing)
export const getTransactions = async ({
  accessToken,
}: getTransactionsProps) => {
  try {
    return parseStringify([]);
  } catch (error) {
    console.error("An error occurred while getting transactions:", error);
    return parseStringify([]);
  }
};
