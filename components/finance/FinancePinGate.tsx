"use client";

import { useState, useEffect, ReactNode } from "react";
import { getStoredPin, setStoredPin } from "@/lib/financeClient";
import { apiClient } from "@/lib/apiClient";

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
        if (stored) {
            setUnlocked(true);
            setMounted(true);
        } else {
            // Lazy check: see if session is already unlocked in backend
            setLoading(true);
            apiClient("/finance/dashboard")
                .then(res => {
                    if (res.ok) setUnlocked(true);
                })
                .catch(() => {})
                .finally(() => {
                    setLoading(false);
                    setMounted(true);
                });
        }

        const handleLock = () => {
            setUnlocked(false);
            setPin("");
        };

        // --- Idle Detection (Bank-Level Security) ---
        const IDLE_TIME = 15 * 60 * 1000; // 15 minutes
        let idleTimer: NodeJS.Timeout;

        const resetIdleTimer = () => {
            clearTimeout(idleTimer);
            if (unlocked) {
                idleTimer = setTimeout(() => {
                    const { clearStoredPin } = require("@/lib/financeClient");
                    clearStoredPin(); // This dispatches "finance-locked"
                }, IDLE_TIME);
            }
        };

        const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
        if (unlocked) {
            events.forEach(e => window.addEventListener(e, resetIdleTimer));
            resetIdleTimer();
        }

        window.addEventListener("finance-locked", handleLock);
        
        return () => {
            window.removeEventListener("finance-locked", handleLock);
            events.forEach(e => window.removeEventListener(e, resetIdleTimer));
            clearTimeout(idleTimer);
        };
    }, [unlocked]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (pin.length < 4 || pin.length > 6) {
            setError("Code must be 4 digits (PIN) or 6 digits (Authenticator).");
            return;
        }
        setLoading(true);
        setError("");
        try {
            // Validate by hitting the dashboard endpoint with the code in the header
            const res = await apiClient("/finance/dashboard", {
                headers: { "x-finance-pin": pin },
            });
            
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.message || "Incorrect code. Please try again.");
                setLoading(false);
                return;
            }

            // ONLY store the legacy 4-digit global PIN.
            // 6-digit TOTP codes are one-time use and should NEVER be stored.
            if (pin.length === 4) {
                setStoredPin(pin);
            }
            setUnlocked(true);
        } catch {
            // Network error fallback - only store if 4 digits
            if (pin.length === 4) setStoredPin(pin);
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
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter your Finance PIN or 6-digit Authenticator code</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="••••••"
                        className="w-full text-center text-3xl tracking-[0.5rem] border border-gray-300 dark:border-gray-600 rounded-xl py-3 px-4 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        autoFocus
                    />
                    {error && <p className="text-red-500 text-sm text-center px-4">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading || (pin.length !== 4 && pin.length !== 6)}
                        className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-violet-200 dark:shadow-none"
                    >
                        {loading ? "Verifying…" : "Unlock Finance"}
                    </button>
                    <p className="text-[10px] text-center text-gray-400">
                      Standard PIN is 4 digits. Authenticator codes are 6 digits.
                    </p>
                </form>
            </div>
        </div>
    );
}
