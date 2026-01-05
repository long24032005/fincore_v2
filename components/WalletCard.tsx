import { formatAmount } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import Copy from './Copy'

interface WalletCardProps {
    balance: number;
    userName: string;
    walletId: string;
    showWalletId?: boolean;
}

const WalletCard = ({ balance, userName, walletId, showWalletId = true }: WalletCardProps) => {
    return (
        <div className="flex flex-col items-start">
            {/* WALLET CARD */}
            <Link href="/transaction-history" className="wallet-card">
                <div className="wallet-card_content">
                    {/* Top section - Balance */}
                    <div>
                        <h1 className="text-16 font-semibold text-white mb-1">
                            E-Wallet Balance
                        </h1>
                        <p className="font-ibm-plex-serif font-black text-white text-28">
                            {formatAmount(balance)}
                        </p>
                    </div>

                    {/* Bottom section - User info */}
                    <article className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <h1 className="text-14 font-semibold text-white">
                                {userName}
                            </h1>
                            <h2 className="text-12 font-semibold text-white">
                                ●● / ●●
                            </h2>
                        </div>
                        <p className="text-14 font-semibold tracking-[1.1px] text-white">
                            ●●●● ●●●● ●●●● <span className="text-16">WLLT</span>
                        </p>
                    </article>
                </div>

                {/* RIGHT SIDE - Decorative pattern */}
                <div className="wallet-card_icon">
                    {/* Gradient circles decoration - Purple/Blue theme */}
                    <div className="absolute top-4 right-4 size-20 rounded-full bg-gradient-to-br from-purple-400/20 to-blue-500/20 blur-2xl" />
                    <div className="absolute bottom-4 right-8 size-16 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-500/20 blur-xl" />

                    {/* Contactless payment icon (matching bank card) */}
                    <Image
                        src="/icons/Paypass.svg"
                        width={20}
                        height={24}
                        alt="contactless"
                        className="opacity-90"
                    />

                    {/* Wallet Badge (matching Mastercard position) */}
                    <div className="flex-center px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm ml-5">
                        <span className="text-12 font-bold text-white tracking-wider">WALLET</span>
                    </div>
                </div>

                {/* BACKGROUND PATTERN - Subtle lines */}
                <div className="absolute inset-0 opacity-5">
                    <Image
                        src="/icons/lines.png"
                        width={316}
                        height={190}
                        alt="pattern"
                        className="absolute top-0 left-0 w-full h-full object-cover"
                    />
                </div>
            </Link>

            {/* WALLET ID with Copy button (below card) */}
            {showWalletId && (
                <Copy title={walletId} />
            )}
        </div>
    )
}

export default WalletCard
