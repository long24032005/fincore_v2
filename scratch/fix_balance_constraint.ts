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

async function fixBalanceConstraint() {
    const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT!;
    const API_KEY = process.env.APPWRITE_SECRET!;
    const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;
    const USER_COLLECTION_ID = process.env.APPWRITE_USER_COLLECTION_ID!;

    console.log('🔧 Fixing balance attribute min constraint...');
    console.log(`   Endpoint: ${ENDPOINT}`);
    console.log(`   Database: ${DATABASE_ID}`);
    console.log(`   Collection: ${USER_COLLECTION_ID}`);

    // First check current attribute definition
    const getRes = await fetch(
        `${ENDPOINT}/databases/${DATABASE_ID}/collections/${USER_COLLECTION_ID}/attributes/balance`,
        {
            method: 'GET',
            headers: {
                'X-Appwrite-Project': PROJECT_ID,
                'X-Appwrite-Key': API_KEY,
                'Content-Type': 'application/json',
            }
        }
    );

    if (!getRes.ok) {
        const err = await getRes.text();
        console.error('❌ Could not fetch attribute:', err);
        return;
    }

    const attr = await getRes.json();
    console.log('\n📋 Current balance attribute:');
    console.log(`   type: ${attr.type}`);
    console.log(`   min: ${attr.min}`);
    console.log(`   max: ${attr.max}`);
    console.log(`   required: ${attr.required}`);
    console.log(`   default: ${attr.default}`);

    if (attr.min === 0 || attr.min === null || attr.min === undefined) {
        console.log('\n✅ Min is already 0 or unset - no fix needed!');
        return;
    }

    // Update the attribute to remove min constraint
    console.log('\n🔄 Updating balance attribute: min=50,000,000 → min=0...');

    const updateRes = await fetch(
        `${ENDPOINT}/databases/${DATABASE_ID}/collections/${USER_COLLECTION_ID}/attributes/integer/balance`,
        {
            method: 'PATCH',
            headers: {
                'X-Appwrite-Project': PROJECT_ID,
                'X-Appwrite-Key': API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                required: attr.required ?? false,
                min: 0,
                max: attr.max ?? null,
                default: attr.default ?? 50000000,
            })
        }
    );

    if (!updateRes.ok) {
        const errText = await updateRes.text();
        console.error('❌ Failed to update attribute:', errText);
        
        // Try alternative: delete and recreate (more drastic)
        console.log('\n⚠️ PATCH failed. Trying alternative approach...');
        console.log('   You may need to manually update the balance attribute in Appwrite console:');
        console.log('   1. Go to Appwrite Console → Database → Users collection');
        console.log('   2. Find the "balance" attribute');
        console.log('   3. Set Min to 0');
        return;
    }

    const updated = await updateRes.json();
    console.log('\n✅ Successfully updated balance attribute!');
    console.log(`   New min: ${updated.min}`);
    console.log(`   New max: ${updated.max}`);
    console.log('\n🎉 Users can now transfer below 50,000,000 VND!');
}

fixBalanceConstraint().catch(console.error);
