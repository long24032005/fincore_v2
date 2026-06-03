'use client';

import React, { useState, useEffect } from 'react';
import { formatAmount } from '@/lib/utils';
import { ToggleLeft, ToggleRight, Trash2, ShieldAlert, Sparkles, RefreshCw, Layers, CheckCircle2, Bot, PieChart, TrendingUp } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Bar, Doughnut, Line, Radar } from "react-chartjs-2";

// Đăng ký các thành phần của ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Automation {
  id: string;
  actionType: string;
  amount: number;
  destinationFund: string;
  cronExpression: string;
  isActive: boolean;
  lastRun: string | null;
}

interface AIData {
  riskAppetiteScore: number;
  riskClass: string;
  features: {
    bill_on_time_ratio: number;
    social_sentiment: number;
    spend_discipline: number;
    balance_volatility: number;
    impulse_purchase_index: number;
    late_night_spend_ratio: number;
    immediate_cash_out_rate: number;
    income_regularity_index: number;
    liquidity_buffer_ratio: number;
    save_after_payday_ratio: number;
    auto_save_completion_rate: number;
    onboarding_attention_score: number;
    balance_check_frequency: number;
    p2p_network_density: number;
    low_battery_transaction: boolean;
  };
  featureContributions: Record<string, number>;
  aiAnalysis?: string;
  updatedAt: string;
  walletBalance?: number;
  realIncome?: number;
  realExpenses?: number;
  realSavings?: number;
  currentAllocation?: {
    cash: number;
    bonds: number;
    stocks: number;
  };
  userInterests?: Record<string, number>;
  userRiskScore?: number;
  portfolioAllocation?: Array<{
    code: string;
    name: string;
    type: string;
    allocationPct: number;
    vndAmount: number;
  }>;
  history?: Array<{
    timestamp: string;
    riskClass: string;
    aiAnalysis: string;
  }>;
}

// Helper functions for drawing SVG gauge arcs
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY - radius * Math.sin(angleInRadians)
  };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(x, y, radius, startAngle);
  const end = polarToCartesian(x, y, radius, endAngle);
  const largeArcFlag = startAngle - endAngle <= 180 ? "0" : "1";
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y
  ].join(" ");
};

