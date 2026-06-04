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
                            `✅ Đã chuyển thành công ${formatAmount(transferAmount)} từ ví!`,
                            { duration: 4000 }
                        );
                        router.refresh(); // Force server data refresh
                        setSuccessData({
                            amount: transferAmount.toString(),
                            to: recipientData.name,
                            toBank: receiverBankDetails.name,
                            toId: receiverBankDetails.shareableId,
                            from: 'Số dư Ví',
                            fromDetail: 'Ví Fincore',
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
                            `✅ Chuyển tiền thành công! Đã gửi ${formatAmount(transferAmount)} cho ${recipientData.name}.`,
                            { duration: 4000 }
                        );
                        router.refresh(); // Force server data refresh
                        setSuccessData({
                            amount: transferAmount.toString(),
                            to: recipientData.name,
                            toBank: 'Ví Fincore',
                            toId: (recipientData as any).walletId,
                            from: 'Số dư Ví',
                            fromDetail: 'Ví Fincore',
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
                        `Số dư không đủ! Khả dụng: ${formatAmount(availableBalance.available)}, Cần: ${formatAmount(transferAmount)}`,
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
                            `✅ Đã gửi yêu cầu! ${formatAmount(transferAmount)} sẽ được nạp vào ví người nhận.`,
                            { duration: 4000 }
                        );
                        setSuccessData({
                            amount: transferAmount.toString(),
                            to: recipientData.name,
                            toBank: 'Ví Fincore',
                            toId: (recipientData as any).walletId,
                            from: senderBanks.find(b => b.appwriteItemId === selectedBankId)?.name || 'Tài khoản ngân hàng',
                            fromDetail: senderBanks.find(b => b.appwriteItemId === selectedBankId)?.subtype || 'Tài khoản thanh toán',
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
                            `⏳ Đang xử lý chuyển khoản! ${formatAmount(transferAmount)} sẽ đến trong 1-3 ngày làm việc.`,
                            { duration: 4000 }
                        );
                        setSuccessData({
                            amount: transferAmount.toString(),
                            to: recipientData.name,
                            toBank: receiverBankDetails.name,
                            toId: receiverBankDetails.shareableId,
                            from: senderBanks.find(b => b.appwriteItemId === selectedBankId)?.name || 'Tài khoản ngân hàng',
                            fromDetail: senderBanks.find(b => b.appwriteItemId === selectedBankId)?.subtype || 'Tài khoản thanh toán',
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

        const shareText = `Biên lai chuyển tiền Fincore\nSố tiền: ${formatAmount(parseFloat(successData.amount))}\nĐến: ${successData.to}\nMã giao dịch: ${successData.id}\nThời gian: ${successData.time}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Biên lai Fincore',
                    text: shareText,
                });
            } catch (err) {
                console.log('Share cancelled or failed', err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareText);
                toast.success('Đã sao chép chi tiết biên lai!');
            } catch (err) {
                toast.error('Không thể sao chép');
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
            link.download = `fincore-bienlai-${successData.id.slice(-8)}.png`;
            link.click();

            toast.success('Đã lưu biên lai thành công!');
        } catch (err) {
            console.error('Save failed:', err);
            toast.error('Không thể lưu ảnh biên lai');
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
                            <h2 className="text-20 font-bold text-white mb-1">Chuyển tiền thành công!</h2>
                            <p className="text-14 text-gray-400">Giao dịch đã hoàn tất</p>

                            <div className="mt-6 text-center">
                                <p className="text-14 text-gray-400 mb-1">Tổng số tiền</p>
                                <p className="text-36 font-bold text-white tracking-tight">
                                    {formatAmount(parseFloat(successData.amount))}
                                </p>
                            </div>
                        </div>

                        {/* Receipt Details */}
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-gray-800/50">
                                <span className="text-14 text-gray-400">Đến</span>
                                <div className="text-right flex flex-col items-end">
                                    <p className="text-14 font-semibold text-white">{successData.to}</p>
                                    <p className="text-12 text-emerald-400 font-medium">{successData.toBank}</p>
                                    {successData.toId && (
                                        <p className="text-12 text-gray-500 font-mono mt-0.5">
                                            {successData.toBank === 'Ví Fincore' ? successData.toId : `Tài khoản • ${successData.toId}`}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-800/50">
                                <span className="text-14 text-gray-400">Từ</span>
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
                                <span className="text-14 text-gray-400">Thời gian</span>
                                <span className="text-14 text-gray-300">{successData.time}</span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-14 text-gray-400">Mã giao dịch</span>
                                <span className="text-12 font-mono text-gray-500 uppercase tracking-wider">{successData.id.slice(-8)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 pt-2 grid grid-cols-2 gap-3">
                            <button
                                onClick={onCancel}
                                className="col-span-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                            >
                                Hoàn tất
                            </button>
                            <button
                                onClick={handleShare}
                                className="flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-colors border border-gray-700"
                            >
                                <Share2 className="w-4 h-4" /> Chia sẻ
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-colors border border-gray-700"
                            >
                                <Download className="w-4 h-4" /> Lưu
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
                        <h1 className="text-24 font-bold text-white">Xác nhận thanh toán</h1>
                        <p className="text-14 text-gray-400">Xem lại và xác nhận chuyển tiền</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <div className="flex-center size-10 rounded-full bg-emerald-500/20">
                        <Check className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-16 font-semibold text-emerald-400">Quét mã QR thành công</p>
                        <p className="text-12 text-gray-400">Đã xác minh người nhận</p>
                    </div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                    <p className="text-14 text-gray-400 mb-3">Người nhận</p>
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
                    <label className="text-14 font-medium text-gray-300 mb-3 block">Phương thức chuyển tiền</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setMethod('wallet')}
                            className={`p-4 rounded-xl border-2 transition-all ${method === 'wallet' ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-24">💰</span>
                                <div className="text-left">
                                    <p className="text-16 font-semibold text-white">Số dư Ví Fincore</p>
                                    <p className="text-12 text-emerald-400">Tức thời • MIỄN PHÍ</p>
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
                                    <p className="text-16 font-semibold text-white">Tài khoản ngân hàng</p>
                                    <p className="text-12 text-blue-400">1-3 ngày làm việc • Phí 5.000 đ</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {method === 'bank' && (
                    <div>
                        <label className="text-14 font-medium text-gray-300 mb-3 block">Chọn ngân hàng nguồn</label>
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
                                        <SelectValue placeholder="Chọn tài khoản ngân hàng" />
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
                                            <span className="text-gray-400">Số dư thực tế</span>
                                            <span className="text-white font-semibold">{formatAmount(availableBalance.actual)}</span>
                                        </div>

                                        <div className="flex justify-between text-14">
                                            <span className={availableBalance.pending > 0 ? "text-yellow-400" : "text-gray-400"}>Giao dịch đang chờ xử lý</span>
                                            <span className={`${availableBalance.pending > 0 ? "text-yellow-400" : "text-gray-400"} font-semibold`}>
                                                {availableBalance.pending > 0 ? `-${formatAmount(availableBalance.pending)}` : '0 ₫'}
                                            </span>
                                        </div>

                                        <div className="h-px bg-gray-700"></div>

                                        <div className="flex justify-between text-16">
                                            <span className="text-emerald-400 font-medium">Số dư khả dụng</span>
                                            <span className="text-emerald-400 font-bold">{formatAmount(availableBalance.available)}</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                                <p className="text-14 text-yellow-300">⚠️ Chưa liên kết tài khoản ngân hàng. Vui lòng sử dụng số dư ví.</p>
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label className="text-14 font-medium text-gray-300 mb-3 block">
                        Số tiền {recipientData.amount && <span className="text-gray-500">(Đã điền sẵn)</span>}
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-18">đ</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            step="1"
                            min="1"
                            required
                            readOnly={!!recipientData.amount}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-4 text-white text-20 font-bold placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                            placeholder="Nhập số tiền"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-14 font-medium text-gray-300 mb-3 block">Lời nhắn (Tùy chọn)</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Nội dung giao dịch này là gì?"
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
                                💾 Lưu người nhận này vào danh bạ của tôi
                            </span>
                            <p className="text-12 text-gray-400 mt-1">
                                Truy cập nhanh lần sau - không cần quét lại mã QR
                            </p>
                        </div>
                    </label>

                    {shouldSaveRecipient && (
                        <div className="pl-8 mt-3">
                            <label className="text-14 font-medium text-gray-300 mb-2 block">
                                Biệt danh người nhận
                                <span className="text-gray-500 font-normal ml-1">(dành cho bạn)</span>
                            </label>
                            <input
                                type="text"
                                value={recipientNickname}
                                onChange={(e) => setRecipientNickname(e.target.value)}
                                placeholder="ví dụ: Bố mẹ, Cửa hàng cà phê, Bạn thân..."
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
                            />
                            <p className="text-12 text-gray-500 mt-2">
                                💡 Tên này chỉ dành cho bạn lưu trữ - không cần trùng khớp tên thật
                            </p>
                        </div>
                    )}
                </div>

                {amount && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                        <div className="flex justify-between items-center text-14 mb-2">
                            <span className="text-gray-400">Số tiền</span>
                            <span className="text-white font-semibold">{formatAmount(parseFloat(amount))}</span>
                        </div>
                        <div className="flex justify-between items-center text-14 mb-2">
                            <span className="text-gray-400">Phí</span>
                            <span className="text-emerald-400 font-semibold">{method === 'wallet' ? 'MIỄN PHÍ' : '5.000 đ'}</span>
                        </div>
                        <div className="h-px bg-gray-700 my-3"></div>
                        <div className="flex justify-between items-center">
                            <span className="text-16 text-gray-300">Tổng cộng</span>
                            <span className="text-24 text-white font-bold">{formatAmount(parseFloat(amount) + (method === 'bank' ? 5000 : 0))}</span>
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
                        Hủy giao dịch
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

