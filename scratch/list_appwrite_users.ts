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

async function checkUser() {
    const { createAdminClient } = await import('../lib/appwrite');
    const { user } = await createAdminClient();
    
    try {
        console.log("Fetching user 6a200689002e1378519f...");
        const u = await user.get('6a200689002e1378519f');
        console.log("Found User:", u);
    } catch (e: any) {
        console.error("Failed to fetch user:", e.message || e);
    }
}

checkUser().catch(console.error);
