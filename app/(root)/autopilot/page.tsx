'use client';

import React, { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, Trash2, Sparkles, RefreshCw, Layers, CheckCircle2, ShieldAlert, Coins, ShieldCheck, Activity } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { formatAmount } from '@/lib/utils';

interface Automation {
  id: string;
  actionType: string;
  amount: number;
  destinationFund: string;
  cronExpression: string;
  isActive: boolean;
  lastRun: string | null;
}

type TabType = 'all' | 'transact' | 'invest' | 'protect' | 'other';

export default function AutopilotPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loadingAutos, setLoadingAutos] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');

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
      toast.error("Không thể tải danh sách lệnh tự động.");
    } finally {
      setLoadingAutos(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

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
        toast.success("Đã xóa lệnh tự động thành công");
        setAutomations(prev => prev.filter(item => item.id !== id));
      } else {
        toast.error("Xóa lệnh tự động thất bại.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi kết nối để xóa.");
    }
  };

  // Filter logic based on thematic tabs
  const getFilteredAutomations = () => {
    return automations.filter(item => {
      if (activeTab === 'all') return true;
      if (activeTab === 'transact') {
        return item.actionType === 'deposit' || item.actionType === 'transfer';
      }
      if (activeTab === 'invest') {
        return item.actionType === 'invest' || item.actionType === 'smart_cash_sweep';
      }
      if (activeTab === 'protect') {
        return item.actionType === 'low_balance_shield' || item.actionType === 'expense_limit_guardian';
      }
      if (activeTab === 'other') {
        return !['deposit', 'transfer', 'invest', 'smart_cash_sweep', 'low_balance_shield', 'expense_limit_guardian'].includes(item.actionType);
      }
      return true;
    });
  };

  // Counters for tabs
  const getTabCounts = (type: TabType) => {
    return automations.filter(item => {
      if (type === 'all') return true;
      if (type === 'transact') {
        return item.actionType === 'deposit' || item.actionType === 'transfer';
      }
      if (type === 'invest') {
        return item.actionType === 'invest' || item.actionType === 'smart_cash_sweep';
      }
      if (type === 'protect') {
        return item.actionType === 'low_balance_shield' || item.actionType === 'expense_limit_guardian';
      }
      if (type === 'other') {
        return !['deposit', 'transfer', 'invest', 'smart_cash_sweep', 'low_balance_shield', 'expense_limit_guardian'].includes(item.actionType);
      }
      return false;
    }).length;
  };

  const filteredList = getFilteredAutomations();

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-10 font-sans">
      <Toaster position="top-center" />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-success-400 animate-pulse" />
              <h1 className="text-28 font-extrabold tracking-tight bg-gradient-to-r from-success-400 to-green-500 bg-clip-text text-transparent">
                Quản lý Tự động hóa
              </h1>
            </div>
            <p className="text-14 text-gray-400">
              Danh sách các lệnh tự động (Autopilot) được cấu hình bởi AI
            </p>
            <p className="text-12 text-success-400 italic">
              * Mẹo: Để thiết lập quy tắc tự động hóa mới, bạn chỉ cần gửi yêu cầu cho trợ lý ảo Chatbot Fincore ở góc dưới màn hình.
            </p>
          </div>
          <button
            onClick={fetchAutomations}
            disabled={loadingAutos}
            className="flex items-center gap-2 px-4 py-2 border border-gray-850 hover:bg-gray-900 active:scale-95 text-gray-300 hover:text-white font-semibold text-13 rounded-xl transition-all shadow-lg shadow-black/40"
          >
            <RefreshCw className={`h-4 w-4 ${loadingAutos ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </header>

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-2 border-b border-gray-900 pb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-13 transition-all active:scale-95 ${
              activeTab === 'all'
                ? 'bg-success-500 text-black shadow-lg shadow-success-500/20'
                : 'bg-gray-900/40 border border-gray-850 text-gray-400 hover:text-white hover:bg-gray-900'
            }`}
          >
            <Activity className="h-4 w-4" />
            Tất cả
            <span className={`text-11 px-1.5 py-0.5 rounded-md font-mono ${
              activeTab === 'all' ? 'bg-black/20 text-black' : 'bg-gray-800 text-gray-400'
            }`}>
              {getTabCounts('all')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('transact')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-13 transition-all active:scale-95 ${
              activeTab === 'transact'
                ? 'bg-success-500 text-black shadow-lg shadow-success-500/20'
                : 'bg-gray-900/40 border border-gray-850 text-gray-400 hover:text-white hover:bg-gray-900'
            }`}
          >
            <Coins className="h-4 w-4" />
            Nạp & Chuyển tiền
            <span className={`text-11 px-1.5 py-0.5 rounded-md font-mono ${
              activeTab === 'transact' ? 'bg-black/20 text-black' : 'bg-gray-800 text-gray-400'
            }`}>
              {getTabCounts('transact')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('invest')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-13 transition-all active:scale-95 ${
              activeTab === 'invest'
                ? 'bg-success-500 text-black shadow-lg shadow-success-500/20'
                : 'bg-gray-900/40 border border-gray-850 text-gray-400 hover:text-white hover:bg-gray-900'
            }`}
          >
            <Layers className="h-4 w-4" />
            Tích lũy & Đầu đầu tư
            <span className={`text-11 px-1.5 py-0.5 rounded-md font-mono ${
              activeTab === 'invest' ? 'bg-black/20 text-black' : 'bg-gray-800 text-gray-400'
            }`}>
              {getTabCounts('invest')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('protect')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-13 transition-all active:scale-95 ${
              activeTab === 'protect'
                ? 'bg-success-500 text-black shadow-lg shadow-success-500/20'
                : 'bg-gray-900/40 border border-gray-850 text-gray-400 hover:text-white hover:bg-gray-900'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Giám sát & Phòng thủ
            <span className={`text-11 px-1.5 py-0.5 rounded-md font-mono ${
              activeTab === 'protect' ? 'bg-black/20 text-black' : 'bg-gray-800 text-gray-400'
            }`}>
              {getTabCounts('protect')}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('other')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-13 transition-all active:scale-95 ${
              activeTab === 'other'
                ? 'bg-success-500 text-black shadow-lg shadow-success-500/20'
                : 'bg-gray-900/40 border border-gray-850 text-gray-400 hover:text-white hover:bg-gray-900'
            }`}
          >
            <Layers className="h-4 w-4" />
            Khác
            <span className={`text-11 px-1.5 py-0.5 rounded-md font-mono ${
              activeTab === 'other' ? 'bg-black/20 text-black' : 'bg-gray-800 text-gray-400'
            }`}>
              {getTabCounts('other')}
            </span>
          </button>
        </div>

        {/* AI AUTOPILOT CONTROL PANEL */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 backdrop-blur-md p-6 space-y-6 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-center border-b border-gray-850 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-success-400" />
              <h2 className="text-16 font-extrabold text-white">
                {(() => {
                  switch (activeTab) {
                    case 'all': return 'Tất cả cấu hình Autopilot';
                    case 'transact': return 'Lệnh Nạp & Chuyển tiền tự động';
                    case 'invest': return 'Lệnh Tích lũy & Đầu tư tự động';
                    case 'protect': return 'Quy tắc Giám sát & Phòng thủ tài chính';
                    case 'other': return 'Các quy tắc tự động hóa khác';
                  }
                })()}
              </h2>
            </div>
            <span className="text-12 text-gray-400 font-bold">
              Đang chạy: {filteredList.filter(a => a.isActive).length} / {filteredList.length}
            </span>
          </div>

          {loadingAutos ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="h-8 w-8 border-3 border-success-500/20 border-t-success-500 rounded-full animate-spin"></div>
              <p className="text-gray-400 text-13">Đang tải các lệnh tự động hóa tài chính...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-850 p-12 text-center space-y-3 bg-gray-950/20">
              <ShieldAlert className="h-8 w-8 text-gray-500 mx-auto" />
              <p className="text-14 text-gray-400">Không tìm thấy lệnh nào thuộc mục này.</p>
              <p className="text-12 text-gray-500 max-w-md mx-auto">
                Hãy trò chuyện với Chatbot ở góc phải để tạo lệnh mới bất kỳ lúc nào!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredList.map((item) => (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between p-5 rounded-xl border transition-all ${
                    item.isActive 
                      ? 'border-gray-800 bg-gray-950/40 hover:bg-gray-950/70 shadow-md shadow-black/10' 
                      : 'border-gray-900 bg-gray-950/10 opacity-65 hover:opacity-80'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-15 font-extrabold text-white">
                        {(() => {
                          switch (item.actionType) {
                            case 'invest':
                              return `Đầu tư ${formatAmount(item.amount)}`;
                            case 'deposit':
                              return `Nạp tiền tự động ${formatAmount(item.amount)}`;
                            case 'transfer':
                              return `Chuyển tiền định kỳ ${formatAmount(item.amount)}`;
                            case 'low_balance_shield':
                              return `Lá chắn số dư tự nạp ${formatAmount(item.amount)}`;
                            case 'expense_limit_guardian':
                              return `Giới hạn chi tiêu ${formatAmount(item.amount)}`;
                            case 'smart_cash_sweep':
                              return `Quét tiền nhàn rỗi (giữ lại ${formatAmount(item.amount)})`;
                            default:
                              return `Tự động hóa ${formatAmount(item.amount)}`;
                          }
                        })()}
                      </span>
                      <span className="rounded bg-success-500/10 px-2 py-0.5 text-10 font-bold text-success-400 border border-success-500/20 uppercase">
                        {item.destinationFund}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-12 text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-500"></span>
                        Chu kỳ: {item.cronExpression === '0 0 25 * *' ? 'Hàng tháng vào ngày 25' : item.cronExpression === '0 0 1 * *' ? 'Hàng tháng vào ngày 1' : 'Định kỳ theo lịch'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-500"></span>
                        Lần chạy cuối: {item.lastRun ? new Date(item.lastRun).toLocaleDateString("vi-VN") : "Chưa chạy"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 shrink-0 pl-4">
                    <button
                      onClick={() => handleToggleAuto(item.id, item.isActive)}
                      className="text-gray-400 hover:text-success-400 transition-colors"
                      title={item.isActive ? "Bật" : "Tắt"}
                    >
                      {item.isActive ? (
                        <ToggleRight className="h-9 w-9 text-success-400" />
                      ) : (
                        <ToggleLeft className="h-9 w-9 text-gray-500" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleDeleteAuto(item.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors active:scale-95"
                      title="Xóa lệnh"
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
    </div>
  );
}
