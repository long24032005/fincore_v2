import fs from "fs";
import path from "path";

// Đường dẫn file cơ sở dữ liệu cục bộ
const DB_PATH = path.join(process.cwd(), "fincore_local_ai_db.json");

// Khởi tạo file nếu chưa tồn tại
const initDb = () => {
  if (!fs.existsSync(DB_PATH)) {
    const defaultData = {
      users: {},
      automations: {}
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), "utf-8");
  }
};

// Đọc dữ liệu từ file
const readDb = () => {
  initDb();
  try {
    const rawData = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Error reading local AI DB:", error);
    return { users: {}, automations: {} };
  }
};

// Ghi dữ liệu vào file
const writeDb = (data: any) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
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
  const db = readDb();
  return db.automations[userId] || [];
};

// 4. Thêm mới một automation cho user
export const addUserAutomation = async (
  userId: string,
  automation: { actionType: string; amount: number; destinationFund: string; cronExpression: string }
) => {
  const db = readDb();
  if (!db.automations[userId]) {
    db.automations[userId] = [];
  }
  
  const newAutomation = {
    id: `auto_${Date.now()}`,
    userId,
    ...automation,
    isActive: true,
    lastRun: null
  };
  
  db.automations[userId].push(newAutomation);
  writeDb(db);
  return newAutomation;
};

// 5. Cập nhật trạng thái bật/tắt (isActive) hoặc các trường khác của automation
export const updateUserAutomation = async (
  userId: string,
  automationId: string,
  updates: { isActive?: boolean; lastRun?: string }
) => {
  const db = readDb();
  const userAutomations = db.automations[userId] || [];
  const index = userAutomations.findIndex((item: any) => item.id === automationId);
  
  if (index !== -1) {
    db.automations[userId][index] = {
      ...db.automations[userId][index],
      ...updates
    };
    writeDb(db);
    return db.automations[userId][index];
  }
  
  return null;
};

// 6. Xóa một automation
export const deleteUserAutomation = async (userId: string, automationId: string) => {
  const db = readDb();
  const userAutomations = db.automations[userId] || [];
  const filtered = userAutomations.filter((item: any) => item.id !== automationId);
  
  db.automations[userId] = filtered;
  writeDb(db);
  return { success: true };
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
  const db = readDb();
  if (!db.automations) db.automations = {};
  db.automations[userId] = [];
  const now = new Date();
  
  if (scenario === 'conservative') {
    // 12 runs, 12 success -> auto_save_completion_rate = 1.0 (mean: 0.95)
    const history = Array.from({ length: 12 }, (_, i) => ({
      timestamp: new Date(now.getTime() - (12 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'success',
      amount: 1000000
    }));
    db.automations[userId].push({
      id: `auto_tcbf_${userId}`,
      actionType: 'Transfer',
      amount: 1000000,
      destinationFund: 'TCBF',
      cronExpression: '0 0 * * 1',
      isActive: true,
      lastRun: now.toISOString(),
      executionHistory: history
    });
  } else if (scenario === 'aggressive') {
    // 10 runs: 6 failed, 4 success -> auto_save_completion_rate = 0.40
    const history = Array.from({ length: 10 }, (_, i) => {
      const isFailed = [0, 2, 3, 5, 7, 9].includes(i);
      return {
        timestamp: new Date(now.getTime() - (10 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: isFailed ? 'failed' : 'success',
        failureReason: isFailed ? 'Insufficient balance' : undefined,
        amount: 2000000
      };
    });
    db.automations[userId].push({
      id: `auto_vesaf_${userId}`,
      actionType: 'Transfer',
      amount: 2000000,
      destinationFund: 'VESAF',
      cronExpression: '0 0 * * 1',
      isActive: true,
      lastRun: now.toISOString(),
      executionHistory: history
    });
  } else {
    // 12 runs: 3 failed, 9 success -> auto_save_completion_rate = 0.75
    const history = Array.from({ length: 12 }, (_, i) => {
      const isFailed = [2, 5, 8].includes(i);
      return {
        timestamp: new Date(now.getTime() - (12 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: isFailed ? 'failed' : 'success',
        failureReason: isFailed ? 'Insufficient balance' : undefined,
        amount: 1500000
      };
    });
    db.automations[userId].push({
      id: `auto_dcds_${userId}`,
      actionType: 'Transfer',
      amount: 1500000,
      destinationFund: 'DCDS',
      cronExpression: '0 0 * * 1',
      isActive: true,
      lastRun: now.toISOString(),
      executionHistory: history
    });
  }
  writeDb(db);
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
