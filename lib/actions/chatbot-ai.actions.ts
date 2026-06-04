"use server";

import { callGeminiWithRotation } from "../gemini-client";
import { parseStringify } from "../utils";
import { GoogleGenAI } from "@google/genai";
import { getUserInfo } from "./user.actions";
import { getUserAIData, getUserAutomations, addUserAutomation, updateUserAutomation, deleteUserAutomation } from "./local-ai-db";

const API_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY_8,
].filter(Boolean) as string[];

function isQuotaError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorStatus = error?.status || error?.statusCode;
    return (
        errorMessage.includes('quota') ||
        errorMessage.includes('resource_exhausted') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('high demand') ||
        errorMessage.includes('temporary') ||
        errorMessage.includes('unavailable') ||
        errorStatus === 429 ||
        errorStatus === 403 ||
        errorStatus === 503 ||
        errorStatus === 500
    );
}

// 13 Function Declarations for Gemini Tool Use
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
    name: "get_recipients",
    description: "Lấy danh sách người nhận (danh bạ) đã lưu của người dùng.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "get_transaction_history",
    description: "Lấy lịch sử giao dịch gần đây của ví điện tử.",
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
  },
  {
    name: "get_risk_profile",
    description: "Đọc thông tin hồ sơ rủi ro, điểm khẩu vị rủi ro (0-100) và 15 đặc trưng hành vi tài chính thay thế của người dùng.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "get_investment_advice",
    description: "Lấy khuyến nghị chi tiết danh mục đầu tư các quỹ mở (DCDS, VESAF, TCBF...) tối ưu theo hồ sơ rủi ro của người dùng.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "get_utility_bills",
    description: "Lấy danh sách hóa đơn tiện ích (điện EVN, nước SAWACO, Internet) hiện tại và trạng thái thanh toán (đã đóng, chưa đóng).",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "pay_utility_bill",
    description: "Chuẩn bị thanh toán hóa đơn tiện ích. Yêu cầu mã hóa đơn billId và số tiền cần đóng.",
    parameters: {
      type: "OBJECT",
      properties: {
        billId: { type: "STRING", description: "Mã hóa đơn cần đóng" },
        amount: { type: "NUMBER", description: "Số tiền đóng hóa đơn (VND)" }
      },
      required: ["billId", "amount"]
    }
  },
  {
    name: "get_autopilot_rules",
    description: "Lấy danh sách các lệnh tích lũy tự động (Autopilot) định kỳ hiện tại của người dùng.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "create_autopilot_rule",
    description: "Tạo một lệnh tự động hóa tài chính (Autopilot) mới.",
    parameters: {
      type: "OBJECT",
      properties: {
        actionType: { 
          type: "STRING", 
          enum: ["invest", "deposit", "transfer", "low_balance_shield", "expense_limit_guardian", "smart_cash_sweep"], 
          description: "Loại tự động hóa: 'invest' (đầu tư định kỳ vào quỹ), 'deposit' (nạp tiền tự động từ ngân hàng vào ví), 'transfer' (chuyển tiền tự động định kỳ cho ai đó), 'low_balance_shield' (tự động nạp tiền từ ngân hàng liên kết khi số dư ví dưới ngưỡng), 'expense_limit_guardian' (hạn mức cảnh báo/giới hạn chi tiêu tháng), hoặc 'smart_cash_sweep' (quét tiền nhàn rỗi cuối tháng vào quỹ)" 
        },
        amount: { type: "NUMBER", description: "Số tiền giao dịch định kỳ, số tiền nạp, số tiền hạn mức chi tiêu, số tiền tối thiểu để lại ví, hoặc số tiền nạp hộ tùy hành động (VND)" },
        destinationFund: { type: "STRING", description: "Mục tiêu liên quan (Ví dụ: tên quỹ 'VESAF'/'TCBF'/'DCDS', tên ngân hàng 'Vietcombank', tên/ID người nhận chuyển khoản, hoặc 'wallet' tùy loại hành động)" },
        cronExpression: { type: "STRING", description: "Chu kỳ Cron định kỳ (ví dụ: '0 0 1 * *' cho hàng tháng ngày 1, hoặc '0 0 * * *' cho hàng ngày)" }
      },
      required: ["actionType", "amount", "destinationFund", "cronExpression"]
    }
  },
  {
    name: "toggle_autopilot_rule",
    description: "Bật hoặc tắt trạng thái hoạt động của một lệnh Autopilot tự động tích lũy.",
    parameters: {
      type: "OBJECT",
      properties: {
        ruleId: { type: "STRING", description: "ID của lệnh Autopilot cần cập nhật" },
        isActive: { type: "BOOLEAN", description: "Trạng thái bật (true) hoặc tắt (false)" }
      },
      required: ["ruleId", "isActive"]
    }
  },
  {
    name: "delete_autopilot_rule",
    description: "Xóa hoàn toàn một lệnh Autopilot tự động tích lũy.",
    parameters: {
      type: "OBJECT",
      properties: {
        ruleId: { type: "STRING", description: "ID của lệnh Autopilot cần xóa" }
      },
      required: ["ruleId"]
    }
  },
  {
    name: "execute_portfolio_investment",
    description: "Chuẩn bị thực hiện đầu tư phân bổ cả danh mục đề xuất tối ưu của AI với một số tiền tổng cộng.",
    parameters: {
      type: "OBJECT",
      properties: {
        amount: { type: "NUMBER", description: "Tổng số tiền đầu tư phân bổ vào cả danh mục (VND)" }
      },
      required: ["amount"]
    }
  }
];

