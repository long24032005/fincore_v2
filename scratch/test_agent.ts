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
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
        }
        parsedEnv[key] = val;
    }
}

const key = parsedEnv.GEMINI_API_KEY_6;

const systemInstruction = `You are a professional financial ReAct Agent for Fincore Wallet (operating in Vietnam Dong, VND).`;

const functionDeclarations = [
  {
    name: "get_balance",
    description: "Lấy thông tin số dư ví điện tử Fincore và các tài khoản ngân hàng liên kết của người dùng hiện tại.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "execute_transfer",
    description: "Chuẩn bị thực hiện chuyển khoản tiền từ ví Fincore sang ví khác hoặc ngân hàng khác. Yêu cầu nhập số tiền và Wallet ID của người nhận.",
    parameters: {
      type: "OBJECT",
      properties: {
        amount: { type: "NUMBER", description: "Số tiền chuyển khoản (VND)" },
        recipientWalletId: { type: "STRING", description: "Wallet ID của người nhận" },
        description: { type: "STRING", description: "Nội dung chuyển khoản" }
      },
      required: ["amount", "recipientWalletId"]
    }
  }
];

async function testAgent() {
    console.log("Using API Key:", key ? key.substring(0, 15) + "..." : "None");
    if (!key) return;

    try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'kiểm tra số dư hiện tại của tui đi',
            config: {
                systemInstruction,
                tools: [{ functionDeclarations: functionDeclarations as any }]
            }
        });

        console.log("Raw Response:");
        console.log(JSON.stringify(response, null, 2));
    } catch (e: any) {
        console.error("Error calling Gemini:", e);
    }
}

testAgent();
