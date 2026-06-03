'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { formatAmount } from '@/lib/utils';
import { CreditCard, Landmark, Send, Check } from 'lucide-react';

interface ChatMessageProps {
    message: ChatMessage;
    onButtonClick?: (button: ChatActionButton) => void;
}

const ChatMessageComponent = ({ message, onButtonClick }: ChatMessageProps) => {
    const isUser = message.role === 'user';
    const [anyButtonClicked, setAnyButtonClicked] = useState(false);

    const handleButtonClick = (button: ChatActionButton) => {
        if (anyButtonClicked) {
            return;
        }
        setAnyButtonClicked(true);
        onButtonClick?.(button);
    };

    const pending = message.metadata?.pendingConfirmation;

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
                {/* Message bubble */}
                <div
                    className={`rounded-2xl px-4 py-3 ${isUser
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                        : 'bg-gray-800 border border-gray-700 text-white shadow-md'
                        }`}
                >
                    {/* Render pending transaction interactive card if present */}
                    {pending ? (
                        <div className="space-y-4 my-1 w-72">
                            {pending.type === 'transfer' && (
                                <div className="rounded-xl bg-gray-900/80 border border-blue-500/30 p-4 space-y-3 shadow-inner">
                                    <div className="flex items-center gap-2 border-b border-gray-800 pb-2 text-blue-400">
                                        <Send className="h-4 w-4" />
                                        <span className="text-12 font-bold uppercase tracking-wider">Chuyển khoản ví</span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-10 text-gray-400 block uppercase">Số tiền</span>
                                        <span className="text-22 font-extrabold text-white tracking-tight">
                                            {formatAmount(pending.payload.amount)}
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-12">
                                        <div>
                                            <span className="text-gray-400">Người nhận: </span>
                                            <span className="font-semibold text-gray-200">{pending.payload.recipientId}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Nội dung: </span>
                                            <span className="text-gray-300 italic">"{pending.payload.description}"</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {pending.type === 'bill_payment' && (
                                <div className="rounded-xl bg-gray-900/80 border border-emerald-500/30 p-4 space-y-3 shadow-inner">
                                    <div className="flex items-center gap-2 border-b border-gray-800 pb-2 text-emerald-400">
                                        <Landmark className="h-4 w-4" />
                                        <span className="text-12 font-bold uppercase tracking-wider">Thanh toán hóa đơn</span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-10 text-gray-400 block uppercase">Số tiền đóng</span>
                                        <span className="text-22 font-extrabold text-white tracking-tight">
                                            {formatAmount(pending.payload.amount)}
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-12">
                                        <div>
                                            <span className="text-gray-400">Dịch vụ: </span>
                                            <span className="font-semibold text-gray-200">{pending.payload.provider}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Mã hóa đơn: </span>
                                            <span className="font-mono text-gray-300">{pending.payload.billId}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {pending.type === 'portfolio_investment' && (
                                <div className="rounded-xl bg-gray-900/80 border border-violet-500/30 p-4 space-y-3 shadow-inner">
                                    <div className="flex items-center gap-2 border-b border-gray-800 pb-2 text-violet-400">
                                        <CreditCard className="h-4 w-4" />
                                        <span className="text-12 font-bold uppercase tracking-wider">Đầu tư danh mục AI</span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-10 text-gray-400 block uppercase">Tổng tiền phân bổ</span>
                                        <span className="text-22 font-extrabold text-white tracking-tight">
                                            {formatAmount(pending.payload.amount)}
                                        </span>
                                    </div>
                                    <p className="text-11 text-gray-400 leading-normal">
                                        Số tiền này sẽ được tự động chia nhỏ và đầu tư vào danh mục quỹ khuyến nghị tối ưu theo hồ sơ rủi ro hiện tại của bạn.
                                    </p>
                                </div>
                            )}
                            <p className="text-13 leading-relaxed text-gray-300">{message.content}</p>
                        </div>
                    ) : (
                        <p className="text-14 leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    )}
                </div>

                {/* Action buttons (only for assistant messages) */}
                {!isUser && message.metadata?.actionButtons && message.metadata.actionButtons.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {message.metadata.actionButtons.map((button) => {
                            const isDisabled = anyButtonClicked;
                            const isConfirm = button.type === 'confirm_agent_transaction' || button.type === 'confirm';
                            const isDanger = button.type === 'cancel_agent_transaction' || button.variant === 'danger' || button.type === 'cancel';

                            return (
                                <button
                                    key={button.id}
                                    onClick={() => handleButtonClick(button)}
                                    disabled={isDisabled}
                                    className={`
                                        px-4 py-2 rounded-lg text-14 font-bold transition-all active:scale-95 shadow-sm
                                        ${isDisabled
                                            ? 'opacity-50 cursor-not-allowed bg-gray-800 text-gray-500 border border-gray-900'
                                            : isConfirm
                                                ? 'bg-emerald-500 hover:bg-emerald-600 text-black cursor-pointer shadow-emerald-500/10'
                                                : isDanger
                                                    ? 'bg-rose-500 hover:bg-rose-600 text-white cursor-pointer shadow-rose-500/10'
                                                    : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 cursor-pointer'
                                        }
                                    `}
                                >
                                    {button.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Timestamp */}
                <p className={`text-10 text-gray-500 mt-1.5 ${isUser ? 'text-right' : 'text-left'}`}>
                    {format(new Date(message.timestamp), 'h:mm a')}
                </p>
            </div>
        </div>
    );
};

export default ChatMessageComponent;
