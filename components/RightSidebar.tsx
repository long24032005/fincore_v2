'use client'

import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import BankCard from './BankCard'
import { countTransactionCategories } from '@/lib/utils'
import Category from './Category'
import PlaidLink from './PlaidLink'
import Copy from './Copy'

const RightSidebar = ({ user, transactions, banks }: RightSidebarProps) => {
  const categories: CategoryCount[] = countTransactionCategories(transactions);
  const [activeCardIndex, setActiveCardIndex] = React.useState(0);

  const handleCardClick = () => {
    if (banks && banks.length > 1) {
      setActiveCardIndex((prev) => (prev + 1) % banks.length);
    }
  };

  return (
    <aside className="right-sidebar">
      <section className="flex flex-col pb-8">
        <div className="profile-banner" />
        <div className="profile">
          <div className="profile-img glass-panel !rounded-full !p-0">
            <span className="text-5xl font-bold text-success-500">{user.firstName[0]}</span>
          </div>

          <div className="profile-details">
            <h1 className='profile-name mb-4'>
              {user.firstName} {user.lastName}
            </h1>
            <div className="flex items-center gap-2">
              <span className="profile-email font-bold text-gray-500">Email:</span>
              <p className="profile-email font-semibold text-gray-700">
                {user.email}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="profile-email font-bold text-gray-500">Wallet ID:</span>
              <p className="profile-email font-semibold text-gray-700">
                {user.walletId}
              </p>
              <Copy title={user.walletId} className="!mt-0 !h-auto !w-auto !bg-transparent !p-0 hover:!bg-transparent" hideText={true} />
            </div>
          </div>
        </div>
      </section>

      <section className="banks glass-panel !rounded-2xl">
        <div className="flex w-full justify-between items-center">
          <h2 className="header-2">My Banks</h2>
          <PlaidLink user={user} variant="add-bank" />
        </div>

        {banks?.length > 0 && (
          <div className="relative flex flex-1 flex-col items-center justify-center gap-5">
            <div
              className='relative z-10 cursor-pointer transition-all duration-500 ease-in-out hover:scale-[1.02]'
              onClick={handleCardClick}
              style={{
                transform: activeCardIndex > 0 ? 'translateY(-10px)' : 'translateY(0)',
                opacity: 1
              }}
            >
              <BankCard
                key={banks[activeCardIndex].$id}
                account={banks[activeCardIndex]}
                userName={`${user.firstName} ${user.lastName}`}
                showBalance={false}
                clickable={false}
              />
            </div>
            {banks[(activeCardIndex + 1) % banks.length] && banks.length > 1 && (
              <div
                className="absolute right-0 top-8 z-0 w-[90%] pointer-events-none transition-all duration-500 ease-in-out"
                style={{
                  opacity: 0.6,
                  transform: 'translateY(0) scale(0.95)'
                }}
              >
                <BankCard
                  key={banks[(activeCardIndex + 1) % banks.length].$id}
                  account={banks[(activeCardIndex + 1) % banks.length]}
                  userName={`${user.firstName} ${user.lastName}`}
                  showBalance={false}
                  clickable={false}
                />
              </div>
            )}

            <div className="mt-5 flex w-full flex-col gap-1">
              <p className="text-12 font-medium text-gray-400">Card ID</p>
              <Copy title={banks[activeCardIndex]?.shareableId} />
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-1 flex-col gap-6">
          <h2 className="header-2">Top categories</h2>

          <div className='space-y-5'>
            {categories.map((category, index) => (
              <Category key={category.name} category={category} />
            ))}
          </div>
        </div>
      </section>
    </aside>
  )
}

export default RightSidebar