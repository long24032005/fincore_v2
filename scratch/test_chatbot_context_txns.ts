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

async function testContext() {
    const { getChatbotContext } = await import('../lib/actions/chatbot-context.actions');
    
    // Nam Mạo Hiểm user IDs
    const userIds = [
        "6a1d5903002b9e4163cc",
        "6a1d5960002d496fae22",
        "6a1d599f003cbe9fa847",
        "6a1e5506001ebc9a0460"
    ];
    
    for (const uid of userIds) {
        console.log(`\n=== Context for User ${uid} ===`);
        const ctx = await getChatbotContext(uid);
        if (ctx) {
            console.log(`Wallet Balance: ${ctx.walletBalance}`);
            console.log(`Recent Transactions (${ctx.recentTransactions.length}):`);
            ctx.recentTransactions.forEach((t: any) => {
                console.log(`- Date: ${t.$createdAt || t.date}, Name: "${t.name}", Amount: ${t.amount}`);
            });
        } else {
            console.log("Failed to load context");
        }
    }
}

testContext().catch(console.error);
