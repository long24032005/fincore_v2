"use server";

import { getUserBalance } from "./wallet.actions";
import { getAvailableBalance } from "./bankBalance.actions";
import { getSavedRecipients } from "./savedRecipient.actions";
import { getAccounts } from "./bank.actions";
import { parseStringify } from "../utils";
import { Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";

const {
    APPWRITE_DATABASE_ID: DATABASE_ID,
    APPWRITE_TRANSACTION_COLLECTION_ID: TRANSACTION_COLLECTION_ID,
    APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
} = process.env;

/**
 * Load complete chatbot context for a user
 * This includes wallet balance, bank accounts, saved recipients, and recent transactions
 */
export const getChatbotContext = async (userId: string): Promise<ChatbotContext | null> => {
    try {
        console.log('🔍 [Chatbot Context] Loading context for userId:', userId);

        const { database } = await createAdminClient();
        const userDoc = await database.getDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            userId
        );
        const authUserId = userDoc.userId || userId;
        console.log('👤 [Chatbot Context] Resolved authUserId:', authUserId);

        // 1. Get wallet balance
        const walletBalanceData = await getUserBalance(userId);
        const walletBalance = walletBalanceData?.balance || 0;
        console.log('💰 [Chatbot Context] Wallet balance:', walletBalance);

        // 2. Get bank accounts with available balances
        const accountsData = await getAccounts({ userId });
        const bankAccounts = await Promise.all(
            (accountsData?.data || []).map(async (account: any) => {
                try {
                    const balanceInfo = await getAvailableBalance(account.appwriteItemId);
                    return {
                        id: account.appwriteItemId,
                        name: account.name,
                        mask: account.mask,
                        availableBalance: balanceInfo.available,
                        actualBalance: balanceInfo.actual,
                        pendingBalance: balanceInfo.pending,
                    };
                } catch (error) {
                    console.error(`Error getting balance for ${account.name}:`, error);
                    // Return account with zero balance if error
                    return {
                        id: account.appwriteItemId,
                        name: account.name,
                        mask: account.mask,
                        availableBalance: 0,
                        actualBalance: 0,
                        pendingBalance: 0,
                    };
                }
            })
        );
        console.log('🏦 [Chatbot Context] Bank accounts loaded:', bankAccounts.length);

        // 3. Get saved recipients
        const recipientsData = await getSavedRecipients(userId);
        console.log('📥 [Chatbot Context] Recipients data received:', {
            success: recipientsData?.success,
            total: recipientsData?.total,
            recipientsCount: recipientsData?.recipients?.length || 0
        });

        // FIX: Use 'recipients' instead of 'documents' to match getSavedRecipients response
        const savedRecipients = (recipientsData?.recipients || []).map((recipient: any) => ({
            id: recipient.$id,
            nickname: recipient.nickname,
            name: recipient.recipientName || 'Unknown',
            email: recipient.recipientEmail || '',
            transferType: recipient.transferType,
            recipientUserId: recipient.recipientUserId,
            recipientBankId: recipient.recipientBankId,
        }));

        console.log('👥 [Chatbot Context] Saved recipients mapped:', savedRecipients.length);
        if (savedRecipients.length > 0) {
            console.log('   Recipients list:', savedRecipients.map((r: any) => `"${r.nickname}" (${r.email})`).join(', '));
        }

        // 4. Get recent transactions (last 10)
        // Query sent and received transactions separately (Appwrite may not support Query.or)
        const idList = Array.from(new Set([userId, authUserId])).filter(Boolean) as string[];

        let sentTxns = await database.listDocuments(
            DATABASE_ID!,
            TRANSACTION_COLLECTION_ID!,
            [
                Query.equal('senderId', idList),
                Query.orderDesc('$createdAt'),
                Query.limit(50)
            ]
        );

        let receivedTxns = await database.listDocuments(
            DATABASE_ID!,
            TRANSACTION_COLLECTION_ID!,
            [
                Query.equal('receiverId', idList),
                Query.orderDesc('$createdAt'),
                Query.limit(50)
            ]
        );

        // Auto-seed if user has zero transactions (e.g. newly created demo account)
        if (sentTxns.total === 0 && receivedTxns.total === 0) {
            console.log(`🌱 [Chatbot Context] No transactions found. Auto-seeding for user ${userId} / ${authUserId}...`);
            const { getUserInfo, seedUserTransactions } = await import("./user.actions");
            const userInfo = await getUserInfo({ userId });
            if (userInfo) {
                await seedUserTransactions(authUserId, userInfo.email, database);
                
                // Re-fetch transactions after seeding
                sentTxns = await database.listDocuments(
                    DATABASE_ID!,
                    TRANSACTION_COLLECTION_ID!,
                    [
                        Query.equal('senderId', idList),
                        Query.orderDesc('$createdAt'),
                        Query.limit(50)
                    ]
                );

                receivedTxns = await database.listDocuments(
                    DATABASE_ID!,
                    TRANSACTION_COLLECTION_ID!,
                    [
                        Query.equal('receiverId', idList),
                        Query.orderDesc('$createdAt'),
                        Query.limit(50)
                    ]
                );
            }
        }

        // Merge and sort transactions
        const mergedTxns = [...sentTxns.documents, ...receivedTxns.documents];
        // Sort ascending to apply spreading sequence
        mergedTxns.sort((a: any, b: any) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime());

        // Apply virtualization (spreading dates 1.5 days apart)
        const virtualizedTxns = mergedTxns.map((txn: any, idx: number) => {
            const realDate = new Date(txn.$createdAt);
            const offsetDays = (mergedTxns.length - idx) * 1.5;
            const virtualDate = new Date(realDate.getTime() - offsetDays * 24 * 60 * 60 * 1000);
            
            return {
                ...txn,
                $createdAt: virtualDate.toISOString()
            };
        });

        // Now sort descending and take the top 10
        const allTransactions = virtualizedTxns
            .sort((a: any, b: any) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())
            .slice(0, 10);
        console.log('📜 [Chatbot Context] Recent transactions loaded and virtualized:', allTransactions.length);

        const finalContext = {
            userId,
            userName: '', // Will be set from User object
            walletBalance,
            bankAccounts,
            savedRecipients,
            recentTransactions: allTransactions,
        };

        console.log('✅ [Chatbot Context] Context loaded successfully:', {
            walletBalance,
            bankAccountsCount: bankAccounts.length,
            savedRecipientsCount: savedRecipients.length,
            recentTransactionsCount: allTransactions.length
        });

        return parseStringify(finalContext);
    } catch (error) {
        console.error('Error loading chatbot context:', error);
        return null;
    }
};

