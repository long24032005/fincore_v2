'use client'

import { sidebarLinks } from '@/constants'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { QrCode, Users } from 'lucide-react'
import Footer from './Footer'
import PlaidLink from './PlaidLink'

const Sidebar = ({ user }: SiderbarProps) => {
  const pathname = usePathname();

  return (
    <section className="sidebar border-r border-gray-200">
      <nav className="flex flex-col gap-4">
        <Link href="/" className="mb-12 cursor-pointer flex items-center gap-1">
          <Image
            src="/icons/logo.png"
            width={56}
            height={56}
            alt="Finecore logo"
            className="size-[56px] max-xl:size-14"
          />
          <Image
            src="/icons/finecore-text-logo.png"
            width={160}
            height={40}
            alt="Finecore"
            className="max-xl:hidden"
          />
        </Link>

        {sidebarLinks.map((item) => {
          const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`)

          return (
            <Link href={item.route} key={item.label}
              className={cn('sidebar-link', {
                'bg-bank-gradient': isActive,
                'hover:bg-gray-25': !isActive
              })}
            >
              {item.label === 'QR Transfer' ? (
                <div className="relative size-6 flex items-center justify-center">
                  <QrCode
                    className={cn(
                      'w-6 h-6 text-white',
                      { 'brightness-150': isActive }
                    )}
                    strokeWidth={2}
                  />
                </div>
              ) : item.label === 'Saved Recipients' ? (
                <div className="relative size-6 flex items-center justify-center">
                  <Users
                    className={cn(
                      'w-6 h-6 text-white',
                      { 'brightness-150': isActive }
                    )}
                    strokeWidth={2}
                  />
                </div>
              ) : (
                <div className="relative size-6">
                  <Image
                    src={item.imgURL}
                    alt={item.label}
                    fill
                    className={cn(
                      'brightness-[3] invert-0',
                      { 'brightness-[5]': isActive }
                    )}
                  />
                </div>
              )}
              <p className={cn(
                "sidebar-label",
                {
                  "!text-white": isActive,
                  "!text-gray-600": !isActive
                }
              )}>
                {item.label}
              </p>
            </Link>
          )
        })}

        <PlaidLink user={user} />
      </nav>

      <Footer user={user} />
    </section>
  )
}

export default Sidebar