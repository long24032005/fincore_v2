# 🔧 BUG FIXES #2, #3, #4 - IMPLEMENTATION GUIDE

## ⚠️ **FILE CORRUPTION NOTICE**

File `components/Chatbot/ChatbotWindow.tsx` đã bị corrupt trong quá trình auto-fix.  
Backup saved: `components/Chatbot/ChatbotWindow.tsx.broken`

## ✅ **SOLUTION CREATED:**

Đã tạo helper file: `lib/chatbot-validation.ts` với validation functions.

---

## 📝 **MANUAL FIX STEPS:**

### Step 1: Restore Clean File
```bash
# Trong terminal
cd "c:\Users\philo\OneDrive\Desktop\bank - Sao chép (4)-sao chép\banking-main"

# Restore từ backup nếu có hoặc restart server để Next.js auto-fix
npm run dev
```

###  Step 2: Add Import
File: `components/Chatbot/ChatbotWindow.tsx`

**Add at top (line ~11):**
```typescript
import { validateTransferAmount, checkBalance } from '@/lib/chatbot-validation';
```

### Step 3: Update `handleTransferIntent` Function

**Find this code (around line 220):**
```typescript
// Check if amount is provided
if (!amount || amount <= 0) {
    addAssistantMessage(`How much would you like to send to ${recipient.nickname}?`);
    return;
}
```

**Replace with:**
```typescript
// BUG FIX #2 & #3: Validate amount with friendly messages
const amountValidation = validateTransferAmount(amount, recipient.nickname);
if (!amountValidation.isValid) {
    addAssistantMessage(amountValidation.errorMessage!);
    return;
}

// BUG FIX #4: Check balance before proceeding
const balanceCheck = checkBalance(amount, context.walletBalance, context.bankAccounts);
if (!balanceCheck.isValid) {
    addAssistantMessage(balanceCheck.errorMessage!);
    return;
}
```

### Step 4: Update Disambiguation Flow

**In `handleButtonClick`, find this (around line 373):**
```typescript
if (!amount || amount <= 0) {
    addAssistantMessage(`Got it! How much would you like to send to ${recipient.nickname}?`);
    setPendingEntities(null);
} else {
    // proceed...
}
```

**Replace with:**
```typescript
// Same validation as main flow
const amountValidation = validateTransferAmount(amount, recipient.nickname);
if (!amountValidation.isValid) {
    addAssistantMessage(amountValidation.errorMessage!);
    setPendingEntities(null);
    return;
}

const balanceCheck = checkBalance(amount, context.walletBalance, context.bankAccounts);
if (!balanceCheck.isValid) {
    addAssistantMessage(balanceCheck.errorMessage!);
    setPendingEntities(null);
    return;
}

// Amount valid - proceed to source selection
console.log('✅ [Using Saved Amount]', amount);
// ... rest of code
```

---

## 🎯 **WHAT FIXES DO:**

### Bug #2: Zero Amount Validation
**Before:**
```
User: "transfer zero dollars to lana ngo"
Bot: "How much?" (generic message)
```

**After:**
```
User: "transfer zero dollars to lana ngo"
Bot: "❌ Oops! The amount must be greater than $0.

You tried to send: $0.00

Please try again with a positive amount.
Example: "Transfer 5 dollars to lana ngo""
```

### Bug #3: Negative Amount Validation
**Before:**
```
User: "send -5 to lana ngo"
Bot: Proceeds or generic error
```

**After:**
```
User: "send -5 to lana ngo"
Bot: "❌  Oops! The amount must be greater than $0.

You tried to send: $-5.00

Please try again with a positive amount."
```

### Bug #4: Balance Check
**Before:**
```
User: "transfer 999999 to lana ngo"
Bot: Shows confirmation
User: Clicks confirm
Bot: "Insufficient balance" (only after confirm!)
```

**After:**
```
User: "transfer 999999 to lana ngo"
Bot: "⚠️  The amount $999,999.00 exceeds your available balance.

Your current balances:
💰 Wallet: $86.00
🏦 Plaid Checking: $10.00

Please specify a smaller amount or add funds to continue."
```

---

## 🧪 **TESTING:**

After fixing, test these cases:

### Test 1: Zero Amount
```
"transfer zero dollars to lana ngo"
Expected: Friendly error about amount > $0
```

### Test 2: Negative Amount
```
"send -5 to lana ngo"
Expected: Error showing tried amount and request positive
```

### Test 3: Amount > Balance
```
"transfer 500 to lana ngo"
Expected: Balance warning with all balances shown
```

### Test 4: Valid Amount
```
"transfer 1 dollar to lana ngo"
Expected: Proceeds normally to recipient/source selection
```

---

## 📁 **FILES:**

1. ✅ `lib/chatbot-validation.ts` - NEW validation helper (created)
2. ⚠️ `components/Chatbot/ChatbotWindow.tsx` - NEEDS MANUAL FIX
3. 📝 `BUG_FIXES_2_3_4_GUIDE.md` - This file

---

## 🚨 **ALTERNATIVE: Full File Replacement**

If manual edits are too complex, I can provide a complete working version of `ChatbotWindow.tsx` with all fixes applied.

Let me know if you want me to generate the full corrected file!

---

**Status:** Validation logic created ✅, Manual integration pending ⚠️  
**Estimated Time:** 5-10 minutes manual edits  
**Difficulty:** Medium (requires careful code placement)
