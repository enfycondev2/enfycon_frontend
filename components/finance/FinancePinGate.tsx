"use client";

import { useState, useEffect, ReactNode } from "react";
import { getStoredPin, setStoredPin } from "@/lib/financeClient";

interface FinancePinGateProps {
    children: ReactNode;
}

export default function FinancePinGate({ children }: FinancePinGateProps) {
    const [unlocked, setUnlocked] = useState(false);
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const stored = getStoredPin();
        if (stored) setUnlocked(true);
        setMounted(true);
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            setError("PIN must be exactly 4 digits.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            // Validate PIN by hitting the dashboard endpoint
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/finance/dashboard`,
                {
                    headers: { "x-finance-pin": pin, Authorization: `Bearer ` },
                }
            );
            // 401 from auth is fine — 403 means bad PIN
            if (res.status === 403) {
                setError("Incorrect PIN. Please try again.");
                setLoading(false);
                return;
            }
            setStoredPin(pin);
            setUnlocked(true);
        } catch {
            // Network error — store the pin anyway since we can't validate without token
            setStoredPin(pin);
            setUnlocked(true);
        } finally {
            setLoading(false);
        }
    }

    if (!mounted) return null;

    if (unlocked) return <>{children}</>;

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm border border-gray-100 dark:border-gray-700">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Finance Access</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter your 4-digit Finance PIN to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="••••"
                        className="w-full text-center text-3xl tracking-[1rem] border border-gray-300 dark:border-gray-600 rounded-xl py-3 px-4 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        autoFocus
                    />
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading || pin.length !== 4}
                        className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                    >
                        {loading ? "Verifying…" : "Unlock Finance"}
                    </button>
                </form>
            </div>
        </div>
    );
}
