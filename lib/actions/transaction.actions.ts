"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";
import { getUserById, getLoggedInUser } from "./user.actions";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_TRANSACTION_COLLECTION_ID: TRANSACTION_COLLECTION_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
} = process.env;

/**
 * Create a transaction record in Appwrite
 * 
 * CRITICAL FIXES:
 * 1. senderId is ALWAYS forced to the authenticated user's ID
 * 2. receiverId is RESOLVED to ensure it's a valid User System ID ($id)
 *    This fixes QR receiver visibility where walletId was being used instead of $id
 */
export const createTransaction = async (transaction: CreateTransactionProps) => {
  try {
    const { database } = await createAdminClient();

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: FORCE FETCH AUTHENTICATED USER (THE FIX)
    // ═══════════════════════════════════════════════════════════════════
    const user = await getLoggedInUser();

    // Guard clause: User must be authenticated
    if (!user || !user.$id) {
      throw new Error("User not authenticated. Cannot create transaction.");
    }

    console.log("=== createTransaction called ===");
    console.log("Authenticated user.$id:", user.$id);
    console.log("Incoming transaction:", JSON.stringify(transaction, null, 2));

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: RESOLVE RECEIVER ID (CRITICAL FIX FOR QR VISIBILITY)
    // The receiverId MUST be a User System ID ($id) for getWalletTransactions
    // to find the transaction. If walletId or email is passed, we resolve it.
    // ═══════════════════════════════════════════════════════════════════
    let resolvedReceiverId: string = "";
    let resolvedEmail: string = transaction.email || "";

    if (transaction.receiverId && typeof transaction.receiverId === "string" && transaction.receiverId.trim() !== "") {
      const inputReceiverId = transaction.receiverId.trim();
      console.log("📍 Resolving receiverId:", inputReceiverId);

      // STRATEGY 1: Try to find user by $id (direct lookup)
      try {
        const receiverByDocId = await database.getDocument(
          DATABASE_ID!,
          USER_COLLECTION_ID!,
          inputReceiverId
        );
        if (receiverByDocId && receiverByDocId.$id) {
          resolvedReceiverId = receiverByDocId.$id;
          resolvedEmail = (receiverByDocId as any).email || resolvedEmail;
          console.log("✅ Found receiver by Document ID:", resolvedReceiverId);
        }
      } catch (e: any) {
        // Not found by $id, try other strategies
        console.log("📍 Not found by Document ID, trying walletId lookup...");
      }

      // STRATEGY 2: Try to find user by walletId
      if (!resolvedReceiverId) {
        try {
          const usersByWalletId = await database.listDocuments(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            [Query.equal('walletId', inputReceiverId)]
          );
          if (usersByWalletId.total > 0) {
            const receiverByWalletId = usersByWalletId.documents[0];
            resolvedReceiverId = receiverByWalletId.$id;
            resolvedEmail = (receiverByWalletId as any).email || resolvedEmail;
            console.log("✅ Found receiver by Wallet ID:", resolvedReceiverId);
          }
        } catch (e: any) {
          console.log("📍 Not found by Wallet ID, trying email lookup...");
        }
      }

      // STRATEGY 3: Try to find user by email
      if (!resolvedReceiverId) {
        try {
          const usersByEmail = await database.listDocuments(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            [Query.equal('email', inputReceiverId)]
          );
          if (usersByEmail.total > 0) {
            const receiverByEmail = usersByEmail.documents[0];
            resolvedReceiverId = receiverByEmail.$id;
            resolvedEmail = (receiverByEmail as any).email || resolvedEmail;
            console.log("✅ Found receiver by Email:", resolvedReceiverId);
          }
        } catch (e: any) {
          console.log("⚠️ Could not find receiver by email");
        }
      }

      // FALLBACK: Use original value if all lookups failed
      if (!resolvedReceiverId) {
        resolvedReceiverId = inputReceiverId;
        console.log("⚠️ Using original receiverId as fallback:", resolvedReceiverId);
      }
    }

    console.log("🔧 Final resolved receiverId:", resolvedReceiverId);

    // Fallback email chain
    if (!resolvedEmail) {
      resolvedEmail = user.email || "anonymous@transfer.com";
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Process category
    // ═══════════════════════════════════════════════════════════════════
    let categoryString: string;
    if (transaction.category) {
      if (Array.isArray(transaction.category)) {
        categoryString = transaction.category.length > 0
          ? String(transaction.category[0])
          : "Uncategorized";
      } else {
        categoryString = String(transaction.category);
      }
    } else {
      categoryString = "Transfer";
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 4: BUILD PAYLOAD WITH FORCED senderId AND RESOLVED receiverId
    // ═══════════════════════════════════════════════════════════════════
    const documentPayload = {
      name: String(transaction.name || "Transaction"),
      amount: String(transaction.amount || "0"),
      senderId: user.$id,           // ✅ ALWAYS use authenticated user ID
      senderBankId: String(transaction.senderBankId || ""),
      receiverId: resolvedReceiverId, // ✅ RESOLVED receiver ID (User $id)
      receiverBankId: String(transaction.receiverBankId || ""),
      email: resolvedEmail,
      channel: "online",
      category: categoryString,
      status: String(transaction.status || "Processing"),  // ✅ Respect passed status
    };

    console.log("Final payload (IDs resolved):", JSON.stringify(documentPayload, null, 2));

    // ═══════════════════════════════════════════════════════════════════
    // STEP 5: CREATE DOCUMENT
    // ═══════════════════════════════════════════════════════════════════
    const newTransaction = await database.createDocument(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      ID.unique(),
      documentPayload
    );

    console.log("✅ Transaction saved with ID:", newTransaction.$id);
    return parseStringify(newTransaction);

  } catch (error: any) {
    console.error("❌ createTransaction ERROR:", error.message || error);
    return null;
  }
};

export const getTransactionsByBankId = async ({ bankId }: getTransactionsByBankIdProps) => {
  try {
    const { database } = await createAdminClient();

    const senderTransactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal("senderBankId", bankId)]
    );

    const receiverTransactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal("receiverBankId", bankId)]
    );

    const transactions = {
      total: senderTransactions.total + receiverTransactions.total,
      documents: [
        ...senderTransactions.documents,
        ...receiverTransactions.documents,
      ],
    };

    return parseStringify(transactions);
  } catch (error) {
    console.error("getTransactionsByBankId ERROR:", error);
    return null;
  }
};

export const getPendingAmount = async ({ bankId }: { bankId: string }) => {
  try {
    const { database } = await createAdminClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 3);

    const pendingTransactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [
        Query.equal("senderBankId", bankId),
        Query.greaterThan("$createdAt", cutoffDate.toISOString()),
      ]
    );

    const totalPending = pendingTransactions.documents.reduce(
      (sum: number, txn: any) => sum + (Number(txn.amount) || 0),
      0
    );

    return totalPending;
  } catch (error) {
    console.error("getPendingAmount ERROR:", error);
    return 0;
  }
};