"use server";

import { Query } from "node-appwrite";
import { parseStringify } from "../utils";
import { getTransactionsByBankId } from "./transaction.actions";
import { getBanks, getBank, getUserInfo } from "./user.actions";
import { createAdminClient } from "../appwrite";

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const TRANSACTION_COLLECTION_ID = process.env.APPWRITE_TRANSACTION_COLLECTION_ID;

/**
 * Per-scenario starting balance per bank (VND).
 * Calculated as: targetFinalBalance + |netOutflow| from seeded transactions.
 *
 * TOTAL WEALTH per scenario (wallet + all banks):
 *   Conservative (Huy): 70M total  → Wallet 35M | VCB 23M | TCB 12M
 *   Aggressive   (Nam):  5M total  → Wallet  2M | VCB  2M | TCB  1M
 *   Balanced (default): 25M total  → Wallet 13M | Bank ~6M each
 *
 * startingBalance = targetFinalBalance + |netOutflow|
 */
const BANK_STARTING_BALANCES: Record<string, number> = {
  // Huy Thận Trọng (Conservative) — target: VCB 23M, TCB 12M
  '6a2008cb00020212b950': 25_272_000,  // VCB: 23M + 2.272M outflow
  '6a2008cb001e88f3127a': 16_743_000,  // TCB: 12M + 4.743M outflow
  // Nam Mạo Hiểm (Aggressive) — target: VCB 2M, TCB 1M
  '6a2008db002ff3dbc104': 44_183_331,  // VCB:  2M + 42.183M outflow
  '6a2008dc00226455ac65':  7_333_331,  // TCB:  1M +  6.333M outflow
};

const DEFAULT_STARTING_BALANCE = 6_000_000; // Balanced: ~6M/bank → total ~25M with 13M wallet

/**
 * Resolves starting balance based on scenario determined by the user's email
 */
async function getStartingBalance(bank: any) {
  try {
    // For backwards compatibility and speed, check fixed demo account IDs first
    if (BANK_STARTING_BALANCES[bank.$id] !== undefined) {
      return BANK_STARTING_BALANCES[bank.$id];
    }

    const userIdRaw = bank.userId;
    const userId = typeof userIdRaw === 'object' ? (userIdRaw.userId || userIdRaw.$id) : userIdRaw;
    if (!userId) {
      return DEFAULT_STARTING_BALANCE;
    }

    const user = await getUserInfo({ userId });
    if (!user || !user.email) {
      return DEFAULT_STARTING_BALANCE;
    }

    const emailLower = user.email.toLowerCase();
    const bankId = bank.bankId; // E.g., "Vietcombank" or "Techcombank"

    if (emailLower.includes('thantrong')) {
      return bankId === 'Vietcombank' ? 25_272_000 : 16_743_000;
    } else if (emailLower.includes('maohiem')) {
      return bankId === 'Vietcombank' ? 44_183_331 : 7_333_331;
    } else {
      // Default / Balanced scenario starting balances (so final balance is ~6M/bank)
      return bankId === 'Vietcombank' ? 12_098_000 : 29_508_000;
    }
  } catch (error) {
    console.error("Error getting starting balance for bank:", error);
    return DEFAULT_STARTING_BALANCE;
  }
}

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
        const startingBalance = await getStartingBalance(bank);
        
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

    const startingBalance = await getStartingBalance(bank);

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
        senderBankId: t.senderBankId || "",
        receiverBankId: t.receiverBankId || "",
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
