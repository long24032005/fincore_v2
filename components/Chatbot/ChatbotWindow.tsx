'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessageComponent from './ChatMessage';
import ChatInput from './ChatInput';
import { getChatbotContext } from '@/lib/actions/chatbot-context.actions';
import { parseUserIntent, generateChatbotResponse, evaluateProactiveTriggers, runAgenticChatbot } from '@/lib/actions/chatbot-ai.actions';
import { executeChatbotTransfer } from '@/lib/actions/chatbot-transfer.actions';
import { validateTransferAmount, checkBalance, detectZeroAmountInText } from '@/lib/chatbot-validation';
import { formatAmount } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ChatbotWindowProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
}

const ChatbotWindow = ({ user, isOpen, onClose }: ChatbotWindowProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [context, setContext] = useState<ChatbotContext | null>(null);
    const [pendingTransfer, setPendingTransfer] = useState<TransferRequest | null>(null);
    const [pendingEntities, setPendingEntities] = useState<any>(null); // BUG FIX #4: Store entities during disambiguation
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load context when window opens
    useEffect(() => {
        if (isOpen && !context) {
            loadContext();
        }
    }, [isOpen]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadContext = async () => {
        const ctx = await getChatbotContext(user.$id);
        if (ctx) {
            setContext({ ...ctx, userName: user.firstName });

            // Add welcome message
            const welcomeMessage: ChatMessage = {
                id: 'welcome',
                role: 'assistant',
                content: `Xin chào ${user.firstName}! 👋 Tôi là trợ lý ảo Fincore. Tôi có thể giúp bạn:\n\n• Chuyển tiền nhanh đến người nhận đã lưu\n• Kiểm tra số dư tài khoản & ngân hàng liên kết\n• Xem lịch sử giao dịch gần đây\n\nBạn cần tôi hỗ trợ việc gì hôm nay?`,
                timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
        }
    };

    const handleSendMessage = async (content: string) => {
        if (!context) return;

        // Add user message
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            // Early detection of zero amount keywords
            if (detectZeroAmountInText(content)) {
                addAssistantMessage(
                    `❌ **Oops!** Số tiền giao dịch phải lớn hơn 0 ₫.\n\n` +
                    `Tôi phát hiện bạn đang cố gắng nhập số tiền bằng không hoặc không hợp lệ. Vui lòng ghi rõ số tiền lớn hơn 0 ₫.\n\n` +
                    `**Ví dụ:** "Chuyển 50.000 ₫ cho Linda"`
                );
                setIsLoading(false);
                return;
            }

            // Call ReAct Agentic Chatbot
            const result = await runAgenticChatbot(content, context, messages);
            console.log('🤖 Agentic Chatbot Result:', result);

            if (result.pendingConfirmation) {
                const pending = result.pendingConfirmation;
                
                // Define confirmation buttons
                const buttons: ChatActionButton[] = [
                    {
                        id: `confirm-agent-txn-${Date.now()}`,
                        label: '✅ Xác nhận',
                        value: JSON.stringify({ type: pending.type, payload: pending.payload }),
                        type: 'confirm_agent_transaction',
                        variant: 'primary'
                    },
                    {
                        id: `cancel-agent-txn-${Date.now()}`,
                        label: '❌ Hủy',
                        value: 'cancel',
                        type: 'cancel_agent_transaction',
                        variant: 'danger'
                    }
                ];

                // Append assistant message with pending transaction interactive card
                const assistantMsg: ChatMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: result.message,
                    timestamp: new Date(),
                    metadata: {
                        pendingConfirmation: pending,
                        actionButtons: buttons
                    }
                };
                setMessages(prev => [...prev, assistantMsg]);
            } else {
                // Regular response text
                addAssistantMessage(result.message);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            addAssistantMessage("Tôi gặp chút trục trặc khi kết nối với mô hình AI. Vui lòng thử lại sau.");
        }

        setIsLoading(false);
    };

     const handleBalanceQuery = async () => {
         if (!context) return;
 
         const balanceText = `💰 Số dư tài khoản của bạn:\n\n` +
             `Ví Fincore: ${formatAmount(context.walletBalance)}\n\n` +
             context.bankAccounts.map((bank, idx) =>
                 `🏦 ${bank.name} (...${bank.mask}):\n` +
                 `   Khả dụng: ${formatAmount(bank.availableBalance)}`
             ).join('\n\n');
 
         addAssistantMessage(balanceText);
     };
 
     const handleListRecipients = async () => {
         if (!context) return;
 
         if (context.savedRecipients.length === 0) {
             addAssistantMessage("Bạn chưa có người nhận đã lưu nào. Hãy thêm một người sau giao dịch đầu tiên của bạn!");
             return;
         }
 
         const recipientsText = `📋 Danh sách người nhận đã lưu (${context.savedRecipients.length}):\n\n` +
             context.savedRecipients.map((r, idx) =>
                 `${idx + 1}. **${r.nickname}**\n   ${r.name} (${r.email})\n   Loại: ${r.transferType === 'wallet' ? '💰 Ví Fincore' : '🏦 Ngân hàng'}`
             ).join('\n\n');
 
         addAssistantMessage(recipientsText);
     };
 
     const handleTransactionHistory = async () => {
         if (!context) return;
 
         if (context.recentTransactions.length === 0) {
             addAssistantMessage("Không tìm thấy giao dịch nào gần đây.");
             return;
         }
 
         const txnText = `📜 Giao dịch gần đây:\n\n` +
             context.recentTransactions.slice(0, 5).map((txn: any) => {
                 const isSent = txn.senderId === user.$id;
                 const amount = parseFloat(txn.amount);
                 return `${isSent ? '📤 Chuyển đi' : '📥 Nhận được'} ${formatAmount(amount)}\n` +
                     `   ${txn.name}\n` +
                     `   ${new Date(txn.$createdAt).toLocaleDateString('vi-VN')}`;
             }).join('\n\n');
 
         addAssistantMessage(txnText);
     };

    const handleTransferIntent = async (entities: any) => {
        if (!context) return;

        const { recipientNickname, amount } = entities;

        console.log('🔍 [Transfer Intent] Searching for recipient:', recipientNickname);
        console.log('📋 [Transfer Intent] Available recipients:', context.savedRecipients.map(r => r.nickname));
        console.log('💰 [Transfer Intent] Amount received:', amount);

        // ✅ BUG FIX #2 & #3: VALIDATE AMOUNT FIRST - before recipient matching!
        // This ensures zero/negative amounts are caught IMMEDIATELY
        const amountValidation = validateTransferAmount(amount, recipientNickname || 'recipient');
        if (!amountValidation.isValid) {
            addAssistantMessage(amountValidation.errorMessage!);
            return;
        }

        // ✅ BUG FIX #4: Check balance EARLY - before disambiguation
        const balanceCheck = checkBalance(amount, context.walletBalance, context.bankAccounts);
        if (!balanceCheck.isValid) {
            addAssistantMessage(balanceCheck.errorMessage!);
            return;
        }

        // NOW proceed with recipient validation and matching
        // Validate recipientNickname is not null/empty
        if (!recipientNickname || recipientNickname.trim() === '' || recipientNickname === 'null') {
            addAssistantMessage(
                `Tôi không nhận diện được tên người nhận. Vui lòng thử lại theo định dạng:\n\n"Chuyển [số tiền] cho [tên người nhận]"\n\nBạn có muốn xem danh sách người nhận đã lưu không?`,
                [{
                    id: 'list-recipients',
                    label: '📋 Xem danh sách',
                    value: 'list_recipients',
                    type: 'confirm',
                    variant: 'secondary',
                }]
            );
            return;
        }
 
         // BUG FIX #3: Improve recipient matching - exact match first
         const normalizedSearch = recipientNickname.toLowerCase().trim();
 
         // Try exact match first (most accurate)
         let matchingRecipients = context.savedRecipients.filter(r =>
             r.nickname.toLowerCase() === normalizedSearch ||
             r.name.toLowerCase() === normalizedSearch
         );
 
         // If no exact match and search is longer than 3 characters, try partial match
         if (matchingRecipients.length === 0 && normalizedSearch.length > 3) {
             matchingRecipients = context.savedRecipients.filter(r =>
                 r.nickname.toLowerCase().includes(normalizedSearch) ||
                 r.name.toLowerCase().includes(normalizedSearch)
             );
         }
 
         console.log('✅ [Transfer Intent] Matching recipients:', matchingRecipients.map(r => r.nickname));
 
         if (matchingRecipients.length === 0) {
             addAssistantMessage(
                 `Tôi không tìm thấy "${recipientNickname}" trong danh sách người nhận đã lưu của bạn.\n\nBạn có muốn xem danh sách người nhận không?`,
                 [{
                     id: 'list-recipients',
                     label: '📋 Xem danh sách',
                     value: 'list_recipients',
                     type: 'confirm',
                     variant: 'secondary',
                 }]
             );
             return;
         }
 
         if (matchingRecipients.length > 1) {
             // Amount already validated above, just save for later use
             setPendingEntities(entities);
             console.log('💾 [Transfer Intent] Saved pending entities (amount already validated):', entities);
 
             const buttons = matchingRecipients.map((r, idx) => ({
                 id: `recipient-${r.id}`,
                 label: `${idx + 1}. ${r.nickname} (${r.transferType === 'wallet' ? 'Ví' : 'NH'})`,
                 value: r.id,
                 type: 'recipient' as const,
                 variant: 'secondary' as const,
             }));
 
             addAssistantMessage(`Tôi tìm thấy ${matchingRecipients.length} người có tên "${recipientNickname}". Bạn muốn gửi cho ai?`, buttons);
             return;
         }
 
         // Single match - amount already validated above
         const recipient = matchingRecipients[0];
 
         // All validations passed - proceed to source selection
         const sourceButtons: ChatActionButton[] = [
             {
                 id: 'source-wallet',
                 label: `💰 Ví Fincore (${formatAmount(context.walletBalance)})`,
                 value: 'wallet',
                 type: 'source',
                 variant: 'secondary',
             },
             ...context.bankAccounts.map(bank => ({
                 id: `source-${bank.id}`,
                 label: `🏦 ${bank.name} (${formatAmount(bank.availableBalance)})`,
                 value: bank.id,
                 type: 'source' as const,
                 variant: 'secondary' as const,
             })),
         ];
 
         // Store pending transfer
         setPendingTransfer({
             recipientId: recipient.id,
             recipientNickname: recipient.nickname,
             amount,
             source: 'wallet', // Default, will be updated
             destination: recipient.transferType === 'wallet' ? 'wallet' : 'bank',
             destinationBankId: recipient.recipientBankId,
         });
 
         addAssistantMessage(
             `Chuyển ${formatAmount(amount)} cho ${recipient.nickname}.\n\nChọn nguồn thanh toán:`,
             sourceButtons
         );
     };
 
     const handleButtonClick = async (button: ChatActionButton) => {
         if (button.type === 'source' && pendingTransfer) {
             // User selected source - now show confirmation
             const updatedTransfer = { ...pendingTransfer, source: button.value };
             setPendingTransfer(updatedTransfer);
 
             const isFree = button.value === 'wallet' && updatedTransfer.destination === 'wallet';
             const fee = isFree ? 'Miễn phí' : '5.000 ₫';
             const arrival = isFree ? 'Tức thì' : '1-3 ngày';
 
             const confirmButtons: ChatActionButton[] = [
                 {
                     id: 'confirm-transfer',
                     label: '✅ Xác nhận & Gửi',
                     value: 'confirm',
                     type: 'confirm',
                     variant: 'primary',
                 },
                 {
                     id: 'cancel-transfer',
                     label: '❌ Hủy',
                     value: 'cancel',
                     type: 'cancel',
                     variant: 'danger',
                 },
             ];
 
             addAssistantMessage(
                 `Xác nhận giao dịch chuyển tiền:\n\n` +
                 `💵 Số tiền: ${formatAmount(updatedTransfer.amount)}\n` +
                 `👤 Người nhận: ${updatedTransfer.recipientNickname}\n` +
                 `📍 Nguồn chuyển: ${button.label}\n` +
                 `💸 Phí giao dịch: ${fee}\n` +
                 `⏱️ Thời gian xử lý: ${arrival}\n\n` +
                 `Xác nhận để thực hiện:`,
                 confirmButtons
             );
        } else if (button.type === 'confirm' && button.value === 'list_recipients') {
            // Show recipients list
            await handleListRecipients();
        } else if (button.type === 'confirm' && pendingTransfer) {
            // Execute transfer
            setIsLoading(true);
            const result = await executeChatbotTransfer({
                userId: user.$id,
                transferRequest: pendingTransfer,
            });

            if (result.success) {
                addAssistantMessage(result.message);
                toast.success('Transfer completed!');

                // Reload context
                const newContext = await getChatbotContext(user.$id);
                if (newContext) {
                    setContext({ ...newContext, userName: user.firstName });
                }
            } else {
                addAssistantMessage(`❌ ${result.message}`);
                toast.error('Transfer failed');
            }

            setPendingTransfer(null);
            setIsLoading(false);
         } else if (button.type === 'confirm_agent_transaction') {
             setIsLoading(true);
             try {
                 const actionData = JSON.parse(button.value);
                 const { type, payload } = actionData;
                 
                 if (type === 'transfer') {
                     const { executeChatbotTransfer } = await import('@/lib/actions/chatbot-transfer.actions');
                     
                     const foundRecipient = context?.savedRecipients.find(r => 
                         r.id === payload.recipientId ||
                         r.email.toLowerCase() === payload.recipientId.toLowerCase() ||
                         r.nickname.toLowerCase() === payload.recipientId.toLowerCase()
                     );

                     const transferReq = {
                         recipientId: foundRecipient?.id || payload.recipientId,
                         recipientNickname: foundRecipient?.nickname || payload.recipientId,
                         amount: payload.amount,
                         source: 'wallet',
                         destination: foundRecipient?.transferType === 'wallet' ? 'wallet' as const : 'bank' as const,
                         destinationBankId: foundRecipient?.recipientBankId || ""
                     };

                     const result = await executeChatbotTransfer({
                         userId: user.$id,
                         transferRequest: transferReq
                     });

                     if (result.success) {
                         addAssistantMessage(`✅ Đã chuyển thành công ${formatAmount(payload.amount)} cho ${transferReq.recipientNickname}!`);
                         toast.success('Chuyển tiền thành công!');
                     } else {
                         addAssistantMessage(`❌ Chuyển tiền thất bại: ${result.message}`);
                         toast.error('Chuyển tiền thất bại');
                     }
                 } else if (type === 'bill_payment') {
                     const { updateUserBalance } = await import('@/lib/actions/wallet.actions');
                     const { createTransaction } = await import('@/lib/actions/transaction.actions');
                     
                     await updateUserBalance({
                         userId: user.$id,
                         amount: payload.amount,
                         operation: 'subtract'
                     });
                     
                     await createTransaction({
                         name: `Thanh toán hóa đơn: ${payload.provider}`,
                         amount: payload.amount.toString(),
                         senderId: user.$id,
                         senderBankId: '',
                         receiverId: 'utility_provider',
                         receiverBankId: '',
                         email: 'billing@evn.com.vn',
                         category: 'Payment',
                         status: 'Success',
                         channel: 'online'
                     });

                     addAssistantMessage(`✅ Đã thanh toán thành công hóa đơn ${payload.provider} số tiền ${formatAmount(payload.amount)}!`);
                     toast.success('Thanh toán thành công!');
                 } else if (type === 'portfolio_investment') {
                     const { updateUserBalance } = await import('@/lib/actions/wallet.actions');
                     const { createTransaction } = await import('@/lib/actions/transaction.actions');
                     
                     await updateUserBalance({
                         userId: user.$id,
                         amount: payload.amount,
                         operation: 'subtract'
                     });
                     
                     await createTransaction({
                         name: `Đầu tư danh mục AI đề xuất`,
                         amount: payload.amount.toString(),
                         senderId: user.$id,
                         senderBankId: '',
                         receiverId: 'portfolio_fund',
                         receiverBankId: '',
                         email: 'invest@fincore.vn',
                         category: 'Transfer',
                         status: 'Success',
                         channel: 'online'
                     });

                     addAssistantMessage(`✅ Đã đầu tư thành công số tiền ${formatAmount(payload.amount)} vào cả danh mục AI khuyến nghị!`);
                     toast.success('Đầu tư danh mục thành công!');
                 }

                 // Reload context
                 const newContext = await getChatbotContext(user.$id);
                 if (newContext) {
                     setContext({ ...newContext, userName: user.firstName });
                 }
             } catch (err: any) {
                 console.error("Confirm transaction error:", err);
                 addAssistantMessage(`❌ Lỗi thực thi giao dịch: ${err.message}`);
                 toast.error('Lỗi thực thi giao dịch');
             } finally {
                 setIsLoading(false);
             }
         } else if (button.type === 'cancel_agent_transaction') {
             addAssistantMessage('Giao dịch đã được hủy bỏ. Bạn cần tôi trợ giúp việc gì khác không?');
          } else if (button.type === 'cancel') {
              setPendingTransfer(null);
              addAssistantMessage('Giao dịch đã được hủy. Bạn cần tôi giúp gì khác không?');
        } else if (button.type === 'proactive_action') {
            try {
                const actionData = JSON.parse(button.value);
                const { type, payload } = actionData;
                
                if (type === 'pay_bill') {
                    setIsLoading(true);
                    const { updateUserBalance } = await import('@/lib/actions/wallet.actions');
                    const { createTransaction } = await import('@/lib/actions/transaction.actions');
                    
                    await updateUserBalance({
                        userId: user.$id,
                        amount: payload.amount,
                        operation: 'subtract'
                    });
                    
                    await createTransaction({
                        name: `Thanh toán: ${payload.provider}`,
                        amount: payload.amount.toString(),
                        senderId: user.$id,
                        senderBankId: '', // Wallet source
                        receiverId: 'utility_provider',
                        receiverBankId: '',
                        email: 'billing@evn.com.vn',
                        category: 'Payment',
                        status: 'Success',
                        channel: 'online'
                    });

                    const newContext = await getChatbotContext(user.$id);
                    if (newContext) {
                        setContext({ ...newContext, userName: user.firstName });
                    }

                    addAssistantMessage(`✅ Đã thanh toán hóa đơn ${payload.provider} thành công số tiền ${payload.amount.toLocaleString('vi-VN')} ₫ từ ví của bạn!`);
                    toast.success('Thanh toán hóa đơn thành công!');
                    setIsLoading(false);
                } else if (type === 'invest_fund') {
                    setIsLoading(true);
                    const { updateUserBalance } = await import('@/lib/actions/wallet.actions');
                    const { createTransaction } = await import('@/lib/actions/transaction.actions');
                    
                    await updateUserBalance({
                        userId: user.$id,
                        amount: payload.amount,
                        operation: 'subtract'
                    });
                    
                    await createTransaction({
                        name: `Đầu tư quỹ: ${payload.provider}`,
                        amount: payload.amount.toString(),
                        senderId: user.$id,
                        senderBankId: '', // Wallet source
                        receiverId: `fund_${payload.provider.toLowerCase()}`,
                        receiverBankId: '',
                        email: 'invest@fincore.vn',
                        category: 'Transfer',
                        status: 'Success',
                        channel: 'online'
                    });

                    const newContext = await getChatbotContext(user.$id);
                    if (newContext) {
                        setContext({ ...newContext, userName: user.firstName });
                    }

                    addAssistantMessage(`✅ Đầu tư thành công ${payload.amount.toLocaleString('vi-VN')} ₫ vào quỹ ${payload.provider}! Chúc bạn tích lũy hiệu quả.`);
                    toast.success('Đầu tư thành công!');
                    setIsLoading(false);
                } else if (type === 'enable_autopilot') {
                    setIsLoading(true);
                    
                    const res = await fetch('/api/v1/automations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            actionType: 'invest',
                            amount: payload.amount,
                            destinationFund: payload.provider,
                            cronExpression: payload.cronExpression || '0 0 25 * *'
                        })
                    });

                    if (res.ok) {
                        addAssistantMessage(`✅ Đã kích hoạt lệnh đầu tư tự động Autopilot tích lũy ${payload.amount.toLocaleString('vi-VN')} ₫ vào quỹ ${payload.provider} định kỳ! Bạn có thể bật/tắt hoặc quản lý lệnh này tại bảng điều khiển AI Insights.`);
                        toast.success('Đã kích hoạt Autopilot!');
                    } else {
                        addAssistantMessage(`❌ Kích hoạt Autopilot thất bại. Vui lòng thử lại.`);
                        toast.error('Kích hoạt thất bại');
                    }
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Error executing proactive action:", err);
                addAssistantMessage("❌ Có lỗi xảy ra trong quá trình thực hiện giao dịch.");
                setIsLoading(false);
            }
        } else if (button.type === 'recipient') {
            // BUG FIX #4: User selected recipient from disambiguation - use saved amount
            const recipient = context?.savedRecipients.find(r => r.id === button.value);
            if (recipient && context) {
                console.log('👤 [Recipient Selected]', recipient.nickname);
                console.log('💰 [Pending Entities]', pendingEntities);

                const amount = pendingEntities?.amount;

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

                // Amount is valid - proceed to source selection
                console.log('✅ [Using Saved Amount]', amount);

                const sourceButtons: ChatActionButton[] = [
                    {
                        id: 'source-wallet',
                        label: `💰 Ví Fincore (${formatAmount(context.walletBalance)})`,
                        value: 'wallet',
                        type: 'source',
                        variant: 'secondary',
                    },
                    ...context.bankAccounts.map(bank => ({
                        id: `source-${bank.id}`,
                        label: `🏦 ${bank.name} (${formatAmount(bank.availableBalance)})`,
                        value: bank.id,
                        type: 'source' as const,
                        variant: 'secondary' as const,
                    })),
                ];

                setPendingTransfer({
                    recipientId: recipient.id,
                    recipientNickname: recipient.nickname,
                    amount,
                    source: 'wallet',
                    destination: recipient.transferType === 'wallet' ? 'wallet' : 'bank',
                    destinationBankId: recipient.recipientBankId,
                });

                addAssistantMessage(
                    `Chuyển ${formatAmount(amount)} cho ${recipient.nickname}.\n\nChọn nguồn thanh toán:`,
                    sourceButtons
                );

                setPendingEntities(null);
            }
        }
    };

    const addAssistantMessage = (content: string, buttons?: ChatActionButton[]) => {
        const message: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content,
            timestamp: new Date(),
            metadata: buttons ? { actionButtons: buttons } : undefined,
        };
        setMessages(prev => [...prev, message]);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="fixed bottom-24 right-6 w-[400px] h-[600px] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-white/20 rounded-full flex-center">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-16 font-bold text-white">Finecore Assistant</h3>
                            <p className="text-12 text-blue-100">Always here to help</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-8 flex-center hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
                    {messages.map((message) => (
                        <ChatMessageComponent
                            key={message.id}
                            message={message}
                            onButtonClick={handleButtonClick}
                        />
                    ))}
                    {isLoading && (
                        <div className="flex items-center gap-2 text-gray-400 mb-4">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-14">Thinking...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <ChatInput
                    onSend={handleSendMessage}
                    disabled={isLoading}
                    placeholder="Ask me anything..."
                />
            </motion.div>
        </AnimatePresence>
    );
};

export default ChatbotWindow;
