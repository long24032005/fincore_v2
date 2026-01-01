'use server';

import { createAdminClient } from "../appwrite";
import { Query } from "node-appwrite";
import { getAccount } from "./bank.actions";

const {
    APPWRITE_DATABASE_ID: DATABASE_ID,
    APPWRITE_TRANSACTION_COLLECTION_ID: TRANSACTION_COLLECTION_ID,
} = process.env;

/**
 * Get total pending amount for a specific bank account
 * @param bankId - Appwrite bank ID
 * @returns Total amount in "processing" status
 */
export async function getPendingAmount(bankId: string): Promise<number> {
    try {
        const { database } = await createAdminClient();

        // Calculate cutoff date for pending transactions (e.g., 3 days for ACH)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 3);

        // Find recent transactions (assumed pending)
        const pendingTransactions = await database.listDocuments(
            DATABASE_ID!,
            TRANSACTION_COLLECTION_ID!,
            [
                Query.equal('senderBankId', bankId),
                Query.greaterThan('$createdAt', cutoffDate.toISOString())
            ]
        );

        // Calculate total pending
        const totalPending = pendingTransactions.documents.reduce((sum, txn: any) => {
            return sum + (Number(txn.amount) || 0); // Cast to Number
        }, 0);

        return totalPending;

    } catch (error) {
        console.error('Error getting pending amount:', error);
        return 0; // Return 0 if error to avoid blocking UI
    }
}

/**
 * Get detailed balance info for a bank account
 * @param bankId - Appwrite bank ID
 * @returns Object with actual, pending, and available balance
 */
export async function getAvailableBalance(bankId: string) {
    try {
        console.log('🔍 Calculating available balance for bankId:', bankId);

        // 1. Get account from bank actions (Note: currentBalance already has pending deducted!)
        const accountResponse = await getAccount({ appwriteItemId: bankId });

        // This is the Net Available Balance (Plaid - Pending)
        const netAvailableBalance = accountResponse?.data?.currentBalance || 0;

        // 2. Get pending amount locally
        const pendingAmount = await getPendingAmount(bankId);

        // 3. Reconstruct the Gross Plaid Balance
        // (Rounding to avoid float errors)
        const grossPlaidBalance = Number((netAvailableBalance + pendingAmount).toFixed(2));

        return {
            actual: grossPlaidBalance,  // The raw balance from Plaid
            pending: pendingAmount,     // The pending amount
            available: netAvailableBalance // What user can spend
        };

    } catch (error) {
        console.error('Error getting available balance:', error);
        return {
            actual: 0,
            pending: 0,
            available: 0
        };
    }
}

/**
 * Get list of pending transactions for a bank
 * @param bankId - Appwrite bank ID  
 * @returns Array of pending transactions
 */
export async function getPendingTransactions(bankId: string) {
    try {
        const { database } = await createAdminClient();

        // Calculate cutoff date for pending transactions
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 3);

        const pendingTxns = await database.listDocuments(
            DATABASE_ID!,
            TRANSACTION_COLLECTION_ID!,
            [
                Query.equal('senderBankId', bankId),
                Query.greaterThan('$createdAt', cutoffDate.toISOString()),
                Query.orderDesc('$createdAt'),
                Query.limit(10) // Last 10 pending
            ]
        );

        return pendingTxns.documents;

    } catch (error) {
        console.error('Error getting pending transactions:', error);
        return [];
    }
}
