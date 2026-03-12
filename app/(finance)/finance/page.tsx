"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import FinancePinGate from "@/components/finance/FinancePinGate";
import { financeGet } from "@/lib/financeClient";

const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (n: number) => `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface Summary {
    receivable: { total: number; overdue: number; dueSoon: number; pendingCount: number };
    payable: { total: number };
    netPosition: number;
    historical: { totalBilled: number; totalCollected: number };
    overdueInvoices: { id: string; consultant: string; client: string; month: number; year: number; remaining: number; daysOverdue: number; expectedPaymentDate: string }[];
    dueSoonInvoices: { id: string; consultant: string; client: string; month: number; year: number; remaining: number; dueInDays: number; expectedPaymentDate: string }[];
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
    return (
        <div className={`rounded-2xl border p-5 ${color}`}>
            <p className="text-xs uppercase font-bold tracking-widest text-current opacity-70 mb-2">{label}</p>
            <p className="text-3xl font-black">{value}</p>
            {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
        </div>
    );
}

function FinanceDashboardContent() {
    const [data, setData] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        financeGet("finance/summary")
            .then(setData)
            .catch((e: any) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center py-32">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
        </div>
    );
    if (error) return <div className="p-6 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200">{error}</div>;
    if (!data) return null;

    const net = data.netPosition;
    const collectRate = data.historical.totalBilled > 0
        ? ((data.historical.totalCollected / data.historical.totalBilled) * 100).toFixed(1)
        : "0.0";

    return (
        <>
            <DashboardBreadcrumb title="Finance Overview" text="Finance / Overview" />

            <div className="space-y-6">

                {/* ── Balance Sheet ─────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard
                        label="📥 Accounts Receivable"
                        value={fmt(data.receivable.total)}
                        sub={`${data.receivable.pendingCount} open invoice${data.receivable.pendingCount !== 1 ? "s" : ""} · clients owe you`}
                        color="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                    />
                    <StatCard
                        label="📤 Accounts Payable"
                        value={fmt(data.payable.total)}
                        sub="Owed to consultants for open invoices"
                        color="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300"
                    />
                    <div className={`rounded-2xl border p-5 ${net >= 0 ? "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-300" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"}`}>
                        <p className="text-xs uppercase font-bold tracking-widest opacity-70 mb-2">⚖️ Net Position (AR − AP)</p>
                        <p className="text-3xl font-black">{net < 0 ? "-" : ""}{fmt(net)}</p>
                        <p className="text-xs mt-1 opacity-60">{net >= 0 ? "Company is in surplus" : "Company is in deficit"}</p>
                    </div>
                </div>

                {/* ── Alert Row ─────────────────────────────────────────── */}
                {(data.receivable.overdue > 0 || data.receivable.dueSoon > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {data.receivable.overdue > 0 && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-4 flex items-start gap-3">
                                <span className="text-2xl">⚠️</span>
                                <div>
                                    <p className="font-bold text-red-700 dark:text-red-400">Overdue: {fmt(data.receivable.overdue)}</p>
                                    <p className="text-sm text-red-600/70 dark:text-red-400/70">{data.overdueInvoices.length} invoice{data.overdueInvoices.length !== 1 ? "s" : ""} past their due date</p>
                                </div>
                            </div>
                        )}
                        {data.receivable.dueSoon > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4 flex items-start gap-3">
                                <span className="text-2xl">⏰</span>
                                <div>
                                    <p className="font-bold text-amber-700 dark:text-amber-400">Due Soon: {fmt(data.receivable.dueSoon)}</p>
                                    <p className="text-sm text-amber-600/70 dark:text-amber-400/70">{data.dueSoonInvoices.length} invoice{data.dueSoonInvoices.length !== 1 ? "s" : ""} due within 7 days</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Historical ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow">
                        <p className="text-xs uppercase font-bold tracking-widest text-gray-400 mb-3">All-time Performance</p>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Total Billed</span>
                                <span className="font-bold text-gray-800 dark:text-white">{fmt(data.historical.totalBilled)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Total Collected</span>
                                <span className="font-bold text-emerald-600">{fmt(data.historical.totalCollected)}</span>
                            </div>
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-2 flex justify-between items-center">
                                <span className="text-sm text-gray-500">Collection Rate</span>
                                <span className={`font-black text-lg ${+collectRate >= 80 ? "text-emerald-600" : +collectRate >= 50 ? "text-amber-500" : "text-red-500"}`}>{collectRate}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow">
                        <p className="text-xs uppercase font-bold tracking-widest text-gray-400 mb-3">Quick Access</p>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { href: "/finance/roster", label: "📋 Live Roster", desc: "AR/AP per consultant" },
                                { href: "/finance/consultants", label: "👤 Consultants", desc: "Manage all consultants" },
                                { href: "/finance/invoices", label: "🧾 Invoices", desc: "All billing records" },
                                { href: "/finance/payments", label: "💳 Payments", desc: "Client payments received" },
                            ].map(l => (
                                <Link key={l.href} href={l.href} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3 hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition">
                                    <p className="font-semibold text-sm text-gray-800 dark:text-white">{l.label}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{l.desc}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Overdue Invoices Table ─────────────────────────────── */}
                {data.overdueInvoices.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-2xl shadow overflow-hidden">
                        <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
                            <h3 className="font-bold text-red-700 dark:text-red-400 text-sm">⚠ Overdue Invoices — Action Required</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/30">
                                    <tr>
                                        <th className="text-left px-4 py-2">Consultant</th>
                                        <th className="text-left px-4 py-2">Client</th>
                                        <th className="text-left px-4 py-2">Period</th>
                                        <th className="text-right px-4 py-2">Outstanding</th>
                                        <th className="text-left px-4 py-2">Days Overdue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {data.overdueInvoices.map(inv => (
                                        <tr key={inv.id} className="hover:bg-red-50/30 dark:hover:bg-red-900/10">
                                            <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-white">{inv.consultant}</td>
                                            <td className="px-4 py-2.5 text-gray-500">{inv.client}</td>
                                            <td className="px-4 py-2.5 text-gray-500">{MN[inv.month - 1]} {inv.year}</td>
                                            <td className="px-4 py-2.5 font-bold text-red-600 text-right">{fmt(inv.remaining)}</td>
                                            <td className="px-4 py-2.5">
                                                <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 px-2 py-0.5 rounded-full text-xs font-bold">
                                                    {inv.daysOverdue}d late
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Due Soon Table ─────────────────────────────────────── */}
                {data.dueSoonInvoices.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 rounded-2xl shadow overflow-hidden">
                        <div className="px-5 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800">
                            <h3 className="font-bold text-amber-700 dark:text-amber-400 text-sm">⏰ Due Within 7 Days</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/30">
                                    <tr>
                                        <th className="text-left px-4 py-2">Consultant</th>
                                        <th className="text-left px-4 py-2">Client</th>
                                        <th className="text-left px-4 py-2">Period</th>
                                        <th className="text-right px-4 py-2">Outstanding</th>
                                        <th className="text-left px-4 py-2">Due In</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {data.dueSoonInvoices.map(inv => (
                                        <tr key={inv.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-900/10">
                                            <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-white">{inv.consultant}</td>
                                            <td className="px-4 py-2.5 text-gray-500">{inv.client}</td>
                                            <td className="px-4 py-2.5 text-gray-500">{MN[inv.month - 1]} {inv.year}</td>
                                            <td className="px-4 py-2.5 font-bold text-amber-600 text-right">{fmt(inv.remaining)}</td>
                                            <td className="px-4 py-2.5">
                                                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full text-xs font-bold">
                                                    {inv.dueInDays}d left
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </>
    );
}

export default function FinancePage() {
    return (
        <FinancePinGate>
            <FinanceDashboardContent />
        </FinancePinGate>
    );
}
