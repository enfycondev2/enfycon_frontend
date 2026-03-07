import { ModeToggle } from '../shared/mode-toggle';
import { Button } from '../ui/button';
import ProfileDropdown from '../shared/profile-dropdown';
import { SidebarTrigger } from '../ui/sidebar';
import NotificationDropdown from './../shared/notification-dropdown';
import EstOfficeClock from '../shared/est-office-clock';
import Link from 'next/link';
import { Mail } from 'lucide-react';

const Header = () => {
    return (
        <header className="dashboard-header flex items-center justify-between sm:h-18 h-13 shrink-0 gap-2 md:px-6 px-4 py-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-18 dark:bg-[#273142]">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="-ms-1 p-0 size-[unset] cursor-pointer" />
            </div>
            <div className="flex items-center gap-3">
                <EstOfficeClock />
                <ModeToggle />
                <Link href="/chat">
                    <Button
                        size="icon"
                        className="rounded-[50%] text-neutral-900 sm:w-10 sm:h-10 w-8 h-8 bg-gray-200/75 hover:bg-slate-200 focus-visible:ring-0 dark:bg-slate-700 dark:hover:bg-slate-600 border-0 cursor-pointer"
                    >
                        <Mail className="w-5 h-5" />
                    </Button>
                </Link>
                <NotificationDropdown />

                <ProfileDropdown />
            </div>
        </header>
    );
};

export default Header;
