import { redirect } from 'next/navigation';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import MigrationRunner from '@/components/MigrationRunner';

const MigrationPage = async () => {
    const loggedIn = await getLoggedInUser();

    // Only allow admin to access (you can add admin check here)
    if (!loggedIn) {
        redirect('/sign-in');
    }

    return (
        <section className="flex w-full flex-row max-xl:max-h-screen max-xl:overflow-y-scroll">
            <div className="flex w-full flex-1 flex-col gap-8 px-5 sm:px-8 py-7 lg:py-12">
                <header className="flex flex-col gap-2">
                    <h1 className="text-30 font-bold text-white">🔧 Database Migration</h1>
                    <p className="text-16 text-gray-400">
                        Run database migrations to update user data
                    </p>
                </header>

                <MigrationRunner />
            </div>
        </section>
    );
};

export default MigrationPage;
