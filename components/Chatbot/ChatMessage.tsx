'use client';

import { useState } from 'react';
import { format } from 'date-fns';

interface ChatMessageProps {
    message: ChatMessage;
    onButtonClick?: (button: ChatActionButton) => void;
}

const ChatMessageComponent = ({ message, onButtonClick }: ChatMessageProps) => {
    const isUser = message.role === 'user';
    const [anyButtonClicked, setAnyButtonClicked] = useState(false);

    const handleButtonClick = (button: ChatActionButton) => {
        // Prevent any action if any button already clicked
        if (anyButtonClicked) {
            return;
        }

        // Mark that a button has been clicked (disables ALL buttons)
        setAnyButtonClicked(true);

        // Call the original handler
        onButtonClick?.(button);
    };

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
                {/* Message bubble */}
                <div
                    className={`rounded-2xl px-4 py-3 ${isUser
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : 'bg-gray-800 border border-gray-700 text-white'
                        }`}
                >
                    <p className="text-14 leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>

                {/* Action buttons (only for assistant messages) */}
                {!isUser && message.metadata?.actionButtons && message.metadata.actionButtons.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {message.metadata.actionButtons.map((button) => {
                            // All buttons disabled if any button clicked
                            const isDisabled = anyButtonClicked;

                            return (
                                <button
                                    key={button.id}
                                    onClick={() => handleButtonClick(button)}
                                    disabled={isDisabled}
                                    className={`
                                        px-4 py-2 rounded-lg text-14 font-medium transition-all
                                        ${isDisabled
                                            ? 'opacity-50 cursor-not-allowed bg-gray-600 text-gray-400'
                                            : button.variant === 'primary'
                                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer'
                                                : button.variant === 'danger'
                                                    ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
                                                    : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 cursor-pointer'
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
                <p className={`text-10 text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
                    {format(new Date(message.timestamp), 'h:mm a')}
                </p>
            </div>
        </div>
    );
};

export default ChatMessageComponent;
