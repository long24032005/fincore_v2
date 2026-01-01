'use client';

import { useEffect, useRef, useState } from 'react';
import type { User } from '@/types';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import QRCode from 'qrcode';

interface MyQRCodeProps {
    user: User;
    banks?: any[];
    onBack: () => void;
}

const MyQRCode = ({ user, banks = [], onBack }: MyQRCodeProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [amount, setAmount] = useState('');
    const [destinationType, setDestinationType] = useState<'wallet' | 'bank'>('wallet');
    const [destinationBankId, setDestinationBankId] = useState(banks[0]?.appwriteItemId || '');
    const [qrGenerated, setQrGenerated] = useState(false);

    useEffect(() => {
        console.log('🔄 Generating QR for user:', user.$id, user.firstName);
        generateQR();
    }, [amount, destinationType, destinationBankId, user, banks]);

    const generateQR = async () => {
        if (!canvasRef.current) return;

        const qrData = {
            type: 'finecore_payment',
            userId: user.$id,
            walletId: (user as any).walletId, // NEW: Wallet ID for wallet transfers
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            amount: amount ? parseFloat(amount) : null,
            // Destination Info
            destinationType: destinationType,
            destinationBankId: destinationType === 'bank' ? destinationBankId : null,
            destinationBankName: destinationType === 'bank' ? banks.find(b => b.appwriteItemId === destinationBankId)?.name : 'Finecore Wallet',
            timestamp: Date.now()
        };

        try {
            await QRCode.toCanvas(canvasRef.current, JSON.stringify(qrData), {
                width: 300,
                margin: 2,
                color: {
                    dark: '#12B76A',  // Emerald
                    light: '#FFFFFF'
                }
            });
            setQrGenerated(true);
        } catch (error) {
            console.error('Error generating QR:', error);
        }
    };

    const downloadQR = () => {
        if (!canvasRef.current) return;

        const url = canvasRef.current.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `finecore-qr-${user.firstName}.png`;
        link.href = url;
        link.click();
    };

    const shareQR = async () => {
        if (!canvasRef.current) return;

        try {
            const blob = await new Promise<Blob>((resolve) => {
                canvasRef.current!.toBlob((b) => resolve(b!));
            });

            const file = new File([blob], 'qr-code.png', { type: 'image/png' });

            if (navigator.share) {
                await navigator.share({
                    title: 'My Finecore QR Code',
                    text: `Scan to send money to ${user.firstName}`,
                    files: [file]
                });
            } else {
                alert('Share not supported on this browser. Use Download instead.');
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="flex-center size-10 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                    <h1 className="text-24 font-bold text-white">My QR Code</h1>
                    <p className="text-14 text-gray-400">Let others scan to pay you</p>
                </div>
            </div>

            {/* QR Card */}
            <div className="flex flex-col items-center gap-6 bg-gradient-to-br from-emerald-500/10 to-emerald-700/10 border border-emerald-500/20 rounded-2xl p-8">
                {/* User Info */}
                <div className="flex flex-col items-center gap-2">
                    <div className="flex-center size-16 rounded-full bg-emerald-500 text-white text-24 font-bold">
                        {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <h3 className="text-20 font-bold text-white">
                        {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-14 text-green-400 font-medium">
                        Receiving to: {destinationType === 'wallet' ? 'Finecore Wallet' : banks.find(b => b.appwriteItemId === destinationBankId)?.name || 'Bank Account'}
                    </p>
                </div>

                {/* QR Code */}
                <div className="bg-white p-6 rounded-2xl shadow-2xl relative">
                    <canvas ref={canvasRef} className="block" />
                    {/* Destination Icon Overlay */}
                    <div className="absolute inset-0 flex-center pointer-events-none">
                        <div className="bg-white p-1 rounded-full">
                            {destinationType === 'wallet' ? (
                                <span className="text-24">💰</span>
                            ) : (
                                <span className="text-24">🏦</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Settings Container */}
                <div className="w-full max-w-sm space-y-4">
                    {/* Destination Selector */}
                    <div>
                        <label className="text-14 font-medium text-gray-300 mb-2 block">
                            Receive To
                        </label>
                        <select
                            value={destinationType === 'wallet' ? 'wallet' : destinationBankId}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'wallet') {
                                    setDestinationType('wallet');
                                } else {
                                    setDestinationType('bank');
                                    setDestinationBankId(val);
                                }
                            }}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                        >
                            <option value="wallet">💰 Finecore Wallet (Instant)</option>
                            {banks.map((bank: any) => (
                                <option key={bank.appwriteItemId} value={bank.appwriteItemId}>
                                    🏦 {bank.name} ••••{bank.mask}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Amount Input (Optional) */}
                    <div>
                        <label className="text-14 font-medium text-gray-300 mb-2 block">
                            Set Amount (Optional)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                                $
                            </span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-4 py-3 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        onClick={downloadQR}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
                    >
                        <Download className="w-5 h-5" />
                        Download
                    </button>
                    <button
                        onClick={shareQR}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
                    >
                        <Share2 className="w-5 h-5" />
                        Share
                    </button>
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-14 text-blue-300">
                    <strong>💡 How it works:</strong> Share this QR code with anyone who wants to send you money.
                    They'll scan it with their Finecore app and the payment will be instant!
                </p>
            </div>
        </div>
    );
};

export default MyQRCode;
