'use client';

import { useState } from 'react';
import { Wallet, Building2, PieChart } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';
import DoughnutChart from './DoughnutChart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TotalBalanceBox = ({
  accounts = [],
  totalBanks,
  totalCurrentBalance,
  user
}: TotalBalanceBoxProps) => {
  const walletBalance = user?.balance || 0;

  // Create account options: Total + Finecore Wallet + all linked banks
  const accountOptions = [
    {
      id: 'total',
      name: 'Tổng số dư',
      balance: walletBalance + totalCurrentBalance,
      type: 'total',
      icon: PieChart
    },
    {
      id: 'wallet',
      name: 'Ví Finecore',
      balance: walletBalance,
      type: 'wallet',
      icon: Wallet
    },
    ...accounts.map((account: Account) => ({
      id: account.appwriteItemId,
      name: account.name,
      balance: account.currentBalance,
      type: 'bank',
      icon: Building2
    }))
  ];

  const [selectedAccount, setSelectedAccount] = useState(accountOptions[0]?.id || 'total');

  // Get selected account data
  const currentAccount = accountOptions.find(acc => acc.id === selectedAccount);
  const displayBalance = currentAccount?.balance || 0;
  const displayName = currentAccount?.name || 'Tổng số dư';
  const accountType = currentAccount?.type || 'total';
  const IconComponent = currentAccount?.icon || PieChart;

  return (
    <section className="total-balance glass-panel !rounded-[20px] shadow-inner">
      <div className="flex flex-col gap-6 w-full">
        {/* Header with Account Selector */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Professional Icon */}
            <div className="flex-center size-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg">
              <IconComponent className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>

            {/* Title */}
            <div>
              <p className="text-14 font-medium text-gray-400">Tài khoản</p>
              <h3 className="text-16 font-semibold text-white">{displayName}</h3>
            </div>
          </div>

          {/* Compact Selector */}
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-[200px] bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white hover:border-emerald-500 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border border-gray-600 shadow-xl backdrop-blur-xl">
              {accountOptions.map((account) => {
                const OptionIcon = account.icon;
                return (
                  <SelectItem
                    key={account.id}
                    value={account.id}
                    className="text-white hover:bg-gray-700 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 py-1">
                      <div className={`flex-center size-8 rounded-lg ${account.type === 'total' ? 'bg-blue-500/20' :
                        account.type === 'wallet' ? 'bg-emerald-500/20' :
                          'bg-blue-500/20'
                        }`}>
                        <OptionIcon className={`w-4 h-4 ${account.type === 'total' ? 'text-blue-400' :
                          account.type === 'wallet' ? 'text-emerald-400' :
                            'text-blue-300'
                          }`} />
                      </div>
                      <span className="font-medium text-sm">{account.name}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Balance Display */}
        <div className="flex flex-col gap-2">
          <p className="text-14 font-medium text-gray-400">
            Số dư hiện tại
          </p>

          <div className="flex items-baseline gap-3">
            <div className="total-balance-amount">
              <AnimatedCounter amount={displayBalance} />
            </div>

            {accountType === 'wallet' && (
              <span className="text-12 text-emerald-400 font-medium px-2 py-1 bg-emerald-500/10 rounded-md">
                Ví
              </span>
            )}
            {accountType === 'total' && (
              <span className="text-12 text-blue-400 font-medium px-2 py-1 bg-blue-500/10 rounded-md">
                Tất cả tài khoản
              </span>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-14 text-gray-400">Ngân hàng liên kết</span>
          </div>
          <span className="text-14 font-semibold text-white">{totalBanks}</span>
        </div>
      </div>
    </section>
  )
}

export default TotalBalanceBox