/**
 * Check if user has exceeded daily transfer limits
 */
export const checkDailyLimits = async (userId: string, amount: number): Promise<{
    allowed: boolean;
    reason?: string;
    todayTotal: number;
    todayCount: number;
}> => {
    try {
        const { database } = await createAdminClient();

        // Get today's transfers
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayTransfers = await database.listDocuments(
            DATABASE_ID!,
            TRANSACTION_COLLECTION_ID!,
            [
                Query.equal('senderId', userId),
                Query.greaterThan('$createdAt', todayStart.toISOString()),
            ]
        );

        const todayTotal = todayTransfers.documents.reduce((sum, txn: any) => {
            return sum + (parseFloat(txn.amount) || 0);
        }, 0);

        const todayCount = todayTransfers.total;

        // Define limits
        const LIMITS: ChatbotLimits = {
            maxPerTransfer: 1000,
            maxDailyTotal: 5000,
            maxDailyCount: 20,
            warningThreshold: 500,
        };

        // Check limits
        if (amount > LIMITS.maxPerTransfer) {
            return {
                allowed: false,
                reason: `Single transfer limit is $${LIMITS.maxPerTransfer}. Please transfer a smaller amount.`,
                todayTotal,
                todayCount,
            };
        }

        if (todayTotal + amount > LIMITS.maxDailyTotal) {
            return {
                allowed: false,
                reason: `Daily limit is $${LIMITS.maxDailyTotal}. You've already transferred $${todayTotal.toFixed(2)} today.`,
                todayTotal,
                todayCount,
            };
        }

        if (todayCount >= LIMITS.maxDailyCount) {
            return {
                allowed: false,
                reason: `Daily transfer count limit is ${LIMITS.maxDailyCount}. You've reached the limit.`,
                todayTotal,
                todayCount,
            };
        }

        return {
            allowed: true,
            todayTotal,
            todayCount,
        };
    } catch (error) {
        console.error('Error checking daily limits:', error);
        return {
            allowed: false,
            reason: 'Error checking transfer limits. Please try again.',
            todayTotal: 0,
            todayCount: 0,
        };
    }
};
