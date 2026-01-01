'use client';

import { useState, useEffect } from 'react';
import { Users, ChevronDown, X } from 'lucide-react';
import { getSavedRecipients } from '@/lib/actions/savedRecipient.actions';

interface SavedRecipient {
    $id: string;
    nickname: string;
    recipientName?: string;
    recipientEmail?: string;
    recipientUserId?: string;
    recipientBankId?: string;
    transferType: 'bank' | 'wallet' | 'qr';
    bankName?: string;
    accountMask?: string;
}

interface SavedRecipientSelectorProps {
    userId: string;
    onSelect: (recipient: SavedRecipient) => void;
    onClear?: () => void;
}

const SavedRecipientSelector = ({ userId, onSelect, onClear }: SavedRecipientSelectorProps) => {
    const [recipients, setRecipients] = useState<SavedRecipient[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState<SavedRecipient | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadRecipients();
    }, [userId]);

    const loadRecipients = async () => {
        setIsLoading(true);
        const result = await getSavedRecipients(userId);
        if (result.success) {
            setRecipients(result.recipients as SavedRecipient[]);
        }
        setIsLoading(false);
    };

    const handleSelect = (recipient: SavedRecipient) => {
        setSelectedRecipient(recipient);
        setIsOpen(false);
        onSelect(recipient);
    };

    const handleClear = () => {
        setSelectedRecipient(null);
        onClear?.();
    };

    if (isLoading) {
        return (
            <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4">
                <p className="text-14 text-gray-400 text-center">Loading saved recipients...</p>
            </div>
        );
    }

    if (recipients.length === 0) {
        return null; // Don't show if no saved recipients
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <label className="text-14 font-medium text-gray-300">
                    Quick Select Saved Recipient
                </label>
            </div>

            <div className="relative">
                {selectedRecipient ? (
                    // Selected state
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-16 font-semibold text-white">{selectedRecipient.nickname}</p>
                                <p className="text-12 text-gray-400 mt-1">
                                    {selectedRecipient.recipientName || selectedRecipient.recipientEmail}
                                </p>
                                {selectedRecipient.transferType === 'bank' && selectedRecipient.bankName && (
                                    <p className="text-12 text-emerald-400 mt-1">
                                        {selectedRecipient.bankName} {selectedRecipient.accountMask && `•••• ${selectedRecipient.accountMask}`}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={handleClear}
                                className="ml-3 p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                title="Clear selection"
                            >
                                <X className="w-5 h-5 text-gray-400 hover:text-white" />
                            </button>
                        </div>
                    </div>
                ) : (
                    // Dropdown selector
                    <>
                        <button
                            type="button"
                            onClick={() => setIsOpen(!isOpen)}
                            className="w-full flex items-center justify-between bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-xl px-4 py-3 transition-colors"
                        >
                            <span className="text-14 text-gray-400">
                                {recipients.length} saved recipient{recipients.length !== 1 ? 's' : ''} available
                            </span>
                            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isOpen && (
                            <>
                                {/* Backdrop */}
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setIsOpen(false)}
                                />

                                {/* Dropdown menu */}
                                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-2xl z-50 max-h-80 overflow-y-auto">
                                    {recipients.map((recipient) => (
                                        <button
                                            key={recipient.$id}
                                            type="button"
                                            onClick={() => handleSelect(recipient)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-colors text-left border-b border-gray-700 last:border-0"
                                        >
                                            <div className="flex-center size-10 rounded-full bg-emerald-500/20">
                                                <span className="text-18">
                                                    {recipient.transferType === 'wallet' ? '💰' : '🏦'}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-14 font-semibold text-white truncate">
                                                    {recipient.nickname}
                                                </p>
                                                <p className="text-12 text-gray-400 truncate">
                                                    {recipient.recipientName || recipient.recipientEmail}
                                                </p>
                                                {recipient.bankName && (
                                                    <p className="text-11 text-emerald-400 mt-0.5">
                                                        {recipient.bankName} {recipient.accountMask && `•••• ${recipient.accountMask}`}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            <p className="text-11 text-gray-500">
                💡 Select a saved recipient to auto-fill their information
            </p>
        </div>
    );
};

export default SavedRecipientSelector;
