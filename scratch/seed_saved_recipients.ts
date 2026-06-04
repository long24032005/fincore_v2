import fs from 'fs';
import path from 'path';

// Load .env manually
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const parts = trimmed.split('=', 2);
            if (parts.length === 2) {
                const key = parts[0].trim();
                let val = parts[1].trim();
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.substring(1, val.length - 1);
                }
                process.env[key] = val;
            }
        }
    });
}

async function main() {
    const { createAdminClient } = await import('../lib/appwrite');
    const { database } = await createAdminClient();
    const { Query, ID } = await import('node-appwrite');
    const crypto = await import('crypto');

    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;
    const USER_COLLECTION_ID = process.env.APPWRITE_USER_COLLECTION_ID!;
    const SAVED_RECIPIENTS_COLLECTION_ID = process.env.APPWRITE_SAVED_RECIPIENTS_COLLECTION_ID!;
    const BANK_COLLECTION_ID = process.env.APPWRITE_BANK_COLLECTION_ID!;

    console.log('\n🔍 Searching for users by email...\n');

    // Find both users
    const allUsers = await database.listDocuments(DATABASE_ID, USER_COLLECTION_ID, []);
    
    const conservativeUser = allUsers.documents.find((u: any) => u.email === 'huy.thantrong.23642@gmail.com');
    const aggressiveUser = allUsers.documents.find((u: any) => u.email === 'nam.maohiem.23642@gmail.com');

    if (!conservativeUser) {
        console.log('❌ Conservative user (huy.thantrong.23642@gmail.com) NOT FOUND');
        console.log('Available users:');
        allUsers.documents.forEach((u: any) => console.log(`  - ${u.email} (ID: ${u.$id})`));
        return;
    }
    if (!aggressiveUser) {
        console.log('❌ Aggressive user (nam.maohiem.23642@gmail.com) NOT FOUND');
        console.log('Available users:');
        allUsers.documents.forEach((u: any) => console.log(`  - ${u.email} (ID: ${u.$id})`));
        return;
    }

    console.log(`✅ Conservative User: ${conservativeUser.firstName} ${conservativeUser.lastName} (ID: ${conservativeUser.$id})`);
    console.log(`✅ Aggressive User: ${aggressiveUser.firstName} ${aggressiveUser.lastName} (ID: ${aggressiveUser.$id})`);

    // Find banks for each user
    const conservativeBanks = await database.listDocuments(DATABASE_ID, BANK_COLLECTION_ID, [
        Query.equal('userId', conservativeUser.$id)
    ]);
    const aggressiveBanks = await database.listDocuments(DATABASE_ID, BANK_COLLECTION_ID, [
        Query.equal('userId', aggressiveUser.$id)
    ]);

    console.log(`\n🏦 Conservative banks: ${conservativeBanks.documents.map((b: any) => b.name || b.bankId).join(', ')}`);
    console.log(`🏦 Aggressive banks: ${aggressiveBanks.documents.map((b: any) => b.name || b.bankId).join(', ')}`);

    function createDestinationHash(params: { recipientUserId?: string; recipientBankId?: string; recipientEmail?: string }) {
        const data = `${params.recipientUserId || ''}_${params.recipientBankId || ''}_${params.recipientEmail || ''}`;
        return crypto.createHash('md5').update(data).digest('hex');
    }

    async function addRecipient(ownerUserId: string, params: {
        nickname: string;
        transferType: 'bank' | 'wallet' | 'qr';
        recipientUserId?: string;
        recipientBankId?: string;
        recipientEmail?: string;
        recipientName?: string;
        bankName?: string;
        accountMask?: string;
    }) {
        const destinationHash = createDestinationHash({
            recipientUserId: params.recipientUserId,
            recipientBankId: params.recipientBankId,
            recipientEmail: params.recipientEmail
        });

        // Check duplicate
        const existing = await database.listDocuments(DATABASE_ID, SAVED_RECIPIENTS_COLLECTION_ID, [
            Query.equal('userId', ownerUserId),
            Query.equal('destinationHash', destinationHash),
            Query.equal('isActive', true)
        ]);

        if (existing.documents.length > 0) {
            console.log(`  ⚠️  "${params.nickname}" already exists, skipping.`);
            return;
        }

        await database.createDocument(DATABASE_ID, SAVED_RECIPIENTS_COLLECTION_ID, ID.unique(), {
            userId: ownerUserId,
            nickname: params.nickname,
            transferType: params.transferType,
            recipientUserId: params.recipientUserId || null,
            recipientWalletId: null,
            recipientBankId: params.recipientBankId || null,
            recipientEmail: params.recipientEmail || null,
            recipientName: params.recipientName || null,
            bankName: params.bankName || null,
            accountMask: params.accountMask || null,
            createdFrom: 'normal_transfer',
            isActive: true,
            destinationHash
        });
        console.log(`  ✅ Saved recipient: "${params.nickname}"`);
    }

    // ============================================================
    // SEED RECIPIENTS FOR CONSERVATIVE USER (huy.thantrong.23642)
    // ============================================================
    console.log(`\n📋 Seeding saved recipients for CONSERVATIVE user (${conservativeUser.firstName})...`);

    // Recipient 1: Aggressive user (wallet transfer) — most important for test cases
    await addRecipient(conservativeUser.$id, {
        nickname: 'Nam Mạo Hiểm',
        transferType: 'wallet',
        recipientUserId: aggressiveUser.$id,
        recipientEmail: 'nam.maohiem.23642@gmail.com',
        recipientName: `${aggressiveUser.firstName} ${aggressiveUser.lastName}`,
    });

    // Recipient 2: Aggressive user bank (if they have bank accounts)
    if (aggressiveBanks.documents.length > 0) {
        const bank1 = aggressiveBanks.documents[0] as any;
        await addRecipient(conservativeUser.$id, {
            nickname: 'Nam (Vietcombank)',
            transferType: 'bank',
            recipientUserId: aggressiveUser.$id,
            recipientBankId: bank1.$id,
            recipientEmail: 'nam.maohiem.23642@gmail.com',
            recipientName: `${aggressiveUser.firstName} ${aggressiveUser.lastName}`,
            bankName: bank1.name || 'Vietcombank',
            accountMask: bank1.accountId ? bank1.accountId.slice(-4) : '0001',
        });
    }

    // Recipient 3: A fictional external contact for variety
    await addRecipient(conservativeUser.$id, {
        nickname: 'Mẹ',
        transferType: 'wallet',
        recipientEmail: 'nguyen.thi.me@gmail.com',
        recipientName: 'Nguyễn Thị Mẹ',
    });

    await addRecipient(conservativeUser.$id, {
        nickname: 'Bạn Minh (Techcombank)',
        transferType: 'bank',
        recipientEmail: 'minh.techcom@gmail.com',
        recipientName: 'Trần Văn Minh',
        bankName: 'Techcombank',
        accountMask: '3892',
    });

    // ============================================================
    // SEED RECIPIENTS FOR AGGRESSIVE USER (nam.maohiem.23642)
    // ============================================================
    console.log(`\n📋 Seeding saved recipients for AGGRESSIVE user (${aggressiveUser.firstName})...`);

    // Recipient 1: Conservative user (wallet) — for test cases
    await addRecipient(aggressiveUser.$id, {
        nickname: 'Huy Thận Trọng',
        transferType: 'wallet',
        recipientUserId: conservativeUser.$id,
        recipientEmail: 'huy.thantrong.23642@gmail.com',
        recipientName: `${conservativeUser.firstName} ${conservativeUser.lastName}`,
    });

    // Recipient 2: Conservative user bank
    if (conservativeBanks.documents.length > 0) {
        const bank1 = conservativeBanks.documents[0] as any;
        await addRecipient(aggressiveUser.$id, {
            nickname: 'Huy (Vietcombank)',
            transferType: 'bank',
            recipientUserId: conservativeUser.$id,
            recipientBankId: bank1.$id,
            recipientEmail: 'huy.thantrong.23642@gmail.com',
            recipientName: `${conservativeUser.firstName} ${conservativeUser.lastName}`,
            bankName: bank1.name || 'Vietcombank',
            accountMask: bank1.accountId ? bank1.accountId.slice(-4) : '0002',
        });
    }

    // Recipient 3: External contacts (for realistic test)
    await addRecipient(aggressiveUser.$id, {
        nickname: 'Bạn Nhậu Tuấn',
        transferType: 'wallet',
        recipientEmail: 'tuan.nhauhau@gmail.com',
        recipientName: 'Nguyễn Tuấn',
    });

    await addRecipient(aggressiveUser.$id, {
        nickname: 'Shopee (Hoàn tiền)',
        transferType: 'wallet',
        recipientEmail: 'shopee.refund@shopee.vn',
        recipientName: 'Shopee Vietnam',
    });

    // ============================================================
    // VERIFY: List all saved recipients
    // ============================================================
    console.log('\n\n🔎 === VERIFICATION: All Saved Recipients ===\n');
    
    const consRecipients = await database.listDocuments(DATABASE_ID, SAVED_RECIPIENTS_COLLECTION_ID, [
        Query.equal('userId', conservativeUser.$id),
        Query.equal('isActive', true)
    ]);
    console.log(`📌 Conservative user has ${consRecipients.total} saved recipients:`);
    consRecipients.documents.forEach((r: any) => {
        console.log(`   - "${r.nickname}" (type: ${r.transferType}, email: ${r.recipientEmail || 'N/A'})`);
    });

    const aggrRecipients = await database.listDocuments(DATABASE_ID, SAVED_RECIPIENTS_COLLECTION_ID, [
        Query.equal('userId', aggressiveUser.$id),
        Query.equal('isActive', true)
    ]);
    console.log(`\n📌 Aggressive user has ${aggrRecipients.total} saved recipients:`);
    aggrRecipients.documents.forEach((r: any) => {
        console.log(`   - "${r.nickname}" (type: ${r.transferType}, email: ${r.recipientEmail || 'N/A'})`);
    });

    console.log('\n✅ Done! Both accounts now have saved recipients for test cases.\n');
    console.log('📝 Summary:');
    console.log(`   Conservative (huy.thantrong.23642@gmail.com) ID: ${conservativeUser.$id}`);
    console.log(`   Aggressive (nam.maohiem.23642@gmail.com) ID: ${aggressiveUser.$id}`);
}

main().catch(console.error);
