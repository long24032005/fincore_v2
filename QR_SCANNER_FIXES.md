# 🔧 QR SCANNER - BUG FIXES

## ❌ VẤN ĐỀ TÌM ĐƯỢC:

### **1. Scanner Instance Management (CRITICAL BUG)**

**Vấn đề:**
```typescript
// ❌ SAI - Tạo instance mới mỗi lần
const startScanner = async () => {
  const html5QrCode = new Html5Qrcode("qr-reader"); // Instance #1
  await html5QrCode.start(...);
};

const stopScanner = async () => {
  const html5QrCode = new Html5Qrcode("qr-reader"); // Instance #2 (KHÁC!)
  if (html5QrCode.isScanning) { // ← Luôn FALSE vì #2 chưa start!
    await html5QrCode.stop(); // ← KHÔNG BAO GIỜ CHẠY!
  }
};
```

**Hậu quả:**
- Camera KHÔNG BAO GIỜ stop được
- Multiple scanner instances conflict với nhau
- Memory leak
- Camera bị lock

**Giải pháp:**
```typescript
// ✅ ĐÚNG - Dùng useRef để lưu 1 instance duy nhất
const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

const startScanner = async () => {
  if (!html5QrCodeRef.current) {
    html5QrCodeRef.current = new Html5Qrcode("qr-reader"); // Tạo 1 lần
  }
  await html5QrCodeRef.current.start(...); // Dùng instance đó
};

const stopScanner = async () => {
  if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
    await html5QrCodeRef.current.stop(); // ✅ Stop đúng instance!
    await html5QrCodeRef.current.clear();
  }
};
```

---

### **2. File Upload Scanner Instance**

**Vấn đề:**
```typescript
// File upload dùng ID khác nhưng không cleanup
const html5QrCode = new Html5Qrcode("qr-file-reader");
const result = await html5QrCode.scanFile(file, true);
// ❌ Không cleanup → memory leak
```

**Giải pháp:**
```typescript
const html5QrCode = new Html5Qrcode("qr-file-reader");
const result = await html5QrCode.scanFile(file, true);
await html5QrCode.clear(); // ✅ Cleanup
onScanSuccess(result);
```

---

## ✅ ĐÃ FIX:

### **File: `components/QRScanner.tsx`**

1. ✅ Thêm `useRef` import
2. ✅ Tạo `html5QrCodeRef` để lưu scanner instance
3. ✅ Kiểm tra instance tồn tại trước khi tạo mới
4. ✅ Dùng CÙNG 1 instance cho start/stop
5. ✅ Gọi `.clear()` khi stop để cleanup
6. ✅ Thêm div `#qr-file-reader` để file upload hoạt động
7. ✅ Cleanup file upload scanner sau khi scan

---

## 🎯 CÁCH KIỂM TRA:

### **Test Camera Scanner:**
1. Mở `/qr-transfer`
2. Click "Scan QR to Pay"
3. Click "Start Camera"
4. **Kiểm tra:**
   - Camera có bật không?
   - Có thấy live view không?
   - Quét QR code → Có nhận diện không?
5. Click "Stop Camera"
6. **Kiểm tra:**
   - Camera có TẮT không?
   - Có thể start lại không?

### **Test File Upload:**
1. Click "Upload QR Image"
2. Chọn ảnh QR code
3. **Kiểm tra:**
   - Có parse được data không?
   - Có hiện payment form không?

---

## 🐛 NẾU VẪN LỖI:

### **Lỗi: "Camera access denied"**
**Nguyên nhân:** Browser chặn camera
**Giải pháp:**
1. Click icon 🔒 hoặc ⓘ trên address bar
2. Allow camera permission
3. Reload page

### **Lỗi: "Could not read QR from image"**
**Nguyên nhân:**
- Ảnh không phải QR code hợp lệ
- QR code không phải Finecore format
- Ảnh quá mờ/nhỏ

**Test:** Dung QR code được generate từ "Show My QR Code"

---

## 📝 SUMMARY:

**Root cause:** Scanner instance được tạo mới mỗi lần thay vì reuse  
**Impact:** Camera không stop được, file upload fail  
**Fix:** Dùng `useRef` để lưu 1 instance duy nhất  
**Status:** ✅ FIXED  

---

**Giờ test lại xem!** 🚀
