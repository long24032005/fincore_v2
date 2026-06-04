import fs from 'fs';
import path from 'path';

// Load .env manually to avoid external dependency
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
                // strip quotes if any
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.substring(1, val.length - 1);
                }
                process.env[key] = val;
            }
        }
    });
}

// Remove static import to prevent early evaluation of Appwrite and Gemini clients before env is parsed
// import { runAgenticChatbot } from '../lib/actions/chatbot-ai.actions';

const mockRecipients = [
    { id: "rec1", nickname: "lana ngo", name: "Lana Ngo", email: "lanango@gmail.com", transferType: "wallet" },
    { id: "rec2", nickname: "lana ngo", name: "Lana Ngo Bank", email: "lanangobank@gmail.com", transferType: "bank" },
    { id: "rec3", nickname: "Nguyễn Văn A", name: "Nguyen Van A", email: "vana@gmail.com", transferType: "wallet" }
];

const mockAccounts = [
    { id: "acc_vcb", name: "Vietcombank", mask: "1234", availableBalance: 50000000 },
    { id: "acc_tcb", name: "Techcombank", mask: "5678", availableBalance: 20000000 }
];

const mockTransactions = [
    { id: "tx1", name: "Thanh toán Điện lực EVN", amount: 1200000, date: "2026-06-01T08:00:00Z", paymentChannel: "online", category: "Utilities" }
];

const testCases = [
    {
        id: 1,
        title: "Kịch bản 1: Hỏi số dư ví (Single Tool Call - get_balance)",
        userId: "6a1d569a002e262f3623", // Huy Thantrong
        userName: "Huy Thantrong",
        walletBalance: 70000000,
        message: "Ví của tôi còn bao nhiêu tiền vậy?",
        history: []
    },
    {
        id: 2,
        title: "Kịch bản 2: Xem hóa đơn sinh hoạt (Single Tool Call - get_utility_bills)",
        userId: "6a1d5960002d496fae22", // Nam Mạo Hiểm
        userName: "Nam Mạo Hiểm",
        walletBalance: 52000000,
        message: "Kiểm tra xem tôi có hóa đơn nào chưa đóng không?",
        history: []
    },
    {
        id: 3,
        title: "Kịch bản 3: Khử mập mờ trùng tên (Disambiguation Trigger)",
        userId: "6a1d569a002e262f3623", // Huy Thantrong
        userName: "Huy Thantrong",
        walletBalance: 70000000,
        message: "Tôi muốn chuyển 1 triệu đồng cho lana ngo",
        history: []
    },
    {
        id: 4,
        title: "Kịch bản 4: Tạo quy tắc đầu tư tự động Autopilot (create_autopilot_rule)",
        userId: "6a1d569a002e262f3623", // Huy Thantrong
        userName: "Huy Thantrong",
        walletBalance: 70000000,
        message: "Hãy tạo lệnh tự động tích lũy 2 triệu đồng vào quỹ VESAF vào ngày 25 hàng tháng nhé",
        history: []
    },
    {
        id: 5,
        title: "Kịch bản 5: Tư vấn danh mục đầu tư (get_investment_advice & get_risk_profile)",
        userId: "6a1d569a002e262f3623", // Huy Thantrong (Conservative - 15 points)
        userName: "Huy Thantrong",
        walletBalance: 70000000,
        message: "Hồ sơ rủi ro của tôi thế nào và nên đầu tư thế nào là tối ưu?",
        history: []
    },
    {
        id: 6,
        title: "Kịch bản 6: Kiểm tra hạn mức giao dịch qua AI (Safe Guard Limits - execute_transfer)",
        userId: "6a1d569a002e262f3623", // Huy Thantrong
        userName: "Huy Thantrong",
        walletBalance: 70000000,
        message: "Chuyển khoản 10 triệu đồng cho Nguyễn Văn A",
        history: []
    }
];

async function runTests() {
    console.log("==================================================");
    console.log("🚀 STARTING AGENTIC AI CHATBOT INTEGRATION TESTS");
    console.log("==================================================");

    // Dynamically import runAgenticChatbot AFTER env setup has fully executed
    const { runAgenticChatbot } = await import('../lib/actions/chatbot-ai.actions');

    const results = [];

    for (const tc of testCases) {
        console.log(`\n--------------------------------------------------`);
        console.log(`📝 RUNNING TEST CASE ${tc.id}: ${tc.title}`);
        console.log(`User: ${tc.userName} (ID: ${tc.userId})`);
        console.log(`Message: "${tc.message}"`);
        console.log(`--------------------------------------------------`);

        const context = {
            userId: tc.userId,
            userName: tc.userName,
            walletBalance: tc.walletBalance,
            bankAccounts: mockAccounts,
            savedRecipients: mockRecipients,
            recentTransactions: mockTransactions
        };

        try {
            const start = Date.now();
            const res = await runAgenticChatbot(tc.message, context as any, tc.history as any);
            const duration = Date.now() - start;

            console.log(`⏱️ Duration: ${duration}ms`);
            console.log(`🤖 AI Message:\n"${res.message}"`);
            if (res.pendingConfirmation) {
                console.log(`📦 Pending Confirmation:`, JSON.stringify(res.pendingConfirmation, null, 2));
            } else {
                console.log(`📦 Pending Confirmation: None`);
            }

            results.push({
                id: tc.id,
                title: tc.title,
                message: tc.message,
                duration,
                response: res,
                success: true
            });

        } catch (err: any) {
            console.error(`❌ Test Case ${tc.id} Failed with Error:`, err.message || err);
            results.push({
                id: tc.id,
                title: tc.title,
                message: tc.message,
                error: err.message || String(err),
                success: false
            });
        }
    }

    console.log("\n==================================================");
    console.log("🏁 INTEGRATION TESTS FINISHED");
    console.log("==================================================");
    console.log(JSON.stringify(results, null, 2));
}

runTests().catch(err => {
    console.error("Test runner crashed:", err);
});
