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

async function diagnose() {
    const { createAdminClient } = await import('../lib/appwrite');
    const { database } = await createAdminClient();
    const { Query } = await import('node-appwrite');

    const DB = process.env.APPWRITE_DATABASE_ID!;
    const USER_COL = process.env.APPWRITE_USER_COLLECTION_ID!;
    const BANK_COL = process.env.APPWRITE_BANK_COLLECTION_ID!;
    const TXN_COL = process.env.APPWRITE_TRANSACTION_COLLECTION_ID!;

    const emails = ['huy.thantrong.23642@gmail.com', 'nam.maohiem.23642@gmail.com'];

    for (const email of emails) {
        const users = await database.listDocuments(DB, USER_COL, [Query.equal('email', email)]);
        const user = users.documents[0] as any;
        if (!user) { console.log(`❌ Not found: ${email}`); continue; }

        const fmt = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

        console.log(`\n${'='.repeat(60)}`);
        console.log(`👤 ${user.firstName} ${user.lastName}`);
        console.log(`   Email: ${email}`);
        console.log(`   Wallet balance: ${fmt(user.balance || 0)}`);

        // Get banks
        const banks = await database.listDocuments(DB, BANK_COL, [Query.equal('userId', user.$id)]);
        
        for (const bank of banks.documents as any[]) {
            console.log(`\n   🏦 ${bank.bankId} (ID: ${bank.$id})`);

            // Get all transactions for this bank
            const senderTxns = await database.listDocuments(DB, TXN_COL, [
                Query.equal('senderBankId', bank.$id)
            ]);
            const receiverTxns = await database.listDocuments(DB, TXN_COL, [
                Query.equal('receiverBankId', bank.$id)
            ]);

            const outflow = senderTxns.documents.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
            const inflow = receiverTxns.documents.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);

            const currentWith100M = 100_000_000 + inflow - outflow;

            console.log(`      Sender txns:   ${senderTxns.total} transactions, total outflow: ${fmt(outflow)}`);
            console.log(`      Receiver txns: ${receiverTxns.total} transactions, total inflow:  ${fmt(inflow)}`);
            console.log(`      Net flow:      ${fmt(inflow - outflow)}`);
            console.log(`      Current displayed balance (with 100M base): ${fmt(currentWith100M)}`);
        }
    }

    console.log('\n\n📋 DESIGN TARGETS:');
    console.log('Conservative (Huy): Wallet 70M + VCB ~85M + TCB ~45M = total ~200M');
    console.log('Aggressive   (Nam): Wallet  5M + VCB ~12M + TCB  ~8M = total  ~25M');
    console.log('\nRequired startingBalance = targetFinalBalance - netFlow (inflow - outflow)');
}

diagnose().catch(console.error);
