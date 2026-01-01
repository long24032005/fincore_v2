# HƯỚNG DẪN IMPLEMENT E-WALLET - CHỈ TIẾT TỪNG BƯỚC

## ✅ ĐÃ HOÀN THÀNH

### ✅ Bước 1: Update Database Schema (PHẢI LÀM MANUAL)
**Bạn cần làm thủ công trong Appwrite Console:**
1. Vào https://nyc.cloud.appwrite.io/console
2. Login vào project
3. Databases → Chọn database của bạn → Collection `users`
4. Click "Create Attribute" → Chọn **Float**:
   - Key: `balance`
   - Type: Float
   - Default value: `0`
   - Required: Yes
5. Click "Create" và đợi attribute được tạo (1-2 phút)

### ✅ Bước 2: Update TypeScript Types
**Đã tự động hoàn thành!**  
File: `types/index.d.ts`  
Đã thêm: `balance: number;` vào User type

### ✅ Bước 3: Update Sign Up Flow  
**Đã tự động hoàn thành!**  
File: `lib/actions/user.actions.ts`  
Đã thêm: `balance: 0` khi tạo user mới

### ✅ Bước 4: Tạo Wallet Actions  
**Đã tự động hoàn thành!**  
File: `lib/actions/wallet.actions.ts` đã được tạo với 2 functions:
- `transferBalance()` - Chuyển tiền tức thì
- `getUserBalance()` - Lấy số dư ví

---

## 🔧 BỊ PHẢI LÀM MANUAL

### Bước 5: Sửa PaymentTransferForm.tsx

**File:** `components/PaymentTransferForm.tsx`

**THAY ĐỔI 1: Import (dòng 10-11)**\n```typescript
// CŨ (XÓA ĐI):
import { createTransfer } from "@/lib/actions/dwolla.actions";
import { createTransaction } from "@/lib/actions/transaction.actions";

// MỚI (THAY BẰNG):
import { transferBalance } from "@/lib/actions/wallet.actions";
```

**THAY ĐỔI 2: Submit Function (dòng 52-95)**

Thay thế TOÀN BỘ function `submit` từ dòng 52 đến dòng 95 bằng code này:

```typescript
  const submit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      const receiverAccountId = decryptId(data.sharableId);
      const receiverBank = await getBankByAccountId({
        accountId: receiverAccountId,
      });
      const senderBank = await getBank({ documentId: data.senderBank });

      if (!receiverBank || !senderBank) {
        alert("Invalid bank account");
        setIsLoading(false);
        return;
      }

      // ✅ E-WALLET TRANSFER - Update balance TỨC THÌ
      const result = await transferBalance({
        senderId: senderBank.userId,
        receiverId: receiverBank.userId,
        amount: parseFloat(data.amount),
        description: data.name,
        email: data.email,
      });

      if (result && result.success) {
        alert(`✅ Transfer successful! Your new balance: $${result.newBalance.toFixed(2)}`);
        form.reset();
        router.push("/");
      }
    } catch (error: any) {
      // ✅ Hiển thị lỗi rõ ràng cho user
      console.error("Transfer failed:", error);
      alert(`❌ Transfer failed: ${error.message || "Unknown error"}`);
    }

    setIsLoading(false);
  };
```

**CÁC THỨ XÓA ĐI:**
- Dòng `const transferParams = {...}`
- Dòng `const transfer = await createTransfer(transferParams);`
- Toàn bộ block `if (transfer) {...}` với `createTransaction`

---

## 📋 CHECKLIST KIỂM TRA

Sau khi sửa xong, kiểm tra:

1. ✅ Appwrite `users` collection có field `balance` (type Float)
2. ✅ File `types/index.d.ts` có `balance: number` trong User type
3. ✅ File `lib/actions/wallet.actions.ts` tồn tại và không có lỗi TypeScript
4. ✅ File `components/PaymentTransferForm.tsx`:
   - Import `transferBalance` từ wallet.actions
   - KHÔNG import `createTransfer` và `createTransaction`
   - Submit function gọi `transferBalance()`
   - KHÔNG còn gọi `createTransfer()` hay `createTransaction()`

---

## 🧪 TEST

Sau khi hoàn thành:

1. **Tạo 2 users mới** (hoặc update existing users có balance)
2. **Test transfer:**
   ```
   User A: balance = $100
   User B: balance = $50
   
   User A chuyển $30 cho User B
   
   KẾT QUẢ MONG ĐỢI:
   ✅ Alert hiển thị: "Transfer successful! Your new balance: $70"
   ✅ Refresh app:
      - User A balance: $70
      - User B balance: $80
   ✅ Transaction được lưu vào database
   ```

3. **Test insufficient balance:**
   ```
   User A: balance = $20
   Thử chuyển $100
   
   KẾT QUẠ MONG ĐỢI:
   ❌ Alert: "Transfer failed: Insufficient balance. You have $20, but trying to send $100"
   ❌ Balance KHÔNG ĐỔI
   ```

---

## 🎯 LỢI ÍCH SAU KHI HOÀN THÀNH

### TRƯỚC (Dwolla):
- ❌ Chuyển tiền mất 1-3 ngày
- ❌ Balance không đổi ngay
- ❌ User thấy tiền còn → Spam transactions
- ❌ Mất phí $0.25/transaction

### SAU (E-Wallet):
- ✅ Chuyển tiền TỨC THÌ (< 1 giây)
- ✅ Balance cập nhật NGAY LẬP TỨC
- ✅ Kiểm tra số dư TRƯỚC KHI chuyển
- ✅ FREE (không mất phí)
- ✅ UX giống Momo/ZaloPay

---

## 💡 LƯU Ý QUAN TRỌNG

1. **Balance chỉ tồn tại trong app:**
   - User KHÔNG THỂ rút ra ATM
   - Cần tạo tính năng "Nạp tiền" (deposit from bank)
   - Cần tạo tính năng "Rút tiền" (withdraw to bank)

2. **Plaid/Dwolla vẫn còn vai trò:**
   - Plaid: Kết nối ngân hàng, xem transactions thật
   - Dwolla: Dùng cho Nạp/Rút tiền (không dùng cho transfer nội bộ nữa)

3. **Database migration cho users cũ:**
   - Nếu có users đã tồn tại, balance sẽ là `null`
   - Cần set default = 0 hoặc cho users nạp tiền lần đầu

---

## 🚀 BƯỚC TIẾP THEO (OPTIONAL)

Sau khi e-wallet hoạt động, bạn có thể:

1. **Thêm UI hiển thị balance:**
   - Tạo component `WalletBalance.tsx`
   - Hiển thị ở homepage dashboard

2. **Tạo trang Deposit (Nạp tiền):**
   - User chọn ngân hàng đã kết nối
   - Chuyển tiền từ bank → wallet (qua Dwolla)
   - Cộng vào balance

3. **Tạo trang Withdraw (Rút tiền):**
   - User nhập số tiền muốn rút
   - Chuyển từ wallet → bank (qua Dwolla)
   - Trừ balance

4. **Real-time notifications:**
   - WebSocket/SSE cho real-time updates
   - Push notification khi nhận tiền

---

**BẠN CÓ THẮC MẮC GÌ VỀ CÁC BƯỚC TRÊN KHÔNG?** 💬
