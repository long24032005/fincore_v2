'use client';

import { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { migrateUsersWalletId } from '@/lib/actions/migration.actions';

const MigrationRunner = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const runMigration = async () => {
        console.log('🔘 Run Migration button clicked');

        setIsRunning(true);
        setResult(null);
        setError(null);

        try {
            console.log('📤 Calling migrateUsersWalletId...');
            const migrationResult = await migrateUsersWalletId();
            console.log('📥 Migration result:', migrationResult);
            setResult(migrationResult);
        } catch (err: any) {
            console.error('❌ Migration error:', err);
            setError(err.message || 'Migration failed');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Migration Button */}
            <div className="glass-panel !rounded-xl p-6">
                <h3 className="text-18 font-semibold text-white mb-2">
                    Add Wallet IDs to Users
                </h3>
                <p className="text-14 text-gray-400 mb-4">
                    This migration will generate unique wallet IDs for all users who don't have one yet.
                    Wallet IDs are required for wallet-to-wallet transfers.
                </p>

                <button
                    onClick={runMigration}
                    disabled={isRunning}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                >
                    {isRunning ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                            <span>Running Migration...</span>
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5" />
                            <span>Run Migration</span>
                        </>
                    )}
                </button>
            </div>

            {/* Results */}
            {result && (
                <div className={`glass-panel !rounded-xl p-6 ${result.success ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
                    <div className="flex items-center gap-3 mb-4">
                        {result.success ? (
                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                        ) : (
                            <XCircle className="w-6 h-6 text-red-400" />
                        )}
                        <h3 className="text-18 font-semibold text-white">
                            {result.success ? 'Migration Completed!' : 'Migration Completed with Errors'}
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-800/50 rounded-lg p-4">
                            <p className="text-12 text-gray-400 mb-1">Total Users</p>
                            <p className="text-24 font-bold text-white">{result.total}</p>
                        </div>
                        <div className="bg-emerald-500/10 rounded-lg p-4">
                            <p className="text-12 text-gray-400 mb-1">Updated</p>
                            <p className="text-24 font-bold text-emerald-400">{result.updated}</p>
                        </div>
                        <div className="bg-blue-500/10 rounded-lg p-4">
                            <p className="text-12 text-gray-400 mb-1">Skipped</p>
                            <p className="text-24 font-bold text-blue-400">{result.skipped}</p>
                        </div>
                        <div className="bg-red-500/10 rounded-lg p-4">
                            <p className="text-12 text-gray-400 mb-1">Errors</p>
                            <p className="text-24 font-bold text-red-400">{result.errors}</p>
                        </div>
                    </div>

                    {result.success && result.updated > 0 && (
                        <div className="mt-4 p-4 bg-emerald-500/10 rounded-lg">
                            <p className="text-14 text-emerald-400">
                                ✅ You can now set the <code className="px-2 py-1 bg-gray-800 rounded">walletId</code> attribute to <strong>Required</strong> in Appwrite Console.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="glass-panel !rounded-xl p-6 border-red-500/30">
                    <div className="flex items-center gap-3 mb-2">
                        <AlertCircle className="w-6 h-6 text-red-400" />
                        <h3 className="text-18 font-semibold text-white">Migration Failed</h3>
                    </div>
                    <p className="text-14 text-red-400">{error}</p>
                </div>
            )}
        </div>
    );
};

export default MigrationRunner;
