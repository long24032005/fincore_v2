/* Chatbot Types */

declare type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: {
        intent?: ChatIntent;
        transferId?: string;
        actionButtons?: ChatActionButton[];
        pendingConfirmation?: {
            type: 'transfer' | 'bill_payment' | 'portfolio_investment';
            payload: any;
        };
    };
};

declare type ChatActionButton = {
    id: string;
    label: string;
    value: string;
    type: 'source' | 'destination' | 'confirm' | 'cancel' | 'recipient' | 'proactive_action' | 'confirm_agent_transaction' | 'cancel_agent_transaction';
    variant?: 'primary' | 'secondary' | 'danger';
};

declare type ChatIntent =
    | 'transfer_money'
    | 'check_balance'
    | 'list_recipients'
    | 'transaction_history'
    | 'general_query'
    | 'multiple_intents'
    | 'unknown';

declare type ChatbotContext = {
    userId: string;
    userName: string;
    walletBalance: number;
    bankAccounts: Array<{
        id: string;
        name: string;
        mask: string;
        availableBalance: number;
        actualBalance: number;
        pendingBalance: number;
    }>;
    savedRecipients: Array<{
        id: string;
        nickname: string;
        name: string;
        email: string;
        transferType: 'wallet' | 'bank';
        recipientUserId?: string;
        recipientBankId?: string;
    }>;
    recentTransactions: Transaction[];
};

declare type TransferRequest = {
    recipientId: string;
    recipientNickname: string;
    amount: number;
    source: 'wallet' | string; // 'wallet' or bank appwriteItemId
    destination: 'wallet' | 'bank';
    destinationBankId?: string;
};

declare type ChatbotLimits = {
    maxPerTransfer: number;
    maxDailyTotal: number;
    maxDailyCount: number;
    warningThreshold: number; // Amount above which extra confirmation is needed
};

declare interface ChatbotBubbleProps {
    user: User;
}

declare interface ChatbotWindowProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
}

declare interface ChatMessageProps {
    message: ChatMessage;
    onButtonClick?: (button: ChatActionButton) => void;
}