/**
 * Server-side ReAct Loop Chatbot using Gemini Function Calling (Tool Use)
 */
export const runAgenticChatbot = async (
    userMessage: string,
    context: ChatbotContext,
    conversationHistory: ChatMessage[]
): Promise<{
    message: string;
    pendingConfirmation?: {
        type: "transfer" | "bill_payment" | "portfolio_investment";
        payload: any;
    };
}> => {
    try {
        const userId = context.userId;
        const user = await getUserInfo({ userId });
        const email = user?.email || "";
        const userName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || context.userName || "User";

        console.log(`🤖 [ReAct Agent] Executing for ${userName} (${email})`);

        const systemInstruction = `You are a professional financial ReAct Agent for Fincore Wallet (operating in Vietnam Dong, VND).
You help users manage their wallet balance, check linked bank accounts, view transaction history, manage saved recipients, pay bills, look up their risk profile, get investment advice, and manage autopilot rules.

YOUR TOOLS:
You have a set of tools to interact with the backend. Call them when needed to answer user requests. 
If the user asks a question that requires data (e.g. check balance, view bills), ALWAYS call the corresponding tool first. Do not guess or make up data.
If the user asks to perform an action (e.g. send money, pay a bill, invest in portfolio), call the tool. Note that execution tools like execute_transfer, pay_utility_bill, and execute_portfolio_investment will not execute immediately; they will return a "pending_confirmation" response, which you should return directly to the user.

RULES:
- Tone: Professional, concise, helpful financial advisor.
- Do NOT mention any technical variable names or code structures (like "XGBoost", "FastAPI", "K-Means", "SHAP", "NLP", etc.). Translate all terms into natural Vietnamese (e.g. Autopilot -> tích lũy tự động, risk appetite -> khẩu vị rủi ro, features -> đặc trưng hành vi, etc.).
- Use VND currency formatting (e.g., 50.000.000 ₫).
- If a tool returns a "pending_confirmation" payload, output a brief summary message explaining that you've prepared the transaction, and the system will stop to ask for their confirmation card.
- For transfer requests, if the user specifies a recipient by name/nickname (e.g. "lana ngo"), you MUST first call "get_recipients" to retrieve their saved recipients. If a unique matching recipient is found, extract their "id" field (which acts as their Wallet ID) and call "execute_transfer" with that ID as "recipientWalletId". Do NOT ask the user for email/wallet ID directly if you haven't called "get_recipients" yet.
- When filtering recipients from "get_recipients", perform strict matching. Do not match names that are only visually or phonetically similar but different (e.g., "Thận" or "Thận Trọng" is NOT a match for "Tuấn"). Only match if the name/nickname actually contains or equals the query.
- INVESTMENT & STOCK ADVICE (CRITICAL): When the user asks for investment advice or what stocks/funds they should invest in (e.g., "tôi nên đầu tư vào cổ phiếu nào", "đầu tư gì"), you MUST call "get_investment_advice" to fetch their personalized portfolio allocation. You are fully authorized and expected to suggest the specific individual stocks (such as FPT, HPG, VNM) and mutual funds (such as DCDS, VESAF, TCBF) returned by the tool. Do NOT say you cannot recommend specific stocks; instead, present the specific stock/fund allocation recommendations matching their risk profile.
- MULTI-PURPOSE AUTOPILOT / FINANCIAL AUTOMATION (CRITICAL):
  The user can set up various autopilot / automatic rules. You must parse their intent and map to "create_autopilot_rule" tool:
  1. **'deposit' (Nạp tiền tự động)**:
     - Intent example: "Cứ mỗi đầu tháng nạp 5tr từ Vietcombank vào ví cho tôi nhé"
     - actionType: "deposit"
     - amount: 5000000 (the amount to top up)
     - destinationFund: "Vietcombank" (the bank name)
     - cronExpression: "0 0 1 * *" (runs on the 1st of every month)
  2. **'transfer' (Chuyển khoản tự động định kỳ)**:
     - Intent example: "Mỗi tháng ngày 10 tự động chuyển 2tr cho Tuấn"
     - actionType: "transfer"
     - amount: 2000000 (transfer amount)
     - destinationFund: recipient name or resolved Wallet ID (e.g., "Tuấn")
     - cronExpression: "0 0 10 * *" (runs on the 10th of every month)
  3. **'low_balance_shield' (Nạp tiền tự động khi số dư thấp)**:
     - Intent example: "Nếu ví của tôi xuống dưới 100k, tự động nạp thêm 500k từ Vietcombank nhé"
     - actionType: "low_balance_shield"
     - amount: 500000 (top-up amount)
     - destinationFund: "Vietcombank (Ngưỡng 100k)" (record the bank name and threshold)
     - cronExpression: "0 0 * * *" (runs daily check)
  4. **'expense_limit_guardian' (Hạn chế chi tiêu / cảnh báo)**:
     - Intent example: "Nếu tôi chi tiêu quá 10tr trong tháng này thì cảnh báo/khóa lại"
     - actionType: "expense_limit_guardian"
     - amount: 10000000 (monthly limit threshold)
     - destinationFund: "wallet"
     - cronExpression: "0 0 1 * *" (runs monthly check)
  5. **'smart_cash_sweep' (Tối ưu hóa tiền nhàn rỗi)**:
     - Intent example: "Cuối tháng nếu ví còn dư trên 3 triệu, hãy chuyển hết phần dư đó vào quỹ VESAF"
     - actionType: "smart_cash_sweep"
     - amount: 3000000 (the buffer threshold kept in wallet)
     - destinationFund: "VESAF" (or target fund to sweep into)
     - cronExpression: "0 0 1 * *" (runs at end/beginning of month)
- RETRY / CONTEXT AWARENESS (CRITICAL): If the user says anything like "thử lại", "chuyển lại đi", "retry", "làm lại", "thử lại coi", "gửi lại", "send again", you MUST scan the conversation history to find the most recent transfer attempt (look for messages containing amount + recipient info), then immediately re-attempt that EXACT same action (same recipient name/nickname, same amount in VND) WITHOUT asking the user to repeat any details. Call get_recipients first if needed to resolve the recipient, then call execute_transfer directly. This is a top-priority rule.
`;

        const contents: any[] = [];
        
        // Convert conversationHistory to Gemini Content format (last 20 messages for context)
        for (const msg of conversationHistory.slice(-20)) {
            if (msg.role === 'user') {
                contents.push({ role: 'user', parts: [{ text: msg.content }] });
            } else {
                contents.push({ role: 'model', parts: [{ text: msg.content }] });
            }
        }
        
        // Add current user message
        contents.push({ role: 'user', parts: [{ text: userMessage }] });

        const maxKeys = API_KEYS.length;
        if (maxKeys === 0) {
            throw new Error("No Gemini API keys configured");
        }

        for (let keyIdx = 0; keyIdx < maxKeys; keyIdx++) {
            const apiKey = API_KEYS[keyIdx];
            const ai = new GoogleGenAI({ apiKey });
            
            try {
                let turns = 0;
                let currentContents = [...contents];
                
                while (turns < 5) {
                    console.log(`🔄 [ReAct Turn ${turns + 1}] Calling Gemini API...`);
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: currentContents,
                        config: {
                            systemInstruction,
                            tools: [{ functionDeclarations: functionDeclarations as any }]
                        }
                    });
                    
                    const candidate = response.candidates?.[0];
                    const parts = candidate?.content?.parts || [];
                    const textPart = parts.find(p => p.text);
                    const functionCalls = parts.filter(p => p.functionCall);
                    
                    if (functionCalls.length === 0) {
                        const finishReason = candidate?.finishReason || "UNKNOWN";
                        if (!textPart?.text) {
                            throw new Error(`Gemini returned empty response (Finish Reason: ${finishReason})`);
                        }
                        return {
                            message: textPart.text
                        };
                    }
                    const call = functionCalls[0].functionCall;
                    const toolName = call.name;
                    const toolArgs = (call.args || {}) as Record<string, any>;
                    
                    console.log(`🛠️ [ReAct Tool Call] ${toolName} with args:`, JSON.stringify(toolArgs));
                    
                    // Push model tool-call turn
                    currentContents.push({
                        role: 'model',
                        parts: [{ functionCall: call }]
                    });
                    
                    let toolResult: any;
                    let pendingConfirmation: any = null;
                    
                    try {
                        if (toolName === 'get_balance') {
                        toolResult = {
                            walletBalance: context.walletBalance,
                            bankAccounts: context.bankAccounts.map(b => ({
                                name: b.name,
                                mask: b.mask,
                                availableBalance: b.availableBalance
                            }))
                        };
                    } else if (toolName === 'get_recipients') {
                        toolResult = context.savedRecipients;
                    } else if (toolName === 'get_transaction_history') {
                        toolResult = context.recentTransactions;
                    } else if (toolName === 'execute_transfer') {
                        const amount = Number(toolArgs.amount);
                        const recipientId = toolArgs.recipientWalletId;
                        const desc = toolArgs.description || "Chuyển tiền qua Fincore Chatbot Autopilot";
                        
                        pendingConfirmation = {
                            type: "transfer",
                            payload: {
                                amount,
                                recipientId,
                                description: desc
                            }
                        };
                        toolResult = { status: "pending_confirmation", type: "transfer" };
                    } else if (toolName === 'get_risk_profile') {
                        const cachedAIData = await getUserAIData(userId);
                        toolResult = cachedAIData || { riskAppetiteScore: 50, riskClass: "balanced" };
                    } else if (toolName === 'get_investment_advice') {
                        const cachedAIData = await getUserAIData(userId);
                        const risk = cachedAIData?.riskClass || "balanced";
                        if (risk === 'conservative') {
                            toolResult = {
                                portfolioName: "Danh mục Bảo toàn Vốn (Conservative)",
                                allocation: [
                                    { name: "TCBF (Techcombank Bonds)", pct: 70 },
                                    { name: "VLBF (VinaCapital Bonds)", pct: 20 },
                                    { name: "VNM (Vinamilk)", pct: 10 }
                                ]
                            };
                        } else if (risk === 'aggressive') {
                            toolResult = {
                                portfolioName: "Danh mục Tăng trưởng Mạo hiểm (Aggressive)",
                                allocation: [
                                    { name: "VESAF (VinaCapital Equity)", pct: 50 },
                                    { name: "DCDS (Dragon Capital Stock)", pct: 30 },
                                    { name: "FPT (Cổ phiếu FPT)", pct: 20 }
                                ]
                            };
                        } else {
                            toolResult = {
                                portfolioName: "Danh mục Tăng trưởng Cân bằng (Balanced)",
                                allocation: [
                                    { name: "TCBF (Techcombank Bonds)", pct: 40 },
                                    { name: "DCDS (Dragon Capital Stock)", pct: 30 },
                                    { name: "VESAF (VinaCapital Equity)", pct: 20 },
                                    { name: "FPT (Cổ phiếu FPT)", pct: 10 }
                                ]
                            };
                        }
                    } else if (toolName === 'get_utility_bills') {
                        const nameLower = userName.toLowerCase();
                        const emailLower = email.toLowerCase();
                        let bills: any[] = [];
                        
                        if (nameLower.includes("nam") || emailLower.includes("maohiem")) {
                            bills = [
                                { id: "b1", provider: "EVN HCMC", type: "electricity", amount: 1450000, due_date: "2026-05-15", status: "paid" },
                                { id: "b2", provider: "SAWACO", type: "water", amount: 280000, due_date: "2026-05-10", status: "paid" },
                                { id: "b3", provider: "Viettel Internet", type: "internet", amount: 250000, due_date: "2026-05-05", status: "unpaid" }
                            ];
                        } else if (nameLower.includes("lan") || emailLower.includes("canbang")) {
                            bills = [
                                { id: "b1", provider: "EVN HCMC", type: "electricity", amount: 1100000, due_date: "2026-05-15", status: "paid" },
                                { id: "b2", provider: "SAWACO", type: "water", amount: 180000, due_date: "2026-05-10", status: "paid" },
                                { id: "b3", provider: "Viettel Internet", type: "internet", amount: 250000, due_date: "2026-05-05", status: "paid" }
                            ];
                        } else {
                            bills = [
                                { id: "b1", provider: "EVN HCMC", type: "electricity", amount: 1200000, due_date: "2026-05-15", status: "paid" },
                                { id: "b2", provider: "SAWACO", type: "water", amount: 150000, due_date: "2026-05-10", status: "paid" },
                                { id: "b3", provider: "Viettel Internet", type: "internet", amount: 250000, due_date: "2026-05-05", status: "paid" }
                            ];
                        }
                        toolResult = { bills };
                    } else if (toolName === 'pay_utility_bill') {
                        const billId = toolArgs.billId;
                        const amount = Number(toolArgs.amount);
                        
                        let provider = "Nhà cung cấp";
                        if (billId === 'b3') provider = "Viettel Internet";
                        else if (billId === 'b2') provider = "SAWACO Nước";
                        else if (billId === 'b1') provider = "EVN HCMC Điện lực";

                        pendingConfirmation = {
                            type: "bill_payment",
                            payload: {
                                billId,
                                amount,
                                provider
                            }
                        };
                        toolResult = { status: "pending_confirmation", type: "bill_payment" };
                    } else if (toolName === 'get_autopilot_rules') {
                        toolResult = await getUserAutomations(userId);
                    } else if (toolName === 'create_autopilot_rule') {
                        const rule = await addUserAutomation(userId, {
                            actionType: toolArgs.actionType,
                            amount: Number(toolArgs.amount),
                            destinationFund: toolArgs.destinationFund,
                            cronExpression: toolArgs.cronExpression
                        });
                        toolResult = rule;
                    } else if (toolName === 'toggle_autopilot_rule') {
                        const rule = await updateUserAutomation(userId, toolArgs.ruleId, {
                            isActive: toolArgs.isActive
                        });
                        toolResult = rule || { error: "Automation rule not found" };
                    } else if (toolName === 'delete_autopilot_rule') {
                        await deleteUserAutomation(userId, toolArgs.ruleId);
                        toolResult = { success: true };
                    } else if (toolName === 'execute_portfolio_investment') {
                        const amount = Number(toolArgs.amount);
                        pendingConfirmation = {
                            type: "portfolio_investment",
                            payload: {
                                amount
                            }
                        };
                        toolResult = { status: "pending_confirmation", type: "portfolio_investment" };
                    } else {
                        toolResult = { error: `Tool ${toolName} not supported` };
                    }

                    console.log(`✅ [ReAct Tool Success] Result:`, JSON.stringify(toolResult));

                    currentContents.push({
                        role: 'user',
                        parts: [{
                            functionResponse: {
                                name: toolName,
                                response: { result: toolResult }
                            }
                        }]
                    });

                    // If tool request pending confirmation from user, stop loop and output final text response wrapper
                    if (pendingConfirmation) {
                        const finalResponse = await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: currentContents,
                            config: { systemInstruction }
                        });
                        
                        const finalCandidate = finalResponse.candidates?.[0];
                        const finalPart = finalCandidate?.content?.parts?.find(p => p.text);
                        
                        return {
                            message: finalPart?.text || "Tôi đã chuẩn bị giao dịch để bạn xác nhận. Vui lòng kiểm tra thẻ giao dịch bên dưới.",
                            pendingConfirmation
                        };
                    }

                    turns++;

                } catch (toolCallError: any) {
                    console.error(`🚨 [Tool Call Exec Exception]:`, toolCallError);
                    currentContents.push({
                        role: 'user',
                        parts: [{
                            functionResponse: {
                                name: toolName,
                                response: { result: { error: toolCallError.message || "Execution failed" } }
                            }
                        }]
                    });
                    turns++;
                }
            }
            throw new Error("ReAct Loop turns exceeded limit (5)");

            } catch (error: any) {
                console.error(`❌ [Gemini Key #${keyIdx + 1}] failed:`, error.message);
                const isRetryable = isQuotaError(error) || error.message?.toLowerCase().includes("empty response");
                if (isRetryable && keyIdx < maxKeys - 1) {
                    console.warn(`⚠️ [Gemini] key exhausted/invalid, switching to key #${keyIdx + 2}`);
                    continue;
                }
                throw error;
            }
        }

        throw new Error("All Gemini API keys exhausted or failed during agentic loop execution");
    } catch (e: any) {
        console.error("🚨 runAgenticChatbot Exception:", e);
        return {
            message: `Lỗi hệ thống: ${e.message || "Không thể thực thi Chatbot Agentic lúc này."}`
        };
    }
};

