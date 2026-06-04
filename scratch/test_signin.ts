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

async function testLogin() {
    const { createAdminClient } = await import('../lib/appwrite');
    const { account } = await createAdminClient();
    
    try {
        console.log("Attempting session creation for huy.thantrong.24775@gmail.com...");
        const session = await account.createEmailPasswordSession("huy.thantrong.91628@gmail.com", "Password123!");
        console.log("Login Success! Session:", session);
    } catch (e: any) {
        console.error("Login Failed:", e.message || e);
    }
}

testLogin().catch(console.error);
