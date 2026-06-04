import fs from 'fs';
import path from 'path';

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...rest] = trimmed.split('=');
            let val = rest.join('=').trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
                val = val.slice(1, -1);
            process.env[key.trim()] = val;
        }
    });
}

async function updateWallets() {
    const { createAdminClient } = await import('../lib/appwrite');
    const { database } = await createAdminClient();
    const { Query } = await import('node-appwrite');

    const DB = process.env.APPWRITE_DATABASE_ID!;
    const UC = process.env.APPWRITE_USER_COLLECTION_ID!;

    // Total 70M → Wallet 35M | VCB 23M | TCB 12M
    // Total 5M  → Wallet  2M | VCB  2M | TCB  1M
    const updates = [
        { email: 'huy.thantrong.23642@gmail.com', balance: 35_000_000 },
        { email: 'nam.maohiem.23642@gmail.com',   balance:  2_000_000 },
    ];

    for (const u of updates) {
        const res = await database.listDocuments(DB, UC, [Query.equal('email', u.email)]);
        if (!res.documents.length) { console.log('❌ Not found:', u.email); continue; }
        const doc = res.documents[0] as any;
        await database.updateDocument(DB, UC, doc.$id, { balance: u.balance });
        console.log(`✅ ${u.email} → ${u.balance.toLocaleString('vi-VN')} ₫`);
    }
    console.log('\nDone!');
}

updateWallets().catch(console.error);
