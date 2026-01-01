'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatbotWindow from './ChatbotWindow';

interface ChatbotBubbleProps {
    user: User;
}

const ChatbotBubble = ({ user }: ChatbotBubbleProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Floating Bubble */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 size-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg hover:shadow-xl flex-center transition-shadow z-50 group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <span className="text-24">✕</span>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="open"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <MessageCircle className="w-7 h-7 text-white" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Pulse effect when closed */}
                {!isOpen && (
                    <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75" />
                )}
            </motion.button>

            {/* Chatbot Window */}
            <ChatbotWindow user={user} isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
};

export default ChatbotBubble;
