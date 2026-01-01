'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessageComponent from './ChatMessage';
import ChatInput from './ChatInput';
import { getChatbotContext } from '@/lib/actions/chatbot-context.actions';
import { parseUserIntent, generateChatbotResponse } from '@/lib/actions/chatbot-ai.actions';
import { executeChatbotTransfer } from '@/lib/actions/chatbot-transfer.actions';
import { validateTransferAmount, checkBalance, detectZeroAmountInText } from '@/lib/chatbot-validation';
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
                content: `Hi ${user.firstName}! 👋 I'm your Finecore assistant. I can help you:\n\n• Transfer money to saved recipients\n• Check your balance\n• View recent transactions\n\nWhat would you like to do?`,
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
            // BUG FIX #2: Early detection of zero amount keywords BEFORE AI parsing
            // This catches "zero dollars", "$0", "send nothing", etc.
            if (detectZeroAmountInText(content)) {
                addAssistantMessage(
                    `❌ **Oops!** The amount must be greater than $0.\n\n` +
                    `I detected you're trying to send zero or no money. ` +
                    `Please specify a valid amount greater than $0.\n\n` +
                    `**Example:** "Transfer $10 to John"`
                );
                setIsLoading(false);
                return;
            }

            // Parse intent
            const { intent, entities } = await parseUserIntent(content, context);
            console.log('🤖 Intent:', intent, 'Entities:', entities);

            // Handle different intents
            if (intent === 'multiple_intents') {
                // BUG FIX #7: Handle multiple intents in one message
                const detectedIntents = entities.detectedIntents || [];
                const intentLabels: Record<string, string> = {
                    'check_balance': '💰 Check Balance',
                    'transfer_money': '💸 Transfer Money',
                    'list_recipients': '📋 List Recipients',
                    'transaction_history': '📜 Transaction History',
                };

                const intentsList = detectedIntents
                    .map((i: string) => `• ${intentLabels[i] || i}`)
                    .join('\n');

                addAssistantMessage(
                    `I noticed you're asking for multiple things:\n\n${intentsList}\n\n` +
                    `I can only handle one request at a time. Which would you like me to help with first?\n\n` +
                    `Please send them as separate messages.`
                );
            } else if (intent === 'check_balance') {
                await handleBalanceQuery();
            } else if (intent === 'list_recipients') {
                await handleListRecipients();
            } else if (intent === 'transaction_history') {
                await handleTransactionHistory();
            } else if (intent === 'transfer_money') {
                await handleTransferIntent(entities);
            } else {
                // General query - use AI response
                const response = await generateChatbotResponse(content, context, messages);
                addAssistantMessage(response);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            addAssistantMessage("I'm having trouble processing your request. Please try again.");
        }

        setIsLoading(false);
    };

    const handleBalanceQuery = async () => {
        if (!context) return;

        const balanceText = `💰 Your Balances:\n\n` +
            `Wallet: $${context.walletBalance.toFixed(2)}\n\n` +
            context.bankAccounts.map((bank, idx) =>
                `🏦 ${bank.name} (...${bank.mask}):\n` +
                `   Available: $${bank.availableBalance.toFixed(2)}`
            ).join('\n\n');

        addAssistantMessage(balanceText);
    };

    const handleListRecipients = async () => {
        if (!context) return;

        if (context.savedRecipients.length === 0) {
            addAssistantMessage("You don't have any saved recipients yet. Save someone after your first transfer!");
            return;
        }

        const recipientsText = `📋 Your Saved Recipients (${context.savedRecipients.length}):\n\n` +
            context.savedRecipients.map((r, idx) =>
                `${idx + 1}. **${r.nickname}**\n   ${r.name} (${r.email})\n   Type: ${r.transferType === 'wallet' ? '💰 Wallet' : '🏦 Bank'}`
            ).join('\n\n');

        addAssistantMessage(recipientsText);
    };

    const handleTransactionHistory = async () => {
        if (!context) return;

        if (context.recentTransactions.length === 0) {
            addAssistantMessage("No recent transactions found.");
            return;
        }

        const txnText = `📜 Recent Transactions:\n\n` +
            context.recentTransactions.slice(0, 5).map((txn: any) => {
                const isSent = txn.senderId === user.$id;
                const amount = parseFloat(txn.amount);
                return `${isSent ? '📤 Sent' : '📥 Received'} $${amount.toFixed(2)}\n` +
                    `   ${txn.name}\n` +
                    `   ${new Date(txn.$createdAt).toLocaleDateString()}`;
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
                `I couldn't detect a recipient name. Please try again with this format:\n\n"Transfer [amount] to [recipient name]"\n\nWould you like to see your saved recipients list?`,
                [{
                    id: 'list-recipients',
                    label: '📋 Show Recipients',
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
                `I couldn't find "${recipientNickname}" in your saved recipients.\n\nWould you like to see your saved recipients list?`,
                [{
                    id: 'list-recipients',
                    label: '📋 Show Recipients',
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
                label: `${idx + 1}. ${r.nickname} (${r.transferType})`,
                value: r.id,
                type: 'recipient' as const,
                variant: 'secondary' as const,
            }));

            addAssistantMessage(`I found ${matchingRecipients.length} recipients named "${recipientNickname}". Which one?`, buttons);
            return;
        }

        // Single match - amount already validated above
        const recipient = matchingRecipients[0];

        // All validations passed - proceed to source selection
        const sourceButtons: ChatActionButton[] = [
            {
                id: 'source-wallet',
                label: `💰 Wallet ($${context.walletBalance.toFixed(2)})`,
                value: 'wallet',
                type: 'source',
                variant: 'secondary',
            },
            ...context.bankAccounts.map(bank => ({
                id: `source-${bank.id}`,
                label: `🏦 ${bank.name} ($${bank.availableBalance.toFixed(2)})`,
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
            `Send $${amount.toFixed(2)} to ${recipient.nickname}.\n\nSelect payment source:`,
            sourceButtons
        );
    };

    const handleButtonClick = async (button: ChatActionButton) => {
        if (button.type === 'source' && pendingTransfer) {
            // User selected source - now show confirmation
            const updatedTransfer = { ...pendingTransfer, source: button.value };
            setPendingTransfer(updatedTransfer);

            const isFree = button.value === 'wallet' && updatedTransfer.destination === 'wallet';
            const fee = isFree ? 'FREE' : '$0.25';
            const arrival = isFree ? 'Instant' : '1-3 days';

            const confirmButtons: ChatActionButton[] = [
                {
                    id: 'confirm-transfer',
                    label: '✅ Confirm & Send',
                    value: 'confirm',
                    type: 'confirm',
                    variant: 'primary',
                },
                {
                    id: 'cancel-transfer',
                    label: '❌ Cancel',
                    value: 'cancel',
                    type: 'cancel',
                    variant: 'danger',
                },
            ];

            addAssistantMessage(
                `Review your transfer:\n\n` +
                `💵 Amount: $${updatedTransfer.amount.toFixed(2)}\n` +
                `👤 To: ${updatedTransfer.recipientNickname}\n` +
                `📍 From: ${button.label}\n` +
                `💸 Fee: ${fee}\n` +
                `⏱️ Arrival: ${arrival}\n\n` +
                `Confirm to proceed:`,
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
        } else if (button.type === 'cancel') {
            setPendingTransfer(null);
            addAssistantMessage('Transfer cancelled. Anything else I can help with?');
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
                        label: `💰 Wallet ($${context.walletBalance.toFixed(2)})`,
                        value: 'wallet',
                        type: 'source',
                        variant: 'secondary',
                    },
                    ...context.bankAccounts.map(bank => ({
                        id: `source-${bank.id}`,
                        label: `🏦 ${bank.name} ($${bank.availableBalance.toFixed(2)})`,
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
                    `Send $${amount.toFixed(2)} to ${recipient.nickname}.\n\nSelect payment source:`,
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
                            <span className="text-20">🤖</span>
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
