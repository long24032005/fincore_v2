import BankCard from '@/components/BankCard';
import WalletCard from '@/components/WalletCard';
import HeaderBox from '@/components/HeaderBox'
import { getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import React from 'react'

const MyBanks = async () => {
  const loggedIn = await getLoggedInUser();
  const accounts = await getAccounts({
    userId: loggedIn.$id
  })

  // Get wallet balance and ID
  const walletBalance = loggedIn?.balance || 0;
  const walletId = loggedIn?.walletId || '';

  return (
    <section className='flex'>
      <div className="my-banks">
        <HeaderBox
          title="My Accounts"
          subtext="Manage your Finecore Wallet and linked bank accounts"
        />

        <div className="space-y-10">
          {/* FINECORE WALLET SECTION */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-20 font-bold text-white">
                Finecore Wallet
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-teal-500/50 to-transparent" />
            </div>

            <p className="text-14 text-gray-400">
              Instant transfers • No fees • Always available
            </p>

            <div className="flex flex-wrap gap-6">
              <WalletCard
                balance={walletBalance}
                userName={loggedIn?.firstName || 'User'}
                walletId={walletId}
                showWalletId={true}
              />
            </div>
          </div>

          {/* LINKED BANKS SECTION */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-20 font-bold text-white">
                Linked Banks
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/50 to-transparent" />
            </div>

            <p className="text-14 text-gray-400">
              {accounts?.data?.length || 0} {accounts?.data?.length === 1 ? 'account' : 'accounts'} connected via Plaid
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts && accounts.data.map((a: Account) => (
                <BankCard
                  key={a.appwriteItemId}
                  account={a}
                  userName={loggedIn?.firstName}
                />
              ))}
            </div>

            {/* Empty state if no banks */}
            {(!accounts || accounts.data.length === 0) && (
              <div className="flex-center flex-col gap-4 py-12 px-6 rounded-2xl border-2 border-dashed border-gray-700 bg-gray-800/20">
                <div className="flex-center size-16 rounded-full bg-gray-800">
                  <span className="text-32">🏦</span>
                </div>
                <div className="text-center">
                  <h3 className="text-16 font-semibold text-white mb-2">
                    No bank accounts linked
                  </h3>
                  <p className="text-14 text-gray-400 max-w-sm">
                    Connect your bank account to start sending and receiving money
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default MyBanks