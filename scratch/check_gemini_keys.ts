import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

// Manually parse .env to avoid dependency issues
const envPath = path.join(__dirname, "../.env");
const envContent = fs.readFileSync(envPath, "utf8");
const parsedEnv: Record<string, string> = {};

for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        // Remove surrounding quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
        }
        parsedEnv[key] = val;
    }
}

const keys = [
    parsedEnv.GEMINI_API_KEY,
    parsedEnv.GEMINI_API_KEY_2,
    parsedEnv.GEMINI_API_KEY_3,
    parsedEnv.GEMINI_API_KEY_4,
    parsedEnv.GEMINI_API_KEY_5,
    parsedEnv.GEMINI_API_KEY_6,
    parsedEnv.GEMINI_API_KEY_7,
    parsedEnv.GEMINI_API_KEY_8,
];

async function checkKeys() {
    console.log("=== CHECKING GEMINI API KEYS ===");
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (!key) {
            console.log(`Key #${i + 1}: Not configured.`);
            continue;
        }

        const preview = key.substring(0, 15) + "...";
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: "Say hello",
            });
            console.log(`Key #${i + 1} (${preview}): ✅ WORKING (Response: "${response.text?.trim()}")`);
        } catch (error: any) {
            console.log(`Key #${i + 1} (${preview}): ❌ FAILED - ${error.message || error}`);
        }
    }
}

checkKeys();
