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

async function viewUserTxns() {
    const { createAdminClient } = await import('../lib/appwrite');
    const { database } = await createAdminClient();
    const { getLoggedInUser } = await import('../lib/actions/user.actions');
    const { Query } = await import('node-appwrite');
    
    const user = await getLoggedInUser();
    if (!user) {
        console.log("No user is logged in!");
        return;
    }
    
    console.log("Logged In User:", user.$id, user.firstName, user.lastName, user.email);
    
    const dbId = process.env.APPWRITE_DATABASE_ID;
    const collId = process.env.APPWRITE_TRANSACTION_COLLECTION_ID;
    
    // Get all transactions where senderId = user.$id or receiverId = user.$id
    const sent = await database.listDocuments(dbId!, collId!, [
        Query.equal('senderId', user.$id),
        Query.limit(100)
    ]);
    const received = await database.listDocuments(dbId!, collId!, [
        Query.equal('receiverId', user.$id),
        Query.limit(100)
    ]);
    
    console.log("--- SENT TRANSACTIONS ---");
    sent.documents.forEach((d: any) => {
        console.log(`- ID: ${d.$id}, Name: "${d.name}", Amount: ${d.amount}, Category: ${d.category}, Created: ${d.$createdAt}`);
    });
    
    console.log("--- RECEIVED TRANSACTIONS ---");
    received.documents.forEach((d: any) => {
        console.log(`- ID: ${d.$id}, Name: "${d.name}", Amount: ${d.amount}, Category: ${d.category}, Created: ${d.$createdAt}`);
    });
}

viewUserTxns().catch(console.error);
