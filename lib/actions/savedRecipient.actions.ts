"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";
import crypto from "crypto";

const {
    APPWRITE_DATABASE_ID: DATABASE_ID,
    APPWRITE_SAVED_RECIPIENTS_COLLECTION_ID: SAVED_RECIPIENTS_COLLECTION_ID,
} = process.env;

/**
 * Create a hash for recipient destination to detect duplicates
 */
function createDestinationHash(params: {
    recipientUserId?: string;
    recipientBankId?: string;
    recipientEmail?: string;
}): string {
    const data = `${params.recipientUserId || ''}_${params.recipientBankId || ''}_${params.recipientEmail || ''}`;
    return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Check if a recipient already exists for this user
 */
export async function checkDuplicateRecipient(params: {
    userId: string;
    recipientUserId?: string;
    recipientBankId?: string;
    recipientEmail?: string;
}): Promise<{ isDuplicate: boolean; existingNickname?: string; existingId?: string }> {
    try {
        const { database } = await createAdminClient();
        const hash = createDestinationHash(params);

        const result = await database.listDocuments(
            DATABASE_ID!,
            SAVED_RECIPIENTS_COLLECTION_ID!,
            [
                Query.equal('userId', params.userId),
                Query.equal('destinationHash', hash),
                Query.equal('isActive', true)
            ]
        );

        if (result.documents.length > 0) {
            const doc = result.documents[0] as any;
            return {
                isDuplicate: true,
                existingNickname: doc.nickname,
                existingId: doc.$id
            };
        }

        return { isDuplicate: false };
    } catch (error) {
        console.error('Check duplicate recipient error:', error);
        return { isDuplicate: false };
    }
}

/**
 * Save a new recipient
 */
export async function saveRecipient(params: {
    userId: string;
    nickname: string;
    transferType: 'bank' | 'wallet' | 'qr';
    recipientUserId?: string;
    recipientWalletId?: string; // NEW: Wallet ID for wallet transfers
    recipientBankId?: string;
    recipientEmail?: string;
    recipientName?: string;
    bankName?: string;
    accountMask?: string;
    createdFrom: 'normal_transfer' | 'qr_transfer';
}): Promise<{ success: boolean; message: string; recipientId?: string }> {
    try {
        // 1. Validate nickname
        if (!params.nickname || params.nickname.trim().length === 0) {
            return { success: false, message: 'Nickname cannot be empty' };
        }

        // 2. Check for duplicates
        const duplicateCheck = await checkDuplicateRecipient({
            userId: params.userId,
            recipientUserId: params.recipientUserId,
            recipientBankId: params.recipientBankId,
            recipientEmail: params.recipientEmail
        });

        if (duplicateCheck.isDuplicate) {
            return {
                success: false,
                message: `This recipient is already saved as "${duplicateCheck.existingNickname}"`
            };
        }

        // 3. Create destination hash
        const destinationHash = createDestinationHash({
            recipientUserId: params.recipientUserId,
            recipientBankId: params.recipientBankId,
            recipientEmail: params.recipientEmail
        });

        // 4. Save to database
        const { database } = await createAdminClient();

        console.log('🔍 DEBUG - Saving recipient:', {
            DATABASE_ID,
            SAVED_RECIPIENTS_COLLECTION_ID,
            userId: params.userId,
            nickname: params.nickname
        });

        const newRecipient = await database.createDocument(
            DATABASE_ID!,
            SAVED_RECIPIENTS_COLLECTION_ID!,
            ID.unique(),
            {
                userId: params.userId,
                nickname: params.nickname.trim(),
                transferType: params.transferType,
                recipientUserId: params.recipientUserId || null,
                recipientWalletId: params.recipientWalletId || null, // Revert: User confirmed column name is recipientWalletId
                recipientBankId: params.recipientBankId || null,
                recipientEmail: params.recipientEmail || null,
                recipientName: params.recipientName || null,
                bankName: params.bankName || null,
                accountMask: params.accountMask || null,
                createdFrom: params.createdFrom,
                isActive: true,
                destinationHash
            }
        );

        console.log('✅ DEBUG - Recipient saved successfully:', newRecipient.$id);

        return {
            success: true,
            message: `✅ Recipient "${params.nickname}" saved successfully!`,
            recipientId: newRecipient.$id
        };
    } catch (error: any) {
        console.error('❌ Save recipient error:', error);
        return {
            success: false,
            message: error.message || 'Failed to save recipient'
        };
    }
}

/**
 * Get all saved recipients for a user
 */
export async function getSavedRecipients(userId: string) {
    try {
        const { database } = await createAdminClient();

        const result = await database.listDocuments(
            DATABASE_ID!,
            SAVED_RECIPIENTS_COLLECTION_ID!,
            [
                Query.equal('userId', userId),
                Query.equal('isActive', true),
                Query.orderDesc('$createdAt')
            ]
        );

        return parseStringify({
            success: true,
            recipients: result.documents,
            total: result.total
        });
    } catch (error) {
        console.error('Get saved recipients error:', error);
        return {
            success: false,
            recipients: [],
            total: 0
        };
    }
}

/**
 * Update lastUsedAt when a saved recipient is used
 */
export async function updateRecipientLastUsed(recipientId: string) {
    try {
        const { database } = await createAdminClient();

        await database.updateDocument(
            DATABASE_ID!,
            SAVED_RECIPIENTS_COLLECTION_ID!,
            recipientId,
            {
                lastUsedAt: new Date().toISOString()
            }
        );

        return { success: true };
    } catch (error) {
        console.error('Update recipient last used error:', error);
        return { success: false };
    }
}

/**
 * Delete (deactivate) a saved recipient
 */
export async function deleteRecipient(recipientId: string) {
    try {
        const { database } = await createAdminClient();

        await database.updateDocument(
            DATABASE_ID!,
            SAVED_RECIPIENTS_COLLECTION_ID!,
            recipientId,
            {
                isActive: false
            }
        );

        return {
            success: true,
            message: 'Recipient removed successfully'
        };
    } catch (error: any) {
        console.error('Delete recipient error:', error);
        return {
            success: false,
            message: error.message || 'Failed to remove recipient'
        };
    }
}

/**
 * Update recipient nickname
 */
export async function updateRecipientNickname(recipientId: string, newNickname: string) {
    try {
        if (!newNickname || newNickname.trim().length === 0) {
            return { success: false, message: 'Nickname cannot be empty' };
        }

        const { database } = await createAdminClient();

        await database.updateDocument(
            DATABASE_ID!,
            SAVED_RECIPIENTS_COLLECTION_ID!,
            recipientId,
            {
                nickname: newNickname.trim()
            }
        );

        return {
            success: true,
            message: 'Nickname updated successfully'
        };
    } catch (error: any) {
        console.error('Update nickname error:', error);
        return {
            success: false,
            message: error.message || 'Failed to update nickname'
        };
    }
}
