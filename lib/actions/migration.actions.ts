'use server';

import { createAdminClient } from '@/lib/appwrite';
import { ID, Query } from 'node-appwrite';

/**
 * Generate a unique wallet ID
 * Format: FW-XXXXXXXX (FW = Finecore Wallet)
 */
function generateWalletId(): string {
    const timestamp = Date.now().toString(36); // Base 36 timestamp
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `FW-${timestamp}${random}`.substring(0, 20); // Max 20 chars
}

/**
 * Migration script to add walletId to all existing users
 */
export async function migrateUsersWalletId() {
    try {
        console.log('🚀 Starting wallet ID migration...');

        const { database } = await createAdminClient();
        const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;
        const USER_COLLECTION_ID = process.env.APPWRITE_USER_COLLECTION_ID!;

        // Get all users
        const users = await database.listDocuments(
            DATABASE_ID,
            USER_COLLECTION_ID,
            [Query.limit(500)] // Adjust if you have more users
        );

        console.log(`📊 Found ${users.total} users to migrate`);

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        // Update each user
        for (const user of users.documents) {
            try {
                // Check if user already has walletId
                if ((user as any).walletId) {
                    console.log(`⏭️  Skipping user ${user.$id} - already has walletId: ${(user as any).walletId}`);
                    skipped++;
                    continue;
                }

                // Generate new walletId
                const walletId = generateWalletId();

                // Update user
                await database.updateDocument(
                    DATABASE_ID,
                    USER_COLLECTION_ID,
                    user.$id,
                    { walletId }
                );

                console.log(`✅ Updated user ${user.$id} with walletId: ${walletId}`);
                updated++;

            } catch (error: any) {
                console.error(`❌ Error updating user ${user.$id}:`, error.message);
                errors++;
            }
        }

        const summary = {
            total: users.total,
            updated,
            skipped,
            errors,
            success: errors === 0
        };

        console.log('\n📈 Migration Summary:', summary);
        return summary;

    } catch (error: any) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

/**
 * Helper function to generate walletId for new users
 */
export async function createWalletId(): Promise<string> {
    return generateWalletId();
}