/**
 * Parse user message and determine intent using Gemini AI (Legacy/Fallback)
 */
export const parseUserIntent = async (
    userMessage: string,
    context: ChatbotContext
): Promise<{
    intent: ChatIntent;
    entities: {
        recipientNickname?: string;
        amount?: number;
        source?: string;
        destination?: string;
        detectedIntents?: string[];
        multipleTransfers?: boolean;
    };
}> => {
    try {
        const recipientList = context.savedRecipients
            .map((r, idx) => `${idx + 1}. "${r.nickname}" (Name: ${r.name}, Email: ${r.email}, Type: ${r.transferType})`)
            .join('\n');

        const prompt = `You are a financial assistant for Finecore Wallet. Parse the user's request and respond ONLY with valid JSON.

USER'S SAVED RECIPIENTS:
${recipientList || 'None'}

USER'S MESSAGE: "${userMessage}"

Return ONLY JSON:
{
  "intents": ["intent1", "intent2", ...],
  "entities": {
    "recipientNickname": "exact nickname from list or null",
    "amount": number or null
  }
}`;

        const response = await callGeminiWithRotation({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        let responseText = '';
        if (response && typeof response === 'object') {
            if ('text' in response && typeof response.text === 'string') {
                responseText = response.text;
            } else if ('candidates' in response && Array.isArray(response.candidates)) {
                responseText = response.candidates[0]?.content?.parts?.[0]?.text || '';
            }
        }

        const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanedResponse);

        let finalIntent: ChatIntent = 'general_query';
        let detectedIntents: string[] = parsed.intents || [];

        if (detectedIntents.length > 1) {
            finalIntent = 'multiple_intents';
            parsed.entities.detectedIntents = detectedIntents;
        } else if (detectedIntents.length === 1) {
            finalIntent = detectedIntents[0] as ChatIntent;
        }

        return parseStringify({
            intent: finalIntent,
            entities: parsed.entities || {},
        });
    } catch (error) {
        return {
            intent: 'general_query',
            entities: {},
        };
    }
};

/**
 * Generate chatbot response using Gemini AI (Legacy/Fallback)
 */
export const generateChatbotResponse = async (
    userMessage: string,
    context: ChatbotContext,
    conversationHistory: ChatMessage[]
): Promise<string> => {
    try {
        const historyText = conversationHistory
            .slice(-5)
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');

        const prompt = `You are a financial assistant for Finecore Wallet.
Wallet Balance: $${context.walletBalance.toFixed(2)}
Saved Recipients: ${context.savedRecipients.map(r => r.nickname).join(', ')}

CONVERSATION HISTORY:
${historyText}

CURRENT USER MESSAGE: "${userMessage}"
Respond naturally as the assistant in Vietnamese:`;

        const response = await callGeminiWithRotation({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        let responseText = '';
        if (response && typeof response === 'object') {
            if ('text' in response && typeof response.text === 'string') {
                responseText = response.text;
            } else if ('candidates' in response && Array.isArray(response.candidates)) {
                responseText = response.candidates[0]?.content?.parts?.[0]?.text || '';
            }
        }

        return responseText || "Tôi có chút trục trặc khi kết nối, vui lòng thử lại sau.";
    } catch (error) {
        return "Tôi gặp lỗi khi kết nối. Xin thử lại.";
    }
};

/**
 * AI Reasoning Loop: Evaluate proactive triggers based on user's context, bills, and social posts
 */
export const evaluateProactiveTriggers = async (
    userId: string,
    userName: string,
    walletBalance: number
): Promise<any[]> => {
    try {
        console.log('🤖 [AI Proactive] Starting dynamic reasoning loop for:', userName);
        
        // 1. Fetch user email to determine scenario dynamically
        const user = await getUserInfo({ userId });
        const email = user?.email || "";
        
        const nameLower = userName.toLowerCase();
        const emailLower = email.toLowerCase();
        
        let scenario: 'conservative' | 'balanced' | 'aggressive' = 'balanced';
        if (nameLower.includes("huy") || emailLower.includes("thantrong")) {
            scenario = 'conservative';
        } else if (nameLower.includes("nam") || emailLower.includes("maohiem")) {
            scenario = 'aggressive';
        } else if (nameLower.includes("lan") || emailLower.includes("canbang")) {
            scenario = 'balanced';
        }

        const { getUserAutomations } = await import("./local-ai-db");
        const automations = await getUserAutomations(userId);

        let posts: any[] = [];
        let bills: any[] = [];

        if (scenario === 'aggressive') {
            posts = [
                { id: "p1", content: "Mới săn sale Shopee đêm qua hết 5 triệu, ví xẹp lép rồi cứu với! 😭", created_at: "2026-05-23T23:45:00Z" },
                { id: "p2", content: "Lương chưa về mà nợ thẻ tín dụng dí sát nút rồi, ai cho vay nóng 2 triệu gồng nợ đi", created_at: "2026-05-20T02:15:00Z" },
                { id: "p3", content: "Thức đêm cày game nạp VIP sướng vãi nồi, cuộc sống có bao lâu mà hững hờ", created_at: "2026-05-18T01:30:00Z" }
            ];
            bills = [
                { id: "b1", provider: "EVN HCMC", type: "electricity", amount: 1450000, due_date: "2026-05-15", payment_date: "2026-05-22", status: "paid" },
                { id: "b2", provider: "SAWACO", type: "water", amount: 280000, due_date: "2026-05-10", payment_date: "2026-05-20", status: "paid" },
                { id: "b3", provider: "Viettel Internet", type: "internet", amount: 250000, due_date: "2026-05-05", payment_date: null, status: "unpaid" }
            ];
        } else if (scenario === 'balanced') {
            posts = [
                { id: "p1", content: "Cuối tuần đi cafe với bạn bè tán gẫu, hóa đơn dạo này đắt đỏ ghê", created_at: "2026-05-24T15:00:00Z" },
                { id: "p2", content: "Đang tìm hiểu mấy quỹ mở để gửi tiết kiệm tích lũy, có ai dùng Fincore chưa?", created_at: "2026-05-21T09:30:00Z" },
                { id: "p3", content: "Lại trễ hẹn đóng tiền nước 2 ngày rồi, trí nhớ dạo này kém quá", created_at: "2026-05-15T11:00:00Z" }
            ];
            bills = [
                { id: "b1", provider: "EVN HCMC", type: "electricity", amount: 1100000, due_date: "2026-05-15", payment_date: "2026-05-17", status: "paid" },
                { id: "b2", provider: "SAWACO", type: "water", amount: 180000, due_date: "2026-05-10", payment_date: "2026-05-10", status: "paid" },
                { id: "b3", provider: "Viettel Internet", type: "internet", amount: 250000, due_date: "2026-05-05", payment_date: "2026-05-07", status: "paid" }
            ];
        } else {
            // Conservative
            posts = [
                { id: "p1", content: "Vừa hoàn thành cuốn sách Tài chính cá nhân của Dave Ramsey. Rất bổ ích!", created_at: "2026-05-24T08:00:00Z" },
                { id: "p2", content: "Tự động trích 10% lương chuyển thẳng vào quỹ đầu tư ngay khi nhận, thói quen tốt cần duy trì.", created_at: "2026-05-22T10:15:00Z" },
                { id: "p3", content: "Thanh toán xong tiền điện, tiền nước tháng này đúng hạn. Mọi thứ đã sẵn sàng cho tuần mới.", created_at: "2026-05-20T17:30:00Z" }
            ];
            bills = [
                { id: "b1", provider: "EVN HCMC", type: "electricity", amount: 1200000, due_date: "2026-05-15", payment_date: "2026-05-12", status: "paid" },
                { id: "b2", provider: "SAWACO", type: "water", amount: 150000, due_date: "2026-05-10", payment_date: "2026-05-08", status: "paid" },
                { id: "b3", provider: "Viettel Internet", type: "internet", amount: 250000, due_date: "2026-05-05", payment_date: "2026-05-04", status: "paid" }
            ];
        }

        const prompt = `You are a proactive agentic AI financial chatbot advisor for Finecore Wallet (operating in Vietnam Dong, VND).
You analyze user financial profiles, social media posts, utility bills, and existing automations to determine if any of the following proactive financial triggers apply:

1. "bill_reminder": If there is an unpaid bill (status: "unpaid").
2. "salary_allocator": If the user has a high balance (e.g. > 10.000.000 ₫) and we suggest allocating some to Fincore-linked mutual funds/securities (DCDS, VESAF, VEOF, SSISCA, TCBF, VLBF, SSIBF, FPT, HPG, VNM, VIB212003).
3. "emotional_spend_shield": If the user's social posts indicate impulsive emotional night-spending (e.g. Shopee sale shopping, gaming nạp VIP, debt warnings).
4. "pre_execution": If there are active automations and we want to notify them.

USER DATA:
- First Name: ${userName}
- Wallet Balance: ${walletBalance.toLocaleString('vi-VN')} ₫
- Social Media Posts: ${JSON.stringify(posts)}
- Utility Bills: ${JSON.stringify(bills)}
- Existing Automations: ${JSON.stringify(automations)}

TASK:
Analyze this context. Output ONLY a valid JSON array of insights. If nothing is critical, return an empty array [] or a general greeting, but you should try to suggest at least 1-2 personalized items based on the data.
For instance:
- Nam: definitely needs a bill_reminder for Viettel Internet (250.000 ₫) and an emotional_spend_shield recommendation (e.g. "AI phát hiện bạn có bài đăng chi tiêu bốc đồng trên Shopee lúc đêm muộn. Finecore đề xuất kích hoạt lá chắn chi tiêu để tự động tích lũy tiền vào quỹ VESAF hoặc cổ phiếu VNM hàng tuần trước khi bị cám dỗ mua sắm!").
- Huy: has a good profile, so suggest a salary_allocator (e.g., allocating a portion of their balance into TCBF, VESAF, SSIBF, or FPT stock) or praise their savings and remind them of active automations.

Each item in the array MUST follow this exact JSON structure:
{
  "category": "bill_reminder" | "salary_allocator" | "emotional_spend_shield" | "pre_execution",
  "message": "Friendly, personalized notification message in Vietnamese. Reference specific details like bill names, amounts, or spend habits.",
  "action": {
    "label": "Button label (e.g., 'Thanh toán ngay 250K', 'Kích hoạt lá chắn chi tiêu', 'Đầu tư 5.000.000 ₫')",
    "type": "pay_bill" | "invest_fund" | "enable_autopilot",
    "payload": {
      "amount": number,
      "provider": string,
      "billId": string
    }
  }
}

Return ONLY the raw JSON block. No markdown \`\`\`json blocks, no explanations, no prefix.`;

        const response = await callGeminiWithRotation({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        let responseText = '';
        if (response && typeof response === 'object') {
            if ('text' in response && typeof response.text === 'string') {
                responseText = response.text;
            } else if ('candidates' in response && Array.isArray(response.candidates)) {
                responseText = response.candidates[0]?.content?.parts?.[0]?.text || '';
            }
        }

        const cleanedResponse = responseText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const parsed = JSON.parse(cleanedResponse);
        console.log('✅ [AI Proactive] Parsed results:', JSON.stringify(parsed, null, 2));
        return parseStringify(parsed);
    } catch (error) {
        console.error('❌ [AI Proactive] Error evaluating proactive triggers:', error);
        return [];
    }
};
