"use server";

import { transferBalance, updateUserBalance } from "./wallet.actions";
import { createTransfer } from "./dwolla.actions";
import { createTransaction } from "./transaction.actions";
import { getBank, getBankByAppwriteItemId } from "./user.actions";
import { updateRecipientLastUsed } from "./savedRecipient.actions";
import { checkDailyLimits } from "./chatbot-context.actions";
import { parseStringify, formatAmount } from "../utils";

/**
 * Execute transfer via chatbot (with all safety checks)
 */
export const executeChatbotTransfer = async ({
    userId,
    transferRequest,
}: {
    userId: string;
    transferRequest: TransferRequest;
}): Promise<{
    success: boolean;
    message: string;
    newBalance?: number;
    transactionId?: string;
}> => {
    try {
        const { recipientId, amount, source, destination, destinationBankId } = transferRequest;

        // 1. Check daily limits
        const limitsCheck = await checkDailyLimits(userId, amount);
        if (!limitsCheck.allowed) {
            return {
                success: false,
                message: limitsCheck.reason || 'Transfer limit exceeded',
            };
        }

        // 2. Validate amount
        if (amount <= 0) {
            return {
                success: false,
                message: 'Transfer amount must be greater than $0',
            };
        }

        // 3. Get recipient details from saved recipients
        const { getSavedRecipients } = await import('./savedRecipient.actions');
        const recipientsData = await getSavedRecipients(userId);

        console.log('🔍 [Chatbot Transfer] Looking for recipient:', recipientId);
        console.log('📋 [Chatbot Transfer] Recipients data:', {
            success: recipientsData?.success,
            total: recipientsData?.total,
            recipientsCount: recipientsData?.recipients?.length || 0
        });

        // FIX: Use 'recipients' instead of 'documents' to match getSavedRecipients response
        const recipient = recipientsData?.recipients?.find((r: any) => r.$id === recipientId);

        console.log('✅ [Chatbot Transfer] Found recipient:', recipient ? recipient.nickname : 'NOT FOUND');

        if (!recipient) {
            return {
                success: false,
                message: 'Recipient not found in your saved list',
            };
        }

        // 4. Execute transfer based on source and destination
        let result: any;

        // WALLET → WALLET
        if (source === 'wallet' && destination === 'wallet') {
            result = await transferBalance({
                senderId: userId,
                receiverId: recipient.recipientUserId,
                amount,
                description: `Chatbot transfer to ${recipient.nickname}`,
                // email auto-resolved by backend
            });

            if (result.success) {
                await updateRecipientLastUsed(recipientId);
                return {
                    success: true,
                    message: `✅ Đã chuyển thành công ${formatAmount(amount)} cho ${recipient.nickname} tức thì!`,
                    newBalance: result.newBalance,
                };
            }
        }

        // WALLET → BANK
        else if (source === 'wallet' && destination === 'bank') {
            // Get recipient bank
            const recipientBank = await getBank({
                documentId: destinationBankId || recipient.recipientBankId
            });

            if (!recipientBank) {
                return {
                    success: false,
                    message: 'Recipient bank account not found',
                };
            }

            // Create transaction first
            const transaction = await createTransaction({
                name: `Chatbot: To ${recipient.nickname}`,
                amount: amount.toString(),
                senderId: userId,
                senderBankId: '', // Wallet source
                receiverId: recipient.recipientUserId,
                receiverBankId: recipientBank.$id,
                email: recipient.recipientEmail,
                category: 'Transfer',
                status: 'Processing',
                channel: 'chatbot',
            });

            if (transaction) {
                // Deduct from sender's wallet
                await updateUserBalance({
                    userId,
                    amount,
                    operation: 'subtract',
                });

                await updateRecipientLastUsed(recipientId);

                return {
                    success: true,
                    message: `✅ Đã chuyển ${formatAmount(amount)} tới ngân hàng của ${recipient.nickname}. Tiền sẽ đến trong 1-3 ngày.`,
                    transactionId: transaction.$id,
                };
            }
        }

        // BANK → WALLET
        else if (source !== 'wallet' && destination === 'wallet') {
            // source is bank appwriteItemId
            const senderBank = await getBankByAppwriteItemId(source);

            if (!senderBank) {
                return {
                    success: false,
                    message: 'Your selected bank account not found',
                };
            }

            // Create transaction
            const transaction = await createTransaction({
                name: `Chatbot: To ${recipient.nickname}`,
                amount: amount.toString(),
                senderId: userId,
                senderBankId: source,
                receiverId: recipient.recipientUserId,
                receiverBankId: '', // Wallet destination
                email: recipient.recipientEmail,
                category: 'Transfer',
                status: 'Processing',
                channel: 'online',
            });

            if (transaction) {
                // Credit recipient's wallet
                await updateUserBalance({
                    userId: recipient.recipientUserId,
                    amount,
                    operation: 'add',
                });

                await updateRecipientLastUsed(recipientId);

                return {
                    success: true,
                    message: `✅ Đã khởi tạo giao dịch. ${formatAmount(amount)} sẽ đến ví của ${recipient.nickname} trong 1-3 ngày.`,
                    transactionId: transaction.$id,
                };
            }
        }

        // BANK → BANK
        else if (source !== 'wallet' && destination === 'bank') {
            const senderBank = await getBankByAppwriteItemId(source);
            const recipientBank = await getBank({
                documentId: destinationBankId || recipient.recipientBankId
            });

            if (!senderBank || !recipientBank) {
                return {
                    success: false,
                    message: 'Bank account configuration error',
                };
            }

            // Dwolla transfer
            const transfer = await createTransfer({
                sourceFundingSourceUrl: senderBank.fundingSourceUrl,
                destinationFundingSourceUrl: recipientBank.fundingSourceUrl,
                amount: amount.toString(),
            });

            if (transfer) {
                const transaction = await createTransaction({
                    name: `Chatbot: To ${recipient.nickname}`,
                    amount: amount.toString(),
                    senderId: userId,
                    senderBankId: source,
                    receiverId: recipient.recipientUserId,
                    receiverBankId: recipientBank.$id,
                    email: recipient.recipientEmail,
                    category: 'Transfer',
                    status: 'Processing',
                    channel: 'chatbot',
                });


                if (transaction) {
                    await updateRecipientLastUsed(recipientId);

                    return {
                        success: true,
                        message: `✅ Đã khởi tạo chuyển khoản liên ngân hàng. ${formatAmount(amount)} sẽ đến trong 1-3 ngày. Phí: 0 ₫ (Miễn phí)`,
                        transactionId: transaction.$id,
                    };
                }
            }
        }

        return {
            success: false,
            message: 'Transfer failed. Please try again.',
        };
    } catch (error: any) {
        console.error('Chatbot transfer error:', error);
        return {
            success: false,
            message: error.message || 'Transfer failed. Please try again.',
        };
    }
};
