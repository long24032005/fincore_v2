'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Endpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  defaultPayload?: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'POST',
    path: '/api/v1/auth/signup',
    summary: 'Đăng ký tài khoản mới',
    description: 'Đăng ký tài khoản người dùng Việt Nam với các trường thông tin CCCD, SĐT. Ví điện tử tự động được cấp 50.000.000 ₫.',
    defaultPayload: JSON.stringify({
      email: `user_${Math.floor(1000 + Math.random() * 9000)}@sandbox.vn`,
      password: 'password123',
      firstName: 'Nguyễn Văn',
      lastName: 'Huy',
      phone: '0912345678',
      address: '123 Đường Ba Tháng Hai, Phường 11',
      city: 'Quận 10',
      province: 'TP. Hồ Chí Minh',
      dateOfBirth: '1995-10-15',
      citizenId: '079095012345'
    }, null, 2)
  },
  {
    method: 'POST',
    path: '/api/v1/auth/signin',
    summary: 'Đăng nhập tài khoản',
    description: 'Xác thực thông tin email và mật khẩu của người dùng, thiết lập cookie phiên làm việc.',
    defaultPayload: JSON.stringify({
      email: '',
      password: 'password123'
    }, null, 2)
  },
  {
    method: 'GET',
    path: '/api/v1/banks',
    summary: 'Lấy danh sách ngân hàng liên kết',
    description: 'Trả về toàn bộ các tài khoản ngân hàng nội địa Việt Nam đã liên kết cùng số dư ledger tính toán.'
  },
  {
    method: 'POST',
    path: '/api/v1/banks',
    summary: 'Liên kết tài khoản ngân hàng nội địa',
    description: 'Liên kết trực tiếp tài khoản ngân hàng Việt Nam (Vietcombank, Techcombank, BIDV...) vào database local sandbox.',
    defaultPayload: JSON.stringify({
      bankName: 'Vietcombank (VCB)',
      accountId: '1023456789'
    }, null, 2)
  },
  {
    method: 'POST',
    path: '/api/v1/transfers',
    summary: 'Chuyển tiền (Ví/Ngân hàng/Quỹ)',
    description: 'Khởi tạo chuyển tiền. Hỗ trợ chuyển khoản P2P tức thì, chuyển tiền về ngân hàng liên kết hoặc mua chứng chỉ các quỹ mở thật (DCDS, VESAF, VEOF, SSISCA, TCBF, VLBF, SSIBF) hoặc cổ phiếu/trái phiếu (FPT, HPG, VNM, VIB212003).',
    defaultPayload: JSON.stringify({
      receiverId: 'email_or_walletId_or_shareableId',
      amount: 500000,
      description: 'Chuyển tiền ăn trưa',
      receiverBankId: ''
    }, null, 2)
  },
  {
    method: 'GET',
    path: '/api/v1/external/social-posts',
    summary: 'Lấy dữ liệu mạng xã hội (Facebook Graph API)',
    description: 'Kết nối Facebook Graph API v19.0 qua OAuth 2.0 để thu thập bài đăng công khai của người dùng. Dữ liệu được dùng để phân tích tâm lý tài chính và phân loại sở thích 7 chiều phục vụ mô hình gợi ý đầu tư.'
  },
  {
    method: 'GET',
    path: '/api/v1/external/utility-bills',
    summary: 'Lấy lịch sử hóa đơn tiện ích (NGSP Gateway)',
    description: 'Kết nối Cổng Dịch vụ Thanh toán Quốc gia (NGSP) để truy vấn lịch sử hóa đơn điện (EVN HCMC), nước (SAWACO) và internet (Viettel) của người dùng. Dữ liệu thanh toán đúng/trễ hạn là tín hiệu quan trọng trong mô hình đánh giá rủi ro tài chính.'
  },
  {
    method: 'GET',
    path: '/api/v1/alternative-data/risk-appetite',
    summary: 'Phân tích Khẩu vị Rủi ro AI',
    description: 'Pipeline phân tích hành vi tài chính toàn diện: thu thập dữ liệu thay thế từ mạng xã hội và tiện ích, trích xuất 15 đặc trưng hành vi, chạy mô hình phân loại để xác định khẩu vị rủi ro (Thận trọng / Cân bằng / Mạo hiểm), và sinh lời tư vấn danh mục đầu tư cá nhân hóa bằng tiếng Việt qua Gemini AI.'
  },



  {
    method: 'GET',
    path: '/api/v1/automations',
    summary: 'Lấy các lệnh tích lũy tự động',
    description: 'Trả về danh sách các lệnh tự động đầu tư định kỳ đã thiết lập của tài khoản.'
  },
  {
    method: 'POST',
    path: '/api/v1/automations',
    summary: 'Tạo lệnh tích lũy tự động mới',
    description: 'Kích hoạt thêm một luật tích lũy định kỳ (ví dụ: tự động trích tiền nạp vào các quỹ).',
    defaultPayload: JSON.stringify({
      actionType: 'invest',
      amount: 2000000,
      destinationFund: 'DCDS',
      cronExpression: '0 0 25 * *'
    }, null, 2)
  },
  {
    method: 'PATCH',
    path: '/api/v1/automations',
    summary: 'Bật/Tắt công tắc Autopilot',
    description: 'Cập nhật trạng thái hoạt động (bật hoặc tắt) của lệnh tự động tích lũy.',
    defaultPayload: JSON.stringify({
      id: 'auto_id_here',
      isActive: false
    }, null, 2)
  },
  {
    method: 'DELETE',
    path: '/api/v1/automations',
    summary: 'Hủy lệnh tích lũy tự động',
    description: 'Xóa hoàn toàn lệnh lập lịch tích lũy. Truyền tham số id để thực hiện xóa.',
    defaultPayload: JSON.stringify({
      id: 'auto_id_here'
    }, null, 2)
  }
];

