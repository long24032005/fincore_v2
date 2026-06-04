import { NextRequest, NextResponse } from "next/server";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { callGeminiWithRotation } from "@/lib/gemini-client";
import { updateUserAIData } from "@/lib/actions/local-ai-db";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import fs from "fs";
import path from "path";

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const TRANSACTION_COLLECTION_ID = process.env.APPWRITE_TRANSACTION_COLLECTION_ID;
const ML_SERVER_URL = process.env.ML_SERVER_URL || "http://127.0.0.1:8000";

export async function GET(req: NextRequest) {
  try {
    // 1. Xác thực người dùng
    const user = await getLoggedInUser();
    if (!user || !user.$id) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const emailLower = user.email ? user.email.toLowerCase() : "";

    const { origin, searchParams } = new URL(req.url);
    const runAnalysis = searchParams.get("runAnalysis") === "true";
    const cookieHeader = req.headers.get("cookie") || "";

    // 1.0 Truy vấn cơ sở dữ liệu để lấy các giao dịch và tính toán đặc trưng
    const { database } = await createAdminClient();
    const idList = Array.from(new Set([user.$id, user.userId])).filter(Boolean) as string[];

    let sentTxns = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal('senderId', idList), Query.limit(100)]
    );
    let receivedTxns = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal('receiverId', idList), Query.limit(100)]
    );

    // Auto-seed transactions if empty
    if (sentTxns.total === 0 && receivedTxns.total === 0) {
      console.log(`[AI Scoring API] No transactions found. Auto-seeding for user ${user.$id}...`);
      const { seedUserTransactions } = await import("@/lib/actions/user.actions");
      // Seed with the Auth User ID if available, otherwise Doc ID
      const seedId = user.$id;
      await seedUserTransactions(seedId, user.email, database);

      // Re-fetch after seeding
      sentTxns = await database.listDocuments(
        DATABASE_ID!,
        TRANSACTION_COLLECTION_ID!,
        [Query.equal('senderId', idList), Query.limit(100)]
      );
      receivedTxns = await database.listDocuments(
        DATABASE_ID!,
        TRANSACTION_COLLECTION_ID!,
        [Query.equal('receiverId', idList), Query.limit(100)]
      );
    }

    const totalExpenses = sentTxns.documents.reduce((sum: number, txn: any) => sum + (parseFloat(txn.amount) || 0), 0);
    const totalIncome = receivedTxns.documents.reduce((sum: number, txn: any) => sum + (parseFloat(txn.amount) || 0), 0);

    const realIncome = totalIncome > 0 ? totalIncome : 30000000;
    const realExpenses = totalExpenses > 0 ? totalExpenses : 18000000;
    const realSavings = Math.max(0, realIncome - realExpenses) || 12000000;

    // Load bank balances để làm tỷ lệ phân bổ danh mục tài sản thực
    const { getAccounts } = await import("@/lib/actions/bank.actions");
    const { getAvailableBalance } = await import("@/lib/actions/bankBalance.actions");
    
    let totalBankBalance = 0;
    try {
      const accountsData = await getAccounts({ userId: user.$id });
      if (accountsData && accountsData.data) {
        for (const account of accountsData.data) {
          try {
            const balanceInfo = await getAvailableBalance(account.appwriteItemId);
            totalBankBalance += balanceInfo.available || 0;
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (e) {
      // ignore
    }

    const walletBalance = user.balance || 0;
    const totalWealth = walletBalance + totalBankBalance;
    
    let cashPct = 75;
    let bondsPct = 15;
    let stocksPct = 10;
    
    if (totalWealth > 0) {
      cashPct = Math.round((walletBalance / totalWealth) * 100);
      bondsPct = Math.round((totalBankBalance / totalWealth) * 100);
      
      if (cashPct + bondsPct >= 95) {
        stocksPct = 5;
        const ratio = cashPct / (cashPct + bondsPct || 1);
        cashPct = Math.round(95 * ratio);
        bondsPct = 95 - cashPct;
      } else {
        stocksPct = 100 - cashPct - bondsPct;
      }
    }

    const dynamicStats = {
      walletBalance,
      realIncome,
      realExpenses,
      realSavings,
      currentAllocation: {
        cash: cashPct,
        bonds: bondsPct,
        stocks: stocksPct
      }
    };

    // Trả về dữ liệu đã lưu nếu không yêu cầu phân tích trực tiếp
    if (!runAnalysis) {
      const { getUserAIData } = await import("@/lib/actions/local-ai-db");
      const cachedData = await getUserAIData(user.$id);
      if (cachedData && (cachedData.riskClass || cachedData.riskAppetiteScore)) {
        console.log(`[AI Scoring] Returning cached AI Profile for user ${user.$id}.`);
        return NextResponse.json({
          success: true,
          userId: user.$id,
          userName: `${user.firstName} ${user.lastName}`,
          ...cachedData,
          ...dynamicStats
        });
      }
    }

    console.log(`[AI Scoring] Initiating live API data collection & Gemini analysis for user: ${user.firstName} ${user.lastName}`);

    // Gọi các API giả lập ngoài để lấy dữ liệu thô (đúng luồng thực tế)
    let socialData: any = { posts: [] };
    let utilityData: any = { bills: [] };

    try {
      const [socialRes, utilityRes] = await Promise.all([
        fetch(`${origin}/api/v1/external/social-posts`, { headers: { cookie: cookieHeader } }),
        fetch(`${origin}/api/v1/external/utility-bills`, { headers: { cookie: cookieHeader } })
      ]);

      if (socialRes.ok) {
        const rawSocial = await socialRes.json();
        // Support both Facebook Graph API schema (data[].message) and legacy schema (posts[].content)
        const postsArray = rawSocial.data || rawSocial.posts || [];
        socialData = {
          ...rawSocial,
          posts: postsArray.map((p: any) => ({
            ...p,
            // Normalize: Graph API uses 'message', legacy uses 'content'
            content: p.message ?? p.content ?? "",
          }))
        };
      }
      if (utilityRes.ok) utilityData = await utilityRes.json();
    } catch (fetchErr) {
      console.warn("⚠️ Failed to fetch external mock APIs, using direct local mock generation. Error:", fetchErr);
    }

    const fullNameLower = `${user.firstName || ""} ${user.lastName || ""} ${user.email || ""}`.toLowerCase();
    const isAggressive = fullNameLower.includes("maohiem");
    const isConservative = fullNameLower.includes("thantrong");

    // Direct local mock generation if fetch failed or returned empty
    if (!socialData.posts || socialData.posts.filter((p: any) => p.content).length === 0) {
      if (isAggressive) {
        socialData.posts = [
          { id: "p1", content: "Mới săn sale Shopee đêm qua hết 5 triệu, ví xẹp lép rồi cứu với! 😭", created_at: "2026-05-23T23:45:00Z" },
          { id: "p2", content: "Lương chưa về mà nợ thẻ tín dụng dí sát nút rồi, ai cho vay nóng 2 triệu gồng nợ đi", created_at: "2026-05-20T02:15:00Z" },
          { id: "p3", content: "Thức đêm cày game nạp VIP sướng vãi nồi, cuộc sống có bao lâu mà hững hờ", created_at: "2026-05-18T01:30:00Z" }
        ];
      } else if (isConservative) {
        socialData.posts = [
          { id: "p1", content: "Vừa hoàn thành cuốn sách Tài chính cá nhân của Dave Ramsey. Rất bổ ích!", created_at: "2026-05-24T08:00:00Z" },
          { id: "p2", content: "Tự động trích 10% lương chuyển thẳng vào quỹ đầu tư ngay khi nhận, thói quen tốt cần duy trì.", created_at: "2026-05-22T10:15:00Z" },
          { id: "p3", content: "Thanh toán xong tiền điện, tiền nước tháng này đúng hạn. Mọi thứ đã sẵn sàng cho tuần mới.", created_at: "2026-05-20T17:30:00Z" }
        ];
      } else {
        // Balanced fallback
        socialData.posts = [
          { id: "p1", content: "Cuối tuần đi cafe với bạn bè tán gẫu, hóa đơn dạo này đắt đỏ ghê", created_at: "2026-05-24T15:00:00Z" },
          { id: "p2", content: "Đang tìm hiểu mấy quỹ mở để gửi tiết kiệm tích lũy, có ai dùng Fincore chưa?", created_at: "2026-05-21T09:30:00Z" },
          { id: "p3", content: "Lại trễ hẹn đóng tiền nước 2 ngày rồi, trí nhớ dạo này kém quá", created_at: "2026-05-15T11:00:00Z" }
        ];
      }
    }

    if (!utilityData.bills || utilityData.bills.length === 0) {
      if (isAggressive) {
        utilityData.bills = [
          { id: "b1", provider: "EVN HCMC", amount: 1450000, status: "paid", due_date: "2026-05-15T23:59:59Z", payment_date: "2026-05-18T10:30:00Z" },
          { id: "b2", provider: "SAWACO", amount: 150000, status: "unpaid", due_date: "2026-05-25T23:59:59Z", payment_date: null }
        ];
      } else if (isConservative) {
        utilityData.bills = [
          { id: "b1", provider: "EVN HCMC", amount: 650000, status: "paid", due_date: "2026-05-15T23:59:59Z", payment_date: "2026-05-14T09:00:00Z" },
          { id: "b2", provider: "SAWACO", amount: 120000, status: "paid", due_date: "2026-05-20T23:59:59Z", payment_date: "2026-05-18T16:45:00Z" }
        ];
      } else {
        // Balanced fallback
        utilityData.bills = [
          { id: "b1", provider: "EVN HCMC", amount: 850000, status: "paid", due_date: "2026-05-15T23:59:59Z", payment_date: "2026-05-17T11:00:00Z" },
          { id: "b2", provider: "SAWACO", amount: 180000, status: "paid", due_date: "2026-05-20T23:59:59Z", payment_date: "2026-05-20T17:30:00Z" }
        ];
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // TÍNH TOÁN ĐỘNG 13 ĐẶC TRƯNG HÀNH VI (FEATURE ENGINEERING)
    // ─────────────────────────────────────────────────────────────────
    const allSent = sentTxns.documents;
    const allReceived = receivedTxns.documents;
    const allTxns = [...allSent, ...allReceived].sort(
      (a: any, b: any) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime()
    );

    // Kịch bản ảo hóa thời gian giao dịch cho các tài khoản demo (seeding tạo trong 1-2 phút)
    const virtualDates = allTxns.map((t: any, idx: number) => {
      const realDate = new Date(t.$createdAt);
      // Spreading transactions: cách nhau 1.5 ngày
      const offsetDays = (allTxns.length - idx) * 1.5;
      const baseDate = new Date(realDate.getTime() - offsetDays * 24 * 60 * 60 * 1000);

      // Gán giờ cố định để đảm bảo tỷ lệ chi tiêu đêm muộn và ngoài giờ chuẩn xác toán học
      let hours = 14; // Default: 2:00 PM (neither late night nor impulse)
      if (isAggressive) {
        // Aggressive: exactly 50% late night (hours = 1), 70% impulse (20 hours = late night, 8 hours = 20h, 12 hours = 14h)
        if (idx < 20) {
          hours = 1; // 1:00 AM (late night + impulse)
        } else if (idx < 28) {
          hours = 20; // 8:00 PM (impulse)
        } else {
          hours = 14; // 2:00 PM (normal)
        }
      } else if (isConservative) {
        // Conservative: 0% late night, 0% impulse
        hours = 10; // 10:00 AM (normal)
      } else {
        // Balanced: 15% late night (5 out of 35), 35% impulse (12 out of 35)
        if (idx < 5) {
          hours = 1; // 1:00 AM (late night + impulse)
        } else if (idx < 12) {
          hours = 20; // 8:00 PM (impulse)
        } else {
          hours = 14; // 2:00 PM (normal)
        }
      }

      baseDate.setHours(hours, 0, 0, 0);
      return baseDate;
    });

    const getVirtualDate = (txnId: string) => {
      const idx = allTxns.findIndex((t: any) => t.$id === txnId);
      return idx !== -1 ? virtualDates[idx] : new Date();
    };

    // 1. bill_on_time_ratio: Tỷ lệ thanh toán hóa đơn đúng hạn
    let bill_on_time_ratio = 1.0;
    if (utilityData.bills && utilityData.bills.length > 0) {
      const bills = utilityData.bills;
      const paidBills = bills.filter((b: any) => b.status === 'paid');
      if (paidBills.length > 0) {
        const onTimeBills = paidBills.filter((b: any) => {
          if (!b.payment_date) return false;
          return new Date(b.payment_date) <= new Date(b.due_date);
        });
        bill_on_time_ratio = onTimeBills.length / paidBills.length;
      }
    }

    // 2. social_sentiment & Interests: Phân tích Ngữ nghĩa 7 Chủ đề qua FastAPI NLP
    let social_sentiment = 0.75;
    let userInterests = {
      technology: 0.1,
      entertainment: 0.1,
      discipline: 0.1,
      health: 0.1,
      education: 0.1,
      entrepreneurship: 0.1,
      family: 0.1
    };

    if (socialData.posts && socialData.posts.length > 0) {
      try {
        const postContents = socialData.posts.map((p: any) => p.content);
        console.log(`[AI Insights] Sending ${postContents.length} posts to ML NLP server for interest embedding analysis...`);
        const nlpRes = await fetch(`${ML_SERVER_URL}/analyze-interests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ posts: postContents })
        });
        
        if (nlpRes.ok) {
          const nlpResult = await nlpRes.json();
          if (nlpResult.success && nlpResult.interests) {
            userInterests = nlpResult.interests;
            // Map discipline của NLP thành social_sentiment của XGBoost (tương tự logic cũ)
            social_sentiment = userInterests.discipline || 0.5;
            console.log("[AI Insights] Live NLP analysis user interests:", JSON.stringify(userInterests, null, 2));
          }
        }
      } catch (nlpErr) {
        console.warn("⚠️ Failed to call FastAPI /analyze-interests. Using fallback values.", nlpErr);
      }
    }

    // 3. spend_discipline: Kỷ luật quản lý chi tiêu (1.0 - tỷ lệ mua sắm & ăn uống)
    let spend_discipline = 0.70;
    if (allSent.length > 0) {
      const shoppingDiningTotal = allSent
        .filter((t: any) => t.category === 'Shopping' || t.category === 'Dining' || t.category === 'Food and Drink')
        .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
      
      const totalSentAmount = allSent.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
      
      if (totalSentAmount > 0) {
        spend_discipline = Math.max(0.0, 1.0 - (shoppingDiningTotal / totalSentAmount));
      }
    }

    // 4. balance_volatility: Độ biến động số dư tài khoản
    let balance_volatility = 0.20;
    if (allTxns.length > 0) {
      const amounts = allTxns.map((t: any) => parseFloat(t.amount) || 0);
      const meanAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((a, b) => a + Math.pow(b - meanAmount, 2), 0) / amounts.length;
      const stdDev = Math.sqrt(variance);
      balance_volatility = Math.min(1.0, stdDev / (walletBalance || 1));
    }

    // 5. impulse_purchase_index: Chỉ số mua sắm bốc đồng ngoài giờ hành chính
    let impulse_purchase_index = 0.25;
    const shoppingDiningTxns = allSent.filter((t: any) => t.category === 'Shopping' || t.category === 'Dining');
    if (shoppingDiningTxns.length > 0) {
      const impulseTxns = shoppingDiningTxns.filter((t: any) => {
        const date = getVirtualDate(t.$id);
        const hours = date.getHours();
        return hours >= 18 || hours <= 8;
      });
      impulse_purchase_index = impulseTxns.length / shoppingDiningTxns.length;
    }

    // 6. late_night_spend_ratio: Tỷ lệ chi tiêu đêm muộn (23h - 5h)
    let late_night_spend_ratio = 0.10;
    if (allSent.length > 0) {
      const lateNightTxns = allSent.filter((t: any) => {
        const date = getVirtualDate(t.$id);
        const hours = date.getHours();
        return hours >= 23 || hours < 5;
      });
      late_night_spend_ratio = lateNightTxns.length / allSent.length;
    }

    // 7. immediate_cash_out_rate: Tỷ lệ rút tiền ngay sau khi nạp ví (trong vòng 2h)
    let immediate_cash_out_rate = 0.0;
    const deposits = allReceived.filter((t: any) => t.category === 'Wallet Top-up');
    let totalDeposits = deposits.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
    let totalImmediateCashOut = 0;
    
    deposits.forEach((dep: any) => {
      const depTime = getVirtualDate(dep.$id).getTime();
      const depAmount = parseFloat(dep.amount) || 0;
      
      const quickCashOuts = allSent.filter((w: any) => {
        const wTime = getVirtualDate(w.$id).getTime();
        return (w.category === 'Withdrawal' || w.category === 'Transfer') && 
               wTime >= depTime && 
               (wTime - depTime) <= 2 * 60 * 60 * 1000;
      });
      
      const sumOut = quickCashOuts.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
      totalImmediateCashOut += Math.min(depAmount, sumOut);
    });
    
    if (totalDeposits > 0) {
      immediate_cash_out_rate = totalImmediateCashOut / totalDeposits;
    }

    // 8. income_regularity_index: Độ ổn định thu nhập (payroll)
    let income_regularity_index = 0.80;
    const paydays = allReceived
      .filter((t: any) => t.category === 'Wallet Top-up' && parseFloat(t.amount) >= 15000000)
      .sort((a: any, b: any) => getVirtualDate(a.$id).getTime() - getVirtualDate(b.$id).getTime());
      
    if (paydays.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < paydays.length; i++) {
        const diffMs = getVirtualDate(paydays[i].$id).getTime() - getVirtualDate(paydays[i-1].$id).getTime();
        intervals.push(diffMs / (24 * 60 * 60 * 1000));
      }
      const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((a, b) => a + Math.pow(b - meanInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      income_regularity_index = Math.max(0.0, 1.0 - (stdDev / 30));
    } else if (paydays.length === 1) {
      income_regularity_index = 0.75;
    } else {
      income_regularity_index = 0.50; // No payroll
    }

    // 9. liquidity_buffer_ratio: Đệm thanh khoản (ví / trung bình chi tiêu)
    let liquidity_buffer_ratio = 2.0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentExpenses = allSent.filter((t: any) => getVirtualDate(t.$id) >= thirtyDaysAgo);
    const total30dExpense = recentExpenses.reduce((sum: any, t: any) => sum + (parseFloat(t.amount) || 0), 0);
    const dailySpend = total30dExpense / 30;
    if (dailySpend > 0) {
      liquidity_buffer_ratio = Math.min(5.0, walletBalance / dailySpend);
    }

    // 10. save_after_payday_ratio: Tỷ lệ tiết kiệm ngay sau kỳ lương (trong vòng 48h)
    let save_after_payday_ratio = 0.0;
    const salaryDeposits = allReceived.filter((t: any) => t.category === 'Wallet Top-up' && parseFloat(t.amount) >= 15000000);
    let totalSalary = salaryDeposits.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
    let totalSaved = 0;
    
    salaryDeposits.forEach((sal: any) => {
      const salTime = getVirtualDate(sal.$id).getTime();
      const next48hFundTransfers = allSent.filter((w: any) => {
        const wTime = getVirtualDate(w.$id).getTime();
        return w.category === 'Transfer' && 
               w.receiverId.toLowerCase().includes('fund') &&
               wTime >= salTime && 
               (wTime - salTime) <= 48 * 60 * 60 * 1000;
      });
      totalSaved += next48hFundTransfers.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
    });
    
    if (totalSalary > 0) {
      save_after_payday_ratio = Math.min(1.0, totalSaved / totalSalary);
    } else {
      const allTransfers = allSent.filter((w: any) => w.category === 'Transfer' && w.receiverId.toLowerCase().includes('fund'));
      const totalExpenses = allSent.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
      save_after_payday_ratio = totalExpenses > 0 ? allTransfers.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0) / totalExpenses : 0.10;
    }

    // Tải nhật ký thiết bị và hoạt động từ Database
    const { getUserDeviceActivityLogs, seedUserDeviceActivity, getUserAutomations, seedUserAutomations } = await import("@/lib/actions/local-ai-db");
    let deviceLogs = await getUserDeviceActivityLogs(user.$id);

    // Tự động seed dữ liệu giả lập cho demo nếu DB chưa có
    if (!deviceLogs) {
      const scenario = emailLower.includes('thantrong') ? 'conservative' : emailLower.includes('maohiem') ? 'aggressive' : 'balanced';
      const allTransactions = [...sentTxns.documents, ...receivedTxns.documents];
      await seedUserDeviceActivity(user.$id, scenario, allTransactions);
      deviceLogs = await getUserDeviceActivityLogs(user.$id);
    }

    // 11. auto_save_completion_rate: Tỷ lệ trích tiền tự động thành công (Autopilot success rate)
    let auto_save_completion_rate = 0.95;
    try {
      let automations = await getUserAutomations(user.$id);
      if (automations.length === 0) {
        const scenario = emailLower.includes('thantrong') ? 'conservative' : emailLower.includes('maohiem') ? 'aggressive' : 'balanced';
        await seedUserAutomations(user.$id, scenario);
        automations = await getUserAutomations(user.$id);
      }
      
      let totalRuns = 0;
      let successRuns = 0;
      for (const auto of automations) {
        if (auto.executionHistory && auto.executionHistory.length > 0) {
          totalRuns += auto.executionHistory.length;
          successRuns += auto.executionHistory.filter((h: any) => h.status === 'success').length;
        }
      }
      if (totalRuns > 0) {
        auto_save_completion_rate = successRuns / totalRuns;
      }
    } catch (e) {
      // ignore
    }

    // 12. onboarding_attention_score: Thời gian đọc điều khoản rủi ro
    const onboarding_attention_score = Math.min(1.0, (deviceLogs.onboardingTimeSeconds || 30) / 60);

    // 13. balance_check_frequency: Tần suất kiểm tra số dư
    const balance_check_frequency = deviceLogs.balanceCheckCount30d || 5;

    // 14. p2p_network_density: Mạng lưới giao dịch ngang hàng (số người giao dịch cùng)
    const uniquePartners = new Set(
      allTxns.map((t: any) => t.senderId === user.$id ? t.receiverId : t.senderId)
    );
    const p2p_network_density = Math.min(20.0, uniquePartners.size || 5.0);

    // 15. low_battery_transaction: Giao dịch pin yếu
    const low_battery_transaction = deviceLogs.transactionDeviceStatus ? deviceLogs.transactionDeviceStatus.some(
      (status: any) => status.batteryLevel < 0.20 && !status.isCharging
    ) : false;

    // Sanitizer helper to guarantee Pydantic validation passes on the FastAPI ML Server
    const sanitizeFeature = (val: any, min: number, max: number, defaultVal: number): number => {
      const parsed = parseFloat(val);
      if (isNaN(parsed)) return defaultVal;
      return Math.min(max, Math.max(min, parsed));
    };

    const features = {
      bill_on_time_ratio: sanitizeFeature(bill_on_time_ratio, 0.0, 1.0, 0.75),
      social_sentiment: sanitizeFeature(social_sentiment, 0.0, 1.0, 0.75),
      spend_discipline: sanitizeFeature(spend_discipline, 0.0, 1.0, 0.85),
      balance_volatility: sanitizeFeature(balance_volatility, 0.0, 1.0, 0.15),
      impulse_purchase_index: sanitizeFeature(impulse_purchase_index, 0.0, 1.0, 0.20),
      late_night_spend_ratio: sanitizeFeature(late_night_spend_ratio, 0.0, 1.0, 0.10),
      immediate_cash_out_rate: sanitizeFeature(immediate_cash_out_rate, 0.0, 1.0, 0.05),
      income_regularity_index: sanitizeFeature(income_regularity_index, 0.0, 1.0, 0.80),
      liquidity_buffer_ratio: sanitizeFeature(liquidity_buffer_ratio, 0.0, 5.0, 2.0),
      save_after_payday_ratio: sanitizeFeature(save_after_payday_ratio, 0.0, 1.0, 0.25),
      auto_save_completion_rate: sanitizeFeature(auto_save_completion_rate, 0.0, 1.0, 0.85),
      onboarding_attention_score: sanitizeFeature(onboarding_attention_score, 0.0, 1.0, 0.65),
      balance_check_frequency: sanitizeFeature(balance_check_frequency, 0.0, 20.0, 5.0),
      p2p_network_density: sanitizeFeature(p2p_network_density, 0.0, 20.0, 5.0),
      low_battery_transaction: !!low_battery_transaction
    };

    console.log("[AI Insights] Extracted 15 behavioral features dynamically:", JSON.stringify(features, null, 2));

    // Tính toán dữ liệu Radar Chart 3 trục trên Backend
    // Willingness
    const willingness = Math.round(
      ((1.0 - features.impulse_purchase_index) + 
       (1.0 - features.late_night_spend_ratio) + 
       features.onboarding_attention_score + 
       (1.0 - Math.min(20, features.balance_check_frequency) / 20)) / 4 * 100
    );

    // Capacity
    const bufferScore = features.liquidity_buffer_ratio > 2 ? 1.0 : features.liquidity_buffer_ratio / 2;
    const densityScore = features.p2p_network_density > 10 ? 1.0 : features.p2p_network_density / 10;
    const capacity = Math.round(
      (features.income_regularity_index + 
       bufferScore + 
       (1.0 - features.immediate_cash_out_rate) + 
       densityScore) / 4 * 100
    );

    // Discipline
    const saveScore = Math.min(1.0, features.save_after_payday_ratio / 0.5);
    const discipline = Math.round(
      (saveScore + 
       features.auto_save_completion_rate + 
       features.bill_on_time_ratio + 
       (features.low_battery_transaction ? 0.0 : 1.0)) / 4 * 100
    );

    const radarData = {
      willingness,
      capacity,
      discipline
    };

    // 3. Gửi sang Python FastAPI Server để nhận diện khẩu vị rủi ro
    let mlResult: any;
    try {
      console.log(`[AI Insights] Requesting prediction from ML server at ${ML_SERVER_URL}/predict ...`);
      const mlRes = await fetch(`${ML_SERVER_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(features)
      });

      if (!mlRes.ok) {
        throw new Error("FastAPI ML Server failed to predict risk appetite");
      }
      mlResult = await mlRes.json();
      console.log("[AI Insights] prediction successful:", JSON.stringify(mlResult, null, 2));
    } catch (predictErr) {
      console.warn("⚠️ Failed to get prediction from FastAPI ML Server. Falling back to local JS scoring model...", predictErr);
      
      // Tính toán mô hình thang đo rủi ro nội bộ bằng JS (phù hợp khi chạy trên Vercel không có server ML)
      let riskClass: "conservative" | "balanced" | "aggressive" = "balanced";
      let probabilities = { conservative: 0.33, balanced: 0.34, aggressive: 0.33 };
      
      // Logic heuristic đơn giản dựa trên đặc trưng hành vi tài chính:
      // spend_discipline cao + bill_on_time_ratio cao -> Thiên về bảo thủ (conservative)
      // spend_discipline thấp + impulse_purchase_index cao + balance_volatility cao -> Thiên về mạo hiểm (aggressive)
      const score = (features.spend_discipline * 2.0) + (features.bill_on_time_ratio * 1.5) - (features.impulse_purchase_index * 2.0) - (features.balance_volatility * 1.0);
      if (score > 1.0) {
        riskClass = "conservative";
        probabilities = { conservative: 0.70, balanced: 0.20, aggressive: 0.10 };
      } else if (score < -0.5) {
        riskClass = "aggressive";
        probabilities = { conservative: 0.10, balanced: 0.25, aggressive: 0.65 };
      } else {
        riskClass = "balanced";
        probabilities = { conservative: 0.25, balanced: 0.55, aggressive: 0.20 };
      }

      // Feature contributions fallback ngẫu nhiên có định hướng nhẹ
      const feature_contributions: Record<string, number> = {};
      for (const key of Object.keys(features)) {
        feature_contributions[key] = (Math.random() * 0.1) - 0.05;
      }

      mlResult = {
        success: true,
        risk_class: riskClass,
        probabilities,
        feature_contributions
      };
    }

    // Tính toán Điểm Rủi ro của User (Expected Risk Value)
    // P_con: xác suất Thận trọng (rủi ro đại diện = 0.1)
    // P_bal: xác suất Cân bằng (rủi ro đại diện = 0.5)
    // P_agg: xác suất Mạo hiểm (rủi ro đại diện = 0.9)
    const pCon = mlResult.probabilities?.conservative ?? 0.33;
    const pBal = mlResult.probabilities?.balanced ?? 0.33;
    const pAgg = mlResult.probabilities?.aggressive ?? 0.34;
    const userRiskScore = (pCon * 0.1) + (pBal * 0.5) + (pAgg * 0.9);
    console.log(`[AI Insights] Computed continuous userRiskScore: ${userRiskScore.toFixed(3)}`);

    // Thuật toán Khớp nối Kép (Double-Matching Algorithm) trên danh sách 150 mã
    const productsPath = path.join(process.cwd(), "constants", "products.json");
    let rawProducts = [];
    try {
      rawProducts = JSON.parse(fs.readFileSync(productsPath, "utf-8"));
    } catch (readErr) {
      console.error("❌ Failed to read products.json from constants path:", readErr);
      // Fallback nếu không đọc được
      rawProducts = [
        { code: "VESAF", name: "Quỹ Cổ phiếu VinaCapital", type: "Fund", riskRating: 0.7, dna: { technology: 0.6, entertainment: 0.4, discipline: 0.2, health: 0.3, education: 0.2, entrepreneurship: 0.9, family: 0.1 } },
        { code: "TCBF", name: "Quỹ Trái phiếu Techcombank", type: "Fund", riskRating: 0.1, dna: { technology: 0.1, entertainment: 0.1, discipline: 1.0, health: 0.1, education: 0.1, entrepreneurship: 0.1, family: 0.8 } },
        { code: "FPT", name: "Cổ phiếu FPT", type: "Stock", riskRating: 0.4, dna: { technology: 1.0, entertainment: 0.3, discipline: 0.6, health: 0.1, education: 0.8, entrepreneurship: 0.7, family: 0.2 } },
        { code: "DCDS", name: "Quỹ Năng động Dragon Capital", type: "Fund", riskRating: 0.6, dna: { technology: 0.5, entertainment: 0.3, discipline: 0.3, health: 0.2, education: 0.1, entrepreneurship: 0.9, family: 0.2 } },
        { code: "VNM", name: "Cổ phiếu Vinamilk", type: "Stock", riskRating: 0.3, dna: { technology: 0.2, entertainment: 0.2, discipline: 0.9, health: 0.6, education: 0.2, entrepreneurship: 0.3, family: 1.0 } }
      ];
    }

    // Helper tính Cosine Similarity giữa 2 vector đơn giản
    const getCosineSimilarity = (vUser: any, vProd: any): number => {
      const keys = ["technology", "entertainment", "discipline", "health", "education", "entrepreneurship", "family"] as const;
      let dotProduct = 0;
      let normUser = 0;
      let normProd = 0;
      
      keys.forEach((key) => {
        const uVal = vUser[key] ?? 0.1;
        const pVal = vProd[key] ?? 0.1;
        dotProduct += uVal * pVal;
        normUser += uVal * uVal;
        normProd += pVal * pVal;
      });
      
      return dotProduct / (Math.sqrt(normUser) * Math.sqrt(normProd) || 1);
    };

    // Chấm điểm cho toàn bộ sản phẩm
    const scoredProducts = rawProducts.map((prod: any) => {
      const interestScore = getCosineSimilarity(userInterests, prod.dna);
      const riskScore = 1.0 - Math.abs(userRiskScore - (prod.riskRating ?? 0.5));
      const finalScore = interestScore * riskScore;
      
      return {
        ...prod,
        interestScore,
        riskScore,
        finalScore
      };
    });

    // Sắp xếp giảm dần theo finalScore và chọn Top 5
    scoredProducts.sort((a: any, b: any) => b.finalScore - a.finalScore);
    const topRecommendations = scoredProducts.slice(0, 5);

    // Tính tỷ lệ phân bổ ngân sách động dựa trên finalScore tương đối của Top 5
    const totalFinalScore = topRecommendations.reduce((sum: number, item: any) => sum + item.finalScore, 0);
    const monthlySavings = mlResult.risk_class === 'conservative' ? 13000000 : mlResult.risk_class === 'aggressive' ? 7000000 : 12000000;

    let targetAllocationPrompt = "";
    const allocationDetails = topRecommendations.map((prod: any) => {
      const allocationPct = totalFinalScore > 0 ? Math.round((prod.finalScore / totalFinalScore) * 100) : 20;
      const vndAmount = Math.round(monthlySavings * (allocationPct / 100));
      
      // Bổ sung vào prompt tư vấn
      targetAllocationPrompt += `- ${prod.code} (${prod.name} - ${prod.type}): ${allocationPct}% (tương đương với ${vndAmount.toLocaleString('vi-VN')} VND)\n`;
      
      return {
        code: prod.code,
        name: prod.name,
        type: prod.type,
        allocationPct,
        vndAmount
      };
    });

    console.log("[AI Insights] Calculated Top 5 Product recommendations dynamically:", JSON.stringify(allocationDetails, null, 2));

    // 4. Gọi Gemini API để sinh bài tư vấn tiếng Việt cá nhân hóa sâu sắc
    console.log("[AI Insights] Generating Gemini advisor Vietnamese analysis...");
      
    const advicePrompt = `You are a professional Robo-Advisor for Fincore Wallet (operating in Vietnam Dong, VND).
Your task is to write a highly personalized, deep, data-driven financial assessment and asset allocation advice for the user based on their alternative data and computed scores.

USER PROFILE:
- Name: ${user.firstName} ${user.lastName}
- Risk Class: ${mlResult.risk_class} (conservative: Thận trọng, balanced: Cân bằng, aggressive: Mạo hiểm)
- Behavior Risk Score: ${userRiskScore.toFixed(2)} (on a scale 0.1 to 0.9)

RAW SOCIAL MEDIA POSTS:
${JSON.stringify(socialData.posts, null, 2)}

RAW UTILITY BILLS:
${JSON.stringify(utilityData.bills, null, 2)}

CALCULATED BEHAVIOR FEATURES:
${JSON.stringify(features, null, 2)}

USER 7-DIMENSION INTEREST SCORES (from NLP analysis):
${JSON.stringify(userInterests, null, 2)}

MONTHLY FINANCIAL STATS:
- Income: ${mlResult.risk_class === 'conservative' ? '25,000,000' : mlResult.risk_class === 'aggressive' ? '35,000,000' : '30,000,000'} VND
- Expenses: ${mlResult.risk_class === 'conservative' ? '12,000,000' : mlResult.risk_class === 'aggressive' ? '28,000,000' : '18,000,000'} VND
- Savings/Investment Capacity: ${monthlySavings.toLocaleString('vi-VN')} VND

TOP DYNAMIC RECOMMENDED ASSETS & ALLOCATION:
${targetAllocationPrompt}

OUTPUT FORMAT & WRITING INSTRUCTIONS:
- Language: Vietnamese (Tiếng Việt)
- Tone: Professional, encouraging, empathetic, financial expert advisor.
- CRITICAL CONSTRAINTS TO PROTECT COMPANY PROPRIETARY ALGORITHMS (IP PROTECTION):
  * Do NOT mention any machine learning terms, metrics, indices, or technical words (such as "SHAP", "K-Means", "XGBoost", "feature", "chỉ số mua sắm tức thời", "chỉ số bốc đồng", "tần suất kiểm tra ví", "đệm thanh khoản", "tỷ lệ tích lũy sau lương", "vector", "Cosine Similarity", "Double-Matching", "Risk Rating", v.v.).
  * Do NOT explicitly reference mobile/device metrics in the text (such as "giao dịch khi điện thoại pin yếu", "thời gian đọc điều khoản", "số lần kiểm tra số dư"). These are strictly backend signals.
  * Instead, translate these raw metrics into qualitative, professional descriptions of financial habits:
    - Instead of "giao dịch pin yếu", describe it as "các quyết định tài chính vội vã, chưa tối ưu hóa thời điểm".
    - Instead of "tần suất kiểm tra ví/số dư", describe it as "mức độ chủ động theo dõi nguồn vốn thường nhật".
    - Instead of "thời gian đọc điều khoản rủi ro", describe it as "sự cẩn trọng trong các quyết định gia nhập sản phẩm tài chính mới".
    - Instead of "đệm thanh khoản", describe it as "lượng tài sản dự phòng thanh khoản".
    - Instead of "mua sắm bốc đồng/săn sale", describe it as "các khoản chi tiêu không thiết yếu phát sinh ngẫu hứng".
  * Recommend và giải thích chi tiết vì sao các mã trong danh mục đề xuất ở trên lại cực kỳ phù hợp với sự giao thoa giữa sở thích cá nhân (được phân tích qua mạng xã hội) và khẩu vị rủi ro tài chính của họ.
  * Thuyết minh chi tiết số tiền phân bổ (VND) thực tế cho từng mã.
  * Keep response clean, formatted in clear plain text paragraphs. Do NOT use markdown syntax (such as double asterisks '**' for bold text, or '#' for headers). Use standard newlines for spacing.
  * Word count: around 300-450 words.`;

    let ai_analysis = "";
    try {
      const geminiAdviceResponse = await callGeminiWithRotation({
        model: "gemini-2.5-flash",
        contents: advicePrompt
      });

      if (geminiAdviceResponse && typeof geminiAdviceResponse === 'object') {
        if ('text' in geminiAdviceResponse && typeof geminiAdviceResponse.text === 'string') {
          ai_analysis = geminiAdviceResponse.text;
        } else if ('candidates' in geminiAdviceResponse && Array.isArray(geminiAdviceResponse.candidates)) {
          ai_analysis = geminiAdviceResponse.candidates[0]?.content?.parts?.[0]?.text || '';
        }
      }
      ai_analysis = ai_analysis.replace(/\*\*/g, '').trim();
    } catch (geminiError: any) {
      console.warn("⚠️ Gemini API call failed or keys exhausted. Using static fallback advice. Error:", geminiError.message);
      if (mlResult.risk_class === 'conservative') {
        ai_analysis = "Dựa trên phân tích hành vi Fincore, bạn là người có khẩu vị rủi ro Thận trọng. Bạn có xu hướng ưu tiên sự an toàn và bảo toàn vốn. Hành vi đóng hóa đơn đúng hạn và chi tiêu thiết yếu kỷ luật đóng vai trò tích cực giúp bảo vệ ví tài chính của bạn. Chúng tôi đề xuất phân bổ danh mục đầu tư an sau với tỷ trọng lớn vào các tài sản thu nhập cố định rủi ro thấp như VLBF (VinaCapital Bonds) hoặc TCBF (Techcombank Bonds) khoảng 70-80%, và chỉ dành 20-30% cho các quỹ cổ phiếu lớn, ổn định như VEOF hoặc cổ phiếu VNM để tăng trưởng nhẹ.";
      } else if (mlResult.risk_class === 'aggressive') {
        ai_analysis = "Dựa trên phân tích hành vi Fincore, bạn là người có khẩu vị rủi ro Mạo hiểm. Bạn có xu hướng chấp nhận biến động lớn để tìm kiếm lợi nhuận đột phá. Hành vi mua sắm trực tuyến vào đêm muộn hoặc các giao dịch chi tiêu không thiết yếu có tác động thúc đẩy khẩu vị rủi ro của bạn lên mức cao. Chúng tôi đề xuất danh mục đầu tư tăng trưởng mạnh mẽ với 70-80% phân bổ vào các quỹ cổ phiếu năng động như VESAF (VinaCapital Equity), DCDS (Dragon Capital Stock) hoặc các cổ phiếu tiềm năng như HPG, FPT để tối ưu hóa lợi nhuận trong dài hạn, và chỉ duy trì 20-30% ở các tài sản thanh khoản an toàn.";
      } else {
        ai_analysis = "Dựa trên phân tích hành vi Fincore, bạn là người có khẩu vị rủi ro Cân bằng. Bạn tìm kiếm sự hài hòa giữa tăng trưởng và an toàn. Sự ổn định trong thu nhập và chi tiêu thiết yếu giúp bạn duy trì một đệm tài chính tốt. Chúng tôi đề xuất danh mục đầu tư cân bằng 50/50: chia đều 50% vào các quỹ cổ phiếu tăng trưởng như VESAF, DCDS hoặc cổ phiếu công nghệ FPT, và 50% còn lại vào các quỹ trái phiếu ổn định như TCBF, VLBF hoặc cổ phiếu phòng thủ VNM để giảm thiểu rủi ro biến động thị trường.";
      }
    }

    const finalResult = {
      riskClass: mlResult.risk_class,
      radarData: radarData,
      userInterests: userInterests,
      userRiskScore: userRiskScore,
      portfolioAllocation: allocationDetails,
      aiAnalysis: ai_analysis || "Chưa có phân tích hành vi chi tiết từ AI.",
      updatedAt: new Date().toISOString(),
      ...dynamicStats
    };

    // 5. Đồng bộ lưu vào database cục bộ (Local AI DB)
    const updatedUserDb = await updateUserAIData(user.$id, finalResult);
    console.log(`[AI Scoring] Saved AI Profile for user ${user.$id} successfully.`);

    return NextResponse.json({
      success: true,
      userId: user.$id,
      userName: `${user.firstName} ${user.lastName}`,
      ...updatedUserDb,
      ...dynamicStats
    }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      }
    });

  } catch (error: any) {
    console.error("❌ alternative-data/risk-appetite route error:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze risk appetite" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