const allProducts = [
  { code: "VESAF", name: "Quỹ cổ phiếu Tăng trưởng VinaCapital", type: "Quỹ Cổ phiếu", partner: "VinaCapital", desc: "Tập trung vào các cổ phiếu vừa và nhỏ tăng trưởng đột phá vượt trội.", color: "border-rose-500/20 bg-rose-500/5 text-rose-400" },
  { code: "DCDS", name: "Quỹ cổ phiếu Năng động Dragon Capital", type: "Quỹ Hỗn hợp", partner: "Dragon Capital", desc: "Tối ưu hóa lợi nhuận dài hạn từ danh mục cổ phiếu & trái phiếu chọn lọc.", color: "border-orange-500/20 bg-orange-500/5 text-orange-400" },
  { code: "VEOF", name: "Quỹ cổ phiếu Triển vọng VinaCapital", type: "Quỹ Cổ phiếu", partner: "VinaCapital", desc: "Đầu tư các doanh nghiệp hàng đầu có lợi thế cạnh tranh lớn và thanh khoản cao.", color: "border-red-500/20 bg-red-500/5 text-red-400" },
  { code: "SSISCA", name: "Quỹ cổ phiếu Bền vững SSI", type: "Quỹ Cổ phiếu", partner: "SSI AM", desc: "Đầu tư doanh nghiệp có năng lực cạnh tranh bền vững và quản trị tốt.", color: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" },
  { code: "TCBF", name: "Quỹ trái phiếu Techcom Bonds", type: "Quỹ Trái phiếu", partner: "Techcom Securities", desc: "Quỹ đầu tư trái phiếu doanh nghiệp quy mô lớn, lợi nhuận bền vững ổn định.", color: "border-cyan-500/20 bg-cyan-500/5 text-cyan-400" },
  { code: "VLBF", name: "Quỹ trái phiếu Bảo thịnh VinaCapital", type: "Quỹ Trái phiếu", partner: "VinaCapital", desc: "Đầu tư các tài sản có thu nhập cố định và trái phiếu chất lượng tín dụng cao.", color: "border-blue-500/20 bg-blue-500/5 text-blue-400" },
  { code: "SSIBF", name: "Quỹ trái phiếu SSI Bond Fund", type: "Quỹ Trái phiếu", partner: "SSI AM", desc: "Tối ưu hóa lợi nhuận ngắn và trung hạn từ danh mục công cụ nợ an toàn.", color: "border-indigo-500/20 bg-indigo-500/5 text-indigo-400" },
];

export default function AiInsights() {
  const [aiData, setAiData] = useState<AIData | null>(null);
  const [loadingScore, setLoadingScore] = useState(true);
  const [loadingAutos, setLoadingAutos] = useState(false);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [recalculating, setRecalculating] = useState(false);
  const [hasActivatedAnalysis, setHasActivatedAnalysis] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [aiAnalysisText, setAiAnalysisText] = useState("");
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);
  const [selectedFundForInvest, setSelectedFundForInvest] = useState("");
  const [investAmount, setInvestAmount] = useState(1000000);
  const [investSchedule, setInvestSchedule] = useState("0 0 1 * *");

  const fetchAIData = async () => {
    try {
      setLoadingScore(true);
      const res = await fetch('/api/v1/alternative-data/risk-appetite');
      if (res.ok) {
        const data = await res.json();
        setAiData(data);
        // Mặc định luôn để người dùng bắt đầu phân tích mới từ đầu khi tải trang
        setHasActivatedAnalysis(false);
        setAiAnalysisText("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingScore(false);
    }
  };

  const fetchAutomations = async () => {
    try {
      setLoadingAutos(true);
      const res = await fetch('/api/v1/automations');
      if (res.ok) {
        const data = await res.json();
        setAutomations(Array.isArray(data) ? data : (data.automations || []));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAutos(false);
    }
  };

  useEffect(() => {
    fetchAIData();
    fetchAutomations();
  }, []);

  const handleActivateAnalysis = async () => {
    try {
      setLoadingAnalysis(true);
      const toastId = toast.loading("AI đang quét các dữ liệu hành vi & DNA sản phẩm...");
      const res = await fetch('/api/v1/alternative-data/risk-appetite?runAnalysis=true', {
        method: 'GET'
      });
      if (res.ok) {
        const data = await res.json();
        setAiData(data);
        setAiAnalysisText(data.aiAnalysis || "");
        setHasActivatedAnalysis(true);
        const label = data.riskClass === 'conservative' ? 'Thận trọng' : data.riskClass === 'aggressive' ? 'Mạo hiểm' : 'Cân bằng';
        toast.success(`Cập nhật phân tích thành công! Nhãn: ${label}`, { id: toastId });
      } else {
        toast.error("Không thể thực hiện phân tích tài chính AI.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối khi phân tích.");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleToggleAuto = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/v1/automations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus })
      });

      if (res.ok) {
        toast.success(currentStatus ? "Đã tắt lệnh tự động" : "Đã bật lệnh tự động");
        setAutomations(prev => 
          prev.map(item => item.id === id ? { ...item, isActive: !currentStatus } : item)
        );
      } else {
        toast.error("Cập nhật trạng thái thất bại.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối mạng.");
    }
  };
  const handleDeleteAuto = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/automations?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success("Đã xóa lệnh thành công");
        setAutomations(prev => prev.filter(item => item.id !== id));
      } else {
        toast.error("Xóa lệnh thất bại.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 6. Xác nhận đầu tư nhanh qua Modal
  const handleConfirmInvest = async () => {
    if (investAmount <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ");
      return;
    }

    try {
      const fundCode = selectedFundForInvest.split(" ")[0];
      const res = await fetch('/api/v1/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'invest',
          amount: investAmount,
          destinationFund: fundCode,
          cronExpression: investSchedule
        })
      });

      if (res.ok) {
        toast.success(`Đã thiết lập lệnh đầu tư tự động ${formatAmount(investAmount)} vào ${fundCode}!`);
        setIsInvestModalOpen(false);
        fetchAutomations();
      } else {
        const data = await res.json();
        toast.error(data.error || "Không thể tạo lệnh đầu tư.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi mạng khi kết nối máy chủ.");
    }
  };

  // Xác định danh mục phân bổ dựa trên nhóm rủi ro và các đề xuất động của AI
  const getPortfolioDetails = () => {
    // Nếu có phân bổ danh mục động từ Backend API (Xử lý 150 mã)
    if (aiData?.portfolioAllocation && aiData.portfolioAllocation.length > 0) {
      const risk = aiData.riskClass || "balanced";
      const themeColor = risk === "conservative" 
        ? "text-blue-400 border-blue-500/20 bg-blue-500/5" 
        : risk === "aggressive"
        ? "text-rose-400 border-rose-500/20 bg-rose-500/5"
        : "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";

      const colorMap = [
        "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-indigo-500", "bg-violet-600", "bg-teal-500", "bg-emerald-500", "bg-blue-500"
      ];

      const allocation = aiData.portfolioAllocation.map((prod, idx) => {
        // Tìm thông tin mô tả chi tiết từ allProducts tĩnh nếu khớp code
        const staticMatch = allProducts.find(p => p.code === prod.code);
        return {
          name: `${prod.code} (${prod.name})`,
          pct: prod.allocationPct,
          color: staticMatch ? staticMatch.color.split(" ")[1] : colorMap[idx % colorMap.length],
          description: staticMatch ? staticMatch.desc : `Sản phẩm tài chính thuộc nhóm ${prod.type === 'Stock' ? 'Cổ phiếu' : prod.type === 'Bond' ? 'Trái phiếu' : 'Chứng chỉ Quỹ'} đề xuất tối ưu hóa danh mục cá nhân hóa.`
        };
      });

      return {
        name: `Danh mục Cá nhân hóa AI (Nhãn rủi ro: ${risk === 'conservative' ? 'Thận trọng' : risk === 'aggressive' ? 'Mạo hiểm' : 'Cân bằng'})`,
        color: themeColor,
        allocation,
        description: `Danh mục được thiết lập tự động bằng thuật toán khớp nối tối ưu hóa đa mục tiêu, cân đối giữa khẩu vị rủi ro đo bằng XGBoost (${(aiData.userRiskScore ?? 0.5).toFixed(2)}) và 7 chiều sở thích cá nhân.`
      };
    }

    const risk = aiData?.riskClass || "balanced";
    if (risk === "conservative") {
      return {
        name: "Danh mục Bảo toàn Vốn (Conservative)",
        color: "text-blue-400 border-blue-500/20 bg-blue-500/5",
        allocation: [
          { name: "VLBF (VinaCapital Bonds)", pct: 40, color: "bg-blue-500", description: "Quỹ đầu tư trái phiếu an toàn, ổn định với thanh khoản cao." },
          { name: "TCBF (Techcombank Bonds)", pct: 30, color: "bg-cyan-500", description: "Quỹ trái phiếu doanh nghiệp quy mô lớn, lợi nhuận bền vững." },
          { name: "SSIBF (SSI Bond Fund)", pct: 20, color: "bg-indigo-500", description: "Quỹ trái phiếu SSI, an toàn cao, tối ưu hóa lợi nhuận ngắn và trung hạn." },
          { name: "VNM (Cổ phiếu Vinamilk)", pct: 10, color: "bg-teal-500", description: "Cổ phiếu sữa quốc dân, chi trả cổ tức cao và rủi ro cực thấp." }
        ],
        description: "Tập trung bảo toàn dòng vốn an toàn, tối thiểu hóa biến động và duy trì thanh khoản tối đa cho ví."
      };
    } else if (risk === "aggressive") {
      return {
        name: "Danh mục Tăng trưởng Mạo hiểm (Aggressive)",
        color: "text-rose-400 border-rose-500/20 bg-rose-500/5",
        allocation: [
          { name: "VESAF (VinaCapital Equity)", pct: 30, color: "bg-rose-500", description: "Quỹ cổ phiếu tăng trưởng đột phá với lợi nhuận vượt trội." },
          { name: "VEOF (VinaCapital Opportunity)", pct: 20, color: "bg-red-500", description: "Quỹ cổ phiếu triển vọng VinaCapital, tối ưu hóa lợi nhuận từ doanh nghiệp lớn." },
          { name: "DCDS (Dragon Capital Stock)", pct: 30, color: "bg-orange-500", description: "Quỹ đầu tư cổ phiếu lâu đời nhất Việt Nam, tối ưu hóa lợi nhuận dài hạn." },
          { name: "HPG (Cổ phiếu Hòa Phát)", pct: 10, color: "bg-amber-600", description: "Cổ phiếu thép quốc dân, nhạy cảm chu kỳ kinh tế nhưng có tiềm năng bứt phá mạnh." },
          { name: "FPT (Cổ phiếu FPT)", pct: 10, color: "bg-violet-600", description: "Cổ phiếu công nghệ tăng trưởng mạnh mẽ, đón đầu xu thế chuyển đổi số." }
        ],
        description: "Ưu tiên tối đa hóa lợi nhuận dài hạn thông qua phân bổ toàn bộ vào thị trường cổ phiếu tăng trưởng cao."
      };
    } else {
      return {
        name: "Danh mục Tăng trưởng Cân bằng (Balanced)",
        color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
        allocation: [
          { name: "TCBF (Techcombank Bonds)", pct: 30, color: "bg-cyan-500", description: "Quỹ trái phiếu giúp duy trì sự ổn định và bảo toàn vốn." },
          { name: "SSIBF (SSI Bond Fund)", pct: 10, color: "bg-indigo-500", description: "Quỹ trái phiếu SSI giúp bảo vệ tài sản khỏi biến động lớn." },
          { name: "DCDS (Dragon Capital Stock)", pct: 20, color: "bg-orange-500", description: "Tập trung cổ phiếu vốn hóa lớn, tiềm năng tăng trưởng tốt." },
          { name: "SSISCA (SSI Sustainable)", pct: 10, color: "bg-emerald-500", description: "Quỹ lợi thế cạnh tranh bền vững SSI, tập trung doanh nghiệp có nền tảng vững mạnh." },
          { name: "VESAF (VinaCapital Equity)", pct: 20, color: "bg-rose-500", description: "Tận dụng đà tăng giá từ các cổ phiếu tiềm năng vượt trội." },
          { name: "FPT (Cổ phiếu FPT)", pct: 10, color: "bg-violet-600", description: "Cổ phiếu công nghệ đầu ngành, tăng trưởng bền vững qua các năm." }
        ],
        description: "Cân bằng hợp lý giữa sự tăng trưởng của cổ phiếu và sự ổn định dòng tiền từ trái phiếu."
      };
    }
  };

  const portfolio = getPortfolioDetails();

  // Tính góc kim đồng hồ (0 -> 100)
  const getGaugeAngle = (score: number) => {
    const min = 0;
    const max = 100;
    const clamped = Math.max(min, Math.min(max, score));
    const percentage = (clamped - min) / (max - min);
    return -90 + percentage * 180;
  };

  // Tính toán dữ liệu Radar Chart 3 trục
  const getRadarData = () => {
    const radarValues = aiData?.radarData || { willingness: 60, capacity: 60, discipline: 60 };
    
    return {
      labels: [
        ["Ý chí rủi ro", "(Willingness)"],
        ["Năng lực tài chính", "(Capacity)"],
        ["Kỷ luật hành vi", "(Discipline)"]
      ],
      datasets: [
        {
          label: "Điểm thành phần (%)",
          data: [
            radarValues.willingness,
            radarValues.capacity,
            radarValues.discipline
          ],
          backgroundColor: "rgba(16, 185, 129, 0.2)",
          borderColor: "#10B981",
          borderWidth: 2,
          pointBackgroundColor: "#10B981",
          pointHoverRadius: 6
        }
      ]
    };
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 15,
        right: 15,
        top: 10,
        bottom: 10
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const labelStr = Array.isArray(ctx.label) ? ctx.label.join(" ") : ctx.label;
            return ` ${labelStr}: ${ctx.raw}%`;
          }
        }
      }
    },
    scales: {
      r: {
        angleLines: { color: "rgba(255, 255, 255, 0.1)" },
        grid: { color: "rgba(255, 255, 255, 0.08)" },
        pointLabels: {
          color: "#9CA3AF",
          font: { size: 10, weight: "bold" as const },
          padding: 6
        },
        ticks: {
          display: false,
          backdropColor: "transparent"
        },
        min: 0,
        max: 100
      }
    }
  };

  // Compile list of 15 features with values and SHAP contributions
  const getFeatureList = () => {
    if (!aiData || !aiData.features) return [];
    const f = aiData.features;
    const c = aiData.featureContributions || {};

    const rawList = [
      { key: "bill_on_time_ratio", label: "Kỷ luật thanh toán hóa đơn", value: `${Math.round((f.bill_on_time_ratio || 0) * 100)}%`, desc: "Đúng hạn hóa đơn nước/điện" },
      { key: "social_sentiment", label: "Tâm lý mạng xã hội", value: `${Math.round((f.social_sentiment || 0) * 100)}%`, desc: "Mức tích cực cảm xúc MXH" },
      { key: "spend_discipline", label: "Kỷ luật quản lý tài chính", value: `${Math.round((f.spend_discipline || 0) * 100)}%`, desc: "Kỷ luật chi tiêu thông thường" },
      { key: "balance_volatility", label: "Biến động số dư ví", value: `${Math.round((f.balance_volatility || 0) * 100)}%`, desc: "Độ trồi sụt số dư hàng ngày" },
      { key: "impulse_purchase_index", label: "Chỉ số mua sắm bốc đồng", value: `${Math.round((f.impulse_purchase_index || 0) * 100)}%`, desc: "Chi tiêu ngoài giờ / săn sale" },
      { key: "late_night_spend_ratio", label: "Tỷ lệ chi tiêu đêm muộn", value: `${Math.round((f.late_night_spend_ratio || 0) * 100)}%`, desc: "Mua sắm từ 23h đến 5h sáng" },
      { key: "immediate_cash_out_rate", label: "Tỷ lệ rút tiền ngay", value: `${Math.round((f.immediate_cash_out_rate || 0) * 100)}%`, desc: "Rút tiền ATM ngay sau khi nạp" },
      { key: "income_regularity_index", label: "Độ ổn định thu nhập", value: `${Math.round((f.income_regularity_index || 0) * 100)}%`, desc: "Tính chu kỳ nguồn tiền lương" },
      { key: "liquidity_buffer_ratio", label: "Đệm thanh khoản ví", value: `${(f.liquidity_buffer_ratio || 0).toFixed(1)}x`, desc: "Số lần ví phủ chi tiêu ngày" },
      { key: "save_after_payday_ratio", label: "Tỷ lệ tích lũy sau lương", value: `${Math.round((f.save_after_payday_ratio || 0) * 100)}%`, desc: "Tiết kiệm ngay khi có lương" },
      { key: "auto_save_completion_rate", label: "Hoàn thành Autopilot", value: `${Math.round((f.auto_save_completion_rate || 0) * 100)}%`, desc: "Tỷ lệ chạy tự động thành công" },
      { key: "onboarding_attention_score", label: "Thời gian đọc điều khoản", value: `${Math.round((f.onboarding_attention_score || 0) * 100)}%`, desc: "Thời gian tìm hiểu rủi ro" },
      { key: "balance_check_frequency", label: "Tần suất kiểm tra số dư", value: `${(f.balance_check_frequency || 0).toFixed(1)} lần/ngày`, desc: "Số lần truy cập kiểm tra ví" },
      { key: "p2p_network_density", label: "Mạng lưới chuyển tiền P2P", value: `${f.p2p_network_density || 0} đối tác`, desc: "Số tài khoản giao dịch cùng" },
      { key: "low_battery_transaction", label: "Giao dịch khi pin yếu", value: f.low_battery_transaction ? "Có" : "Không", desc: "Thực hiện giao dịch khi pin < 10%" }
    ];

    return rawList.map(item => {
      const contrib = c[item.key] !== undefined ? c[item.key] : 0;
      return {
        ...item,
        contrib
      };
    });
  };


  // Tạo dữ liệu trực quan tài chính KH dựa trên rủi ro
  const getFinancialStats = () => {
    const risk = aiData?.riskClass || "balanced";
    if (risk === "conservative") {
      return {
        income: 25000000,
        expense: 12000000,
        savings: 13000000,
        categories: {
          "Nhà ở & Tiện ích": 4000000,
          "Ăn uống": 3500000,
          "Di chuyển": 1500000,
          "Giải trí": 1000000,
          "Khác": 2000000
        }
      };
    } else if (risk === "aggressive") {
      return {
        income: 35000000,
        expense: 28000000,
        savings: 7000000,
        categories: {
          "Nhà ở & Tiện ích": 6000000,
          "Ăn uống": 8000000,
          "Di chuyển": 3000000,
          "Giải trí": 8000000,
          "Khác": 3000000
        }
      };
    } else {
      return {
        income: 30000000,
        expense: 18000000,
        savings: 12000000,
        categories: {
          "Nhà ở & Tiện ích": 5000000,
          "Ăn uống": 5500000,
          "Di chuyển": 2000000,
          "Giải trí": 3500000,
          "Khác": 2000000
        }
      };
    }
  };

  const stats = getFinancialStats();

  // Dự phóng tích lũy tài sản 10 năm dựa trên ví của người dùng thực tế
  const years = 10;
  const projectionLabels = Array.from({ length: years + 1 }, (_, i) => `Năm ${i}`);
  const monthlySavings = aiData?.realSavings !== undefined ? aiData.realSavings : stats.savings;
  const annualSavings = monthlySavings * 12;
  const initialAsset = aiData?.walletBalance !== undefined ? aiData.walletBalance : 50000000; // Động theo số dư ví thật

  const cashProjection = [initialAsset];
  const savingsProjection = [initialAsset];
  const investProjection = [initialAsset];

  const savingsRate = 0.05; // 5% gửi tiết kiệm
  const riskClass = aiData?.riskClass || "balanced";
  const investRate = riskClass === "aggressive" ? 0.15 : riskClass === "balanced" ? 0.10 : 0.07;

  for (let i = 1; i <= years; i++) {
    cashProjection.push(cashProjection[i - 1] + annualSavings);
    savingsProjection.push(Math.round(savingsProjection[i - 1] * (1 + savingsRate) + annualSavings));
    investProjection.push(Math.round(investProjection[i - 1] * (1 + investRate) + annualSavings));
  }

  const projectionData = {
    labels: projectionLabels,
    datasets: [
      {
        label: "Đầu tư đề xuất AI",
        data: investProjection,
        borderColor: "#10B981", // Emerald
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.3,
        borderWidth: 3,
        pointBackgroundColor: "#10B981",
        pointHoverRadius: 7
      },
      {
        label: "Gửi tiết kiệm (5%/năm)",
        data: savingsProjection,
        borderColor: "#3B82F6", // Blue
        backgroundColor: "transparent",
        tension: 0.3,
        borderWidth: 2,
        borderDash: [5, 5],
        pointBackgroundColor: "#3B82F6"
      },
      {
        label: "Chỉ giữ tiền mặt",
        data: cashProjection,
        borderColor: "#9CA3AF", // Gray
        backgroundColor: "transparent",
        tension: 0.3,
        borderWidth: 2,
        borderDash: [3, 3],
        pointBackgroundColor: "#9CA3AF"
      }
    ]
  };

  const projectionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#D1D5DB",
          font: { size: 11, weight: "bold" as const }
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.raw.toLocaleString('vi-VN')} ₫`
        }
      }
    },
    scales: {
      y: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: {
          color: "#9CA3AF",
          callback: (value: any) => `${(value / 1000000).toLocaleString('vi-VN')}M`
        }
      },
      x: {
        grid: { display: false },
        ticks: { color: "#9CA3AF" }
      }
    }
  };

  const getTargetAllocation = () => {
    const risk = aiData?.riskClass || "balanced";
    if (risk === "conservative") {
      return { cash: 15, bonds: 75, stocks: 10 };
    } else if (risk === "aggressive") {
      return { cash: 10, bonds: 10, stocks: 80 };
    } else {
      return { cash: 10, bonds: 40, stocks: 50 };
    }
  };

  const targetAlloc = getTargetAllocation();

  const currentCash = aiData?.currentAllocation?.cash !== undefined ? aiData.currentAllocation.cash : 75;
  const currentBonds = aiData?.currentAllocation?.bonds !== undefined ? aiData.currentAllocation.bonds : 15;
  const currentStocks = aiData?.currentAllocation?.stocks !== undefined ? aiData.currentAllocation.stocks : 10;

  const allocationCompareData = {
    labels: ["Tiền mặt / Ví", "Trái phiếu & Quỹ TP", "Cổ phiếu & Cổ phần"],
    datasets: [
      {
        label: "Danh mục Hiện tại",
        data: [currentCash, currentBonds, currentStocks],
        backgroundColor: "rgba(99, 102, 241, 0.8)", // Indigo
        hoverBackgroundColor: "#6366F1",
        borderRadius: 6,
        barThickness: 25
      },
      {
        label: "Danh mục AI Đề xuất",
        data: [targetAlloc.cash, targetAlloc.bonds, targetAlloc.stocks],
        backgroundColor: "rgba(16, 185, 129, 0.8)", // Emerald
        hoverBackgroundColor: "#10B981",
        borderRadius: 6,
        barThickness: 25
      }
    ]
  };

  const allocationCompareOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#D1D5DB",
          font: { size: 11, weight: "bold" as const }
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.raw}%`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: {
          color: "#9CA3AF",
          callback: (value: any) => `${value}%`
        }
      },
      x: {
        grid: { display: false },
        ticks: { color: "#9CA3AF" }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-10 font-sans">
      <Toaster position="top-center" />
      
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-success-400" />
              <h1 className="text-28 font-extrabold tracking-tight bg-gradient-to-r from-success-400 to-green-500 bg-clip-text text-transparent">
                Fincore AI Wealth Insights
              </h1>
            </div>
            <p className="text-14 text-gray-400">
              Trợ lý phân tích dữ liệu hành vi & Tự động hóa tích lũy quỹ mở (VND)
            </p>
          </div>
        </header>

        {/* Loading State */}
        {loadingScore ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="h-10 w-10 border-4 border-success-500/20 border-t-success-500 rounded-full animate-spin"></div>
            <p className="text-gray-400 text-14">AI đang tải dữ liệu hồ sơ tài chính...</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* ROW 1: DANH SÁCH TẤT CẢ SẢN PHẨM ĐẦU TƯ LIÊN KẾT */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 backdrop-blur-md p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-gray-850 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-success-400" />
                  <h2 className="text-16 font-extrabold text-white">Danh Sách Sản Phẩm Đầu Tư Fincore</h2>
                </div>
                <span className="text-12 text-gray-400">Tổng số: {allProducts.length} sản phẩm</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                {allProducts.map((prod) => (
                  <div key={prod.code} className="rounded-xl border border-gray-850 bg-gray-950/30 p-5 flex flex-col justify-between space-y-3 hover:bg-gray-950/60 transition-all">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-15 text-white">{prod.code}</span>
                          <span className="text-[10px] text-gray-500 font-bold">• {prod.partner}</span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${prod.color}`}>
                          {prod.type}
                        </span>
                      </div>
                      <h4 className="text-12 font-bold text-gray-200">{prod.name}</h4>
                      <p className="text-11 text-gray-400 leading-normal">{prod.desc}</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedFundForInvest(`${prod.code} (${prod.name})`);
                        setInvestAmount(2000000);
                        setIsInvestModalOpen(true);
                      }}
                      className="w-full py-2 bg-success-500 hover:bg-success-600 active:scale-95 text-black font-extrabold text-12 rounded-xl transition-all shadow-md shadow-success-500/10"
                    >
                      Đầu tư
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ROW 2: BOX PHÂN TÍCH ĐẦU TƯ TÀI CHÍNH AI (FULL WIDTH) - Nút kích hoạt phân tích */}
            <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6 space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Bot className="h-32 w-32 text-success-400" />
              </div>

              {!hasActivatedAnalysis ? (
                <div className="flex flex-col md:flex-row gap-6 pt-2">
                  <div className="md:col-span-9 flex-1 flex flex-col items-center justify-center py-10 space-y-4 text-center bg-gray-950/20 border border-gray-850 rounded-xl p-5 h-[400px]">
                    <Sparkles className="h-8 w-8 text-success-400 animate-pulse" />
                    <p className="text-14 text-gray-400 max-w-lg leading-relaxed">
                      Trợ lý Gemini cần truy cập thông tin rủi ro hành vi XGBoost và DNA sản phẩm mở rộng để đưa ra danh mục đầu tư cá nhân hóa và giải pháp tối ưu.
                    </p>
                    <button
                      onClick={handleActivateAnalysis}
                      disabled={loadingAnalysis}
                      className="px-6 py-2.5 bg-success-500 hover:bg-success-600 active:scale-95 disabled:opacity-50 disabled:scale-100 text-black font-extrabold text-13 rounded-xl transition-all shadow-md shadow-success-500/20 flex items-center gap-2"
                    >
                      {loadingAnalysis ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Đang phân tích...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Kích Hoạt Phân Tích & Tư Vấn AI
                        </>
                      )}
                    </button>
                  </div>

                  <div className="w-full md:w-[280px] flex flex-col h-[400px] border border-gray-850 bg-gray-950/20 rounded-xl p-4 space-y-3 shrink-0">
                    <h3 className="text-13 font-extrabold text-gray-300 border-b border-gray-850 pb-2">Lịch Sử Phân Tích AI</h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {(!aiData?.history || aiData.history.length === 0) ? (
                        <p className="text-11 text-gray-500 text-center pt-12">Chưa có lịch sử phân tích.</p>
                      ) : (
                        aiData.history.slice().reverse().map((hist, idx) => {
                          const dateStr = new Date(hist.timestamp).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          });
                          const label = hist.riskClass === 'conservative' ? 'Thận trọng' : hist.riskClass === 'aggressive' ? 'Mạo hiểm' : 'Cân bằng';
                          const badgeColor = hist.riskClass === 'conservative' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : hist.riskClass === 'aggressive' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                setAiAnalysisText(hist.aiAnalysis);
                                setHasActivatedAnalysis(true);
                              }}
                              className="w-full text-left p-3 rounded-lg border border-gray-850 bg-gray-900/30 hover:bg-gray-900/60 active:scale-[0.98] transition-all flex flex-col space-y-1"
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="text-11 text-gray-400 font-mono">{dateStr}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                                  {label}
                                </span>
                              </div>
                              <p className="text-11 text-gray-500 truncate w-full font-sans">
                                {hist.aiAnalysis}
                              </p>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                  <div className="md:col-span-9 flex flex-col space-y-3">
                    <div className="text-14 text-gray-300 leading-relaxed bg-gray-950/40 border border-gray-850 rounded-xl p-5 h-[340px] overflow-y-auto custom-scrollbar font-mono whitespace-pre-wrap">
                      {aiAnalysisText}
                    </div>
                    <div className="flex justify-start">
                      <button
                        onClick={handleActivateAnalysis}
                        disabled={loadingAnalysis}
                        className="px-5 py-2 bg-success-500 hover:bg-success-600 active:scale-95 disabled:opacity-50 text-black font-extrabold text-12 rounded-xl transition-all shadow-md shadow-success-500/10 flex items-center gap-2"
                      >
                        {loadingAnalysis ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Phân Tích Lại Từ Đầu
                      </button>
                    </div>
                  </div>
                  
                  <div className="md:col-span-3 flex flex-col h-[400px] border border-gray-850 bg-gray-950/20 rounded-xl p-4 space-y-3">
                    <h3 className="text-13 font-extrabold text-gray-300 border-b border-gray-850 pb-2">Lịch Sử Phân Tích AI</h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {(!aiData?.history || aiData.history.length === 0) ? (
                        <p className="text-11 text-gray-500 text-center pt-12">Chưa có lịch sử phân tích.</p>
                      ) : (
                        aiData.history.slice().reverse().map((hist, idx) => {
                          const dateStr = new Date(hist.timestamp).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          });
                          const label = hist.riskClass === 'conservative' ? 'Thận trọng' : hist.riskClass === 'aggressive' ? 'Mạo hiểm' : 'Cân bằng';
                          const badgeColor = hist.riskClass === 'conservative' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : hist.riskClass === 'aggressive' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                setAiAnalysisText(hist.aiAnalysis);
                                setHasActivatedAnalysis(true);
                              }}
                              className="w-full text-left p-3 rounded-lg border border-gray-850 bg-gray-900/30 hover:bg-gray-900/60 active:scale-[0.98] transition-all flex flex-col space-y-1"
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="text-11 text-gray-400 font-mono">{dateStr}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                                  {label}
                                </span>
                              </div>
                              <p className="text-11 text-gray-500 truncate w-full font-sans">
                                {hist.aiAnalysis}
                              </p>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ROW 3: CHARTS & RISK APPETITE (2-COLUMN LAYOUT) - Chỉ hiện khi đã kích hoạt phân tích */}
            {hasActivatedAnalysis && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* CỘT 1: NHÃN PHÂN LOẠI KHẨU VỊ RỦI RO */}
                <div className="lg:col-span-6 rounded-2xl border border-gray-800 bg-gray-900/40 backdrop-blur-md p-6 flex flex-col items-center justify-center relative overflow-hidden h-[420px]">
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 text-12 font-medium text-gray-400">
                    <CheckCircle2 className="h-4 w-4 text-success-400" />
                    Phân Loại Khẩu Vị Rủi Ro AI
                  </div>

                  {/* Icon & Label representation */}
                  <div className="flex flex-col items-center justify-center space-y-6 mt-4">
                    <div className={`relative p-5 rounded-full border-2 bg-gray-900/80 backdrop-blur-md shadow-2xl flex items-center justify-center w-24 h-24 transition-transform duration-500 hover:scale-105 ${
                      aiData?.riskClass === 'conservative' 
                        ? 'border-blue-500 text-blue-400 shadow-blue-500/20' 
                        : aiData?.riskClass === 'aggressive'
                        ? 'border-red-500 text-red-400 shadow-red-500/20'
                        : 'border-emerald-500 text-emerald-400 shadow-emerald-500/20'
                    }`}>
                      {aiData?.riskClass === 'conservative' && <ShieldAlert className="w-12 h-12" />}
                      {aiData?.riskClass === 'aggressive' && <TrendingUp className="w-12 h-12 animate-pulse" />}
                      {aiData?.riskClass === 'balanced' && <Layers className="w-12 h-12" />}
                    </div>

                    <div className="text-center space-y-2">
                      <h3 className={`text-28 font-black tracking-widest uppercase transition-all duration-300 ${
                        aiData?.riskClass === 'conservative'
                          ? 'bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent filter drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                          : aiData?.riskClass === 'aggressive'
                          ? 'bg-gradient-to-r from-red-400 to-rose-500 bg-clip-text text-transparent filter drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                          : 'bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent filter drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      }`}>
                        {aiData?.riskClass === 'conservative' ? 'Thận trọng' : aiData?.riskClass === 'aggressive' ? 'Mạo hiểm' : 'Cân bằng'}
                      </h3>
                      <p className="text-12 text-gray-400 max-w-[220px] mx-auto leading-relaxed">
                        {aiData?.riskClass === 'conservative' && 'Ưu tiên tối đa bảo toàn nguồn vốn và an toàn tài sản.'}
                        {aiData?.riskClass === 'aggressive' && 'Tìm kiếm lợi nhuận đột phá, chấp nhận biến động tài sản lớn.'}
                        {aiData?.riskClass === 'balanced' && 'Hài hòa giữa tăng trưởng dài hạn và phòng ngừa rủi ro.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CỘT 2: BIỂU ĐỒ RADAR 3 TRỤC */}
                <div className="lg:col-span-6 rounded-2xl border border-gray-800 bg-gray-900/40 backdrop-blur-md p-6 flex flex-col justify-between h-[420px]">
                  <h3 className="text-15 font-bold text-white flex items-center gap-2 border-b border-gray-850 pb-2">
                    <PieChart className="h-4 w-4 text-success-400" />
                    Sức Khỏe Tài Chính 3 Chiều
                  </h3>
                  <div className="flex-1 min-h-[300px] relative mt-2 flex items-center justify-center">
                    <Radar data={getRadarData()} options={radarOptions} />
                  </div>
                </div>

              </div>
            )}

            {hasActivatedAnalysis && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* BIỂU ĐỒ DỰ PHÓNG TÍCH LŨY TÀI SẢN TƯƠNG LAI */}
                <div className="lg:col-span-12 rounded-2xl border border-gray-800 bg-gray-900/40 backdrop-blur-md p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-850 pb-2">
                    <TrendingUp className="h-5 w-5 text-success-400" />
                    <h3 className="text-15 font-bold text-white">Biểu đồ Dự phóng Tích lũy Tài sản Tương lai (10 năm)</h3>
                  </div>
                  <div className="h-80 relative">
                    <Line data={projectionData} options={projectionOptions} />
                  </div>
                </div>

              </div>
            )}

            {/* ROW 5: ĐỀ XUẤT DANH MỤC ĐẦU TƯ DỰA TRÊN LỜI KHUYÊN AI (FULL WIDTH) */}
            {hasActivatedAnalysis && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900/40 backdrop-blur-md p-6 space-y-6">
                <div>
                  <h3 className="text-16 font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-success-400" />
                    Danh sách Quỹ Đầu tư Đề xuất: {portfolio.name}
                  </h3>
                  <p className="text-12 text-gray-400 mt-1">{portfolio.description}</p>
                </div>

                {/* Biểu đồ thanh ngang phân bổ (%) */}
                <div className="space-y-4">
                  <div className="h-6 w-full bg-gray-950 rounded-full overflow-hidden flex">
                    {portfolio.allocation.map((alloc, idx) => (
                      <div 
                        key={idx} 
                        className={`${alloc.color} h-full first:rounded-l-full last:rounded-r-full text-10 font-bold flex items-center justify-center text-black`}
                        style={{ width: `${alloc.pct}%` }}
                      >
                        {alloc.name.split(" ")[0]} ({alloc.pct}%)
                      </div>
                    ))}
                  </div>

                  {/* Chú giải chi tiết quỹ với nút Đầu tư nhanh */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {portfolio.allocation.map((alloc, idx) => (
                      <div key={idx} className="rounded-xl border border-gray-850 bg-gray-950/50 p-4 flex flex-col justify-between space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`h-3 w-3 rounded-full ${alloc.color}`}></span>
                              <span className="font-bold text-14 text-white">{alloc.name}</span>
                            </div>
                            <span className="text-12 font-extrabold text-success-400">{alloc.pct}%</span>
                          </div>
                          <p className="text-12 text-gray-400 leading-normal">{alloc.description}</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedFundForInvest(alloc.name);
                            setInvestAmount(2000000);
                            setIsInvestModalOpen(true);
                          }}
                          className="w-full py-2 bg-success-500 hover:bg-success-600 active:scale-95 text-black font-extrabold text-12 rounded-xl transition-all shadow-md shadow-success-500/10 flex items-center justify-center gap-1.5"
                        >
                          Đầu tư ngay
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ROW 5: AI AUTOPILOT CONTROL PANEL (FULL WIDTH) */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 backdrop-blur-md p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-850 pb-2">
                <h3 className="text-15 font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-success-400 animate-pulse" />
                  AI Autopilot Control Panel
                </h3>
                <span className="text-12 text-gray-400">
                  Lệnh tự động tích lũy đang chạy: {automations.length}
                </span>
              </div>

              {loadingAutos ? (
                <div className="flex justify-center items-center py-6">
                  <div className="h-5 w-5 border-2 border-success-500/20 border-t-success-500 rounded-full animate-spin"></div>
                </div>
              ) : automations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-850 p-8 text-center space-y-2">
                  <p className="text-14 text-gray-500">Chưa có lệnh tích lũy tự động nào được thiết lập.</p>
                  <p className="text-12 text-gray-600">Bạn có thể yêu cầu Chatbot cài đặt tự động bằng ngôn ngữ tự nhiên.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {automations.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-850 bg-gray-950/30 transition-all hover:bg-gray-950/60">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-14 font-extrabold text-white">
                            {item.actionType === 'invest' ? 'Đầu tư' : 'Rút tiền'} {formatAmount(item.amount)}
                          </span>
                          <span className="rounded bg-success-500/10 px-1.5 py-0.5 text-10 font-medium text-success-400 border border-success-500/20">
                            {item.destinationFund}
                          </span>
                        </div>
                        <p className="text-11 text-gray-500">
                          Chu kỳ: {item.cronExpression === '0 0 25 * *' ? 'Hàng tháng vào ngày 25' : 'Hàng ngày lúc 00:00'}
                        </p>
                        <p className="text-10 text-gray-500">
                          Chạy lần cuối: {item.lastRun ? new Date(item.lastRun).toLocaleDateString("vi-VN") : "Chưa chạy lần nào"}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleToggleAuto(item.id, item.isActive)}
                          className="text-gray-400 hover:text-success-400 transition-colors"
                        >
                          {item.isActive ? (
                            <ToggleRight className="h-8 w-8 text-success-400" />
                          ) : (
                            <ToggleLeft className="h-8 w-8 text-gray-500" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleDeleteAuto(item.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Modal đầu tư nhanh */}
      {isInvestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-850 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl relative">
            <div>
              <h3 className="text-18 font-extrabold text-white">Đầu tư nhanh: {selectedFundForInvest}</h3>
              <p className="text-12 text-gray-400 mt-1">
                Thiết lập tự động trích quỹ tài khoản tích lũy định kỳ.
              </p>
            </div>
            
            {/* Nhập số tiền */}
            <div className="space-y-2">
              <label className="text-11 text-gray-400 font-bold uppercase tracking-wider">Số tiền (VND)</label>
              <input
                type="number"
                value={investAmount}
                onChange={(e) => setInvestAmount(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-850 rounded-xl px-4 py-2.5 text-white font-mono text-14 focus:outline-none focus:border-success-500"
                placeholder="Nhập số tiền..."
              />
              <div className="flex gap-2 pt-1">
                {[1000000, 2000000, 5000000, 10000000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setInvestAmount(val)}
                    className="text-11 px-2.5 py-1 bg-gray-800 hover:bg-gray-750 text-gray-300 rounded-lg transition-colors font-semibold"
                  >
                    {formatAmount(val)}
                  </button>
                ))}
              </div>
            </div>

            {/* Chọn chu kỳ */}
            <div className="space-y-2">
              <label className="text-11 text-gray-400 font-bold uppercase tracking-wider">Chu kỳ tích lũy</label>
              <select
                value={investSchedule}
                onChange={(e) => setInvestSchedule(e.target.value)}
                className="w-full bg-gray-950 border border-gray-850 rounded-xl px-4 py-2.5 text-white text-14 focus:outline-none focus:border-success-500"
              >
                <option value="0 0 25 * *">Hàng tháng (Ngày 25)</option>
                <option value="0 0 * * *">Hàng ngày (Lúc 00:00)</option>
              </select>
            </div>

            {/* Nút thao tác */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsInvestModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-850 hover:bg-gray-800 text-white font-bold text-14 rounded-xl transition-all"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmInvest}
                className="flex-1 py-2.5 bg-success-500 hover:bg-success-600 text-black font-bold text-14 rounded-xl transition-all"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
