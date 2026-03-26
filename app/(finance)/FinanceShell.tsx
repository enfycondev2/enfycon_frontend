"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "react-hot-toast";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import FinancePinGate from "@/components/finance/FinancePinGate";
import { clearStoredPin, financeLock } from "@/lib/financeClient";
import QuickCalc from "@/components/finance/QuickCalc";
import { useState, useRef, useEffect } from "react";

const NAV_LINKS = [
    { href: "/finance", label: "Overview", exact: true },
    { href: "/finance/roster", label: "Roster" },
    { href: "/finance/consultants", label: "Consultants" },
    { href: "/finance/invoices", label: "Invoices" },
    { href: "/finance/candidate-onboard", label: "Onboard" },
];

function FinanceNav({ onToggleCalc }: { onToggleCalc: () => void }) {
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

                {/* Nav actions */}
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onToggleCalc}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-violet-50 hover:text-violet-600 transition"
                        title="Open Quick Calculator"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    </button>

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
            </div>
        </header>
    );
}

export default function FinanceShell({ theme, children }: { theme: string; children: ReactNode }) {
    const [showCalc, setShowCalc] = useState(false);
    const [calcSize, setCalcSize] = useState<"sm" | "md" | "lg">("md");
    const [pos, setPos] = useState({ x: 0, y: 80 }); 
    const [isDragging, setIsDragging] = useState(false);
    const [rel, setRel] = useState({ x: 0, y: 0 });

    // Initialize position or adjust on size change to keep it on screen
    useEffect(() => {
        const width = calcSize === 'sm' ? 180 : calcSize === 'md' ? 240 : 300;
        if (showCalc) {
            if (pos.x === 0) {
                // First open
                setPos({ x: window.innerWidth - width - 24, y: 80 });
            } else {
                // Adjust if it would go off screen
                setPos(prev => ({
                    x: Math.min(prev.x, window.innerWidth - width),
                    y: prev.y
                }));
            }
        }
    }, [showCalc, calcSize]);

    const onMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsDragging(true);
        const ref = document.getElementById('draggable-calc');
        if (ref) {
            const rect = ref.getBoundingClientRect();
            setRel({
                x: e.pageX - rect.left,
                y: e.pageY - rect.top
            });
        }
        e.stopPropagation();
        e.preventDefault();
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            
            // Boundary checks
            const width = calcSize === 'sm' ? 180 : calcSize === 'md' ? 240 : 300;
            let newX = e.pageX - rel.x;
            let newY = e.pageY - rel.y;
            
            // Keep within horizontal bounds
            newX = Math.max(0, Math.min(newX, window.innerWidth - width));
            // Keep within vertical bounds
            newY = Math.max(0, Math.min(newY, window.innerHeight - 200));

            setPos({ x: newX, y: newY });
        };
        const onMouseUp = () => setIsDragging(false);

        if (isDragging) {
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.body.style.userSelect = 'none';
        } else {
            document.body.style.userSelect = '';
        }
        
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.userSelect = '';
        };
    }, [isDragging, rel, calcSize]);

    return (
        <ThemeProvider attribute="class" defaultTheme={theme} enableSystem disableTransitionOnChange>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col relative">
                <FinanceNav onToggleCalc={() => setShowCalc(!showCalc)} />
                <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6 transition-all duration-300">
                    <FinancePinGate>
                        {children}
                    </FinancePinGate>
                </main>

                {/* Global Floating Calculator */}
                {showCalc && (
                    <div 
                        id="draggable-calc"
                        className="fixed z-50 shadow-2xl animate-in zoom-in-95 fade-in duration-200"
                        style={{ 
                            top: `${pos.y}px`, 
                            left: `${pos.x}px`,
                            cursor: isDragging ? 'grabbing' : 'auto',
                            touchAction: 'none'
                        }}
                    >
                        <div className="relative group">
                            {/* Drag Handle - made smaller and non-blocking */}
                            <div 
                                onMouseDown={onMouseDown}
                                className="absolute top-0 left-0 right-0 h-6 cursor-grab active:cursor-grabbing z-10 rounded-t-2xl flex items-center justify-center group"
                                title="Drag to move"
                            >
                                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full opacity-40 group-hover:opacity-100 transition-opacity mt-2"></div>
                            </div>

                            <button 
                                onClick={() => setShowCalc(false)}
                                className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg z-20 hover:bg-red-600 transition-all hover:scale-110 active:scale-95"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            
                            <QuickCalc 
                                size={calcSize} 
                                onSizeChange={setCalcSize} 
                                showSizeControls={true}
                            />
                        </div>
                    </div>
                )}

                <footer className="border-t border-gray-200 dark:border-gray-800 py-3 text-center text-xs text-gray-400">
                    © {new Date().getFullYear()} enfySync Finance
                </footer>
            </div>
            <Toaster position="top-center" />
        </ThemeProvider>
    );
}
