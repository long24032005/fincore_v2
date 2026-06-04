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

/**
 * Target balances per scenario:
 * Conservative (Huy): Wallet 70M | VCB 85M | TCB 45M | TOTAL ~200M
 * Aggressive   (Nam): Wallet  5M | VCB 12M | TCB  8M | TOTAL  ~25M
 *
 * startingBalance = targetBalance + |netFlow|  (netFlow is negative = outflow > inflow)
 */
const BANK_CONFIG: Record<string, { label: string; startingBalance: number }> = {
    // Huy Thận Trọng
    '6a2008cb00020212b950': { label: 'HUY - Vietcombank', startingBalance: 87_272_000  }, // → final 85M
    '6a2008cb001e88f3127a': { label: 'HUY - Techcombank', startingBalance: 49_743_000  }, // → final 45M
    // Nam Mạo Hiểm
    '6a2008db002ff3dbc104': { label: 'NAM - Vietcombank', startingBalance: 54_183_331  }, // → final 12M
    '6a2008dc00226455ac65': { label: 'NAM - Techcombank', startingBalance: 14_333_331  }, // → final  8M
};

async function applyStartingBalances() {
    const { createAdminClient } = await import('../lib/appwrite');
    const { database } = await createAdminClient();

    const DB = process.env.APPWRITE_DATABASE_ID!;
    const BANK_COL = process.env.APPWRITE_BANK_COLLECTION_ID!;

    const fmt = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

    console.log('🔧 Updating bank startingBalance fields in Appwrite...\n');

    for (const [bankId, cfg] of Object.entries(BANK_CONFIG)) {
        try {
            await database.updateDocument(DB, BANK_COL, bankId, {
                startingBalance: cfg.startingBalance
            });
            console.log(`✅ ${cfg.label}: startingBalance = ${fmt(cfg.startingBalance)}`);
        } catch (err: any) {
            if (err.message?.includes('Unknown attribute')) {
                console.log(`⚠️  Attribute "startingBalance" does not exist on bank collection.`);
                console.log(`   → Will use per-user-email logic in bank.actions.ts instead.\n`);
                console.log('   Switching to code-based approach...');
                break;
            }
            console.error(`❌ ${cfg.label}: ${err.message}`);
        }
    }

    console.log('\n✅ Done!');
}

applyStartingBalances().catch(console.error);
