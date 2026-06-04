"use server";

import fs from "fs";
import path from "path";
import { createAdminClient } from "../appwrite";
import { Query, ID } from "node-appwrite";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
} = process.env;

// Đường dẫn file cơ sở dữ liệu gốc và đích (hỗ trợ môi trường Read-Only của Vercel)
const SRC_DB_PATH = path.join(process.cwd(), "fincore_local_ai_db.json");
const DEST_DB_PATH = process.env.VERCEL ? "/tmp/fincore_local_ai_db.json" : SRC_DB_PATH;

// Khởi tạo file nếu chưa tồn tại
const initDb = () => {
  if (process.env.VERCEL) {
    if (!fs.existsSync(DEST_DB_PATH)) {
      try {
        if (fs.existsSync(SRC_DB_PATH)) {
          fs.copyFileSync(SRC_DB_PATH, DEST_DB_PATH);
          console.log("✅ Copied local AI DB to /tmp for write access");
        } else {
          const defaultData = { users: {}, automations: {} };
          fs.writeFileSync(DEST_DB_PATH, JSON.stringify(defaultData, null, 2), "utf-8");
        }
      } catch (err) {
        console.error("Failed to initialize local AI DB in /tmp:", err);
      }
    }
  } else {
    if (!fs.existsSync(SRC_DB_PATH)) {
      const defaultData = { users: {}, automations: {} };
      fs.writeFileSync(SRC_DB_PATH, JSON.stringify(defaultData, null, 2), "utf-8");
    }
  }
};

// Đọc dữ liệu từ file
const readDb = () => {
  initDb();
  try {
    const rawData = fs.readFileSync(DEST_DB_PATH, "utf-8");
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Error reading local AI DB:", error);
    return { users: {}, automations: {} };
  }
};

