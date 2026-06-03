import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn, formatAmount, formatDateTime, getTransactionStatus, removeSpecialCharacters } from "@/lib/utils"

// ============================================
// STATUS BADGE COMPONENT
// Wallet transactions show as "Success" (green) immediately
// ============================================
interface StatusBadgeProps {
  status: string;
  pending?: boolean;
  channel?: string;
}

const StatusBadge = ({ status, pending, channel }: StatusBadgeProps) => {
  // ✅ Force "success" status for all transactions since dedicated OpenAPI enables instant settlement
  let finalStatus = 'success';

  let styles = 'bg-gray-500/10 text-gray-400'; // Default
  let displayText = finalStatus;

  if (finalStatus === 'success' || finalStatus === 'completed') {
    styles = 'bg-green-500/20 text-green-400';
    displayText = 'Thành công';
  } else if (finalStatus === 'processing' || finalStatus === 'pending') {
    styles = 'bg-blue-500/20 text-blue-400';
    displayText = 'Đang xử lý';
  } else if (finalStatus === 'declined' || finalStatus === 'failed') {
    styles = 'bg-red-500/20 text-red-400';
    displayText = 'Thất bại';
  }

  return (
    <div className={cn(
      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize',
      styles
    )}>
      <span className={cn(
        'mr-1.5 size-1.5 rounded-full',
        finalStatus === 'success' || finalStatus === 'completed' ? 'bg-green-400' :
          finalStatus === 'processing' || finalStatus === 'pending' ? 'bg-blue-400' :
            finalStatus === 'declined' || finalStatus === 'failed' ? 'bg-red-400' :
              'bg-gray-400'
      )} />
      {displayText}
    </div>
  );
};

// ============================================
// CATEGORY BADGE COMPONENT
// Wallet categories get distinct purple/indigo styling
// ============================================
interface CategoryBadgeProps {
  category: string | string[] | undefined | null;
  channel?: string;
}

const CategoryBadge = ({ category, channel }: CategoryBadgeProps) => {
  // Handle array vs string vs null
  let displayCategory: string;

  if (Array.isArray(category)) {
    displayCategory = category.length > 0 ? category[0] : 'Chung';
  } else if (typeof category === 'string' && category.trim()) {
    displayCategory = category;
  } else {
    displayCategory = 'Chung';
  }

  const lowerCat = displayCategory.toLowerCase();
  const isWallet = channel === 'wallet' || lowerCat.includes('wallet');

  let styles = 'bg-gray-500/20 text-gray-400'; // Default
  let icon = '';

  // ✅ WALLET categories get special purple/indigo theme with ⚡ icon
  if (isWallet) {
    styles = 'bg-purple-500/20 text-purple-400';
    icon = '⚡ ';
  }
  // Food & Drink -> Orange
  else if (lowerCat.includes('food') || lowerCat.includes('drink') || lowerCat.includes('dining') ||
    lowerCat.includes('restaurant') || lowerCat.includes('coffee') || lowerCat.includes('grocery')) {
    styles = 'bg-orange-500/20 text-orange-400';
  }
  // Travel, Taxi, Transport -> Blue  
  else if (lowerCat.includes('travel') || lowerCat.includes('taxi') || lowerCat.includes('transport') ||
    lowerCat.includes('uber') || lowerCat.includes('lyft') || lowerCat.includes('airline')) {
    styles = 'bg-blue-500/20 text-blue-400';
  }
  // Payment, Transfer -> Green
  else if (lowerCat.includes('payment') || lowerCat.includes('transfer') || lowerCat.includes('wire') ||
    lowerCat.includes('deposit') || lowerCat.includes('income')) {
    styles = 'bg-green-500/20 text-green-400';
  }
  // Shops, Retail -> Pink
  else if (lowerCat.includes('shop') || lowerCat.includes('retail') || lowerCat.includes('store') ||
    lowerCat.includes('amazon') || lowerCat.includes('merchandise')) {
    styles = 'bg-pink-500/20 text-pink-400';
  }

  // Translate basic categories
  let translatedCat = displayCategory;
  if (lowerCat === 'food and drink') translatedCat = 'Ăn uống';
  else if (lowerCat === 'travel') translatedCat = 'Di chuyển';
  else if (lowerCat === 'entertainment') translatedCat = 'Giải trí';
  else if (lowerCat === 'shopping') translatedCat = 'Mua sắm';
  else if (lowerCat === 'transfer') translatedCat = 'Chuyển khoản';
  else if (lowerCat === 'payment') translatedCat = 'Thanh toán';
  else if (lowerCat === 'wallet transfer') translatedCat = 'Chuyển ví';
  else if (lowerCat === 'wallet top-up') translatedCat = 'Nạp ví';

  // Truncate long category names
  const truncatedCategory = translatedCat.length > 16
    ? translatedCat.substring(0, 13) + '...'
    : translatedCat;

  return (
    <div className={cn(
      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
      styles
    )}>
      {icon}{truncatedCategory}
    </div>
  );
};

