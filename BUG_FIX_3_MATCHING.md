# 🐛 BUG FIX #3: Matching Sai Recipient

## ❌ **VẤN ĐỀ:**

User đang dùng tài khoản **Linda Ngo**, gõ: "transfer 1 dollar to Linda Ngo"

**Expected:** Không tìm thấy recipient (vì Linda Ngo là chính user, không có trong saved recipients)

**Actual:** Tìm thấy **"lana ngo"** (SAI!)

---

## 🔍 **NGUYÊN NHÂN:**

### **Lỗi 1: AI Extract Null**
AI không extract được recipient name → trả về `recipientNickname: null`

### **Lỗi 2: Matching Logic Quá Lỏng**

Code cũ (line 149-150):
```typescript
const matchingRecipients = context.savedRecipients.filter(r =>
    r.nickname.toLowerCase().includes(recipientNickname?.toLowerCase() || '')
);
```

**Vấn đề:**
1. `.includes('')` = **TRUE cho TẤT CẢ strings!**
   - Khi `recipientNickname = null` → `recipientNickname?.toLowerCase() || ''` = `''`
   - `"lana ngo".includes('')` = **TRUE** ✅
   - `"any string".includes('')` = **TRUE** ✅

2. **Matching không chính xác:**
   - `"lana ngo".includes("lan")` = **TRUE** 
   - `"lana ngo".includes("ana")` = **TRUE**
   - Có thể match nhầm recipients!

---

## ✅ **GIẢI PHÁP:**

### **1. Validate Input**
```typescript
// Reject null/empty/invalid recipient names
if (!recipientNickname || recipientNickname.trim() === '' || recipientNickname === 'null') {
    addAssistantMessage('I couldn't detect a recipient name...');
    return;
}
```

### **2. Exact Match First**
```typescript
// Try EXACT match first (most accurate)
let matchingRecipients = context.savedRecipients.filter(r =>
    r.nickname.toLowerCase() === normalizedSearch ||
    r.name.toLowerCase() === normalizedSearch
);
```

**Priority:**
- "Linda Ngo" chỉ match với "Linda Ngo" hoặc "linda ngo" (case-insensitive)
- "Linda Ngo" **KHÔNG** match với "lana ngo" ❌

### **3. Fallback Partial Match (Cẩn thận)**
```typescript
// Only if NO exact match AND search is longer than 3 chars
if (matchingRecipients.length === 0 && normalizedSearch.length > 3) {
    matchingRecipients = context.savedRecipients.filter(r =>
        r.nickname.toLowerCase().includes(normalizedSearch) ||
        r.name.toLowerCase().includes(normalizedSearch)
    );
}
```

**Tại sao > 3 chars?**
- Tránh match nhầm với tên ngắn: "Li", "An", "Ng"
- "Linda" có thể match "Linda Ngo", "Linda Smith" ← OK
- "Li" match tất cả người có "Li" trong tên ← NOT OK

### **4. Debug Logs**
```typescript
console.log('🔍 [Transfer Intent] Searching for recipient:', recipientNickname);
console.log('📋 [Transfer Intent] Available recipients:', context.savedRecipients.map(r => r.nickname));
console.log('✅ [Transfer Intent] Matching recipients:', matchingRecipients.map(r => r.nickname));
```

---

## 🧪 **TEST CASES:**

### Test 1: Exact Match ✅
```
User message: "transfer 1 to Linda Ngo"
Saved recipients: ["Linda Ngo", "lana ngo", "John Doe"]
Result: Match only "Linda Ngo" ✅
```

### Test 2: No Match (Tự chuyển cho mình) ✅
```
User message: "transfer 1 to Linda Ngo"
Saved recipients: ["lana ngo", "John Doe"]  (không có Linda Ngo)
Result: "I couldn't find Linda Ngo..." ✅
```

### Test 3: Null/Empty Validation ✅
```
User message: "transfer 1 dollar" (không có recipient)
AI extracts: recipientNickname = null
Result: "I couldn't detect a recipient name..." ✅
```

### Test 4: Partial Match (Fallback) ✅
```
User message: "transfer 1 to Linda"
Saved recipients: ["Linda Ngo", "Linda Smith"]
Result: "I found 2 recipients named 'Linda'. Which one?" ✅
```

### Test 5: Partial Match Blocked (Too Short) ✅
```
User message: "transfer 1 to Li"
Saved recipients: ["Linda Ngo", "Alice Chen", "Elizabeth"]
Result: "I couldn't find Li..." (no partial match vì < 3 chars) ✅
```

---

## 🎯 **KẾT QUẢ:**

**Trước khi fix:**
- ❌ "Linda Ngo" match với "lana ngo"
- ❌ `null` match với TẤT CẢ recipients
- ❌ Matching rất lỏng lẻo, không chính xác

**Sau khi fix:**
- ✅ Exact match ưu tiên
- ✅ Validate null/empty input
- ✅ Partial match chỉ khi cần (> 3 chars)
- ✅ Debug logs rõ ràng

---

## 📁 **FILE ĐÃ SỬA:**

- ✅ `components/Chatbot/ChatbotWindow.tsx` (lines 143-195)

---

**Date:** 2026-01-01  
**Status:** ✅ FIXED  
**Impact:** CRITICAL - Ngăn match nhầm recipients
