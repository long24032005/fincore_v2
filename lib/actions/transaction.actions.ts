"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_TRANSACTION_COLLECTION_ID: TRANSACTION_COLLECTION_ID,
} = process.env;

export const createTransaction = async (transaction: CreateTransactionProps) => {
  try {
    const { database } = await createAdminClient();

    // DEBUG: Log incoming transaction data
    console.log("=== createTransaction called ===");
    console.log("Incoming transaction.category:", transaction.category);
    console.log("Full transaction object:", JSON.stringify(transaction, null, 2));

    // Convert Plaid category array to string, with robust fallback
    // For transfers, we expect "Transfer" string directly
    // For Plaid transactions, category is string[] (e.g., ["Food and Drink", "Restaurants"])
    let categoryString: string;
    if (transaction.category) {
      if (Array.isArray(transaction.category)) {
        categoryString = transaction.category.length > 0
          ? transaction.category[0] // Use primary category only
          : 'Uncategorized';
      } else {
        categoryString = String(transaction.category); // Force string conversion
      }
    } else {
      // Fallback: If no category and it looks like a transfer (has senderId/receiverId), use "Transfer"
      categoryString = (transaction.senderId && transaction.receiverId)
        ? 'Transfer'
        : 'Uncategorized';
    }

    console.log("Final categoryString to save:", categoryString);

    // Build the document payload explicitly (no spread operator ambiguity)
    const documentPayload = {
      name: transaction.name,
      amount: transaction.amount,
      senderId: transaction.senderId,
      senderBankId: transaction.senderBankId,
      receiverId: transaction.receiverId,
      receiverBankId: transaction.receiverBankId,
      email: transaction.email,
      channel: 'online',
      category: categoryString,
    };

    console.log("Document payload to save:", JSON.stringify(documentPayload, null, 2));

    const newTransaction = await database.createDocument(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      ID.unique(),
      documentPayload
    );

    console.log("Transaction saved successfully with ID:", newTransaction.$id);

    return parseStringify(newTransaction);
  } catch (error) {
    console.error("createTransaction ERROR:", error);
  }
}

export const getTransactionsByBankId = async ({ bankId }: getTransactionsByBankIdProps) => {
  try {
    const { database } = await createAdminClient();

    // Show transactions where this bank is SENDER
    const senderTransactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal('senderBankId', bankId)],
    )

    // Show transactions where this bank is RECEIVER
    const receiverTransactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal('receiverBankId', bankId)],
    );

    const transactions = {
      total: senderTransactions.total + receiverTransactions.total,
      documents: [
        ...senderTransactions.documents,
        ...receiverTransactions.documents,
      ]
    }

    return parseStringify(transactions);
  } catch (error) {
    console.log(error);
  }
}

export const getPendingAmount = async ({ bankId }: { bankId: string }) => {
  try {
    const { database } = await createAdminClient();

    // Calculate cutoff date for pending transactions (e.g., 3 days for ACH)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 3);

    const pendingTransactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [
        Query.equal('senderBankId', bankId),
        Query.greaterThan('$createdAt', cutoffDate.toISOString())
      ]
    );

    const totalPending = pendingTransactions.documents.reduce((sum, txn: any) => {
      return sum + (Number(txn.amount) || 0);
    }, 0);

    return totalPending;
  } catch (error) {
    console.error("getPendingAmount ERROR:", error);
    return 0;
  }
}