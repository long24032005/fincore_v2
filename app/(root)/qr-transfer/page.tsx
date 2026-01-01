import QRTransferClient from '@/components/QRTransferClient';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getAccounts } from '@/lib/actions/bank.actions';
import { redirect } from 'next/navigation';

const QRTransfer = async () => {
    const loggedIn = await getLoggedInUser();

    if (!loggedIn) redirect('/sign-in');

    // Get user's bank accounts for bank transfer option
    const accounts = await getAccounts({ userId: loggedIn.$id });

    return (
        <section className="flex w-full flex-row max-xl:max-h-screen max-xl:overflow-y-scroll">
            <div className="flex w-full flex-1 flex-col gap-8 px-5 sm:px-8 py-7 lg:py-12 xl:max-h-screen xl:overflow-y-scroll">
                <QRTransferClient user={loggedIn} senderBanks={accounts?.data || []} />
            </div>
        </section>
    );
};

export default QRTransfer;
