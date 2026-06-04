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

async function viewDb() {
    const { createAdminClient } = await import('../lib/appwrite');
    const { database } = await createAdminClient();
    
    const dbId = process.env.APPWRITE_DATABASE_ID;
    const collId = process.env.APPWRITE_TRANSACTION_COLLECTION_ID;
    
    console.log("Database ID:", dbId);
    console.log("Collection ID:", collId);
    
    const txns = await database.listDocuments(dbId!, collId!, []);
    console.log("Total transactions in DB:", txns.total);
    txns.documents.forEach((d: any) => {
        console.log(`- [${d.$createdAt}] Name: "${d.name}", Amount: ${d.amount}, Sender: ${d.senderId}, Receiver: ${d.receiverId}`);
    });
}

viewDb().catch(console.error);
