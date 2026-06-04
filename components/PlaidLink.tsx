'use client';

import React, { useState } from 'react'
import { Button } from './ui/button'
import { useRouter } from 'next/navigation';
import { exchangePublicToken } from '@/lib/actions/user.actions';
import Image from 'next/image';

const VN_BANKS = [
  { id: 'vcb', name: 'Vietcombank (VCB)' },
  { id: 'tcb', name: 'Techcombank (TCB)' },
  { id: 'bidv', name: 'BIDV' },
  { id: 'acb', name: 'ACB' },
  { id: 'tpb', name: 'TPBank (TPB)' },
  { id: 'mbb', name: 'MBBank (MBB)' },
  { id: 'vpb', name: 'VPBank (VPB)' },
  { id: 'agribank', name: 'Agribank' }
];

const PlaidLink = ({ user, variant }: PlaidLinkProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState('vcb');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState(
    user ? `${user.firstName || ''} ${user.lastName || ''}`.trim().toUpperCase() : ''
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleLinkBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim()) return;
    setIsLoading(true);

    try {
      const bank = VN_BANKS.find(b => b.id === selectedBank);
      await exchangePublicToken({
        publicToken: selectedBank,
        user,
        accountId: accountNumber.trim(),
        bankName: bank ? bank.name : 'Vietcombank',
      });
      setIsOpen(false);
      router.push('/');
    } catch (err) {
      console.error('Link bank error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {variant === 'primary' ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="plaidlink-primary"
        >
          Liên kết Ngân hàng
        </Button>
      ) : variant === 'ghost' ? (
        <Button onClick={() => setIsOpen(true)} variant="ghost" className="plaidlink-ghost">
          <Image
            src="/icons/connect-bank.svg"
            alt="connect bank"
            width={24}
            height={24}
          />
          <p className='hidden text-[16px] font-semibold text-black-2 xl:block'>Liên kết Ngân hàng</p>
        </Button>
      ) : variant === 'add-bank' ? (
        <button onClick={() => setIsOpen(true)} className="flex gap-2 items-center">
          <Image
            src="/icons/plus.svg"
            width={20}
            height={20}
            alt="plus"
            className="brightness-[3]"
          />
          <h2 className="text-14 font-semibold text-success-500">
            Thêm Ngân hàng
          </h2>
        </button>
      ) : (
        <Button onClick={() => setIsOpen(true)} className="plaidlink-default group">
          <Image
            src="/icons/connect-bank.svg"
            alt="connect bank"
            width={24}
            height={24}
            className="brightness-[3] invert-0"
          />
          <p className='text-[16px] font-semibold text-gray-600'>Liên kết Ngân hàng</p>
        </Button>
      )}

      {/* VN Bank Linker Dialog Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
            <h2 className="text-20 font-bold text-white mb-2">Liên kết ngân hàng nội địa</h2>
            <p className="text-14 text-gray-400 mb-6">Chọn ngân hàng nội địa Việt Nam và nhập số tài khoản để liên kết Sandbox.</p>
            
            <form onSubmit={handleLinkBank} className="space-y-4">
              <div>
                <label className="text-14 font-medium text-gray-300 block mb-1">Tên ngân hàng</label>
                <select 
                  value={selectedBank} 
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full rounded-lg border border-gray-850 bg-gray-900 px-3 py-2.5 text-white outline-none focus:border-success-500"
                >
                  {VN_BANKS.map(bank => (
                    <option key={bank.id} value={bank.id} className="bg-gray-900 text-white">{bank.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-14 font-medium text-gray-300 block mb-1">Số tài khoản</label>
                <input 
                  type="text" 
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ví dụ: 1023456789"
                  className="w-full rounded-lg border border-gray-850 bg-gray-900 px-3 py-2.5 text-white outline-none focus:border-success-500"
                  required
                />
              </div>
              
              <div>
                <label className="text-14 font-medium text-gray-300 block mb-1">Tên chủ tài khoản (Viết hoa không dấu)</label>
                <input 
                  type="text" 
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: NGUYEN VAN A"
                  className="w-full rounded-lg border border-gray-850 bg-gray-900 px-3 py-2.5 text-white outline-none focus:border-success-500"
                  required
                />
              </div>
              
              <div className="flex gap-3 justify-end pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg px-4 py-2.5 border border-gray-850 text-gray-300 hover:bg-gray-900 text-14"
                >
                  Hủy
                </button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="form-btn py-2.5"
                >
                  {isLoading ? 'Đang liên kết...' : 'Liên kết ngay'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default PlaidLink