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

async function createUsers() {
    const { signUp } = await import('../lib/actions/user.actions');
    
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const password = "Password123!";

    const conservativeEmail = `huy.thantrong.${randomSuffix}@gmail.com`;
    const aggressiveEmail = `nam.maohiem.${randomSuffix}@gmail.com`;

    console.log("=== CREATING CONSERVATIVE USER ===");
    console.log("Email:", conservativeEmail);
    const consResult = await signUp({
        firstName: "Huy",
        lastName: "Thận Trọng",
        email: conservativeEmail,
        password: password,
        phone: "0901234567",
        address: "123 Nguyen Hue",
        city: "Ho Chi Minh",
        province: "HCM",
        dateOfBirth: "1990-01-01",
        citizenId: "123456789012"
    });
    console.log("Result:", JSON.stringify(consResult, null, 2));

    console.log("\n=== CREATING AGGRESSIVE USER ===");
    console.log("Email:", aggressiveEmail);
    const aggResult = await signUp({
        firstName: "Nam",
        lastName: "Mạo Hiểm",
        email: aggressiveEmail,
        password: password,
        phone: "0907654321",
        address: "456 Le Loi",
        city: "Ho Chi Minh",
        province: "HCM",
        dateOfBirth: "1992-05-15",
        citizenId: "987654321098"
    });
    console.log("Result:", JSON.stringify(aggResult, null, 2));

    console.log("\n=== SUMMARY FOR USER ===");
    console.log(`1. Tài khoản Thận trọng (Conservative):`);
    console.log(`   - Email: ${conservativeEmail}`);
    console.log(`   - Mật khẩu: ${password}`);
    console.log(`2. Tài khoản Mạo hiểm (Aggressive):`);
    console.log(`   - Email: ${aggressiveEmail}`);
    console.log(`   - Mật khẩu: ${password}`);
}

createUsers().catch(console.error);
