'use client';

import { useState, useEffect } from 'react';
// User type is globally available from types/index.d.ts
import { QrCode, Scan } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import MyQRCode from './MyQRCode';
import QRScanner from './QRScanner';

interface QRTransferClientProps {
    user: User;
    senderBanks?: any[];
}

type ViewMode = 'menu' | 'myqr' | 'scan';

const QRTransferClient = ({ user, senderBanks = [] }: QRTransferClientProps) => {
    const searchParams = useSearchParams();
    const [viewMode, setViewMode] = useState<ViewMode>('menu');
    const [initialData, setInitialData] = useState<any>(null);

    useEffect(() => {
        const recipientParam = searchParams.get('recipient');
        if (recipientParam) {
            try {
                const parsed = JSON.parse(decodeURIComponent(recipientParam));

                // Map to QRData format expected by QRScanner/QRPaymentForm
                const qrData = {
                    type: 'finecore_payment',
                    userId: parsed.userId,
                    email: parsed.email,
                    name: parsed.name,
                    amount: null,
                    destinationType: parsed.transferType === 'wallet' ? 'wallet' : 'bank',
                    destinationBankId: parsed.bankId,
                    destinationBankName: parsed.bankName,
                    walletId: parsed.walletId,
                    timestamp: Date.now()
                };

                setInitialData(qrData);
                setViewMode('scan');
            } catch (e) {
                console.error('Failed to parse recipient data', e);
            }
        }
    }, [searchParams]);

    if (viewMode === 'myqr') {
        return <MyQRCode user={user} banks={senderBanks} onBack={() => setViewMode('menu')} />;
    }

    if (viewMode === 'scan') {
        return <QRScanner user={user} senderBanks={senderBanks} onBack={() => setViewMode('menu')} initialData={initialData} />;
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-32 font-bold text-white">QR Transfer</h1>
                <p className="text-16 text-gray-400">
                    Instant money transfer using QR code - Fast, Easy, Secure
                </p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                {/* Show My QR */}
                <button
                    onClick={() => setViewMode('myqr')}
                    className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 border border-emerald-500/30 rounded-2xl p-8 hover:border-emerald-500 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/20"
                >
                    <div className="flex flex-col items-center gap-6">
                        <div className="flex-center size-24 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-all">
                            <QrCode className="w-12 h-12 text-emerald-400" strokeWidth={2} />
                        </div>

                        <div className="text-center">
                            <h3 className="text-24 font-bold text-white mb-2">
                                Show My QR Code
                            </h3>
                            <p className="text-14 text-gray-400">
                                Let others scan your QR code to receive money instantly
                            </p>
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                            <span className="text-12 text-emerald-400 font-medium px-3 py-1 bg-emerald-500/10 rounded-full">
                                Receive Money
                            </span>
                            <span className="text-12 text-emerald-400 font-medium px-3 py-1 bg-emerald-500/10 rounded-full">
                                FREE
                            </span>
                        </div>
                    </div>
                </button>

                {/* Scan QR */}
                <button
                    onClick={() => setViewMode('scan')}
                    className="group relative overflow-hidden bg-gradient-to-br from-blue-500/20 to-blue-700/20 border border-blue-500/30 rounded-2xl p-8 hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20"
                >
                    <div className="flex flex-col items-center gap-6">
                        <div className="flex-center size-24 rounded-full bg-blue-500/20 group-hover:bg-blue-500/30 transition-all">
                            <Scan className="w-12 h-12 text-blue-400" strokeWidth={2} />
                        </div>

                        <div className="text-center">
                            <h3 className="text-24 font-bold text-white mb-2">
                                Scan QR to Pay
                            </h3>
                            <p className="text-14 text-gray-400">
                                Scan someone's QR code to send money instantly
                            </p>
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                            <span className="text-12 text-blue-400 font-medium px-3 py-1 bg-blue-500/10 rounded-full">
                                Send Money
                            </span>
                            <span className="text-12 text-blue-400 font-medium px-3 py-1 bg-blue-500/10 rounded-full">
                                Instant
                            </span>
                        </div>
                    </div>
                </button>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <div className="text-emerald-400 text-24 mb-2">⚡</div>
                    <h4 className="text-14 font-semibold text-white mb-1">Lightning Fast</h4>
                    <p className="text-12 text-gray-400">Send money instantly with wallet transfers</p>
                </div>

                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <div className="text-emerald-400 text-24 mb-2">🔐</div>
                    <h4 className="text-14 font-semibold text-white mb-1">Fort Knox Secure</h4>
                    <p className="text-12 text-gray-400">Military-grade encryption protects every transaction</p>
                </div>

                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <div className="text-emerald-400 text-24 mb-2">💎</div>
                    <h4 className="text-14 font-semibold text-white mb-1">Wallet Transfers = FREE</h4>
                    <p className="text-12 text-gray-400">Zero fees when you pay from your Finecore Wallet</p>
                </div>
            </div>
        </div>
    );
};

export default QRTransferClient;