// ============================================
// TRANSACTIONS TABLE COMPONENT
// ============================================
const TransactionsTable = ({ transactions, viewContext = 'all', accounts = [] }: TransactionTableProps) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-white/5">
          <TableRow className="border-b border-white/10 hover:bg-transparent">
            <TableHead className="px-2 text-gray-400 font-medium">Giao dịch</TableHead>
            <TableHead className="px-2 text-gray-400 font-medium">Số tiền</TableHead>
            <TableHead className="px-2 text-gray-400 font-medium">Trạng thái</TableHead>
            <TableHead className="px-2 text-gray-400 font-medium">Ngày</TableHead>
            <TableHead className="px-2 max-lg:hidden text-gray-400 font-medium">Kênh</TableHead>
            <TableHead className="px-2 max-lg:hidden text-gray-400 font-medium">Danh mục</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(transactions || []).map((t: Transaction) => {
            const status = getTransactionStatus(new Date(t.date));
            const amount = formatAmount(t.amount);

            const isDebit = t.type === 'debit';
            const isCredit = t.type === 'credit';
            const isNegative = amount.startsWith('-') || amount.includes('-');

            // ✅ CONTEXT-AWARE SIGN LOGIC for Wallet Top-up
            // When viewing Wallet tab, top-up is a CREDIT (incoming money)
            // When viewing Bank tab or All, top-up is a DEBIT (outgoing money)
            const categoryStr = Array.isArray(t.category) ? t.category[0] : t.category;
            const isWalletTopup = categoryStr?.toLowerCase().includes('wallet top-up') || categoryStr === 'Wallet Top-up';

            let displayAsDebit = isDebit;
            if (isWalletTopup && viewContext === 'wallet') {
              // When viewing Wallet, top-up is a CREDIT (incoming money)
              displayAsDebit = false;
            }

            const rawChannel = t.paymentChannel || t.channel || 'online';
            
            // Resolve bank name from matching accounts if it's a bank transaction
            let resolvedBankName = '';
            if (rawChannel !== 'wallet') {
              const targetBankId = t.senderBankId || t.receiverBankId;
              if (targetBankId) {
                const matchedAccount = accounts.find(acc => acc.appwriteItemId === targetBankId);
                if (matchedAccount) {
                  resolvedBankName = matchedAccount.name;
                }
              }
            }

            const displayChannel = rawChannel === 'wallet' ? 'Ví Finecore' : 
                                   resolvedBankName ? resolvedBankName :
                                   rawChannel === 'online' ? 'Trực tuyến' : 
                                   rawChannel === 'in store' ? 'Tại cửa hàng' : rawChannel;

            return (
              <TableRow
                key={t.id || t.$id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                {/* Transaction Name */}
                <TableCell className="max-w-[200px] pl-2 pr-4">
                  <div className="flex items-center gap-3">
                    <p className="text-14 truncate font-semibold text-white">
                      {removeSpecialCharacters(t.name)}
                    </p>
                  </div>
                </TableCell>

                {/* Amount */}
                <TableCell className={cn(
                  'pl-2 pr-4 font-semibold',
                  displayAsDebit || isNegative ? 'text-red-400' : 'text-green-400'
                )}>
                  {displayAsDebit && !amount.startsWith('-') ? `-${amount}` : amount}
                </TableCell>

                {/* Status - Pass pending and channel for wallet detection */}
                <TableCell className="pl-2 pr-4">
                  <StatusBadge
                    status={status}
                    pending={t.pending}
                    channel={t.paymentChannel || t.channel}
                  />
                </TableCell>

                {/* Date */}
                <TableCell className="min-w-32 pl-2 pr-4 text-gray-400">
                  {formatDateTime(new Date(t.date)).dateTime}
                </TableCell>

                {/* Channel */}
                <TableCell className="pl-2 pr-4 capitalize max-lg:hidden text-gray-400">
                  {displayChannel}
                </TableCell>

                {/* Category - Pass channel for wallet styling */}
                <TableCell className="pl-2 pr-4 max-lg:hidden">
                  <CategoryBadge
                    category={t.category}
                    channel={t.paymentChannel || t.channel}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default TransactionsTable