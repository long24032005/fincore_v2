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
          title="Tài khoản của tôi"
          subtext="Quản lý Ví Finecore và các tài khoản ngân hàng liên kết của bạn"
        />

        <div className="space-y-10">
          {/* FINECORE WALLET SECTION */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-20 font-bold text-white">
                Ví Finecore
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-teal-500/50 to-transparent" />
            </div>

            <p className="text-14 text-gray-400">
              Chuyển khoản tức thời • Không thu phí • Luôn khả dụng
            </p>

            <div className="flex flex-wrap gap-6">
              <WalletCard
                balance={walletBalance}
                userName={loggedIn?.firstName || 'Khách'}
                walletId={walletId}
                showWalletId={true}
              />
            </div>
          </div>

          {/* LINKED BANKS SECTION */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-20 font-bold text-white">
                Ngân hàng liên kết
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/50 to-transparent" />
            </div>

            <p className="text-14 text-gray-400">
              Đã liên kết {accounts?.data?.length || 0} tài khoản ngân hàng
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
                    Chưa liên kết tài khoản ngân hàng nào
                  </h3>
                  <p className="text-14 text-gray-400 max-w-sm">
                    Kết nối tài khoản ngân hàng của bạn để bắt đầu gửi và nhận tiền
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