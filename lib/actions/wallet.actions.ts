"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify, extractUserId, formatAmount } from "../utils";
import { getLoggedInUser } from "./user.actions";

const {
    APPWRITE_DATABASE_ID: DATABASE_ID,
    APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
    APPWRITE_TRANSACTION_COLLECTION_ID: TRANSACTION_COLLECTION_ID,
} = process.env;

/**
 * E-WALLET TRANSFER - Intelligent Routing (Wallet-to-Wallet OR Wallet-to-Bank)
 * 
 * CRITICAL FIX: Routing is now based on EXPLICIT receiverBankId parameter:
 * - If receiverBankId is provided (non-empty) → ALWAYS Wallet-to-Bank (regardless of receiver User existence)
 * - If receiverBankId is empty/null AND receiverId is a User → Wallet-to-Wallet P2P
 * - If receiverBankId is empty/null AND receiverId is NOT a User → Wallet-to-Bank (receiverId is a Bank ID)
 */
export const transferBalance = async ({
    senderId,
    receiverId,
    receiverBankId, // 🆕 EXPLICIT bank destination parameter
    amount,
    description,
}: {
    senderId: string;
    receiverId: string;
    receiverBankId?: string; // 🆕 Optional: if provided, forces Wallet→Bank routing
    amount: number;
    description: string;
}) => {
    try {
        const { database } = await createAdminClient();

        // ═══════════════════════════════════════════════════════════════════
        // STEP A: SANITIZE INPUTS - Prevent [object Object] errors
        // ═══════════════════════════════════════════════════════════════════
        const rawReceiverId = extractUserId(receiverId);
        const rawReceiverBankId = receiverBankId ? extractUserId(receiverBankId) : null;

        // Validate receiverId is not null
        if (!rawReceiverId) {
            throw new Error("Invalid receiver ID. Please verify the recipient.");
        }
        const receiverIdString: string = rawReceiverId;
        const receiverBankIdString: string = rawReceiverBankId || '';

        // ═══════════════════════════════════════════════════════════════════
        // STEP B: AUTHENTICATE SENDER - Force authenticated user
        // ═══════════════════════════════════════════════════════════════════
        const currentUser = await getLoggedInUser();
        if (!currentUser || !currentUser.$id) {
            throw new Error("User not authenticated. Please log in again.");
        }

        const validSenderId = currentUser.$id;

        console.log("=== transferBalance (Intelligent Router) called ===");
        console.log("Authenticated senderId:", validSenderId);
        console.log("receiverId (sanitized):", receiverIdString);
        console.log("receiverBankId (explicit):", receiverBankIdString || "(not provided)");
        console.log("amount:", amount);

        // ═══════════════════════════════════════════════════════════════════
        // STEP C: FETCH SENDER (Always required)
        // ═══════════════════════════════════════════════════════════════════
        const senderDoc = await database.getDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            validSenderId
        );
        const sender = senderDoc as unknown as User;

        // Validate sender balance
        const senderBalance = sender.balance || 0;
        if (senderBalance < amount) {
            throw new Error(`Số dư không đủ. Bạn đang có ${formatAmount(senderBalance)}, nhưng cố gắng chuyển ${formatAmount(amount)}`);
        }

        const newSenderBalance = senderBalance - amount;

        // ═══════════════════════════════════════════════════════════════════
        // 🔴 CRITICAL FIX: ROUTING GATEKEEPER - Explicit Bank Check FIRST
        // ═══════════════════════════════════════════════════════════════════
        // Priority 1: If receiverBankId is EXPLICITLY provided → ALWAYS Bank Transfer
        // Priority 2: Check if receiverId is a User → Wallet Transfer
        // Priority 3: Fallback: receiverId is a Bank ID → Bank Transfer
        // ═══════════════════════════════════════════════════════════════════

        let isWalletToBank = false;
        let finalReceiverBankId = receiverBankIdString;
        let receiverDoc = null;

        // 🎯 PRIORITY 1: Explicit receiverBankId provided
        if (receiverBankIdString && receiverBankIdString.length > 0) {
            isWalletToBank = true;
            finalReceiverBankId = receiverBankIdString;
            console.log("🏦 ROUTING: Explicit receiverBankId provided → Wallet-to-Bank");
        } else {
            // 🎯 PRIORITY 2 & 3: Check if receiverId is a User or Bank
            try {
                receiverDoc = await database.getDocument(
                    DATABASE_ID!,
                    USER_COLLECTION_ID!,
                    receiverIdString
                );
                isWalletToBank = false; // Receiver is a User → Wallet-to-Wallet
                console.log("💰 ROUTING: receiverId is a User → Wallet-to-Wallet P2P");
            } catch (error: any) {
                if (error.code === 404 || error.message?.includes('not found')) {
                    // ═══════════════════════════════════════════════════════════════════
                    // 🆕 FIX: FALLBACK - Try to resolve by Wallet ID if direct lookup fails
                    // This fixes QR Wallet-to-Wallet where receiver visibility was broken
                    // because the QR might contain walletId instead of user.$id
                    // ═══════════════════════════════════════════════════════════════════
                    console.log("📍 User not found by $id, trying Wallet ID lookup...");
                    const userByWalletId = await getUserByWalletId(receiverIdString);

                    if (userByWalletId && userByWalletId.$id) {
                        // ✅ Found user by wallet ID → route to Wallet-to-Wallet
                        receiverDoc = userByWalletId;
                        isWalletToBank = false;
                        // 🔧 CRITICAL: Update receiverIdString to the actual User $id
                        // This ensures the transaction is created with the correct receiverId
                        // so getWalletTransactions can find it for the receiver
                        console.log("✅ Found receiver by Wallet ID:", userByWalletId.$id, "→ Wallet-to-Wallet P2P");
                    } else {
                        // receiverId is NOT a User or Wallet → assume it's a Bank ID
                        isWalletToBank = true;
                        finalReceiverBankId = receiverIdString;
                        console.log("🏦 ROUTING: receiverId is NOT a User → Wallet-to-Bank (Bank ID)");
                    }
                } else {
                    throw error;
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // BRANCH 1: WALLET → WALLET (P2P Transfer) - Only if NOT routing to bank
        // ═══════════════════════════════════════════════════════════════════
        if (!isWalletToBank && receiverDoc) {
            const receiver = receiverDoc as unknown as User;
            const resolvedEmail = receiver.email || "";
            const receiverBalance = receiver.balance || 0;
            const newReceiverBalance = receiverBalance + amount;

            console.log("📤 Executing WALLET → WALLET (P2P) Transfer...");

            // ═══════════════════════════════════════════════════════════════════
            // 🔧 CRITICAL FIX: Use receiver.$id instead of receiverIdString
            // When receiver was found by Wallet ID lookup, receiverIdString is 
            // the Wallet ID, but we need the User Document ID ($id) for:
            // 1. Database update (balance credit)
            // 2. Transaction record (so getWalletTransactions can find it)
            // ═══════════════════════════════════════════════════════════════════
            const actualReceiverId = receiver.$id;

            // Ensure receiver ID is valid for database update
            if (!actualReceiverId) {
                throw new Error("Invalid receiver ID for wallet transfer");
            }

            console.log("   → Receiver $id:", actualReceiverId);
            console.log("   → Original input:", receiverIdString);

            // Update both sender and receiver balances + create transaction
            const [senderUpdate, receiverUpdate, newTransaction] = await Promise.all([
                // Deduct from sender
                database.updateDocument(
                    DATABASE_ID!,
                    USER_COLLECTION_ID!,
                    validSenderId,
                    { balance: newSenderBalance }
                ),
                // Credit to receiver (using actual $id)
                database.updateDocument(
                    DATABASE_ID!,
                    USER_COLLECTION_ID!,
                    actualReceiverId,  // 🔧 FIX: Use receiver.$id
                    { balance: newReceiverBalance }
                ),
                // Create transaction record (Instant Success)
                database.createDocument(
                    DATABASE_ID!,
                    TRANSACTION_COLLECTION_ID!,
                    ID.unique(),
                    {
                        name: description,
                        amount: amount.toString(),
                        senderId: validSenderId,
                        senderBankId: '', // Empty for wallet source
                        receiverId: actualReceiverId,  // 🔧 FIX: Use receiver.$id (THE KEY FIX!)
                        receiverBankId: '', // Empty for wallet destination
                        email: resolvedEmail,
                        category: "Wallet Transfer",
                        channel: "wallet",
                        status: "Success", // ✅ Wallet P2P is instant!
                    }
                ),
            ]);

            // 🔍 DEBUG: Log transaction details for visibility verification
            console.log("✅ P2P Transfer successful!");
            console.log("📝 Transaction created with:");
            console.log("   → senderId:", validSenderId, "(should match sender's user.$id for getWalletTransactions)");
            console.log("   → senderBankId: '' (empty = wallet source, required for sender visibility)");
            console.log("   → receiverId:", actualReceiverId, "(should match receiver's user.$id)");
            console.log("   → receiverBankId: '' (empty = wallet destination, required for receiver visibility)");
            console.log("   → Transaction ID:", newTransaction.$id);

            return parseStringify({
                success: true,
                message: "Transfer successful!",
                newBalance: newSenderBalance,
                transactionId: newTransaction.$id
            });
        }

        // ═══════════════════════════════════════════════════════════════════
        // BRANCH 2: WALLET → BANK (Withdrawal / External Transfer)
        // ═══════════════════════════════════════════════════════════════════
        else {
            console.log("📤 Executing WALLET → BANK (Withdrawal) Transfer...");
            console.log("   → Target Bank ID:", finalReceiverBankId);

            // Validate we have a bank ID to send to
            if (!finalReceiverBankId) {
                throw new Error("No valid bank destination for transfer");
            }

            // CRITICAL: Only deduct sender's wallet - DO NOT update receiver wallet
            // The funds go to a Bank Account, not a wallet user

            // 🔧 BUILD TRANSACTION PAYLOAD EXPLICITLY
            // IMPORTANT: senderBankId MUST be empty string '' (NOT null) for getWalletTransactions query to match
            const transactionPayload = {
                name: description || "Wallet to Bank Transfer",
                amount: amount.toString(),
                senderId: validSenderId,           // ✅ Sender's System Document ID ($id)
                senderBankId: '',                  // ✅ CRITICAL: Empty string = wallet source (NOT null!)
                receiverId: receiverIdString || validSenderId, // Receiver user or self
                receiverBankId: finalReceiverBankId, // 🎯 Destination Bank ID
                email: currentUser.email || '',
                category: "Transfer",              // Category for display
                channel: "wallet",                 // ✅ IMPORTANT: 'wallet' channel for visibility
                status: "Processing",              // ⏳ Bank settlement takes time
            };

            console.log("📝 Creating Wallet→Bank transaction with payload:", JSON.stringify(transactionPayload, null, 2));

            const [senderUpdate, newTransaction] = await Promise.all([
                // Deduct from sender's wallet
                database.updateDocument(
                    DATABASE_ID!,
                    USER_COLLECTION_ID!,
                    validSenderId,
                    { balance: newSenderBalance }
                ),
                // Create transaction record (Processing - external settlement)
                database.createDocument(
                    DATABASE_ID!,
                    TRANSACTION_COLLECTION_ID!,
                    ID.unique(),
                    transactionPayload
                ),
            ]);

            console.log("✅ Wallet → Bank transfer initiated! Transaction ID:", newTransaction.$id);

            // FUTURE: Trigger Dwolla transfer here
            // await createDwollaTransfer({ ... });

            return parseStringify({
                success: true,
                message: "Transfer initiated! Funds will arrive in 1-3 business days.",
                newBalance: newSenderBalance,
                transactionId: newTransaction.$id
            });
        }
    } catch (error: any) {
        console.error("Transfer balance error:", error);
        return parseStringify({
            success: false,
            message: error.message || "Transfer failed",
        });
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
        // ═══════════════════════════════════════════════════════════════════
        // GUARD CLAUSE: Sanitize and validate userId
        // ═══════════════════════════════════════════════════════════════════
        const cleanUserId = extractUserId(userId);

        if (!cleanUserId || typeof cleanUserId !== 'string' || cleanUserId.trim() === '') {
            console.warn('getWalletTransactions: Invalid userId provided:', userId);
            return { total: 0, documents: [] };
        }

        const { database } = await createAdminClient();

        // Resolve both Auth User ID and Database Document ID to support all transactions
        let targetAuthUserId = cleanUserId;
        let targetDocId = cleanUserId;

        try {
            const userDoc = await database.getDocument(DATABASE_ID!, USER_COLLECTION_ID!, cleanUserId);
            if (userDoc) {
                targetDocId = userDoc.$id;
                targetAuthUserId = userDoc.userId || userDoc.$id;
            }
        } catch (err) {
            try {
                const userList = await database.listDocuments(
                    DATABASE_ID!,
                    USER_COLLECTION_ID!,
                    [Query.equal('userId', cleanUserId)]
                );
                if (userList.documents.length > 0) {
                    targetDocId = userList.documents[0].$id;
                    targetAuthUserId = userList.documents[0].userId || targetDocId;
                }
            } catch (err2) {
                console.warn("getWalletTransactions: Could not resolve user IDs for:", cleanUserId);
            }
        }

        const idList = Array.from(new Set([targetAuthUserId, targetDocId])).filter(Boolean) as string[];

        // Get transactions where user is receiver and receiverBankId is empty (wallet destination)
        // Empty string ('') means wallet, not bank
        const receiverTransactions = await database.listDocuments(
            DATABASE_ID!,
            TRANSACTION_COLLECTION_ID!,
            [
                Query.equal('receiverId', idList),
                Query.equal('receiverBankId', '') // Empty means wallet destination
            ]
        );

        // Get transactions where user is sender and senderBankId is empty (wallet source)
        const senderTransactions = await database.listDocuments(
            DATABASE_ID!,
            TRANSACTION_COLLECTION_ID!,
            [
                Query.equal('senderId', idList),
                Query.equal('senderBankId', '') // Empty means wallet source
            ]
        );

        const mergedDocs = [
            ...receiverTransactions.documents,
            ...senderTransactions.documents
        ];

        // Sort by real $createdAt to establish a sequence
        mergedDocs.sort((a: any, b: any) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime());

        // Apply virtualization (spreading dates 1.5 days apart) - ONLY for seeded/historical data
        // Real transactions (chatbot channel or very recent) keep their actual $createdAt
        const ONE_HOUR_MS = 60 * 60 * 1000;
        const now = Date.now();
        const virtualizedDocs = mergedDocs.map((txn: any, idx: number) => {
            // Skip virtualization for real chatbot transactions or transactions created in last hour
            const isRealTransaction = txn.channel === 'chatbot' || 
                                      (now - new Date(txn.$createdAt).getTime()) < ONE_HOUR_MS;
            if (isRealTransaction) {
                return txn; // Keep real $createdAt as-is
            }
            
            const realDate = new Date(txn.$createdAt);
            const offsetDays = (mergedDocs.length - idx) * 1.5;
            const virtualDate = new Date(realDate.getTime() - offsetDays * 24 * 60 * 60 * 1000);
            
            return {
                ...txn,
                $createdAt: virtualDate.toISOString()
            };
        });

        return parseStringify({
            total: virtualizedDocs.length,
            documents: virtualizedDocs
        });
    } catch (error) {
        console.error('Get wallet transactions error:', error);
        return { total: 0, documents: [] };
    }
};

/**
 * Get user by their Wallet ID
 * Used for Bank → Wallet transfers where receiver is identified by wallet ID
 */
export const getUserByWalletId = async (walletId: string) => {
    try {
        // ═══════════════════════════════════════════════════════════════════
        // GUARD CLAUSE: Prevent "Invalid query" error when walletId is falsy
        // ═══════════════════════════════════════════════════════════════════
        if (!walletId || typeof walletId !== 'string' || walletId.trim() === '') {
            console.warn('getUserByWalletId: Invalid walletId provided:', walletId);
            return null;
        }

        const { database } = await createAdminClient();

        const users = await database.listDocuments(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            [Query.equal('walletId', walletId)]
        );

        if (users.total === 0) {
            return null;
        }

        return parseStringify(users.documents[0]);
    } catch (error) {
        console.error('getUserByWalletId error:', error);
        return null;
    }
};

/**
 * BANK → WALLET TRANSFER (Top-up Flow)
 * 
 * This handles transfers from an external Plaid bank account to an internal wallet.
 * Unlike Dwolla transfers, this is an internal ledger operation:
 * - Source: Plaid Bank Account (via senderBankId)
 * - Destination: Internal Digital Wallet (via receiverWalletId)
 * 
 * Flow:
 * 1. Validate receiver's wallet ID exists
 * 2. Create transaction record
 * 3. Credit the receiver's wallet balance
 */
export const bankToWalletTransfer = async ({
    senderId,
    senderBankId,
    receiverWalletId,
    amount,
    description,
}: {
    senderId: string;
    senderBankId: string;
    receiverWalletId: string;
    amount: number;
    description: string;
}): Promise<{
    success: boolean;
    message: string;
    transactionId?: string;
    newReceiverBalance?: number;
}> => {
    try {
        const { database } = await createAdminClient();

        // ═══════════════════════════════════════════════════════════════════
        // CRITICAL FIX: Force fetch authenticated user to guarantee senderId
        // ═══════════════════════════════════════════════════════════════════
        const currentUser = await getLoggedInUser();
        if (!currentUser || !currentUser.$id) {
            return {
                success: false,
                message: "User not authenticated. Please log in again.",
            };
        }

        console.log("=== bankToWalletTransfer called ===");
        console.log("Authenticated user.$id:", currentUser.$id);
        console.log("senderBankId:", senderBankId);
        console.log("receiverWalletId:", receiverWalletId);
        console.log("amount:", amount);

        // Step A: Validate Wallet - Find user by walletId
        const receiverUser = await getUserByWalletId(receiverWalletId);

        if (!receiverUser) {
            console.error("Invalid wallet ID:", receiverWalletId);
            return {
                success: false,
                message: "Invalid Wallet ID. Please verify the recipient's wallet ID.",
            };
        }

        console.log("Found receiver:", receiverUser.email, "($id:", receiverUser.$id, ")");

        // Calculate new balance
        const currentBalance = receiverUser.balance || 0;
        const newBalance = currentBalance + amount;

        // Step B & C: Create transaction record AND credit wallet (atomically-ish)
        const [newTransaction, walletUpdate] = await Promise.all([
            // Create transaction record (Bank-to-Wallet = Provisional Credit)
            database.createDocument(
                DATABASE_ID!,
                TRANSACTION_COLLECTION_ID!,
                ID.unique(),
                {
                    name: String(description || "Bank to Wallet Top-up"),
                    amount: String(amount),
                    senderId: currentUser.$id,
                    senderBankId: String(senderBankId || ""),
                    receiverId: String(receiverUser.$id),
                    receiverBankId: "", // Empty = wallet destination
                    email: receiverUser.email || currentUser.email || "",
                    category: "Wallet Top-up",
                    channel: "wallet",
                    status: "Processing", // ✅ Bank settlement takes time
                }
            ),
            // Credit the wallet
            database.updateDocument(
                DATABASE_ID!,
                USER_COLLECTION_ID!,
                receiverUser.$id,
                { balance: newBalance }
            ),
        ]);

        console.log("Transaction created:", newTransaction.$id);
        console.log("Wallet credited. New balance:", newBalance);

        return parseStringify({
            success: true,
            message: `Nạp thành công ${formatAmount(amount)} từ ngân hàng vào ví!`,
            transactionId: newTransaction.$id,
            newReceiverBalance: newBalance,
        });
    } catch (error: any) {
        console.error("bankToWalletTransfer ERROR:", error);
        return {
            success: false,
            message: error.message || "Bank to Wallet transfer failed",
        };
    }
};

/**
 * WALLET → BANK WITHDRAWAL
 * 
 * Transfers funds from the user's internal wallet to their external bank account.
 * This is an OUTBOUND withdrawal flow:
 * - Source: Internal Digital Wallet
 * - Destination: External Bank Account (user's own)
 * 
 * Flow:
 * 1. Validate wallet balance >= amount
 * 2. Decrement wallet balance
 * 3. Create transaction record (status: 'Processing', type: 'Withdrawal')
 * 4. NOTE: Bank balance is NOT incremented here - it's managed by the bank.
 *    In production, this would trigger a Dwolla transfer to the bank's funding source.
 */
export const walletToBank = async ({
    destinationBankId,
    amount,
    description,
}: {
    destinationBankId: string;
    amount: number;
    description: string;
}): Promise<{
    success: boolean;
    message: string;
    transactionId?: string;
    newWalletBalance?: number;
}> => {
    try {
        const { database } = await createAdminClient();

        // ═══════════════════════════════════════════════════════════════════
        // CRITICAL: Get authenticated user (the sender/withdrawer)
        // ═══════════════════════════════════════════════════════════════════
        const currentUser = await getLoggedInUser();
        if (!currentUser || !currentUser.$id) {
            return {
                success: false,
                message: "User not authenticated. Please log in again.",
            };
        }

        // Sanitize destinationBankId (in case object was passed)
        const bankIdString = typeof destinationBankId === 'object' && destinationBankId !== null
            ? (destinationBankId as any).$id || (destinationBankId as any).id || (destinationBankId as any).appwriteItemId || String(destinationBankId)
            : destinationBankId;

        console.log("=== walletToBank (Withdrawal) called ===");
        console.log("User.$id:", currentUser.$id);
        console.log("destinationBankId:", bankIdString);
        console.log("amount:", amount);

        // Step 1: Fetch user's current wallet balance
        const userDoc = await database.getDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            currentUser.$id
        );
        const user = userDoc as unknown as User;
        const currentBalance = user.balance || 0;

        // Step 2: Validate sufficient balance
        if (currentBalance < amount) {
            return {
                success: false,
                message: `Số dư ví không đủ. Bạn đang có ${formatAmount(currentBalance)}, nhưng muốn rút ${formatAmount(amount)}`,
            };
        }

        // Step 3: Calculate new balance
        const newWalletBalance = currentBalance - amount;

        // Step 4: Decrement wallet balance AND create transaction (atomic-ish)
        const [walletUpdate, newTransaction] = await Promise.all([
            // Decrement the wallet
            database.updateDocument(
                DATABASE_ID!,
                USER_COLLECTION_ID!,
                currentUser.$id,
                { balance: newWalletBalance }
            ),
            // Create withdrawal transaction record
            database.createDocument(
                DATABASE_ID!,
                TRANSACTION_COLLECTION_ID!,
                ID.unique(),
                {
                    name: description || "Wallet Withdrawal to Bank",
                    amount: amount.toString(),
                    senderId: currentUser.$id,
                    senderBankId: '', // Empty = wallet source
                    receiverId: currentUser.$id, // Self-transfer (withdrawal)
                    receiverBankId: bankIdString, // Destination bank
                    email: currentUser.email || '',
                    category: "Withdrawal",
                    channel: "wallet",
                    status: "Processing", // ⏳ Bank settlement takes time
                }
            ),
        ]);

        console.log("Withdrawal transaction created:", newTransaction.$id);
        console.log("New wallet balance:", newWalletBalance);

        // Step 5 (FUTURE): Trigger Dwolla transfer
        // In production, you would call createDwollaTransfer here:
        // await createDwollaTransfer({
        //     sourceFundingSourceUrl: user.walletFundingSourceUrl,
        //     destinationFundingSourceUrl: bankFundingSourceUrl,
        //     amount: amount.toString()
        // });

        return parseStringify({
            success: true,
            message: `Yêu cầu rút ${formatAmount(amount)} đã được khởi tạo! Tiền sẽ được chuyển về tài khoản ngân hàng trong 1-3 ngày làm việc.`,
            transactionId: newTransaction.$id,
            newWalletBalance: newWalletBalance,
        });
    } catch (error: any) {
        console.error("walletToBank ERROR:", error);
        return {
            success: false,
            message: error.message || "Withdrawal to bank failed",
        };
    }
};
