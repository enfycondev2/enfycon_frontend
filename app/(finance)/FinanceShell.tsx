"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "react-hot-toast";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import FinancePinGate from "@/components/finance/FinancePinGate";
import { clearStoredPin, financeLock } from "@/lib/financeClient";

const NAV_LINKS = [
    { href: "/finance", label: "Overview", exact: true },
    { href: "/finance/roster", label: "Roster" },
    { href: "/finance/consultants", label: "Consultants" },
    { href: "/finance/invoices", label: "Invoices" },
    { href: "/finance/payments", label: "Payments" },
    { href: "/finance/projects", label: "Projects" },
    { href: "/finance/hours", label: "Hours" },
    { href: "/finance/candidate-onboard", label: "Onboard" },
];

function FinanceNav() {
    const path = usePathname();
    return (
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center gap-6 h-14">
                {/* Brand */}
                <Link href="/finance" className="flex items-center gap-2 shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white text-sm">Finance</span>
                </Link>

                {/* Nav links */}
                <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1">
                    {NAV_LINKS.map(({ href, label, exact }) => {
                        const active = exact ? path === href : path.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                                    active
                                        ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-white"
                                }`}
                            >
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Back to Sync */}
                <Link
                    href="/admin/dashboard"
                    onClick={() => {
                        clearStoredPin();
                        financeLock();
                    }}
                    className="shrink-0 text-xs text-gray-400 hover:text-violet-600 transition flex items-center gap-1"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Sync
                </Link>
            </div>
        </header>
    );
}

export default function FinanceShell({ theme, children }: { theme: string; children: ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme={theme} enableSystem disableTransitionOnChange>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
                <FinanceNav />
                <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6">
                    <FinancePinGate>
                        {children}
                    </FinancePinGate>
                </main>
                <footer className="border-t border-gray-200 dark:border-gray-800 py-3 text-center text-xs text-gray-400">
                    © {new Date().getFullYear()} enfySync Finance
                </footer>
            </div>
            <Toaster position="top-center" />
        </ThemeProvider>
    );
}
