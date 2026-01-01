# 🎯 CHECKLIST - IMPLEMENT E-WALLET CHO BANKING APP

## ✅ TỰ ĐỘNG HOÀN THÀNH (Code đã được tạo)

- [x] **Tạo wallet.actions.ts** với functions:
  - `transferBalance()` - Chuyển tiền tức thì
  - `getUserBalance()` - Lấy số dư ví
  
- [x] **Update TypeScript types**: Thêm `balance: number` vào User type

- [x] **Update signUp function**: Auto set `balance: 0` khi tạo user mới

## ⏳ CẦN LÀM MANUAL (Bạn phải tự làm)

### 1. UPDATE APPWRITE DATABASE ⭐ QUAN TRỌNG NHẤT

**Truy cập:** https://nyc.cloud.appwrite.io/console

**Các bước:**
- [ ] Login vào Appwrite Console
- [ ] Chọn Database của bạn
- [ ] Vào collection **`users`**
- [ ] Click **"Create Attribute"** → Chọn **Float**
- [ ] Điền thông tin:
  ```
  Key: balance
  Type: Float
  Size: Default
  Default value: 0
  Required: Yes
  ```
- [ ] Click "Create"
- [ ] **ĐỢI 1-2 PHÚT** cho đến khi status = "Available" (màu xanh)

---

### 2. SỬA FILE: components/PaymentTransferForm.tsx

**Mở file:** `components/PaymentTransferForm.tsx` trong VS Code

#### BƯỚC 2.1: Sửa Import (dòng 10-11)

**TÌM code này (dòng 10-11):**
```typescript
import { createTransfer } from "@/lib/actions/dwolla.actions";
import { createTransaction } from "@/lib/actions/transaction.actions";
```

**THAY BẰNG:**
```typescript
import { transferBalance } from "@/lib/actions/wallet.actions";
```

**HOẶC** đơn giản hơn, tìm dòng:
```typescript
import { createTransfer } from "@/lib/actions/dwolla.actions";
```

Và chuyển thành:
```typescript
import { transferBalance } from "@/lib/actions/wallet.actions";
```

Rồi **XÓA** dòng:
```typescript
import { createTransaction } from "@/lib/actions/transaction.actions";
```

---

#### BƯỚC 2.2: Thay Submit Function (dòng 52-95)

**TÌM code này:**
```typescript
const submit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      const receiverAccountId = decryptId(data.sharableId);
      const receiverBank = await getBankByAccountId({
        accountId: receiverAccountId,
      });
      const senderBank = await getBank({ documentId: data.senderBank });

      const transferParams = {
        sourceFundingSourceUrl: senderBank.fundingSourceUrl,
        destinationFundingSourceUrl: receiverBank.fundingSourceUrl,
        amount: data.amount,
      };
      // create transfer
      const transfer = await createTransfer(transferParams);

      // create transfer transaction
      if (transfer) {
        const transaction = {
          name: data.name,
          amount: data.amount,
          senderId: senderBank.userId.$id,
          senderBankId: senderBank.$id,
          receiverId: receiverBank.userId.$id,
          receiverBankId: receiverBank.$id,
          email: data.email,
          category: "Transfer",
        };

        const newTransaction = await createTransaction(transaction);

        if (newTransaction) {
          form.reset();
          router.push("/");
        }
      }
    } catch (error) {
      console.error("Submitting create transfer request failed: ", error);
    }

    setIsLoading(false);
  };
```

**COPY code từ file `SNIPPET_PaymentTransferForm_submit.tsx` và PASTE thay thế toàn bộ!**

---

### 3. CHO USERS CŨ NẠP TIỀN KHỞI ĐẦU (Optional)

Nếu đã có users trong database, balance của họ sẽ là `null`.

**Option A:** Manual update trong Appwrite Console
- Vào Database → users collection
- Click từng user document
- Thêm/sửa field `balance` = `100` (hoặc số tiền bất kỳ)

**Option B:** Code migration script
```typescript
// Tạo script riêng để update all users
const updateAllUserBalances = async () => {
  const { database } = await createAdminClient();
  const users = await database.listDocuments(DATABASE_ID!, USER_COLLECTION_ID!);
  
  for (const user of users.documents) {
    if (!user.balance) {
      await database.updateDocument(
        DATABASE_ID!,
        USER_COLLECTION_ID!,
        user.$id,
        { balance: 100 } // Give $100 starting balance
      );
    }
  }
};
```

---

## 🧪 TESTING

### Test Case 1: Transfer Thành Công

**Setup:**
- User A: balance = $100
- User B: balance = $50

**Action:**
1. Login as User A
2. Vào trang Transfer
3. Chọn bank của User A
4. Nhập shareable ID của User B
5. Nhập amount: $30
6. Click "Transfer Funds"

**Expected Result:**
- ✅ Alert: "Transfer successful! Your new balance: $70.00"
- ✅ Redirect về homepage
- ✅ Refresh → User A balance: $70
- ✅ Login as User B → balance: $80
- ✅ Transaction history có record mới

---

### Test Case 2: Insufficient Balance

**Setup:**
- User A: balance = $20

**Action:**
1. Login as User A
2. Thử transfer $100

**Expected Result:**
- ❌ Alert: "Transfer failed: Insufficient balance. You have $20, but trying to send $100"
- ❌ Balance KHÔNG đổi, vẫn là $20
- ❌ Transaction KHÔNG được tạo

---

## 🐛 TROUBLESHOOTING

### Lỗi: "Cannot find module '@/lib/actions/wallet.actions'"

**Nguyên nhân:** File chưa được lưu hoặc path sai

**Giải pháp:**
- Kiểm tra file `lib/actions/wallet.actions.ts` có tồn tại không
- Restart TypeScript server: Ctrl+Shift+P → "TypeScript: Restart TS Server"

---

### Lỗi: "Property 'balance' does not exist on type 'Document'"

**Nguyên nhân:** Chưa update User type hoặc chưa cast type

**Giải pháp:**
- Kiểm tra `types/index.d.ts` có `balance: number` trong User type
- File `wallet.actions.ts` đã có `as unknown as User` type casting

---

### Lỗi: "Cannot read properties of null (reading 'userId')"

**Nguyên nhân:** Bank không tồn tại hoặc shareable ID sai

**Giải pháp:**
- Kiểm tra shareable ID đúng format (base64)
- Thêm null check trong submit function (code mới đã có)

---

### Balance không update

**Nguyên nhân:**
1. Appwrite attribute chưa được tạo
2. User document không có field balance
3. Lỗi trong transferBalance function

**Giải pháp:**
1. Vào Appwrite Console → users collection → Check attribute "balance" tồn tại
2. Mở 1 user document → Check có field balance không
3. Check console log có lỗi không
4. Test API trực tiếp bằng Postman/Thunder Client

---

## ✨ SAU KHI HOÀN THÀNH

**Bạn đã thành công implement e-wallet! 🎉**

**Tiếp theo có thể làm:**
- Hiển thị balance trên homepage
- Tạo trang Deposit (nạp tiền từ bank)
- Tạo trang Withdraw (rút tiền về bank)
- QR code cho transfer nhanh
- Real-time notifications

**Bây giờ app của bạn hoạt động giống Momo/ZaloPay rồi!** 💪
