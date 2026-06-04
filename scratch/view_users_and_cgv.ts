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

async function viewUsersAndCgv() {
    const { createAdminClient } = await import('../lib/appwrite');
    const { database } = await createAdminClient();
    const { Query } = await import('node-appwrite');
    
    const dbId = process.env.APPWRITE_DATABASE_ID;
    const userCollId = process.env.APPWRITE_USER_COLLECTION_ID;
    const txCollId = process.env.APPWRITE_TRANSACTION_COLLECTION_ID;
    
    // List users
    const users = await database.listDocuments(dbId!, userCollId!, []);
    console.log("--- USERS ---");
    users.documents.forEach((u: any) => {
        console.log(`- ID: ${u.$id}, Name: ${u.firstName} ${u.lastName}, Email: ${u.email}`);
    });
    
    // List transactions containing specific strings (or just all and filter)
    const txns = await database.listDocuments(dbId!, txCollId!, [
        Query.limit(100),
        Query.orderDesc('$createdAt')
    ]);
    
    console.log("--- TRANSACTIONS WITH CGV / LAZADA / HAIDILAO ---");
    txns.documents.forEach((d: any) => {
        const name = d.name.toLowerCase();
        if (name.includes('cgv') || name.includes('lazada') || name.includes('haidilao') || name.includes('grab') || name.includes('netflix') || name.includes('evn')) {
            console.log(`- [${d.$createdAt}] Name: "${d.name}", Amount: ${d.amount}, Sender: ${d.senderId}, Receiver: ${d.receiverId}`);
        }
    });
}

viewUsersAndCgv().catch(console.error);
