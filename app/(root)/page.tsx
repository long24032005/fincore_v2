import HeaderBox from '@/components/HeaderBox'
import RecentTransactions from '@/components/RecentTransactions';
import RightSidebar from '@/components/RightSidebar';
import TotalBalanceBox from '@/components/TotalBalanceBox';
import { getAccount, getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getWalletTransactions } from '@/lib/actions/wallet.actions';

const Home = async ({ searchParams: { id, page } }: SearchParamProps) => {
  const currentPage = Number(page as string) || 1;
  const loggedIn = await getLoggedInUser();
  const accounts = await getAccounts({
    userId: loggedIn.$id
  })

  if (!accounts) return;

  const accountsData = accounts?.data;
  const appwriteItemId = (id as string) || accountsData[0]?.appwriteItemId || 'all';

  // Fetch transactions from ALL sources
  const allBankTransactions = await Promise.all(
    accountsData.map(async (acc: Account) => {
      const accountData = await getAccount({ appwriteItemId: acc.appwriteItemId });
      return {
        bankId: acc.appwriteItemId,
        bankName: acc.name,
        transactions: accountData?.transactions || []
      };
    })
  );

  // Fetch wallet transactions
  const walletTransactionsData = await getWalletTransactions(loggedIn.$id);
  const walletTransactions = walletTransactionsData.documents.map((txn: any) => ({
    id: txn.$id,
    name: txn.name,
    amount: txn.amount,
    date: txn.$createdAt,
    paymentChannel: txn.channel,
    category: txn.category,
    type: txn.senderId === loggedIn.$id ? 'debit' : 'credit',
  }));

  // Get current account (for sidebar)
  const currentAccount = accountsData.find((acc: Account) => acc.appwriteItemId === appwriteItemId);

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || 'Guest'}
          />

          <TotalBalanceBox
            accounts={accountsData}
            totalBanks={accounts?.totalBanks}
            totalCurrentBalance={accounts?.totalCurrentBalance}
            user={loggedIn}
          />
        </header>

        <RecentTransactions
          accounts={accountsData}
          allBankTransactions={allBankTransactions}
          walletTransactions={walletTransactions}
          appwriteItemId={appwriteItemId}
          page={currentPage}
        />
      </div>

      <RightSidebar
        user={loggedIn}
        transactions={currentAccount ?
          allBankTransactions.find(b => b.bankId === currentAccount.appwriteItemId)?.transactions || []
          : []
        }
        banks={accountsData?.slice(0, 2)}
      />
    </section>
  )
}

export default Home