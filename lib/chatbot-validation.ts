/**
 * Validation helpers for chatbot transfer functionality
 */

export interface AmountValidationResult {
    isValid: boolean;
    errorMessage?: string;
}

export interface BalanceCheckResult {
    isValid: boolean;
    errorMessage?: string;
}

/**
 * Detects if user input contains keywords that indicate zero/no amount
 * This catches cases like "transfer zero dollars", "send nothing", "$0", etc.
 * Should be called BEFORE AI parsing to provide immediate feedback
 * 
 * @param userMessage - The raw user input text
 * @returns true if zero amount detected, false otherwise
 */
export function detectZeroAmountInText(userMessage: string): boolean {
    const lowerMessage = userMessage.toLowerCase().trim();

    // Patterns that indicate zero amount
    const zeroPatterns = [
        /\bzero\s+(dollars?|bucks?|usd|\$)/i,  // "zero dollars", "zero bucks"
        /\$\s*0(?:\.0+)?(?!\d)\b/,              // "$0", "$ 0", "$0.00" (NOT $0.5)
        /\b0\s+(dollars?|bucks?|usd)/i,         // "0 dollars", "0 bucks"
        /\bnothing\b/i,                          // "nothing"
        /\bno\s+money\b/i,                       // "no money"
        /\bnada\b/i,                             // "nada"
        /transfer\s+0(?!\.?\d)/i,                // "transfer 0" (NOT 0.5, 0.01)
        /send\s+0(?!\.?\d)/i,                    // "send 0" (NOT 0.5, 0.01)
    ];

    return zeroPatterns.some(pattern => pattern.test(lowerMessage));
}

/**
 * Validates that a transfer amount is valid (not zero, not negative)
 * @param amount - The transfer amount to validate
 * @param recipientNickname - The recipient's nickname (for error messages)
 * @returns Validation result with friendly error message if invalid
 */
export function validateTransferAmount(
    amount: number | undefined | null,
    recipientNickname: string
): AmountValidationResult {
    // No amount provided
    if (!amount) {
        return {
            isValid: false,
            errorMessage:
                `💵 How much would you like to send to **${recipientNickname}**?\n\n` +
                `Please specify an amount in dollars.\n` +
                `Example: "Send 10 to ${recipientNickname}"`
        };
    }

    // Zero or negative amount
    if (amount <= 0) {
        return {
            isValid: false,
            errorMessage:
                `❌ Oops! The amount must be greater than $0.\n\n` +
                `You tried to send: $${amount.toFixed(2)}\n\n` +
                `Please try again with a positive amount.\n` +
                `Example: "Transfer 5 dollars to ${recipientNickname}"`
        };
    }

    return { isValid: true };
}

export function checkBalance(
    amount: number,
    walletBalance: number,
    bankAccounts: { name: string; availableBalance: number }[]
): BalanceCheckResult {
    const maxAvailable = Math.max(
        walletBalance,
        ...bankAccounts.map(b => b.availableBalance)
    );

    if (amount > maxAvailable) {
        const walletText = `💰 Wallet: $${walletBalance.toFixed(2)}`;
        const bankBalances = bankAccounts
            .map(b => `🏦 ${b.name}: $${b.availableBalance.toFixed(2)}`)
            .join('\n');

        return {
            isValid: false,
            errorMessage:
                `⚠️  The amount $${amount.toFixed(2)} exceeds your available balance.\n\n` +
                `Your current balances:\n` +
                `${walletText}\n` +
                `${bankBalances}\n\n` +
                `Please specify a smaller amount or add funds to continue.`
        };
    }

    return { isValid: true };
}