// Ghi dữ liệu vào file
const writeDb = (data: any) => {
  try {
    fs.writeFileSync(DEST_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing local AI DB:", error);
  }
};

// 1. Lấy dữ liệu AI của user (Risk Appetite, Features, Contributions)
export const getUserAIData = async (userId: string) => {
  const db = readDb();
  
  if (!db.users[userId]) {
    return {
      riskAppetiteScore: 50,
      riskClass: "balanced",
      features: {
        bill_on_time_ratio: 0.8,
        social_sentiment: 0.7,
        spend_discipline: 0.65,
        balance_volatility: 0.4,
        impulse_purchase_index: 0.35,
        late_night_spend_ratio: 0.15,
        immediate_cash_out_rate: 0.2,
        income_regularity_index: 0.75,
        liquidity_buffer_ratio: 2.0,
        save_after_payday_ratio: 0.2,
        auto_save_completion_rate: 0.75,
        onboarding_attention_score: 0.6,
        balance_check_frequency: 5,
        p2p_network_density: 6,
        low_battery_transaction: false
      },
      featureContributions: {}
    };
  }
  
  return db.users[userId];
};

// 2. Cập nhật dữ liệu AI của user
export const updateUserAIData = async (
  userId: string, 
  data: any
) => {
  const db = readDb();
  const existing = db.users[userId] || {};
  const history = existing.history || [];
  
  // Chỉ lưu lịch sử khi có nội dung phân tích mới
  if (data.aiAnalysis) {
    history.push({
      timestamp: data.updatedAt || new Date().toISOString(),
      riskClass: data.riskClass,
      aiAnalysis: data.aiAnalysis
    });
  }

  db.users[userId] = {
    ...data,
    history
  };
  writeDb(db);
  return db.users[userId];
};

// 3. Lấy danh sách automations của user
export const getUserAutomations = async (userId: string) => {
  try {
    const { database } = await createAdminClient();
    const result = await database.listDocuments(
      DATABASE_ID!,
      "automations",
      [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt')
      ]
    );
    return result.documents.map((doc: any) => ({
      id: doc.$id,
      userId: doc.userId,
      actionType: doc.actionType,
      amount: doc.amount,
      destinationFund: doc.destinationFund,
      cronExpression: doc.cronExpression,
      isActive: doc.isActive,
      lastRun: doc.lastRun,
      executionHistory: doc.executionHistory ? JSON.parse(doc.executionHistory) : []
    }));
  } catch (error) {
    console.error('Error fetching automations from Appwrite:', error);
    return [];
  }
};

// 4. Thêm mới một automation cho user
export const addUserAutomation = async (
  userId: string,
  automation: { actionType: string; amount: number; destinationFund: string; cronExpression: string }
) => {
  try {
    const { database } = await createAdminClient();
    const doc = await database.createDocument(
      DATABASE_ID!,
      "automations",
      ID.unique(),
      {
        userId,
        actionType: automation.actionType,
        amount: automation.amount,
        destinationFund: automation.destinationFund,
        cronExpression: automation.cronExpression,
        isActive: true,
        lastRun: null,
        executionHistory: "[]"
      }
    );
    return {
      id: doc.$id,
      userId: doc.userId,
      actionType: doc.actionType,
      amount: doc.amount,
      destinationFund: doc.destinationFund,
      cronExpression: doc.cronExpression,
      isActive: doc.isActive,
      lastRun: doc.lastRun,
      executionHistory: []
    };
  } catch (error) {
    console.error('Error creating automation in Appwrite:', error);
    throw error;
  }
};

// 5. Cập nhật trạng thái bật/tắt (isActive) hoặc các trường khác của automation
export const updateUserAutomation = async (
  userId: string,
  automationId: string,
  updates: { isActive?: boolean; lastRun?: string }
) => {
  try {
    const { database } = await createAdminClient();
    const updatePayload: any = {};
    if (updates.isActive !== undefined) updatePayload.isActive = updates.isActive;
    if (updates.lastRun !== undefined) updatePayload.lastRun = updates.lastRun;

    const doc = await database.updateDocument(
      DATABASE_ID!,
      "automations",
      automationId,
      updatePayload
    );

    return {
      id: doc.$id,
      userId: doc.userId,
      actionType: doc.actionType,
      amount: doc.amount,
      destinationFund: doc.destinationFund,
      cronExpression: doc.cronExpression,
      isActive: doc.isActive,
      lastRun: doc.lastRun,
      executionHistory: doc.executionHistory ? JSON.parse(doc.executionHistory) : []
    };
  } catch (error) {
    console.error('Error updating automation in Appwrite:', error);
    return null;
  }
};

// 6. Xóa một automation
export const deleteUserAutomation = async (userId: string, automationId: string) => {
  try {
    const { database } = await createAdminClient();
    await database.deleteDocument(
      DATABASE_ID!,
      "automations",
      automationId
    );
    return { success: true };
  } catch (error) {
    console.error('Error deleting automation in Appwrite:', error);
    return { success: false };
  }
};

// 7. Lấy nhật ký thiết bị và hoạt động của người dùng
export const getUserDeviceActivityLogs = async (userId: string) => {
  const db = readDb();
  if (!db.deviceActivityLogs) db.deviceActivityLogs = {};
  return db.deviceActivityLogs[userId] || null;
};

// 8. Lưu nhật ký thiết bị và hoạt động
export const updateUserDeviceActivityLogs = async (userId: string, data: any) => {
  const db = readDb();
  if (!db.deviceActivityLogs) db.deviceActivityLogs = {};
  db.deviceActivityLogs[userId] = data;
  writeDb(db);
  return data;
};

// 9. Giả lập dữ liệu chạy Autopilot phục vụ demo (Chỉ gọi trong pha Seeding)
export const seedUserAutomations = async (userId: string, scenario: 'conservative' | 'aggressive' | 'balanced') => {
  try {
    const { database } = await createAdminClient();
    
    // Clean up existing seeded automations for this user first
    try {
      const existing = await database.listDocuments(
        DATABASE_ID!,
        "automations",
        [Query.equal('userId', userId)]
      );
      for (const doc of existing.documents) {
        await database.deleteDocument(databaseId!, "automations", doc.$id);
      }
    } catch (cleanErr) {
      console.error("Clean up seeded automations error:", cleanErr);
    }

    const now = new Date();
    
    if (scenario === 'conservative') {
      const history = Array.from({ length: 12 }, (_, i) => ({
        timestamp: new Date(now.getTime() - (12 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'success',
        amount: 1000000
      }));
      await database.createDocument(
        DATABASE_ID!,
        "automations",
        `auto_tcbf_${userId}`,
        {
          userId,
          actionType: 'Transfer',
          amount: 1000000,
          destinationFund: 'TCBF',
          cronExpression: '0 0 * * 1',
          isActive: true,
          lastRun: now.toISOString(),
          executionHistory: JSON.stringify(history)
        }
      );
    } else if (scenario === 'aggressive') {
      const history = Array.from({ length: 10 }, (_, i) => {
        const isFailed = [0, 2, 3, 5, 7, 9].includes(i);
        return {
          timestamp: new Date(now.getTime() - (10 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: isFailed ? 'failed' : 'success',
          failureReason: isFailed ? 'Insufficient balance' : undefined,
          amount: 2000000
        };
      });
      await database.createDocument(
        DATABASE_ID!,
        "automations",
        `auto_vesaf_${userId}`,
        {
          userId,
          actionType: 'Transfer',
          amount: 2000000,
          destinationFund: 'VESAF',
          cronExpression: '0 0 * * 1',
          isActive: true,
          lastRun: now.toISOString(),
          executionHistory: JSON.stringify(history)
        }
      );
    } else {
      const history = Array.from({ length: 12 }, (_, i) => {
        const isFailed = [2, 5, 8].includes(i);
        return {
          timestamp: new Date(now.getTime() - (12 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: isFailed ? 'failed' : 'success',
          failureReason: isFailed ? 'Insufficient balance' : undefined,
          amount: 1500000
        };
      });
      await database.createDocument(
        DATABASE_ID!,
        "automations",
        `auto_dcds_${userId}`,
        {
          userId,
          actionType: 'Transfer',
          amount: 1500000,
          destinationFund: 'DCDS',
          cronExpression: '0 0 * * 1',
          isActive: true,
          lastRun: now.toISOString(),
          executionHistory: JSON.stringify(history)
        }
      );
    }
  } catch (error) {
    console.error('Error seeding automations in Appwrite:', error);
  }
};

// 10. Giả lập dữ liệu nhật ký thiết bị phục vụ demo (Chỉ gọi trong pha Seeding)
export const seedUserDeviceActivity = async (userId: string, scenario: 'conservative' | 'aggressive' | 'balanced', transactions: any[]) => {
  const db = readDb();
  if (!db.deviceActivityLogs) db.deviceActivityLogs = {};

  let onboardingTime = 36;
  let balanceChecks = 5;
  let txnStatus: any[] = [];

  if (scenario === 'conservative') {
    onboardingTime = 51; // 51 / 60 = 0.85 (onboarding_attention_score)
    balanceChecks = 2;   // balance_check_frequency
    txnStatus = transactions.map(t => ({
      transactionId: t.$id,
      batteryLevel: 0.85,
      isCharging: true
    }));
  } else if (scenario === 'aggressive') {
    onboardingTime = 15; // 15 / 60 = 0.25 (onboarding_attention_score)
    balanceChecks = 12;  // balance_check_frequency
    txnStatus = transactions.map((t, index) => ({
      transactionId: t.$id,
      batteryLevel: index % 3 === 0 ? 0.12 : 0.60,
      isCharging: index % 3 === 0 ? false : true
    }));
  } else {
    onboardingTime = 36; // 36 / 60 = 0.60 (onboarding_attention_score)
    balanceChecks = 5;   // balance_check_frequency
    txnStatus = transactions.map(t => ({
      transactionId: t.$id,
      batteryLevel: 0.70,
      isCharging: false
    }));
  }

  db.deviceActivityLogs[userId] = {
    onboardingTimeSeconds: onboardingTime,
    balanceCheckCount30d: balanceChecks,
    transactionDeviceStatus: txnStatus
  };
  writeDb(db);
};

// 11. Tăng tần suất kiểm tra số dư của người dùng
export const incrementBalanceCheckCount = async (userId: string) => {
  const db = readDb();
  if (!db.deviceActivityLogs) {
    db.deviceActivityLogs = {};
  }
  if (!db.deviceActivityLogs[userId]) {
    db.deviceActivityLogs[userId] = {
      onboardingTimeSeconds: 30,
      balanceCheckCount30d: 5,
      transactionDeviceStatus: []
    };
  }
  db.deviceActivityLogs[userId].balanceCheckCount30d = (db.deviceActivityLogs[userId].balanceCheckCount30d || 0) + 1;
  writeDb(db);
  console.log(`[AI Scoring DB] Incremented balance check count for user ${userId} to: ${db.deviceActivityLogs[userId].balanceCheckCount30d}`);
  return db.deviceActivityLogs[userId];
};

