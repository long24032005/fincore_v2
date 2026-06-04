# Sử dụng Python image chính thức làm nền tảng (slim version nhẹ và tối ưu)
FROM python:3.10-slim

# Cài đặt các công cụ hệ thống cần thiết (như git để download model từ HF)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Sao chép file requirements.txt
COPY requirements.txt .

# Cài đặt các thư viện phụ thuộc
RUN pip install --no-cache-dir -r requirements.txt

# Thiết lập thư mục lưu cache model của Hugging Face vào /tmp để tránh lỗi ghi quyền (Permission Denied)
ENV HF_HOME=/tmp/hf_cache

# Sao chép toàn bộ mã nguồn và mô hình đã được huấn luyện vào container
COPY . .

# Đảm bảo phân quyền ghi cho các thư mục tạm nếu chạy dưới User không có quyền root (HF Spaces mặc định chạy User ID 1000)
RUN chmod -R 777 /app

# Mở cổng 7860 (Hugging Face Spaces mặc định ánh xạ ứng dụng thông qua cổng này)
EXPOSE 7860

# Khởi chạy ứng dụng uvicorn trên host 0.0.0.0 và port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
