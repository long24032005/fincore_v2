# 🐛 BUG FIX #4: Chatbot Quên Amount Sau Disambiguation

## ❌ **VẤN ĐỀ:**

**User flow:**
1. User gõ: "i want to transfer **1 dollar** to lana ngo"
2. Chatbot tìm thấy 2 recipients tên "lana ngo" → Hỏi chọn cái nào
3. User click chọn "1. lana ngo (wallet)"
4. Chatbot hỏi lại: "**How much** would you like to send?" ❌

**Expected:** Chatbot nhớ amount = $1 từ tin nhắn đầu, không hỏi lại!

---

## 🔍 **NGUYÊN NHÂN:**

### Flow cũ:
```typescript
handleTransferIntent(entities) {
    // entities = { recipientNickname: "lana ngo", amount: 1 }
    
    if (matchingRecipients.length > 1) {
        // Show disambiguation buttons
        addAssistantMessage("Which one?", buttons);
        return; // ← ENTITIES BỊ MẤT TẠI ĐÂY!
    }
}

// Khi user click button chọn recipient:
handleButtonClick(button) {
    if (button.type === 'recipient') {
        const recipient = findRecipient(button.value);
        // ❌ KHÔNG CÒN AMOUNT NỮA! entities đã mất
        addAssistantMessage(`How much to send to ${recipient}?`);
    }
}
```

**Vấn đề:** 
- `entities` (bao gồm `amount: 1`) chỉ tồn tại trong scope của `handleTransferIntent()`
- Khi return để show disambiguation, `entities` bị "quên"
- Khi user click button chọn recipient, không còn access `amount` nữa!

---

## ✅ **GIẢI PHÁP:**

### 1. Thêm State Lưu Entities
```typescript
const [pendingEntities, setPendingEntities] = useState<any>(null);
```

### 2. Lưu Entities Khi Có Disambiguation
```typescript
if (matchingRecipients.length > 1) {
    // IMPORTANT: Save the entities so we don't lose amount!
    setPendingEntities(entities); // ✅ Lưu lại!
    console.log('💾 [Transfer Intent] Saved pending entities:', entities);
    
    addAssistantMessage("Which one?", buttons);
    return;
}
```

### 3. Dùng Lại Amount Khi User Chọn Recipient
```typescript
handleButtonClick(button) {
    if (button.type === 'recipient') {
        const recipient = findRecipient(button.value);
        const amount = pendingEntities?.amount; // ✅ Lấy lại amount đã lưu!
        
        if (!amount || amount <= 0) {
            // No amount saved - ask for it
            addAssistantMessage(`How much to send to ${recipient}?`);
            setPendingEntities(null);
        } else {
            // Amount exists - proceed to source selection!
            console.log('✅ [Using Saved Amount]', amount);
            
            // Show source buttons (wallet/bank)
            addAssistantMessage(
                `Send $${amount} to ${recipient}.\n\nSelect payment source:`,
                sourceButtons
            );
            
            // Clear after using
            setPendingEntities(null);
        }
    }
}
```

---

## 🎯 **FLOW SAU KHI FIX:**

### Scenario: "Transfer 1 dollar to lana ngo" (2 recipients tên lana ngo)

```
1. User: "i want to transfer 1 dollar to lana ngo"
   ↓
2. AI extracts: { recipientNickname: "lana ngo", amount: 1 }
   ↓
3. Find recipients matching "lana ngo" → Found 2!
   ↓
4. 💾 Save entities to state: setPendingEntities({ amount: 1, ... })
   ↓
5. Show: "I found 2 recipients. Which one?"
   [1. lana ngo (wallet)] [2. lana ngo (qr)]
   ↓
6. User clicks: "1. lana ngo (wallet)"
   ↓
7. ✅ Retrieve amount from state: amount = pendingEntities.amount = 1
   ↓
8. Show: "Send $1.00 to lana ngo. Select payment source:"
   [💰 Wallet] [🏦 Bank]
   ↓
9. User clicks: "💰 Wallet"
   ↓
10. Show confirmation: "Review your transfer..."
```

**✅ Amount không bị quên!**

---

## 🧪 **TEST CASES:**

### Test 1: Disambiguation với Amount ✅
```
User: "transfer 1 dollar to lana ngo"
Recipients: ["lana ngo (wallet)", "lana ngo (qr)"]

Flow:
1. AI extracts amount = 1
2. Save to pendingEntities
3. User chọn "lana ngo (wallet)"
4. Use saved amount → Show source selection
5. ✅ NO "How much?" question!
```

### Test 2: Disambiguation không có Amount ✅
```
User: "transfer to lana ngo"  (no amount!)
Recipients: ["lana ngo (wallet)", "lana ngo (qr)"]

Flow:
1. AI extracts amount = null
2. Save to pendingEntities
3. User chọn "lana ngo (wallet)"
4. No saved amount → Ask "How much?"
5. ✅ Correct behavior!
```

### Test 3: Single Match với Amount ✅
```
User: "transfer 1 dollar to John"
Recipients: ["John Doe"]  (only 1)

Flow:
1. AI extracts amount = 1
2. No disambiguation needed
3. Directly show source selection
4. ✅ Works as before!
```

---

## 📊 **DEBUG LOGS:**

**Khi có disambiguation:**
```
💾 [Transfer Intent] Saved pending entities for disambiguation: {
  recipientNickname: "lana ngo",
  amount: 1
}
```

**Khi user chọn recipient:**
```
👤 [Recipient Selected] lana ngo
💰 [Pending Entities] { recipientNickname: "lana ngo", amount: 1 }
✅ [Using Saved Amount] 1
```

---

## 🎯 **KẾT QUẢ:**

**Trước:**
- ❌ Hỏi "How much?" dù đã nói amount
- ❌ User phải gõ lại amount
- ❌ Poor UX

**Sau:**
- ✅ Nhớ amount từ tin nhắn đầu
- ✅ Skip bước hỏi amount
- ✅ Flow mượt mà, UX tốt hơn

---

## 📁 **FILE ĐÃ SỬA:**

- ✅ `components/Chatbot/ChatbotWindow.tsx`
  - Added `pendingEntities` state
  - Save entities before disambiguation
  - Restore amount when recipient selected
  - Smart fallback if no amount

---

**Date:** 2026-01-01  
**Status:** ✅ FIXED  
**Impact:** MEDIUM - Better UX, no more redundant questions
