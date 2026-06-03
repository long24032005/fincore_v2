# ĐỀ CƯƠNG CHI TIẾT BÁO CÁO DỰ ÁN FINTECH (PROJECT REPORT OUTLINE)
## Đề tài: Nâng cấp Hệ thống Ví điện tử Fincore Wallet với AI Robo-Advisor & Agentic Chatbot Tự chủ

Báo cáo này được cấu trúc chi tiết bám sát **tối đa 5 trang PDF** theo yêu cầu của giảng viên, phản ánh chính xác 100% lộ trình nâng cấp mã nguồn (XGBoost 13 features, OpenAPI VND, ReAct Chatbot).

---

### TRANG 1: TỔNG QUAN DỰ ÁN & EXECUTIVE SUMMARY

#### 1. Giới thiệu Dự án Fincore Wallet
* **Mô hình kinh doanh:** Ứng dụng quản lý tài chính cá nhân (PFM) và tích lũy thông minh dành cho giới trẻ Việt Nam.
* **Mục tiêu nâng cấp học kỳ này:** Tích hợp AI để chấm điểm tín dụng hành vi từ dữ liệu thay thế và tự động hóa tích lũy quỹ mở (VND) nhằm hướng tới việc tham gia Vườn ươm Khởi nghiệp UII.

#### 2. Vấn đề của Giải pháp Cũ & Sự cần thiết nâng cấp
* **Hạn chế của API nước ngoài (Plaid/Stripe/Dwolla):** Chỉ hỗ trợ USD, yêu cầu mã số an sinh xã hội Mỹ (SSN), giao dịch chậm (ACH 1-3 ngày), lỗi hiển thị tiền tệ không tương thích tại Việt Nam.
* **Hạn chế của Chatbot cũ:** Chỉ phản hồi tĩnh dựa trên từ khóa (rule-based), không có khả năng thực thi tác vụ tài chính thực tế hoặc kết nối cơ sở dữ liệu động.
* **Giải pháp mới:** Tự chủ công nghệ bằng cách xây dựng **OpenAPI Server riêng** xử lý nội địa hóa tiền tệ (VND) và triển khai **Trợ lý Agentic AI** tương tác logic sâu.

---

### TRANG 2: PHƯƠNG PHÁP LUẬN AI (AI METHODOLOGY) - PHẦN 1
*Trọng tâm: Thu thập và Phân tích Dữ liệu thay thế (Alternative Data)*

#### 1. Khung lý thuyết 13 Chỉ số Hành vi (Behavioral Features)
Báo cáo chi tiết cách hệ thống tự động đo lường thói quen của người dùng thông qua 3 nhóm biến thay vì bắt điền khảo sát rủi ro truyền thống:
* **Nhóm 1: Khả năng chịu rủi ro dòng tiền thực tế**
  * `income_regularity_index` (Độ ổn định thu nhập): Tính từ tần suất nạp tiền lương hàng tháng trong Appwrite DB.
  * `liquidity_buffer_ratio` (Đệm thanh khoản): Số dư ví chia cho mức chi tiêu trung bình 30 ngày.
  * `immediate_cash_out_rate` (Rút tiền khẩn cấp): Tỷ lệ tiền rút ngay trong 2h sau khi nạp ví.
  * `p2p_network_density` (Mạng lưới giao dịch): Số tài khoản giao dịch độc nhất trong 90 ngày.
* **Nhóm 2: Thái độ chấp nhận rủi ro tâm lý**
  * `discretionary_spend_ratio` (Chi tiêu không thiết yếu): Tỷ lệ mua sắm, giải trí trong tổng chi tiêu.
  * `impulse_purchase_index` (Mua sắm bốc đồng): Tần suất mua sắm ngoài giờ hành chính.
  * `late_night_spend_ratio` (Tiêu dùng đêm muộn): Tỷ lệ giao dịch phát sinh từ 23h - 5h sáng.
  * `onboarding_attention_score` (Độ tập trung): Thời gian đọc trang Cảnh báo rủi ro trên Frontend.
  * `balance_check_frequency` (Tần suất check ví): Số lần tải số dư/ngày (đo lường tâm lý lo âu).
* **Nhóm 3: Kỷ luật tích lũy & Trách nhiệm**
  * `save_after_payday_ratio` (Tích lũy sau lương): Tỷ lệ tiền chuyển vào quỹ đầu tư trong 48h sau khi nhận lương.
  * `auto_save_completion_rate` (Tỷ lệ Autopilot thành công): Tỷ lệ lệnh tự động tích lũy thực thi thành công.
  * `bill_on_time_rate` (Đóng hóa đơn đúng hạn): Đo lường kỷ luật thanh toán qua Mock API hóa đơn tiện ích.
  * `low_battery_transaction` (Giao dịch pin yếu): Hành vi bấm xác nhận đầu tư khi pin thiết bị dưới 10% (đo lường mức độ khẩn cấp/bốc đồng).

#### 2. Kỹ thuật Tiền xử lý & Tổng hợp dữ liệu (Feature Engineering)
* Trình bày công thức nén hàng nghìn giao dịch thô về một dòng 13 đặc trưng duy nhất cho mỗi user bằng 4 phép toán: Tỷ lệ (Ratio), Tần suất (Count), Biến động (Volatility), và Thời điểm (Snapshot).

---

### TRANG 3: PHƯƠNG PHÁP LUẬN AI (AI METHODOLOGY) - PHẦN 2
*Trọng tâm: K-Means Clustering, XGBoost và Trực quan hóa SHAP Values*

