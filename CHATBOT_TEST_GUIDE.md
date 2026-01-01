# 🧪 QUICK TEST GUIDE - CHATBOT FIXES

## 🎯 TEST NGAY ĐỂ VERIFY

### Test 1: Check Context Loading ✅

**Mở chatbot** → Check browser console:

```
✅ Phải thấy logs này:
🔍 [Chatbot Context] Loading context for userId: ...
💰 [Chatbot Context] Wallet balance: ...
👥 [Chatbot Context] Saved recipients mapped: X
   Recipients list: "Linda Ngo" (lindango@gmail.com), ...
✅ [Chatbot Context] Context loaded successfully: ...
```

❌ **Nếu thấy:** `savedRecipientsCount: 0` → Lỗi vẫn tồn tại
✅ **Nếu thấy:** `savedRecipientsCount: 1` (hoặc > 0) → **BUG #2 ĐÃ FIX!**

---

### Test 2: Check AI Extraction ✅

**Gõ trong chatbot:**
```
i want to transfer 1 dollar to Linda Ngo
```

**Check console logs:**

```
✅ Phải thấy:
🤖 [AI Parse] User message: i want to transfer 1 dollar to Linda Ngo
📋 [AI Parse] Available recipients: 1
👥 [AI Parse] Recipient list for AI:
 1. "Linda Ngo" (Name: Linda Ngo, Email: lindango@gmail.com, Type: wallet)
🔍 [AI Parse] Raw AI response: {"intent": "transfer_money", ...}
✅ [AI Parse] Parsed result: {
  "intent": "transfer_money",
  "entities": {
    "recipientNickname": "Linda Ngo",  ← PHẢI CÓ TÊN, KHÔNG NULL!
    "amount": 1
  }
}
```

❌ **Nếu:** `recipientNickname: null` → Check xem có trigger regex fallback không
✅ **Nếu:** `recipientNickname: "Linda Ngo"` → **BUG #1 ĐÃ FIX!**

---

### Test 3: Regex Fallback (Nếu AI fail)

Nếu AI trả về null, phải thấy:

```
⚠️  [AI Parse] AI missed recipient, trying regex fallback...
🎯 [Regex Fallback] Extracted name: Linda Ngo
✅ [Regex Fallback] Matched recipient: Linda Ngo
```

→ Recipient sẽ được extract bởi regex backup!

---

### Test 4: UI Confirmation

**Sau khi gõ message** → Chatbot phải hiện:

```
✅ Transfer Confirmation Card với:
- Recipient: Linda Ngo
- Amount: $1.00
- [Confirm] [Cancel] buttons
```

❌ **Nếu thấy:** "Recipient not found" → Lỗi vẫn tồn tại
✅ **Nếu thấy:** Transfer card đầy đủ → **HOÀN TOÀN FIX!**

---

## 🔍 TROUBLESHOOTING

### Vấn đề: savedRecipientsCount vẫn = 0

**Nguyên nhân có thể:**
1. Database không có recipient nào cho user này
2. API `getSavedRecipients()` bị lỗi

**Cách check:**
```javascript
// Trong getSavedRecipients function, xem có error không
Get saved recipients error: ...
```

**Solution:**
- Kiểm tra database có data không
- Verify `SAVED_RECIPIENTS_COLLECTION_ID` trong .env
- Check Appwrite permissions

---

### Vấn đề: AI vẫn trả về recipientNickname: null

**Cách check:**
```
🔍 [AI Parse] Raw AI response: ...
```

Xem AI response có đúng format không.

**Nếu regex fallback cũng fail:**
- Check xem recipient name trong message có khớp với saved recipients không
- Thử message đơn giản hơn: "transfer 1 to Linda Ngo"

---

## ✅ SUCCESS CRITERIA

Chatbot hoạt động đúng khi:

1. ✅ Context load có recipients (count > 0)
2. ✅ AI extract đúng recipient name
3. ✅ Hoặc regex fallback extract được (nếu AI fail)
4. ✅ UI hiện transfer confirmation đúng
5. ✅ Có thể confirm và transfer thành công

---

## 🎉 ALL TESTS PASS = BUG FIXED!

Nếu cả 4 tests trên đều pass → **Chatbot đã hoạt động hoàn hảo!**

Enjoy your AI chatbot! 🚀
