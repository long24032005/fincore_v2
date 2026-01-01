'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Trash2, Edit2, Clock, Wallet, Building2, SendHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    getSavedRecipients,
    deleteRecipient,
    updateRecipientNickname
} from '@/lib/actions/savedRecipient.actions';

interface SavedRecipient {
    $id: string;
    nickname: string;
    recipientUserId?: string; // NEW
    recipientName?: string;
    recipientEmail?: string;
    transferType: 'bank' | 'wallet' | 'qr';
    bankName?: string;
    accountMask?: string;
    createdFrom: 'normal_transfer' | 'qr_transfer';
    lastUsedAt?: string;
}

interface SavedRecipientsClientProps {
    user: any;
}

const SavedRecipientsClient = ({ user }: SavedRecipientsClientProps) => {
    const router = useRouter();
    const [recipients, setRecipients] = useState<SavedRecipient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editNickname, setEditNickname] = useState('');

    useEffect(() => {
        loadRecipients();
    }, []);

    const loadRecipients = async () => {
        setIsLoading(true);
        const result = await getSavedRecipients(user.$id);
        if (result.success) {
            setRecipients(result.recipients as SavedRecipient[]);
        }
        setIsLoading(false);
    };

    const handleQuickTransfer = (recipient: SavedRecipient) => {
        // Encode recipient data to pass via URL
        const recipientData = encodeURIComponent(JSON.stringify({
            id: recipient.$id,
            nickname: recipient.nickname,
            userId: recipient.recipientUserId, // NEW: User ID of recipient
            email: recipient.recipientEmail,
            name: recipient.recipientName,
            walletId: (recipient as any).recipientWalletId,
            bankId: (recipient as any).recipientBankId,
            bankName: recipient.bankName,
            transferType: recipient.transferType
        }));

        // Route based on transfer type
        if (recipient.transferType === 'wallet' || recipient.transferType === 'qr') {
            // For wallet transfers, go to QR transfer page
            router.push(`/qr-transfer?recipient=${recipientData}`);
        } else {
            // For bank transfers, go to normal transfer page
            router.push(`/payment-transfer?recipient=${recipientData}`);
        }
    };

    const handleDelete = async (recipientId: string, nickname: string) => {
        if (!confirm(`Are you sure you want to remove "${nickname}"?`)) {
            return;
        }

        const result = await deleteRecipient(recipientId);
        if (result.success) {
            toast.success(result.message);
            loadRecipients();
        } else {
            toast.error(result.message);
        }
    };

    const startEdit = (recipient: SavedRecipient) => {
        setEditingId(recipient.$id);
        setEditNickname(recipient.nickname);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditNickname('');
    };

    const saveEdit = async (recipientId: string) => {
        if (!editNickname.trim()) {
            toast.error('Nickname cannot be empty');
            return;
        }

        const result = await updateRecipientNickname(recipientId, editNickname);
        if (result.success) {
            toast.success(result.message);
            setEditingId(null);
            loadRecipients();
        } else {
            toast.error(result.message);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading saved recipients...</p>
                </div>
            </div>
        );
    }

    if (recipients.length === 0) {
        return (
            <div className="glass-panel !rounded-xl p-12 text-center">
                <div className="flex-center size-20 rounded-full bg-gray-800/50 mx-auto mb-4">
                    <User className="w-10 h-10 text-gray-500" />
                </div>
                <h3 className="text-20 font-semibold text-white mb-2">No saved recipients yet</h3>
                <p className="text-14 text-gray-400 max-w-md mx-auto">
                    When you save recipients during QR or normal transfers, they'll appear here for quick access.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-14 text-gray-400">
                    {recipients.length} saved recipient{recipients.length !== 1 ? 's' : ''}
                </p>
            </div>

            <div className="grid gap-4">
                {recipients.map((recipient) => (
                    <div
                        key={recipient.$id}
                        className="glass-panel !rounded-xl p-5 hover:border-emerald-500/30 transition-all"
                    >
                        <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className="flex-center size-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20">
                                {recipient.transferType === 'wallet' ? (
                                    <Wallet className="w-7 h-7 text-emerald-400" />
                                ) : (
                                    <Building2 className="w-7 h-7 text-blue-400" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                {/* Nickname (editable) */}
                                {editingId === recipient.$id ? (
                                    <div className="flex items-center gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={editNickname}
                                            onChange={(e) => setEditNickname(e.target.value)}
                                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-16 font-semibold focus:border-emerald-500 focus:outline-none"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => saveEdit(recipient.$id)}
                                            className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-14 font-semibold hover:bg-emerald-600 transition-colors"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={cancelEdit}
                                            className="px-3 py-2 bg-gray-700 text-white rounded-lg text-14 font-semibold hover:bg-gray-600 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <h3 className="text-18 font-semibold text-white mb-2">
                                        {recipient.nickname}
                                    </h3>
                                )}

                                {/* Recipient info */}
                                <div className="space-y-1">
                                    <p className="text-14 text-gray-300">
                                        {recipient.recipientName || recipient.recipientEmail}
                                    </p>
                                    {recipient.recipientEmail && recipient.recipientName && (
                                        <p className="text-12 text-gray-500">{recipient.recipientEmail}</p>
                                    )}
                                    {recipient.bankName && (
                                        <p className="text-13 text-blue-400">
                                            {recipient.bankName}
                                            {recipient.accountMask && ` •••• ${recipient.accountMask}`}
                                        </p>
                                    )}
                                </div>

                                {/* Metadata */}
                                <div className="flex items-center gap-4 mt-3">
                                    <div className="flex items-center gap-1.5 text-12 text-gray-500">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Last used: {formatDate(recipient.lastUsedAt)}</span>
                                    </div>
                                    <span className="text-11 px-2 py-1 rounded-md bg-gray-700/50 text-gray-400">
                                        {recipient.createdFrom === 'qr_transfer' ? '📱 QR Scan' : '📝 Manual'}
                                    </span>
                                    <span className="text-11 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400">
                                        {recipient.transferType === 'wallet' ? '💰 Wallet' : '🏦 Bank'}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            {editingId !== recipient.$id && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleQuickTransfer(recipient)}
                                        className="p-2 hover:bg-emerald-500/10 rounded-lg transition-colors group"
                                        title="Quick Transfer"
                                    >
                                        <SendHorizontal className="w-5 h-5 text-gray-400 group-hover:text-emerald-400" />
                                    </button>
                                    <button
                                        onClick={() => startEdit(recipient)}
                                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors group"
                                        title="Edit nickname"
                                    >
                                        <Edit2 className="w-5 h-5 text-gray-400 group-hover:text-white" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(recipient.$id, recipient.nickname)}
                                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
                                        title="Remove recipient"
                                    >
                                        <Trash2 className="w-5 h-5 text-gray-400 group-hover:text-red-400" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SavedRecipientsClient;
