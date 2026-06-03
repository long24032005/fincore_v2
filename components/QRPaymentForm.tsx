'use client';

import { useState, useEffect } from 'react';
// User type is globally available from types/index.d.ts
import { ArrowLeft, Check, CheckCircle2, Home, Share2, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { transferBalance } from '@/lib/actions/wallet.actions';
import { getAvailableBalance } from '@/lib/actions/bankBalance.actions';
import { getBank, getBankByAccountId, getBankByAppwriteItemId, getUserInfo } from '@/lib/actions/user.actions';
import { createTransfer } from '@/lib/actions/dwolla.actions';
import { createTransaction } from '@/lib/actions/transaction.actions';
import { saveRecipient } from '@/lib/actions/savedRecipient.actions';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface QRPaymentFormProps {
    sender: User;
    senderBanks?: any[];
    recipientData: {
        userId: string;
        email: string;
        name: string;
        amount: number | null;
        destinationType?: 'wallet' | 'bank';
        destinationBankId?: string;
    };
    onBack: () => void;
    onCancel: () => void;
}

const QRPaymentForm = ({ sender, senderBanks = [], recipientData, onBack, onCancel }: QRPaymentFormProps) => {
    const router = useRouter();
    const [amount, setAmount] = useState(recipientData.amount?.toString() || '');
    const [note, setNote] = useState('');
    const [method, setMethod] = useState<'wallet' | 'bank'>('wallet');
    const [selectedBankId, setSelectedBankId] = useState('');
    const [availableBalance, setAvailableBalance] = useState({ actual: 0, pending: 0, available: 0 });
    const [isBalanceLoading, setIsBalanceLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [successData, setSuccessData] = useState<any>(null); // State for success modal

    // Save recipient states
    const [shouldSaveRecipient, setShouldSaveRecipient] = useState(false);
    const [recipientNickname, setRecipientNickname] = useState(recipientData.name || '');

    // Initialize selectedBankId when senderBanks loads
    useEffect(() => {
        console.log('🔄 useEffect triggered - Banks length:', senderBanks.length);
        if (senderBanks.length > 0 && !selectedBankId) {
            const defaultId = senderBanks[0].appwriteItemId;
            console.log('🏦 Setting default bank:', defaultId, senderBanks[0].name);
            setSelectedBankId(defaultId);
        }
    }, [senderBanks.length]);

    // Load available balance when bank is selected
    useEffect(() => {
        if (method === 'bank' && selectedBankId) {
            loadAvailableBalance();
        }
    }, [method, selectedBankId]);

    const loadAvailableBalance = async () => {
        if (!selectedBankId) return;
        setIsBalanceLoading(true);
        try {
            const balance = await getAvailableBalance(selectedBankId);
            setAvailableBalance(balance);
        } finally {
            setIsBalanceLoading(false);
        }
    };

    // Helper function to save recipient after successful transfer
    const saveRecipientIfNeeded = async () => {
        console.log('🔍 DEBUG QR - saveRecipientIfNeeded called:', {
            shouldSaveRecipient,
            recipientNickname,
            'nickname.trim()': recipientNickname.trim()
        });

        if (!shouldSaveRecipient || !recipientNickname.trim()) {
            console.log('⚠️ DEBUG QR - Skipping save:', { shouldSaveRecipient, hasNickname: !!recipientNickname.trim() });
            return;
        }

        try {
            // Check if we have walletId from QR data
            let actualWalletId = (recipientData as any).walletId;

            // If not, fetch it from the user profile
            if (!actualWalletId && recipientData.userId) {
                console.log('🔍 Fetching walletId for recipient:', recipientData.userId);
                try {
                    const recipientUser = await getUserInfo({ userId: recipientData.userId });
                    if (recipientUser) {
                        actualWalletId = recipientUser.walletId;
                        console.log('✅ Fetched walletId:', actualWalletId);
                    }
                } catch (err) {
                    console.error('⚠️ Failed to fetch recipient walletId:', err);
                }
            }

            console.log('📤 DEBUG QR - Calling saveRecipient with:', {
                userId: sender.$id,
                nickname: recipientNickname,
                recipientUserId: recipientData.userId,
                recipientEmail: recipientData.email,
                actualWalletId
            });

            const saveResult = await saveRecipient({
                userId: sender.$id,
                nickname: recipientNickname,
                transferType: recipientData.destinationType === 'wallet' ? 'wallet' : 'bank',
                recipientUserId: recipientData.userId,
                recipientWalletId: actualWalletId, // Use fetched walletId
                recipientEmail: recipientData.email,
                recipientName: recipientData.name,
                recipientBankId: recipientData.destinationBankId,
                createdFrom: 'qr_transfer'
            });

            console.log('📥 DEBUG QR - saveRecipient result:', saveResult);

            if (saveResult.success) {
                toast.success(saveResult.message, { duration: 4000 });
            } else {
                toast(saveResult.message, { duration: 4000, icon: 'ℹ️' });
            }
        } catch (error) {
            console.error('❌ DEBUG QR - Failed to save recipient:', error);
        }
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prevent double submission
        if (isLoading) {
            console.warn('⚠️ Already processing, ignoring duplicate submit');
            return;
        }

        console.log('🚀 QR Payment Form Submitted');
        console.log('Selected Bank ID:', selectedBankId);
        console.log('Sender Banks:', senderBanks);
        setIsLoading(true);

        try {
            const transferAmount = parseFloat(amount);
            console.log('💰 Transfer Amount:', transferAmount);
            console.log('🔧 Method:', method);

            if (!transferAmount || transferAmount <= 0) {
                console.error('❌ Invalid amount:', transferAmount);
                toast.error('Please enter a valid amount');
                setIsLoading(false);
                return;
            }

            if (method === 'wallet') {
                console.log('💰 Sender chose WALLET as payment method');
                console.log('Sender:', sender.$id);
                console.log('Receiver:', recipientData.userId);

                // Check if QR specifies BANK as destination
                if (recipientData.destinationType === 'bank') {
                    console.log('🏦 QR specifies BANK destination → Wallet to Bank transfer');

                    // Find recipient's bank account FIRST
                    let receiverBankDetails;
                    const { getAccounts } = await import('@/lib/actions/bank.actions');

                    if (recipientData.destinationBankId) {
                        console.log('📍 QR specifies destination bank:', recipientData.destinationBankId);
                        try {
                            receiverBankDetails = await getBank({ documentId: recipientData.destinationBankId });
                        } catch (err) {
                            console.error('❌ Failed to fetch specified destination bank', err);
                        }
                    }

                    if (!receiverBankDetails) {
                        console.log('🔍 Auto-discovering recipient bank...');
                        const receiverAccounts = await getAccounts({ userId: recipientData.userId });

                        if (!receiverAccounts || receiverAccounts.data.length === 0) {
                            console.error('❌ Recipient has no bank accounts');
                            toast.error('Recipient has no linked bank account.');
                            setIsLoading(false);
                            return;
                        }

                        const receiverDefaultAccount = receiverAccounts.data[0];
                        receiverBankDetails = await getBank({ documentId: receiverDefaultAccount.appwriteItemId });
                    }

                    if (!receiverBankDetails) {
                        console.error('❌ Could not fetch recipient bank details');
                        toast.error('Could not verify recipient bank details.');
                        setIsLoading(false);
                        return;
                    }

                    // ═══════════════════════════════════════════════════════════════════
                    // 🔴 UNIFIED TRANSFER: Use the same transferBalance function for consistency
                    // ═══════════════════════════════════════════════════════════════════
                    // Previously this was duplicated logic - now using the unified function
                    // with explicit receiverBankId to force Wallet→Bank routing
                    const result = await transferBalance({
                        senderId: sender.$id,
                        receiverId: recipientData.userId, // Receiver User ID
                        receiverBankId: receiverBankDetails.$id, // 🎯 EXPLICIT: Forces Wallet→Bank routing
                        amount: transferAmount,
                        description: note || `QR Payment to ${recipientData.name}`,
                    });

                    console.log('💰 QR Wallet→Bank Transfer Result:', result);

                    if (result && result.success) {
                        // Save recipient if user opted to
                        await saveRecipientIfNeeded();

                        toast.success(
                            `✅ Payment Sent! $${transferAmount.toFixed(2)} deducted from wallet.`,
                            { duration: 4000 }
                        );
                        router.refresh(); // Force server data refresh
                        setSuccessData({
                            amount: transferAmount.toFixed(2),
                            to: recipientData.name,
                            toBank: receiverBankDetails.name,
                            toId: receiverBankDetails.shareableId,
                            from: 'Wallet Balance',
                            fromDetail: 'Finecore Wallet',
                            fromId: sender.walletId,
                            senderName: `${sender.firstName} ${sender.lastName}`,
                            id: result.transactionId || 'N/A',
                            time: new Date().toLocaleString()
                        });
                    } else {
                        console.error('❌ Wallet→Bank transfer failed:', result);
                        throw new Error(result?.message || 'Transfer failed');
                    }

                } else {
                    // QR specifies WALLET destination → Wallet to Wallet transfer
                    console.log('💰 QR specifies WALLET destination → Wallet to Wallet transfer');

                    const result = await transferBalance({
                        senderId: sender.$id,
                        receiverId: recipientData.userId,
                        amount: transferAmount,
                        description: note || `QR Payment to ${recipientData.name}`,
                        // email auto-resolved by backend
                    });

                    console.log('💰 Wallet Transfer Result:', result);

                    if (result && result.success) {
                        // Save recipient if user opted to
                        await saveRecipientIfNeeded();

                        toast.success(
                            `✅ Payment Successful! Sent $${transferAmount.toFixed(2)} to ${recipientData.name}.`,
                            { duration: 4000 }
                        );
                        router.refresh(); // Force server data refresh
                        setSuccessData({
                            amount: transferAmount.toFixed(2),
                            to: recipientData.name,
                            toBank: 'Finecore Wallet',
                            toId: (recipientData as any).walletId,
                            from: 'Wallet Balance',
                            fromDetail: 'Finecore Wallet',
                            fromId: sender.walletId,
                            senderName: `${sender.firstName} ${sender.lastName}`,
                            id: result.transactionId || 'N/A',
                            time: new Date().toLocaleString()
                        });
                        // router.push('/'); REMOVED
                    } else {
                        console.error('❌ Wallet transfer failed:', result);
                        throw new Error(result?.error || 'Transfer failed');
                    }
                }
            } else {
                console.log('🏦 Sender chose BANK as payment method');

                if (!selectedBankId) {
                    console.error('❌ No bank selected');
                    toast.error('Please select a bank account');
                    setIsLoading(false);
                    return;
                }

                console.log('Selected Bank ID:', selectedBankId);
                console.log('Available Balance:', availableBalance);

                if (transferAmount > availableBalance.available) {
                    console.error('❌ Insufficient balance');
                    toast.error(
                        `Insufficient balance! Available: $${availableBalance.available.toFixed(2)}, Needed: $${transferAmount.toFixed(2)}`,
                        { duration: 5000 }
                    );
                    setIsLoading(false);
                    return;
                }

                // Check if QR code specifies WALLET as destination
                if (recipientData.destinationType === 'wallet') {
                    console.log('💰 QR specifies WALLET destination → Bank to Wallet transfer');

                    // This is a Bank → Wallet hybrid transfer
                    // We don't use Dwolla for this, just record the transaction as pending
                    // and credit the recipient's wallet balance

                    const transaction = await createTransaction({
                        name: note || `QR Payment to ${recipientData.name}`,
                        amount: transferAmount.toString(),
                        senderId: sender.$id,
                        senderBankId: selectedBankId,
                        receiverId: recipientData.userId,
                        receiverBankId: '', // No receiver bank for wallet destination
                        email: recipientData.email,
                        category: 'QR Transfer',
                        status: 'Success', // Wallet credit is instant
                        channel: 'qr'
                    });

                    if (transaction) {
                        // Save recipient if needed
                        await saveRecipientIfNeeded();

                        // Credit recipient's wallet
                        const { updateUserBalance } = await import('@/lib/actions/wallet.actions');
                        await updateUserBalance({
                            userId: recipientData.userId,
                            amount: transferAmount,
                            operation: 'add'
                        });

                        toast.success(
                            `✅ Payment Sent! $${transferAmount.toFixed(2)} will be credited to wallet.`,
                            { duration: 4000 }
                        );
                        setSuccessData({
                            amount: transferAmount.toFixed(2),
                            to: recipientData.name,
                            toBank: 'Finecore Wallet',
                            toId: (recipientData as any).walletId,
                            from: senderBanks.find(b => b.appwriteItemId === selectedBankId)?.name || 'Bank Account',
                            fromDetail: senderBanks.find(b => b.appwriteItemId === selectedBankId)?.subtype || 'Checking',
                            fromId: senderBanks.find(b => b.appwriteItemId === selectedBankId)?.shareableId || 'N/A',
                            senderName: `${sender.firstName} ${sender.lastName}`,
                            id: transaction?.$id || 'N/A',
                            time: new Date().toLocaleString()
                        });
                        // router.push('/'); REMOVED
                    } else {
                        toast.error('Failed to create transaction record.');
                        setIsLoading(false);
                    }

                } else {
                    // QR specifies BANK destination → Bank to Bank transfer
                    console.log('🏦 QR specifies BANK destination → Bank to Bank transfer');

                    const senderBank = await getBankByAppwriteItemId(selectedBankId); // ✅ FIX: Use correct function

                    if (!senderBank) {
                        console.error('❌ Sender bank not found');
                        toast.error('Could not find your bank account');
                        setIsLoading(false);
                        return;
                    }

                    // Find recipient's bank account
                    let receiverBankDetails;
                    const { getAccounts } = await import('@/lib/actions/bank.actions');

                    if (recipientData.destinationBankId) {
                        console.log('📍 QR specifies destination bank:', recipientData.destinationBankId);
                        try {
                            receiverBankDetails = await getBank({ documentId: recipientData.destinationBankId });
                        } catch (err) {
                            console.error('❌ Failed to fetch specified destination bank', err);
                        }
                    }

                    if (!receiverBankDetails) {
                        console.log('🔍 Auto-discovering recipient bank...');
                        const receiverAccounts = await getAccounts({ userId: recipientData.userId });

                        if (!receiverAccounts || receiverAccounts.data.length === 0) {
                            console.error('❌ Recipient has no bank accounts');
                            toast.error(
                                'Recipient has no linked bank account.',
                                { duration: 5000 }
                            );
                            setIsLoading(false);
                            return;
                        }

                        const receiverDefaultAccount = receiverAccounts.data[0];
                        receiverBankDetails = await getBank({ documentId: receiverDefaultAccount.appwriteItemId });
                    }

                    if (!receiverBankDetails) {
                        console.error('❌ Could not fetch recipient bank details');
                        toast.error('Could not verify recipient bank details.');
                        setIsLoading(false);
                        return;
                    }

                    if (!senderBank.fundingSourceUrl || !receiverBankDetails.fundingSourceUrl) {
                        console.error('❌ Missing funding source URL');
                        toast.error('Bank account configuration error.');
                        setIsLoading(false);
                        return;
                    }

                    if (senderBank.$id === receiverBankDetails.$id) {
                        console.error('❌ Cannot transfer to same bank account');
                        toast.error('You cannot transfer to the same bank account!');
                        setIsLoading(false);
                        return;
                    }

                    // Create Dwolla transfer
                    const transfer = await createTransfer({
                        sourceFundingSourceUrl: senderBank.fundingSourceUrl,
                        destinationFundingSourceUrl: receiverBankDetails.fundingSourceUrl,
                        amount: transferAmount.toString()
                    });

                    if (!transfer) {
                        console.error('❌ createTransfer failed');
                        toast.error('Transfer failed. Please try again.');
                        setIsLoading(false);
                        return;
                    }

                    const transaction = await createTransaction({
                        name: note || `QR Payment to ${recipientData.name}`,
                        amount: transferAmount.toString(),
                        senderId: sender.$id,
                        senderBankId: selectedBankId,
                        receiverId: recipientData.userId,
                        receiverBankId: receiverBankDetails.$id,
                        email: recipientData.email,
                        category: 'QR Transfer',
                        status: 'Processing', // Bank-to-bank takes 1-3 days
                        channel: 'qr'
                    });

                    if (transaction) {
                        // Save recipient if needed
                        await saveRecipientIfNeeded();

                        toast.success(
                            `⏳ Bank Transfer Initiated! $${transferAmount.toFixed(2)} will arrive in 1-3 days.`,
                            { duration: 4000 }
                        );
                        setSuccessData({
                            amount: transferAmount.toFixed(2),
                            to: recipientData.name,
                            toBank: receiverBankDetails.name,
                            toId: receiverBankDetails.shareableId,
                            from: senderBanks.find(b => b.appwriteItemId === selectedBankId)?.name || 'Bank Account',
                            fromDetail: senderBanks.find(b => b.appwriteItemId === selectedBankId)?.subtype || 'Checking',
                            fromId: senderBanks.find(b => b.appwriteItemId === selectedBankId)?.shareableId || 'N/A',
                            senderName: `${sender.firstName} ${sender.lastName}`,
                            id: transaction?.$id || 'N/A',
                            time: new Date().toLocaleString()
                        });
                        // router.push('/'); REMOVED
                    } else {
                        toast.error('Failed to save transaction record.');
                    }
                }
            }
        } catch (error: any) {
            console.error('💥 Payment Error:', error);
            toast.error(`Payment Failed: ${error.message || 'Unknown error'}`, { duration: 5000 });
        } finally {
            setIsLoading(false);
            console.log('✅ Payment process completed');
        }
    };

    const handleShare = async () => {
        if (!successData) return;

        const shareText = `Finecore Transfer Receipt\nAmount: $${successData.amount}\nTo: ${successData.to}\nRef ID: ${successData.id}\nTime: ${successData.time}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Finecore Receipt',
                    text: shareText,
                });
            } catch (err) {
                console.log('Share cancelled or failed', err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareText);
                toast.success('Receipt details copied to clipboard!');
            } catch (err) {
                toast.error('Failed to copy to clipboard');
            }
        }
    };

    const handleSave = async () => {
        const receiptElement = document.getElementById('receipt-modal-content');
        if (!receiptElement) return;

        try {
            const canvas = await html2canvas(receiptElement, {
                backgroundColor: '#0f1012', // Match modal background
                scale: 2 // Higher resolution
            });

            const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.href = image;
            link.download = `finecore-receipt-${successData.id.slice(-8)}.png`;
            link.click();

            toast.success('Receipt saved successfully!');
        } catch (err) {
            console.error('Save failed:', err);
            toast.error('Failed to save receipt image');
        }
    };

    return (
        <>
            {/* Success Modal */}
            {successData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div id="receipt-modal-content" className="bg-[#0f1012] border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="bg-emerald-500/10 p-6 flex flex-col items-center border-b border-gray-800">
                            <div className="size-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 ring-2 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h2 className="text-20 font-bold text-white mb-1">Transfer Successful!</h2>
                            <p className="text-14 text-gray-400">Transaction completed</p>

                            <div className="mt-6 text-center">
                                <p className="text-14 text-gray-400 mb-1">Total Amount</p>
                                <p className="text-36 font-bold text-white tracking-tight">
                                    ${successData.amount}
                                </p>
                            </div>
                        </div>

                        {/* Receipt Details */}
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-gray-800/50">
                                <span className="text-14 text-gray-400">To</span>
                                <div className="text-right flex flex-col items-end">
                                    <p className="text-14 font-semibold text-white">{successData.to}</p>
                                    <p className="text-12 text-emerald-400 font-medium">{successData.toBank}</p>
                                    {successData.toId && (
                                        <p className="text-12 text-gray-500 font-mono mt-0.5">
                                            {successData.toBank === 'Finecore Wallet' ? successData.toId : `Account • ${successData.toId}`}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-800/50">
                                <span className="text-14 text-gray-400">From</span>
                                <div className="text-right flex flex-col items-end">
                                    <p className="text-14 font-semibold text-white">{successData.senderName}</p>
                                    <p className="text-12 text-emerald-400 font-medium">{successData.from}</p>
                                    {successData.fromId && (
                                        <p className="text-12 text-gray-500 font-mono mt-0.5">
                                            {successData.fromId}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-800/50">
                                <span className="text-14 text-gray-400">Time</span>
                                <span className="text-14 text-gray-300">{successData.time}</span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-14 text-gray-400">Ref ID</span>
                                <span className="text-12 font-mono text-gray-500 uppercase tracking-wider">{successData.id.slice(-8)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 pt-2 grid grid-cols-2 gap-3">
                            <button
                                onClick={onCancel}
                                className="col-span-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                            >
                                Done
                            </button>
                            <button
                                onClick={handleShare}
                                className="flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-colors border border-gray-700"
                            >
                                <Share2 className="w-4 h-4" /> Share
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-colors border border-gray-700"
                            >
                                <Download className="w-4 h-4" /> Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex-center size-10 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div>
                        <h1 className="text-24 font-bold text-white">Confirm Payment</h1>
                        <p className="text-14 text-gray-400">Review and confirm transfer</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <div className="flex-center size-10 rounded-full bg-emerald-500/20">
                        <Check className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-16 font-semibold text-emerald-400">QR Scanned Successfully</p>
                        <p className="text-12 text-gray-400">Recipient verified</p>
                    </div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                    <p className="text-14 text-gray-400 mb-3">Recipient</p>
                    <div className="flex items-center gap-4">
                        <div className="flex-center size-14 rounded-full bg-emerald-500 text-white text-20 font-bold">
                            {recipientData.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                            <p className="text-18 font-bold text-white">{recipientData.name}</p>
                            <p className="text-14 text-gray-400">{recipientData.email}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-14 font-medium text-gray-300 mb-3 block">Transfer Method</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setMethod('wallet')}
                            className={`p-4 rounded-xl border-2 transition-all ${method === 'wallet' ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-24">💰</span>
                                <div className="text-left">
                                    <p className="text-16 font-semibold text-white">Wallet Balance</p>
                                    <p className="text-12 text-emerald-400">Instant • FREE</p>
                                </div>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setMethod('bank')}
                            className={`p-4 rounded-xl border-2 transition-all ${method === 'bank' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-24">🏦</span>
                                <div className="text-left">
                                    <p className="text-16 font-semibold text-white">Bank Account</p>
                                    <p className="text-12 text-blue-400">1-3 days • $0.25 fee</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {method === 'bank' && (
                    <div>
                        <label className="text-14 font-medium text-gray-300 mb-3 block">Select Source Bank</label>
                        {senderBanks.length > 0 ? (
                            <>
                                <Select
                                    defaultValue={selectedBankId}
                                    onValueChange={(value) => {
                                        console.log('🏦 Bank selected:', value);
                                        setSelectedBankId(value);
                                    }}
                                >
                                    <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white h-[50px] rounded-lg">
                                        <SelectValue placeholder="Select a bank" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700">
                                        {senderBanks.map((bank: any) => (
                                            <SelectItem
                                                key={bank.appwriteItemId}
                                                value={bank.appwriteItemId}
                                                className="text-white hover:bg-gray-700 cursor-pointer focus:bg-gray-700"
                                            >
                                                <div className="flex flex-col text-left">
                                                    <span className="text-14 font-medium">{bank.name}</span>
                                                    <span className="text-12 text-gray-400 capitalize">{bank.subtype}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Balance Section with Loading State */}
                                {isBalanceLoading ? (
                                    <div className="mt-4 bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3 animate-pulse">
                                        <div className="flex justify-between">
                                            <div className="h-4 bg-gray-700 rounded w-24"></div>
                                            <div className="h-4 bg-gray-700 rounded w-16"></div>
                                        </div>
                                        <div className="flex justify-between">
                                            <div className="h-4 bg-gray-700 rounded w-32"></div>
                                            <div className="h-4 bg-gray-700 rounded w-12"></div>
                                        </div>
                                        <div className="h-px bg-gray-700"></div>
                                        <div className="flex justify-between">
                                            <div className="h-5 bg-gray-700 rounded w-28"></div>
                                            <div className="h-5 bg-gray-700 rounded w-20"></div>
                                        </div>
                                    </div>
                                ) : availableBalance.actual > 0 && (
                                    <div className="mt-4 bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3">
                                        <div className="flex justify-between text-14">
                                            <span className="text-gray-400">Actual Balance</span>
                                            <span className="text-white font-semibold">${availableBalance.actual.toFixed(2)}</span>
                                        </div>

                                        <div className="flex justify-between text-14">
                                            <span className={availableBalance.pending > 0 ? "text-yellow-400" : "text-gray-400"}>Pending Transfers</span>
                                            <span className={`${availableBalance.pending > 0 ? "text-yellow-400" : "text-gray-400"} font-semibold`}>
                                                {availableBalance.pending > 0 ? `-$${availableBalance.pending.toFixed(2)}` : '$0.00'}
                                            </span>
                                        </div>

                                        <div className="h-px bg-gray-700"></div>

                                        <div className="flex justify-between text-16">
                                            <span className="text-emerald-400 font-medium">Available Balance</span>
                                            <span className="text-emerald-400 font-bold">${availableBalance.available.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                                <p className="text-14 text-yellow-300">⚠️ No linked bank accounts. Please use Wallet Balance.</p>
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label className="text-14 font-medium text-gray-300 mb-3 block">
                        Amount {recipientData.amount && <span className="text-gray-500">(Pre-filled)</span>}
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-18">$</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            step="0.01"
                            required
                            readOnly={!!recipientData.amount}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-4 text-white text-20 font-bold placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-14 font-medium text-gray-300 mb-3 block">Note (Optional)</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="What's this payment for?"
                        rows={3}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none resize-none"
                    />
                </div>

                {/* Save Recipient Section */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={shouldSaveRecipient}
                            onChange={(e) => setShouldSaveRecipient(e.target.checked)}
                            className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                        />
                        <div className="flex-1">
                            <span className="text-14 font-medium text-white group-hover:text-emerald-400 transition-colors">
                                💾 Save this recipient for future transfers
                            </span>
                            <p className="text-12 text-gray-400 mt-1">
                                Quick access for next time - no need to scan QR again
                            </p>
                        </div>
                    </label>

                    {shouldSaveRecipient && (
                        <div className="pl-8 mt-3">
                            <label className="text-14 font-medium text-gray-300 mb-2 block">
                                Recipient Nickname
                                <span className="text-gray-500 font-normal ml-1">(for your reference)</span>
                            </label>
                            <input
                                type="text"
                                value={recipientNickname}
                                onChange={(e) => setRecipientNickname(e.target.value)}
                                placeholder="e.g. Mom, Coffee Shop, Roommate..."
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
                            />
                            <p className="text-12 text-gray-500 mt-2">
                                💡 This name is just for you - it doesn't have to match their real name
                            </p>
                        </div>
                    )}
                </div>

                {amount && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                        <div className="flex justify-between items-center text-14 mb-2">
                            <span className="text-gray-400">Amount</span>
                            <span className="text-white font-semibold">${parseFloat(amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-14 mb-2">
                            <span className="text-gray-400">Fee</span>
                            <span className="text-emerald-400 font-semibold">{method === 'wallet' ? 'FREE' : '$0.25'}</span>
                        </div>
                        <div className="h-px bg-gray-700 my-3"></div>
                        <div className="flex justify-between items-center">
                            <span className="text-16 text-gray-300">Total</span>
                            <span className="text-24 text-white font-bold">${(parseFloat(amount) + (method === 'bank' ? 0.25 : 0)).toFixed(2)}</span>
                        </div>
                    </div>
                )}

                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 px-6 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !amount}
                        className="flex-1 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Processing...' : 'Confirm Payment'}
                    </button>
                </div>
            </form >
        </>
    );
};

export default QRPaymentForm;

