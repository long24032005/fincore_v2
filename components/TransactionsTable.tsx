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
// ============================================
interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const normalizedStatus = status?.toLowerCase() || 'processing';

  let styles = 'bg-gray-500/10 text-gray-400'; // Default

  if (normalizedStatus === 'success' || normalizedStatus === 'completed') {
    styles = 'bg-green-500/20 text-green-400';
  } else if (normalizedStatus === 'processing' || normalizedStatus === 'pending') {
    styles = 'bg-blue-500/20 text-blue-400';
  } else if (normalizedStatus === 'declined' || normalizedStatus === 'failed') {
    styles = 'bg-red-500/20 text-red-400';
  }

  return (
    <div className={cn(
      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize',
      styles
    )}>
      <span className={cn(
        'mr-1.5 size-1.5 rounded-full',
        normalizedStatus === 'success' || normalizedStatus === 'completed' ? 'bg-green-400' :
          normalizedStatus === 'processing' || normalizedStatus === 'pending' ? 'bg-blue-400' :
            normalizedStatus === 'declined' || normalizedStatus === 'failed' ? 'bg-red-400' :
              'bg-gray-400'
      )} />
      {status}
    </div>
  );
};

// ============================================
// CATEGORY BADGE COMPONENT
// Styles based on REAL category from database
// ============================================
interface CategoryBadgeProps {
  category: string | string[] | undefined | null;
}

const CategoryBadge = ({ category }: CategoryBadgeProps) => {
  // Handle array vs string vs null (database returns string, but handle edge cases)
  let displayCategory: string;

  if (Array.isArray(category)) {
    displayCategory = category.length > 0 ? category[0] : 'General';
  } else if (typeof category === 'string' && category.trim()) {
    displayCategory = category;
  } else {
    displayCategory = 'General';
  }

  // Style based on CATEGORY NAME from database
  const lowerCat = displayCategory.toLowerCase();
  let styles = 'bg-gray-500/20 text-gray-400'; // Default: Gray

  // Food & Drink -> Orange
  if (lowerCat.includes('food') || lowerCat.includes('drink') || lowerCat.includes('dining') ||
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

  // Truncate long category names for display
  const truncatedCategory = displayCategory.length > 18
    ? displayCategory.substring(0, 15) + '...'
    : displayCategory;

  return (
    <div className={cn(
      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
      styles
    )}>
      {truncatedCategory}
    </div>
  );
};

// ============================================
// TRANSACTIONS TABLE COMPONENT
// ============================================
const TransactionsTable = ({ transactions }: TransactionTableProps) => {
  return (
    <Table>
      <TableHeader className="bg-white/5">
        <TableRow className="border-b border-white/10 hover:bg-transparent">
          <TableHead className="px-2 text-gray-400 font-medium">Transaction</TableHead>
          <TableHead className="px-2 text-gray-400 font-medium">Amount</TableHead>
          <TableHead className="px-2 text-gray-400 font-medium">Status</TableHead>
          <TableHead className="px-2 text-gray-400 font-medium">Date</TableHead>
          <TableHead className="px-2 max-md:hidden text-gray-400 font-medium">Channel</TableHead>
          <TableHead className="px-2 max-md:hidden text-gray-400 font-medium">Category</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(transactions || []).map((t: Transaction) => {
          const status = getTransactionStatus(new Date(t.date));
          const amount = formatAmount(t.amount);

          const isDebit = t.type === 'debit';
          const isCredit = t.type === 'credit';
          const isNegative = amount.startsWith('-') || amount.includes('-');

          return (
            <TableRow
              key={t.id || t.$id}
              className="border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              {/* Transaction Name */}
              <TableCell className="max-w-[250px] pl-2 pr-10">
                <div className="flex items-center gap-3">
                  <p className="text-14 truncate font-semibold text-white">
                    {removeSpecialCharacters(t.name)}
                  </p>
                </div>
              </TableCell>

              {/* Amount */}
              <TableCell className={cn(
                'pl-2 pr-10 font-semibold',
                isDebit || isNegative ? 'text-red-400' : 'text-green-400'
              )}>
                {isDebit && !amount.startsWith('-') ? `-${amount}` : amount}
              </TableCell>

              {/* Status */}
              <TableCell className="pl-2 pr-10">
                <StatusBadge status={status} />
              </TableCell>

              {/* Date */}
              <TableCell className="min-w-32 pl-2 pr-10 text-gray-400">
                {formatDateTime(new Date(t.date)).dateTime}
              </TableCell>

              {/* Channel */}
              <TableCell className="pl-2 pr-10 capitalize max-md:hidden text-gray-400">
                {t.paymentChannel || t.channel || 'Online'}
              </TableCell>

              {/* Category */}
              <TableCell className="pl-2 pr-10 max-md:hidden">
                <CategoryBadge category={t.category} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export default TransactionsTable