const GROUPS = [
  {
    name: '1. Khởi tạo & Định danh (Onboarding)',
    indices: [0, 1]
  },
  {
    name: '2. Kết nối & Giao dịch (Core Banking)',
    indices: [2, 3, 4]
  },
  {
    name: '3. Tích hợp Dữ liệu thay thế (Connectors)',
    indices: [5, 6]
  },
  {
    name: '4. Phân tích AI & Gợi ý Đầu tư (AI Advisor)',
    indices: [7]
  },
  {
    name: '5. Đầu tư tự động (Autopilot Automation)',
    indices: [8, 9, 10, 11]
  }
];

export default function ApiDocs() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [payloads, setPayloads] = useState<string[]>(ENDPOINTS.map(e => e.defaultPayload || ''));
  const [responses, setResponses] = useState<{ status: string; body: string }[]>(ENDPOINTS.map(() => ({ status: '', body: '' })));
  const [loading, setLoading] = useState<boolean[]>(ENDPOINTS.map(() => false));
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in currently
    fetch('/api/v1/banks')
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        return null;
      })
      .then(data => {
        if (data) {
          setCurrentUser({ status: 'Authenticated' });
        }
      })
      .catch(() => {});
  }, []);

  const handleExecute = async (index: number) => {
    const endpoint = ENDPOINTS[index];
    const newLoading = [...loading];
    newLoading[index] = true;
    setLoading(newLoading);

    try {
      let url = endpoint.path;
      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (endpoint.method === 'POST' || endpoint.method === 'PATCH') {
        options.body = payloads[index];
      } else if (endpoint.method === 'DELETE') {
        let idVal = '';
        try {
          const parsed = JSON.parse(payloads[index] || '{}');
          idVal = parsed.id || '';
        } catch {
          idVal = payloads[index]?.trim() || '';
        }
        url = `${endpoint.path}?id=${idVal}`;
      }

      const res = await fetch(url, options);
      const statusText = `${res.status} ${res.statusText}`;
      
      let responseBody = '';
      try {
        const json = await res.json();
        responseBody = JSON.stringify(json, null, 2);
        
        // If signin or signup succeeded, update current user state
        if (res.ok && (endpoint.path.includes('signin') || endpoint.path.includes('signup'))) {
          setCurrentUser(json);
          // If we got a real user email, prefill the sign-in/transfer templates for testing
          if (json.email) {
            const updatedPayloads = [...payloads];
            // Prefill signin
            const signinIdx = ENDPOINTS.findIndex(e => e.path.includes('signin'));
            if (signinIdx !== -1) {
              updatedPayloads[signinIdx] = JSON.stringify({ email: json.email, password: 'password123' }, null, 2);
            }
            setPayloads(updatedPayloads);
          }
        }
      } catch {
        responseBody = await res.text();
      }

      const newResponses = [...responses];
      newResponses[index] = { status: statusText, body: responseBody };
      setResponses(newResponses);
    } catch (err: any) {
      const newResponses = [...responses];
      newResponses[index] = { status: 'Error', body: err.message || 'Network request failed' };
      setResponses(newResponses);
    } finally {
      const newLoading = [...loading];
      newLoading[index] = false;
      setLoading(newLoading);
    }
  };

  const handlePayloadChange = (index: number, val: string) => {
    const newPayloads = [...payloads];
    newPayloads[index] = val;
    setPayloads(newPayloads);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-12 font-sans selection:bg-success-500/30">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Block */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-gray-800 pb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image
                src="/icons/logo.png"
                width={60}
                height={60}
                alt="FinCore logo"
                className="hover:scale-105 transition-transform duration-200 cursor-pointer"
              />
            </Link>
            <div>
              <h1 className="text-30 font-extrabold tracking-tight bg-gradient-to-r from-success-400 to-green-500 bg-clip-text text-transparent">
                FinCore API Explorer
              </h1>
              <p className="text-14 text-gray-400">
                Tài liệu tích hợp hệ thống & Hướng dẫn sử dụng Open API local Sandbox (VND)
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-12 font-medium ${currentUser ? 'bg-success-500/10 text-success-400 border border-success-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${currentUser ? 'bg-success-400 animate-pulse' : 'bg-amber-400'}`}></span>
              {currentUser ? 'Đã đăng nhập (Cookie Active)' : 'Chưa đăng nhập'}
            </span>
            <Link href="/" className="rounded-lg px-4 py-2 border border-gray-800 text-14 text-gray-300 hover:bg-gray-900 transition-colors">
              Trở về Dashboard
            </Link>
          </div>
        </header>

        {/* API Info Card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-md p-6 space-y-4">
          <h2 className="text-18 font-bold text-white">Cách thức vận hành Sandbox</h2>
          <p className="text-14 text-gray-400 leading-relaxed">
            Hệ thống sandbox này hoàn toàn tự vận hành thông qua các Collection Appwrite địa phương, đã loại bỏ Dwolla và Plaid. Tiền tệ mặc định là Việt Nam Đồng (VND). Khi bạn đăng ký mới, hệ thống tự cấp số dư gốc là <strong>50.000.000 ₫</strong>. 
            Bạn có thể gọi trực tiếp các API này từ bên ngoài bằng cách sử dụng Cookie Session của trình duyệt hoặc test nhanh dưới đây.
          </p>
          <div className="flex gap-4 text-12 text-success-400">
            <div><strong>OpenAPI Spec:</strong> <a href="/api/v1/openapi.json" target="_blank" className="underline hover:text-success-300">/api/v1/openapi.json</a></div>
            <div>•</div>
            <div><strong>Base URL:</strong> <code>/api/v1</code></div>
          </div>
        </div>

        {/* API Explorer layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Endpoint List Selector */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-14 font-semibold text-gray-400 uppercase tracking-wider px-2">Danh sách API</h3>
            <div className="space-y-5">
              {GROUPS.map((group, groupIdx) => (
                <div key={groupIdx} className="space-y-2">
                  <h4 className="text-11 font-bold text-success-400 uppercase tracking-wider px-2 border-l-2 border-success-500 pl-2">
                    {group.name}
                  </h4>
                  <div className="space-y-1.5">
                    {group.indices.map((idx) => {
                      const endpoint = ENDPOINTS[idx];
                      return (
                        <button
                          key={idx}
                          onClick={() => setActiveTab(idx)}
                          className={`w-full text-left rounded-xl p-3 border transition-all duration-200 flex items-start gap-3 ${activeTab === idx ? 'bg-success-500/10 border-success-500/30 shadow-lg' : 'bg-gray-900 border-gray-850 hover:bg-gray-850'}`}
                        >
                          <span className={`inline-block text-10 font-bold px-2 py-0.5 rounded ${
                            endpoint.method === 'GET' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                            endpoint.method === 'POST' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                            endpoint.method === 'PATCH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                            'bg-red-500/20 text-red-400 border border-red-500/20'
                          }`}>
                            {endpoint.method}
                          </span>
                          <div className="space-y-0.5 min-w-0">
                            <div className="text-13 font-semibold text-white truncate">{endpoint.path}</div>
                            <div className="text-11 text-gray-400 truncate">{endpoint.summary}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Endpoint Live Playground Panel */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-6">
              {/* Endpoint Header info */}
              <div className="border-b border-gray-800 pb-4 space-y-2">
                <div className="flex items-center gap-3">
                  <span className={`text-12 font-bold px-2.5 py-1 rounded ${
                    ENDPOINTS[activeTab].method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                    ENDPOINTS[activeTab].method === 'POST' ? 'bg-emerald-500/20 text-emerald-400' :
                    ENDPOINTS[activeTab].method === 'PATCH' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {ENDPOINTS[activeTab].method}
                  </span>
                  <code className="text-16 font-bold text-success-400">{ENDPOINTS[activeTab].path}</code>
                </div>
                <h4 className="text-15 font-bold text-white">{ENDPOINTS[activeTab].summary}</h4>
                <p className="text-13 text-gray-400 leading-relaxed">{ENDPOINTS[activeTab].description}</p>
              </div>

              {/* Input Area (Request Body) */}
              {ENDPOINTS[activeTab].method !== 'GET' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-12 font-semibold text-gray-400 uppercase tracking-wider">Request Body (JSON)</label>
                    <button
                      onClick={() => handlePayloadChange(activeTab, ENDPOINTS[activeTab].defaultPayload || '')}
                      className="text-11 text-gray-500 hover:text-success-400 transition-colors"
                    >
                      Reset về mặc định
                    </button>
                  </div>
                  <textarea
                    value={payloads[activeTab]}
                    onChange={(e) => handlePayloadChange(activeTab, e.target.value)}
                    className="w-full h-44 rounded-xl border border-gray-800 bg-gray-950 p-4 font-mono text-12 text-success-300 outline-none focus:border-success-500 focus:ring-1 focus:ring-success-500"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => handleExecute(activeTab)}
                  disabled={loading[activeTab]}
                  className="rounded-xl bg-success-500 hover:bg-success-600 active:scale-95 disabled:opacity-50 text-black font-semibold text-14 px-6 py-2.5 transition-all flex items-center gap-2"
                >
                  {loading[activeTab] ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang xử lý...
                    </>
                  ) : (
                    'Execute API Call'
                  )}
                </button>
              </div>

              {/* Output Results Section */}
              {responses[activeTab].status && (
                <div className="space-y-2 border-t border-gray-800 pt-6 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center">
                    <span className="text-12 font-semibold text-gray-400 uppercase tracking-wider">Kết quả phản hồi</span>
                    <span className={`text-12 font-bold px-2 py-0.5 rounded ${responses[activeTab].status.startsWith('2') ? 'bg-success-500/10 text-success-400' : 'bg-red-500/10 text-red-400'}`}>
                      {responses[activeTab].status}
                    </span>
                  </div>
                  <pre className="w-full rounded-xl border border-gray-800 bg-gray-950 p-4 font-mono text-12 text-gray-300 overflow-x-auto max-h-64">
                    <code>{responses[activeTab].body}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
