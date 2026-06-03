'use client';

import { useState, useEffect, useRef } from 'react';
// User type is globally available from types/index.d.ts
import { ArrowLeft, Upload } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import QRPaymentForm from './QRPaymentForm';

interface QRScannerProps {
    user: User;
    senderBanks?: any[];
    onBack: () => void;
    initialData?: QRData | null;
}

interface QRData {
    type: string;
    userId: string;
    email: string;
    name: string;
    amount: number | null;
    destinationType?: 'wallet' | 'bank';
    destinationBankId?: string | null;
    destinationBankName?: string;
    timestamp: number;
}

const QRScanner = ({ user, senderBanks = [], onBack, initialData = null }: QRScannerProps) => {
    const [scanning, setScanning] = useState(false);
    const [scannedData, setScannedData] = useState<QRData | null>(initialData);
    const [error, setError] = useState('');
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const scanningRef = useRef(false); // Prevent duplicate scans

    useEffect(() => {
        if (scanning) {
            startScanner();
        }

        return () => {
            stopScanner();
        };
    }, [scanning]);

    const startScanner = async () => {
        try {
            // Clear any previous errors
            setError('');
            scanningRef.current = false;

            // Create scanner instance if not exists
            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode("qr-reader");
            }

            await html5QrCodeRef.current.start(
                {
                    facingMode: "environment" // Use back camera
                },
                {
                    fps: 10, // Balanced FPS (not too high to prevent lag)
                    qrbox: 350, // Larger box = easier to scan
                    aspectRatio: 1.0,
                    disableFlip: false,
                    // Advanced settings for better detection
                    videoConstraints: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    }
                },
                onScanSuccess,
                onScanFailure
            );
        } catch (err: any) {
            setError('Camera access denied or not available. Please check browser permissions.');
            console.error('Scanner error:', err);
        }
    };

    const stopScanner = async () => {
        try {
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                await html5QrCodeRef.current.stop();
                await html5QrCodeRef.current.clear();
            }
        } catch (err) {
            console.error('Stop scanner error:', err);
        }
    };

    const onScanSuccess = async (decodedText: string) => {
        // Debounce: Prevent processing if already scanning
        if (scanningRef.current) {
            return;
        }
        scanningRef.current = true;

        try {
            const data: QRData = JSON.parse(decodedText);

            // Validate QR data
            if (data.type !== 'finecore_payment') {
                setError('Invalid QR code. Please scan a Finecore payment QR.');
                scanningRef.current = false;
                return;
            }

            if (data.userId === user.$id) {
                setError('You cannot send money to yourself!');
                scanningRef.current = false;
                return;
            }

            // Stop scanner
            await stopScanner();
            setScanning(false);

            // Show payment form
            setScannedData(data);
        } catch (err) {
            setError('Invalid QR code format');
            console.error('Parse error:', err);
            scanningRef.current = false;
        }
    };

    const onScanFailure = (errorMessage: string) => {
        // Ignore scan failures (too noisy)
    };

    // Helper function to resize image
    const resizeImage = (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Set max dimensions
                    const MAX_WIDTH = 1024;
                    const MAX_HEIGHT = 1024;

                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height = Math.round((height * MAX_WIDTH) / width);
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width = Math.round((width * MAX_HEIGHT) / height);
                            height = MAX_HEIGHT;
                        }
                    }

                    // Create canvas and resize
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Convert to blob
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const resizedFile = new File([blob], file.name, {
                                type: 'image/png',
                                lastModified: Date.now()
                            });
                            resolve(resizedFile);
                        } else {
                            reject(new Error('Canvas to blob conversion failed'));
                        }
                    }, 'image/png', 0.95);
                };
                img.onerror = reject;
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(''); // Clear previous errors

        try {
            // Resize image first for better QR detection
            console.log('📷 Resizing image for QR scan...');
            const resizedFile = await resizeImage(file);
            console.log('✅ Image resized:', {
                original: `${Math.round(file.size / 1024)}KB`,
                resized: `${Math.round(resizedFile.size / 1024)}KB`
            });

            // Use Html5Qrcode to scan file
            const html5QrCode = new Html5Qrcode("reader-hidden");

            try {
                const decodedText = await html5QrCode.scanFile(resizedFile, true); // true = show image
                await html5QrCode.clear();
                onScanSuccess(decodedText);
            } catch (err) {
                console.error('File scan error:', err);
                await html5QrCode.clear();
                setError('Could not find QR code in this image. Please ensure the image contains a clear QR code and try again.');
            }
        } catch (err: any) {
            console.error('Image processing error:', err);
            setError('Could not process this image. Please try another image or use camera instead.');
        }
    };

    // If scanned successfully, show payment form
    if (scannedData) {
        return (
            <QRPaymentForm
                sender={user}
                senderBanks={senderBanks}
                recipientData={{
                    ...scannedData,
                    destinationBankId: scannedData.destinationBankId || undefined
                }}
                onBack={() => {
                    setScannedData(null);
                    setScanning(true);
                }}
                onCancel={onBack}
            />
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => {
                        stopScanner();
                        onBack();
                    }}
                    className="flex-center size-10 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                    <h1 className="text-24 font-bold text-white">Scan QR to Pay</h1>
                    <p className="text-14 text-gray-400">Point camera at QR code</p>
                </div>
            </div>

            {/* Scanner or Start Button */}
            {!scanning ? (
                <div className="flex flex-col items-center gap-6 bg-gradient-to-br from-blue-500/10 to-blue-700/10 border border-blue-500/20 rounded-2xl p-12">
                    <div className="flex-center size-32 rounded-full bg-blue-500/20">
                        <span className="text-64">📸</span>
                    </div>

                    <h3 className="text-20 font-bold text-white text-center">
                        Ready to Scan
                    </h3>
                    <p className="text-14 text-gray-400 text-center max-w-md">
                        Click the button below to start your camera and scan a Finecore QR code
                    </p>

                    <button
                        onClick={() => setScanning(true)}
                        className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors text-16"
                    >
                        Start Camera
                    </button>

                    <div className="flex items-center gap-4 w-full max-w-md mt-4">
                        <div className="flex-1 h-px bg-gray-700"></div>
                        <span className="text-14 text-gray-500">OR</span>
                        <div className="flex-1 h-px bg-gray-700"></div>
                    </div>

                    <label className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-medium rounded-lg cursor-pointer transition-colors">
                        <Upload className="w-5 h-5" />
                        Upload QR Image
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </label>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-6">
                    {/* Scanner */}
                    <div className="relative w-full max-w-md bg-black rounded-2xl overflow-hidden border-4 border-emerald-500">
                        <div id="qr-reader" className="w-full"></div>

                        {/* Scanning animation overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-emerald-400"></div>
                            <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-emerald-400"></div>
                            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-emerald-400"></div>
                            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-emerald-400"></div>
                        </div>
                    </div>

                    <p className="text-14 text-gray-400 text-center">
                        Align QR code within the frame
                    </p>

                    <button
                        onClick={() => {
                            stopScanner();
                            setScanning(false);
                        }}
                        className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-medium rounded-lg transition-colors"
                    >
                        Stop Camera
                    </button>
                </div>
            )}

            {/* Hidden div for file scanner */}
            <div id="reader-hidden" className="hidden"></div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <p className="text-14 text-red-300">
                        ❌ <strong>Error:</strong> {error}
                    </p>
                </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-14 text-blue-300">
                    <strong>💡 Tips:</strong> Make sure the QR code is well-lit and in focus.
                    Hold your device steady for best results.
                </p>
            </div>
        </div>
    );
};

export default QRScanner;
