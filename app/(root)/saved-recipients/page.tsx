import { redirect } from 'next/navigation';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import SavedRecipientsClient from '@/components/SavedRecipientsClient';

const SavedRecipientsPage = async () => {
    const loggedIn = await getLoggedInUser();

    if (!loggedIn) {
        redirect('/sign-in');
    }

    return (
        <section className="flex w-full flex-row max-xl:max-h-screen max-xl:overflow-y-scroll">
            <div className="flex w-full flex-1 flex-col gap-8 px-5 sm:px-8 py-7 lg:py-12 xl:max-h-screen xl:overflow-y-scroll">
                <header className="flex flex-col gap-2">
                    <h1 className="text-30 font-bold text-white">Saved Recipients</h1>
                    <p className="text-16 text-gray-400">
                        Manage your saved recipients for quick and easy transfers
                    </p>
                </header>

                <SavedRecipientsClient user={loggedIn} />
            </div>
        </section>
    );
};

export default SavedRecipientsPage;
