'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { ChevronDown, Wallet, Building2, LayoutGrid } from 'lucide-react';
import BankInfo from './BankInfo';
import TransactionsTable from './TransactionsTable';
import { Pagination } from './Pagination';

interface BankTransactions {
  bankId: string;
  bankName: string;
  transactions: Transaction[];
}

interface RecentTransactionsPropsNew {
  accounts: Account[];
  allBankTransactions: BankTransactions[];
  walletTransactions: Transaction[];
  appwriteItemId: string;
  page?: number;
}

const RecentTransactions = ({
  accounts,
  allBankTransactions,
  walletTransactions,
  appwriteItemId,
  page = 1,
}: RecentTransactionsPropsNew) => {
  const [selectedView, setSelectedView] = useState<string>(appwriteItemId);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Filter transactions based on selected view
  const filteredTransactions = useMemo(() => {
    if (selectedView === 'all') {
      // Merge all transactions from all sources
      const allTxns = [
        ...allBankTransactions.flatMap(b => b.transactions),
        ...walletTransactions
      ];
      // Sort by date (newest first)
      return allTxns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (selectedView === 'wallet') {
      // Sort wallet transactions by date (newest first)
      return [...walletTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      // Specific bank
      const bankData = allBankTransactions.find(b => b.bankId === selectedView);
      return bankData?.transactions || [];
    }
  }, [selectedView, allBankTransactions, walletTransactions]);

  const rowsPerPage = 10;
  const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage);

  const indexOfLastTransaction = page * rowsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;

  const currentTransactions = filteredTransactions.slice(
    indexOfFirstTransaction,
    indexOfLastTransaction
  );

  // Build options list
  const viewOptions = [
    {
      id: 'all',
      name: 'All Transactions',
      icon: LayoutGrid,
      type: 'all' as const,
    },
    {
      id: 'wallet',
      name: 'Finecore Wallet',
      icon: Wallet,
      type: 'wallet' as const,
    },
    ...accounts.map((account: Account) => ({
      id: account.appwriteItemId,
      name: account.name,
      icon: Building2,
      type: 'bank' as const,
      account,
    })),
  ];

  const selectedOption = viewOptions.find((opt) => opt.id === selectedView) || viewOptions[0];
  const Icon = selectedOption.icon;

  return (
    <section className="recent-transactions">
      <header className="mb-6">
        <h2 className="recent-transactions-label">Recent transactions</h2>
      </header>

      {/* Custom Dropdown Selector */}
      <div className="relative mb-6">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between bg-gray-800/50 border border-gray-700 hover:border-gray-600 rounded-xl px-4 py-3 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex-center size-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-blue-500/20">
              <Icon className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-left">
              <p className="text-14 font-semibold text-white">{selectedOption.name}</p>
              <p className="text-12 text-gray-400">
                {selectedOption.type === 'all'
                  ? 'View all your transactions'
                  : selectedOption.type === 'wallet'
                    ? 'E-wallet transactions'
                    : 'Bank account'}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''
              }`}
          />
        </button>

        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsDropdownOpen(false)}
            />
            {/* Dropdown Menu */}
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-2xl z-50 max-h-96 overflow-y-auto">
              {viewOptions.map((option) => {
                const OptionIcon = option.icon;
                const isSelected = option.id === selectedView;
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSelectedView(option.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${isSelected
                      ? 'bg-emerald-500/10 border-l-4 border-emerald-500'
                      : 'hover:bg-gray-700/50 border-l-4 border-transparent'
                      }`}
                  >
                    <div
                      className={`flex-center size-10 rounded-lg ${isSelected
                        ? 'bg-emerald-500/20'
                        : 'bg-gray-700/50'
                        }`}
                    >
                      <OptionIcon
                        className={`w-5 h-5 ${isSelected ? 'text-emerald-400' : 'text-gray-400'
                          }`}
                      />
                    </div>
                    <div className="text-left flex-1">
                      <p
                        className={`text-14 font-semibold ${isSelected ? 'text-emerald-400' : 'text-white'
                          }`}
                      >
                        {option.name}
                      </p>

                    </div>
                    {isSelected && (
                      <div className="size-2 rounded-full bg-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Content based on selection */}
      {selectedOption.type === 'bank' && selectedOption.account && (
        <div className="glass-panel !rounded-xl p-4 overflow-hidden">
          <TransactionsTable transactions={currentTransactions} />
        </div>
      )}

      {selectedOption.type === 'wallet' && (
        <div className="glass-panel !rounded-xl p-6 mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-center size-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20">
              <Wallet className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-20 font-bold text-white">Finecore Wallet</h3>
              <p className="text-14 text-gray-400">Instant transfers • Zero fees</p>
            </div>
          </div>
          <div className="glass-panel !rounded-xl p-4 overflow-hidden">
            <TransactionsTable transactions={currentTransactions} />
          </div>
        </div>
      )}

      {selectedOption.type === 'all' && (
        <div className="glass-panel !rounded-xl p-4 overflow-hidden">
          <div className="flex items-center gap-3 mb-4 px-2">
            <LayoutGrid className="w-5 h-5 text-emerald-400" />
            <h3 className="text-16 font-semibold text-white">All Transactions</h3>
          </div>
          <TransactionsTable transactions={currentTransactions} />
        </div>
      )}

      {totalPages > 1 && (
        <div className="my-4 w-full">
          <Pagination totalPages={totalPages} page={page} />
        </div>
      )}
    </section>
  );
};

export default RecentTransactions;