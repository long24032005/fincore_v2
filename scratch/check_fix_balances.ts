import fs from 'fs';
import path from 'path';

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

async function checkAndFixBalances() {
    const { createAdminClient } = await import('../lib/appwrite');
    const { database } = await createAdminClient();
    const { Query } = await import('node-appwrite');

    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;
    const USER_COLLECTION_ID = process.env.APPWRITE_USER_COLLECTION_ID!;

    const emails = ['huy.thantrong.23642@gmail.com', 'nam.maohiem.23642@gmail.com'];
    const targetBalances: Record<string, number> = {
        'huy.thantrong.23642@gmail.com': 70_000_000,  // Conservative: 70 triệu
        'nam.maohiem.23642@gmail.com':    5_000_000,  // Aggressive:   5 triệu (theo spec)
    };

    console.log('🔍 Checking current balances...\n');

    const allUsers = await database.listDocuments(DATABASE_ID, USER_COLLECTION_ID, []);
    
    for (const email of emails) {
        const user = allUsers.documents.find((u: any) => u.email === email) as any;
        if (!user) {
            console.log(`❌ User not found: ${email}`);
            continue;
        }

        const currentBalance = user.balance || 0;
        const targetBalance = targetBalances[email];
        const fmt = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

        console.log(`👤 ${user.firstName} ${user.lastName} (${email})`);
        console.log(`   Current balance: ${fmt(currentBalance)}`);
        console.log(`   Target balance:  ${fmt(targetBalance)}`);

        if (currentBalance !== targetBalance) {
            console.log(`   ⚠️  Mismatch! Fixing...`);
            await database.updateDocument(DATABASE_ID, USER_COLLECTION_ID, user.$id, {
                balance: targetBalance
            });
            console.log(`   ✅ Updated to ${fmt(targetBalance)}`);
        } else {
            console.log(`   ✅ Balance is correct`);
        }
        console.log();
    }

    console.log('✅ Done! All balances verified/fixed.');
}

checkAndFixBalances().catch(console.error);
