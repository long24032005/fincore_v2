'use client'

import { sidebarLinks } from '@/constants'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { QrCode, Users } from 'lucide-react'
import Footer from './Footer'
import PlaidLink from './PlaidLink'
import { useRef, useCallback } from 'react'

const Sidebar = ({ user }: SiderbarProps) => {
  const pathname = usePathname();
  const router = useRouter();

  // Triple-click easter egg to open API docs
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    clickCountRef.current += 1;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      router.push('/api-docs');
      return;
    }

    // Reset count if no more clicks within 500ms
    clickTimerRef.current = setTimeout(() => {
      if (clickCountRef.current < 3) {
        // Navigate to home if not triple-click
        router.push('/');
      }
      clickCountRef.current = 0;
    }, 500);
  }, [router]);

  return (
    <section className="sidebar border-r border-gray-200">
      <nav className="flex flex-col gap-4">
        <div
          onClick={handleLogoClick}
          className="mb-12 cursor-pointer flex items-center gap-1 select-none"
          title="fincore"
        >
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
        </div>

        {sidebarLinks.map((item) => {
          const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`)

          return (
            <Link href={item.route} key={item.label}
              className={cn('sidebar-link', {
                'bg-bank-gradient': isActive,
                'hover:bg-gray-25': !isActive
              })}
            >
              {item.route === '/qr-transfer' ? (
                <div className="relative size-6 flex items-center justify-center">
                  <QrCode
                    className={cn(
                      'w-6 h-6 text-white',
                      { 'brightness-150': isActive }
                    )}
                    strokeWidth={2}
                  />
                </div>
              ) : item.route === '/saved-recipients' ? (
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
                      'brightness-[3] invert-0 grayscale',
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