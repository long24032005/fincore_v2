'use client';

import { useEffect, useState } from 'react';
import { getAvailableBalance, getPendingTransactions } from '@/lib/actions/bankBalance.actions';
import AnimatedCounter from './AnimatedCounter';
import { formatAmount } from '@/lib/utils';

interface BankBalanceDisplayProps {
    bankId: string;
    bankName: string;
}

interface BalanceInfo {
    actual: number;
    pending: number;
    available: number;
}

const BankBalanceDisplay = ({ bankId, bankName }: BankBalanceDisplayProps) => {
    const [balances, setBalances] = useState<BalanceInfo>({
        actual: 0,
        pending: 0,
        available: 0
    });
    const [pendingTxns, setPendingTxns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBalances() {
            try {
                const [balanceData, txnData] = await Promise.all([
                    getAvailableBalance(bankId),
                    getPendingTransactions(bankId)
                ]);

                setBalances(balanceData);
                setPendingTxns(txnData);
            } catch (error) {
                console.error('Error fetching balances:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchBalances();

        // Refresh every 30 seconds
        const interval = setInterval(fetchBalances, 30000);
        return () => clearInterval(interval);
    }, [bankId]);

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-20 bg-gray-800 rounded-lg"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Bank Name */}
            <div className="flex items-center gap-2">
                <div className="flex-center size-10 rounded-lg bg-emerald-500/20">
                    <span className="text-xl">🏦</span>
                </div>
                <div>
                    <p className="text-14 text-gray-400">Bank Account</p>
                    <p className="text-16 font-semibold text-white">{bankName}</p>
                </div>
            </div>

            {/* Actual Balance */}
            <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-14 text-gray-400 mb-1">💰 Actual Balance</p>
                <div className="text-24 text-white font-bold">
                    <AnimatedCounter amount={balances.actual} />
                </div>
                <p className="text-12 text-gray-500 mt-1">Real-time from bank</p>
            </div>

            {/* Pending Transfers */}
            {balances.pending > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-14 text-yellow-400 font-medium">⏱️ Pending Transfers</p>
                        <p className="text-18 text-yellow-300 font-semibold">
                            -{formatAmount(balances.pending)}
                        </p>
                    </div>

                    {/* List pending transactions */}
                    <div className="space-y-1 mt-3">
                        {pendingTxns.slice(0, 3).map((txn, index) => (
                            <div key={index} className="flex items-center justify-between text-12">
                                <span className="text-gray-400">
                                    • {txn.name || 'Transfer'}
                                </span>
                                <span className="text-yellow-400">
                                    -{formatAmount(txn.amount)}
                                </span>
                            </div>
                        ))}
                        {pendingTxns.length > 3 && (
                            <p className="text-12 text-gray-500 mt-1">
                                +{pendingTxns.length - 3} more...
                            </p>
                        )}
                    </div>

                    <p className="text-11 text-gray-500 mt-2">
                        Processing 1-3 business days
                    </p>
                </div>
            )}

            {/* Available Balance */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <p className="text-14 text-emerald-400 font-medium mb-1">
                    ✅ Available Balance
                </p>
                <div className="text-30 text-emerald-400 font-bold">
                    <AnimatedCounter amount={balances.available} />
                </div>
                <p className="text-12 text-emerald-300 mt-2">
                    You can transfer up to this amount
                </p>
            </div>

            {/* Info note */}
            {balances.pending > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-12 text-blue-300">
                        💡 <strong>Note:</strong> Your available balance is lower than actual balance
                        because you have {pendingTxns.length} pending transfer{pendingTxns.length > 1 ? 's' : ''}.
                    </p>
                </div>
            )}
        </div>
    );
};

export default BankBalanceDisplay;