#### 1. Quy trình gán nhãn tự động bằng K-Means (Unsupervised Labeling)
* Giải thích giải pháp vượt qua bài toán **Cold Start hệ thống** khi chưa có sẵn nhãn rủi ro của khách hàng.
* Chạy K-Means Clustering trên tập dữ liệu 10,000 người dùng ảo để gom thành 3 cụm hành vi rõ rệt.
* Đội ngũ phân tích đặt tên cụm theo đặc điểm trung bình: Thận trọng (Conservative), Cân bằng (Balanced), Mạo hiểm (Aggressive). Nhãn này được gán ngược lại làm nhãn huấn luyện ($y$).

#### 2. Huấn luyện mô hình XGBoost Classifier
* Sử dụng mô hình XGBoost được huấn luyện trên 10,000 mẫu để nhận diện nhóm rủi ro của người dùng mới dựa trên 13 chỉ số hành vi.
* Trình bày công thức quy đổi xác suất dự đoán của mô hình thành điểm số tài chính **Fincore Credit Score (300-850)**.

#### 3. Giải thích Mô hình bằng SHAP Values (Explainable AI - XAI)
* Phân tích cách tích hợp thư viện SHAP để bóc tách đóng góp của từng hành vi vào kết quả điểm số (ví dụ: việc trích lương đầu tư đều đặn giúp tăng bao nhiêu điểm, việc đóng hóa đơn nước trễ hạn làm giảm bao nhiêu điểm).
* Minh họa cách hiển thị biểu đồ giải thích trực quan trên giao diện ứng dụng để tăng tính minh bạch và độ tin cậy.

---

### TRANG 4: KIẾN TRÚC MÁY CHỦ OPENAPI & NỘI ĐỊA HÓA (SERVER ARCHITECTURE)

#### 1. Kiến trúc Máy chủ Tự dựng (Next.js API Routes + Python FastAPI)
* Sơ đồ luồng dữ liệu Client-Server khép kín.
* Chi tiết các API Endpoint cung cấp dữ liệu phân tích AI và giao dịch VND:
  * `GET /api/v1/openapi.json`: Cung cấp file đặc tả OpenAPI Spec.
  * `GET /api/v1/alternative-data/credit-score`: Trả về kết quả chấm điểm tín dụng hành vi và bài phân tích Gemini.
  * `POST /api/v1/transfers`: API thực hiện giao dịch chuyển khoản đầu tư bằng tiền VND nội địa.
  * `GET /api/v1/automations`: Quản lý các lệnh Autopilot tích lũy.

#### 2. Giải pháp Khắc phục Vấn đề Tiền tệ (VND Localization)
* Chi tiết việc định dạng tiền tệ thông qua hàm `formatAmount` hiển thị đúng đơn vị VND (`₫`).
* Kết nối trực tiếp với Database Appwrite đóng vai trò Sổ cái giao dịch nội bộ (Local Ledger) thay thế hoàn toàn Plaid/Dwolla.

#### 3. Cơ chế Vận hành Đầu tư & Tự động hóa an toàn
* **One-click Portfolio Investment:** Cách thuật toán Frontend chia nhỏ số tiền đầu tư và thực hiện các lệnh mua song song theo tỷ lệ phân bổ của AI.
* **AI Autopilot Control Panel:** Thiết kế bảng điều khiển cho phép người dùng kiểm soát bật/tắt (Toggle) và xóa các lệnh đầu tư tự động nhằm bảo đảm an toàn tài chính (ngăn chặn AI tự ý chuyển tiền ngầm).

---

### TRANG 5: CHATBOT AI CHỦ ĐỘNG, LỘ TRÌNH KINH DOANH & KẾT LUẬN

#### 1. Trợ lý ảo Agentic AI với Gemini API
* **Function Calling / Tool Use:** Chatbot được trang bị các công cụ kết nối trực tiếp với backend OpenAPI (`get_balance`, `pay_utility_bill`, `create_autopilot_rule`...).
* **Quy trình suy luận ReAct:** Phân tích luồng chatbot tự động xử lý yêu cầu phức tạp của khách hàng (ví dụ: quét hóa đơn quá hạn $\rightarrow$ thanh toán $\rightarrow$ đầu tư số dư thừa).
* **Bảo mật Human-in-the-loop:** Thiết kế Interactive Confirmation Card giúp người dùng kiểm tra thông tin và chủ động bấm nút "Xác nhận" giao dịch trực tiếp trong khung chat.

#### 2. Lộ trình phát triển sản phẩm & Tính khả thi kinh doanh (UII Incubator)
* **Mô hình doanh thu:** Không chịu rủi ro nợ xấu (chỉ quản lý và tích lũy tiền tự có), dòng thu từ phí quản lý tài sản dài hạn (AUM Fee) và hoa hồng từ các công ty quản lý quỹ liên kết tại Việt Nam (VinaCapital, Dragon Capital).
* **Lộ trình 12 tháng:**
  * *Tháng 1-3:* Thử nghiệm MVP Alpha tại UII, thu thập dữ liệu thật để huấn luyện lại mô hình.
  * *Tháng 4-6:* Kết nối API chính thức với các quỹ mở đối tác và UOB Việt Nam.
  * *Tháng 7-12:* Thương mại hóa cổng API chấm điểm tín dụng hành vi (Alternative Credit Scoring) cho các ứng dụng tiêu dùng khác.

#### 3. Kết luận
* Khẳng định tính đổi mới sáng tạo của Fincore Wallet trong việc ứng dụng AI và OpenAPI tự chủ nhằm mang lại giải pháp tài chính an toàn, cá nhân hóa cho người dùng Việt Nam.
