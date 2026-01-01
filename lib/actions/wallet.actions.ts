"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";

const {
    APPWRITE_DATABASE_ID: DATABASE_ID,
    APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
    APPWRITE_TRANSACTION_COLLECTION_ID: TRANSACTION_COLLECTION_ID,
} = process.env;

/**
 * E-WALLET TRANSFER - Instant balance update
 * Chuyển tiền TỨC THÌ giống Momo/ZaloPay
 */
export const transferBalance = async ({
    senderId,
    receiverId,
    amount,
    description,
    email,
}: {
    senderId: string;
    receiverId: string;
    amount: number;
    description: string;
    email: string;
}) => {
    try {
        const { database } = await createAdminClient();

        // 1. Lấy thông tin sender và receiver
        const senderDoc = await database.getDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            senderId
        );

        const receiverDoc = await database.getDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            receiverId
        );

        // Cast sang User type để TypeScript hiểu
        const sender = senderDoc as unknown as User;
        const receiver = receiverDoc as unknown as User;

        // 2. Kiểm tra số dư sender
        const senderBalance = sender.balance || 0;
        if (senderBalance < amount) {
            throw new Error(`Insufficient balance. You have $${senderBalance}, but trying to send $${amount}`);
        }

        // 3. Tính toán số dư mới
        const newSenderBalance = senderBalance - amount;
        const receiverBalance = receiver.balance || 0;
        const newReceiverBalance = receiverBalance + amount;

        // 4. CẬP NHẬT BALANCE TỨC THÌ (atomic update)
        // WARNING: Potential race condition if multiple concurrent transfers to same user
        // Consider using database transactions or optimistic locking in production
        await Promise.all([
            // Trừ tiền sender
            database.updateDocument(
                DATABASE_ID!,
                USER_COLLECTION_ID!,
                senderId,
                { balance: newSenderBalance }
            ),
            // Cộng tiền receiver
            database.updateDocument(
                DATABASE_ID!,
                USER_COLLECTION_ID!,
                receiverId,
                { balance: newReceiverBalance }
            ),
            // Tạo transaction record
            database.createDocument(
                DATABASE_ID!,
                TRANSACTION_COLLECTION_ID!,
                ID.unique(),
                {
                    name: description,
                    amount: amount.toString(),
                    senderId,
                    senderBankId: '', // Empty for wallet source
                    receiverId,
                    receiverBankId: '', // Empty for wallet destination
                    email,
                    category: "Transfer",
                    channel: "online",
                }
            ),
        ]);

        return parseStringify({
            success: true,
            message: "Transfer successful!",
            newBalance: newSenderBalance,
        });
    } catch (error: any) {
        console.error("Transfer balance error:", error);
        throw new Error(error.message || "Transfer failed");
    }
};

/**
 * Get user balance
 */
export const getUserBalance = async (userId: string) => {
    try {
        const { database } = await createAdminClient();

        const userDoc = await database.getDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            userId
        );

        const user = userDoc as unknown as User;

        return parseStringify({
            balance: user.balance || 0,
        });
    } catch (error) {
        console.error("Get balance error:", error);
        return null;
    }
};

/**
 * Update user balance (add or subtract)
 * Used for Bank → Wallet transfers
 */
export const updateUserBalance = async ({
    userId,
    amount,
    operation
}: {
    userId: string;
    amount: number;
    operation: 'add' | 'subtract';
}) => {
    try {
        const { database } = await createAdminClient();

        const userDoc = await database.getDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            userId
        );

        const user = userDoc as unknown as User;
        const currentBalance = user.balance || 0;
        const newBalance = operation === 'add'
            ? currentBalance + amount
            : currentBalance - amount;

        if (newBalance < 0) {
            throw new Error('Insufficient balance');
        }

        await database.updateDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            userId,
            { balance: newBalance }
        );

        return parseStringify({
            success: true,
            newBalance
        });
    } catch (error: any) {
        console.error('Update balance error:', error);
        throw new Error(error.message || 'Failed to update balance');
    }
};

/**
 * Get wallet-related transactions for a user
 * This includes transactions where the user received money to their wallet
 * NOTE: We query for receiverBankId = '' (empty string, not null) 
 * because wallet transactions explicitly set these fields to empty strings
 */
export const getWalletTransactions = async (userId: string) => {
    try {
        const { database } = await createAdminClient();

        // Get transactions where user is receiver and receiverBankId is empty (wallet destination)
        // Empty string ('') means wallet, not bank
        const receiverTransactions = await database.listDocuments(
            DATABASE_ID!,
            TRANSACTION_COLLECTION_ID!,
            [
                Query.equal('receiverId', userId),
                Query.equal('receiverBankId', '') // Empty means wallet destination
            ]
        );

        // Get transactions where user is sender and senderBankId is empty (wallet source)
        const senderTransactions = await database.listDocuments(
            DATABASE_ID!,
            TRANSACTION_COLLECTION_ID!,
            [
                Query.equal('senderId', userId),
                Query.equal('senderBankId', '') // Empty means wallet source
            ]
        );

        return parseStringify({
            total: receiverTransactions.total + senderTransactions.total,
            documents: [
                ...receiverTransactions.documents,
                ...senderTransactions.documents
            ]
        });
    } catch (error) {
        console.error('Get wallet transactions error:', error);
        return { total: 0, documents: [] };
    }
};


