import CategoryDoughnutChart from '@/components/CategoryDoughnutChart';
import HeaderBox from '@/components/HeaderBox';
import TopMerchantsChart from '@/components/TopMerchantsChart';
import { getAccount, getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { countTransactionCategories, formatAmount } from '@/lib/utils';
import React from 'react';

const TransactionHistory = async ({ searchParams: { id } }: SearchParamProps) => {
  const loggedIn = await getLoggedInUser();

  if (!loggedIn) return null;

  const accounts = await getAccounts({
    userId: loggedIn.$id,
  });

  if (!accounts) return null;

  const accountsData = accounts?.data;
  const appwriteItemId = (id as string) || accountsData[0]?.appwriteItemId;

  const account = await getAccount({ appwriteItemId });

  // All transactions for analytics (with fallback to empty array)
  const allTransactions: Transaction[] = account?.transactions || [];

  // Use the same category aggregation logic as the Home page
  const categories = countTransactionCategories(allTransactions) || [];

  // Server-side analytics calculations
  const totalExpenses = allTransactions
    .filter((t: Transaction) => t.amount < 0)
    .reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);

  const transactionCount = allTransactions.length;

  return (
    <div className="transactions">
      {/* Header */}
      <div className="transactions-header">
        <HeaderBox
          title="Analytics Dashboard"
          subtext="Insights into your spending patterns and financial activity."
        />
      </div>

      <div className="space-y-6">
        {/* Metric Cards Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Total Spent Card */}
          <div className="glass-panel p-6">
            <p className="text-14 font-medium text-gray-400 mb-2">Total Spent</p>
            <p className="text-30 font-bold text-white">{formatAmount(totalExpenses)}</p>
          </div>

          {/* Transaction Count Card */}
          <div className="glass-panel p-6">
            <p className="text-14 font-medium text-gray-400 mb-2">Total Transactions</p>
            <p className="text-30 font-bold text-white">{transactionCount}</p>
          </div>
        </section>

        {/* Charts Row - 2 Column Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Merchants Horizontal Bar Chart */}
          <div className="glass-panel p-6">
            <h3 className="text-18 font-semibold text-white mb-4">Top Merchants</h3>
            <p className="text-12 text-gray-400 mb-4">Your highest spending vendors</p>
            <div className="h-[400px]">
              <TopMerchantsChart transactions={allTransactions} />
            </div>
          </div>

          {/* Category Distribution Doughnut Chart */}
          <div className="glass-panel p-6">
            <h3 className="text-18 font-semibold text-white mb-4">Spending by Category</h3>
            <p className="text-12 text-gray-400 mb-4">Transaction distribution</p>
            <div className="h-[400px]">
              <CategoryDoughnutChart categories={categories} />
            </div>
          </div>
        </section>

        {/* Account Summary */}
        <section className="transactions-account">
          <div className="flex flex-col gap-2">
            <h2 className="text-18 font-bold text-white">{account?.data.name}</h2>
            <p className="text-14 text-blue-25">{account?.data.officialName}</p>
            <p className="text-14 font-semibold tracking-[1.1px] text-white">
              ●●●● ●●●● ●●●● {account?.data.mask}
            </p>
          </div>
          <div className="transactions-account-balance">
            <p className="text-14">Current balance</p>
            <p className="text-24 text-center font-bold">{formatAmount(account?.data.currentBalance)}</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TransactionHistory;