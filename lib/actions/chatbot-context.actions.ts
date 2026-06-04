"use server";

import { getUserBalance, getWalletTransactions } from "./wallet.actions";
import { getAvailableBalance } from "./bankBalance.actions";
import { getSavedRecipients } from "./savedRecipient.actions";
import { getAccounts, getAccount } from "./bank.actions";
import { getUserInfo, seedUserTransactions } from "./user.actions";
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
        const authUserId = (userDoc as any).userId || userId;
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

        // 4. Get recent transactions (last 10) - MATCH WITH HOME PAGE FOR DATA CONSISTENCY
        const allBankTransactions = await Promise.all(
            bankAccounts.map(async (acc: any) => {
                const accountData = await getAccount({ appwriteItemId: acc.id });
                return accountData?.transactions || [];
            })
        );

        // Fetch wallet transactions
        let walletTransactionsData = await getWalletTransactions(userId);
        
        // Auto-seed if user has zero transactions
        if (allBankTransactions.flat().length === 0 && (walletTransactionsData?.documents || []).length === 0) {
            console.log(`🌱 [Chatbot Context] No transactions found. Auto-seeding for user ${userId}...`);
            const userInfo = await getUserInfo({ userId });
            if (userInfo) {
                await seedUserTransactions(userId, userInfo.email, database);
                // Re-fetch after seeding
                walletTransactionsData = await getWalletTransactions(userId);
            }
        }

        const walletTransactions = (walletTransactionsData?.documents || []).map((txn: any) => ({
            id: txn.$id,
            name: txn.name,
            amount: Number(txn.amount),
            date: txn.$createdAt, // Already virtualized inside getWalletTransactions
            paymentChannel: txn.channel,
            category: txn.category,
            type: txn.senderId === userId ? 'debit' : 'credit',
        }));

        // Merge bank and wallet transactions
        const allTxns = [
            ...allBankTransactions.flat().map((t: any) => ({
                id: t.id || t.$id,
                name: t.name,
                amount: Number(t.amount),
                date: t.date || t.$createdAt,
                paymentChannel: t.paymentChannel || t.channel,
                category: t.category,
                type: t.type
            })),
            ...walletTransactions
        ];

        // Deduplicate based on transaction ID
        const uniqueTxMap = new Map<string, any>();
        allTxns.forEach((tx) => {
            if (tx.id && !uniqueTxMap.has(tx.id)) {
                uniqueTxMap.set(tx.id, tx);
            }
        });
        const uniqueTxns = Array.from(uniqueTxMap.values());

        // Sort by date descending and take top 10
        const allTransactions = uniqueTxns
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10)
            .map((t: any) => ({
                ...t,
                $createdAt: t.date, // Ensure both property variants are populated
                date: t.date
            }));

        console.log('📜 [Chatbot Context] Recent transactions loaded (matching home page):', allTransactions.length);

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
                Query.equal('channel', 'chatbot'),
                Query.greaterThan('$createdAt', todayStart.toISOString()),
            ]
        );

        const todayTotal = todayTransfers.documents.reduce((sum, txn: any) => {
            return sum + (parseFloat(txn.amount) || 0);
        }, 0);

        const todayCount = todayTransfers.total;

        // Define limits (VND)
        const LIMITS: ChatbotLimits = {
            maxPerTransfer: 50_000_000,   // 50 triệu VND/giao dịch
            maxDailyTotal: 100_000_000,   // 100 triệu VND/ngày
            maxDailyCount: 20,
            warningThreshold: 20_000_000, // Cảnh báo từ 20 triệu VND
        };

        const formatVND = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

        // Check limits
        if (amount > LIMITS.maxPerTransfer) {
            return {
                allowed: false,
                reason: `Hạn mức mỗi giao dịch là ${formatVND(LIMITS.maxPerTransfer)}. Vui lòng chuyển số tiền nhỏ hơn.`,
                todayTotal,
                todayCount,
            };
        }

        if (todayTotal + amount > LIMITS.maxDailyTotal) {
            return {
                allowed: false,
                reason: `Hạn mức ngày là ${formatVND(LIMITS.maxDailyTotal)}. Hôm nay bạn đã chuyển ${formatVND(todayTotal)}.`,
                todayTotal,
                todayCount,
            };
        }

        if (todayCount >= LIMITS.maxDailyCount) {
            return {
                allowed: false,
                reason: `Bạn đã đạt giới hạn ${LIMITS.maxDailyCount} giao dịch trong ngày hôm nay.`,
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
