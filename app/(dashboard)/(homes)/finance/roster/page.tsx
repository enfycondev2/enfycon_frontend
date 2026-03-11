"use client";

import { useState, useEffect } from "react";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import FinancePinGate from "@/components/finance/FinancePinGate";
import { financeGet } from "@/lib/financeClient";

const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface MonthActual { month: number; year: number; hours: number; revenue: number; cost: number; margin: number; }
interface DisplayMonth { month: number; year: number; }
interface Row {
    id: string; name: string; email: string; consultantStatus: string;
    clientName: string; accountManagerName: string; paymentTerm: string;
    rates: { bill: number; pay: number };
    ideal: { hours: number; revenue: number; cost: number; margin: number; marginPerc: number };
    monthlies: MonthActual[];
}

export default function RosterPage() {
    const [rows, setRows] = useState<Row[]>([]);
    const [displayMonths, setDisplayMonths] = useState<DisplayMonth[]>([]);
    const [availableMonths, setAvailableMonths] = useState<DisplayMonth[]>([]);
    const [filterMonth, setFilterMonth] = useState("ALL");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function load() {
        setLoading(true); setError("");
        try {
            const data = await financeGet("finance/consultants/roster");
            setRows(data.rows ?? []);
            setDisplayMonths(data.displayMonths ?? []);
            setAvailableMonths(data.availableMonths ?? []);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    }

    useEffect(() => { load(); }, []);

    const curr = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const label = (dm: DisplayMonth) => `${MN[dm.month - 1]} ${dm.year}`;

    // Which month columns to render
    const visibleMonths = filterMonth === "ALL"
        ? displayMonths
        : displayMonths.filter(dm => `${dm.year}-${dm.month}` === filterMonth);

    return (
        <FinancePinGate>
            <DashboardBreadcrumb title="Consultant Roster" text="Finance / Live Consultant Roster" />
            <div className="space-y-6">

                {/* Header bar */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Metrics Guide</h2>
                            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                <li><strong>MTD</strong> = <em>Month-To-Date</em> — total logged hours &amp; calculated revenue for that month</li>
                                <li><strong>Ideal Revenue:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Bill Rate × 160 hrs</code></li>
                                <li><strong>Margin %:</strong> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">(Margin Per Hour ÷ Bill Rate) × 100</code></li>
                            </ul>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Filter Month:</label>
                            <select
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 min-w-[180px]"
                            >
                                <option value="ALL">All ({displayMonths.length} months)</option>
                                {availableMonths.map((am) => (
                                    <option key={`${am.year}-${am.month}`} value={`${am.year}-${am.month}`}>
                                        {MN[am.month - 1]} {am.year}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-500 font-semibold p-4 rounded-xl border border-red-200 dark:border-red-800">{error}</div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <h2 className="font-bold text-gray-800 dark:text-white text-lg">
                                Live Roster ({rows.length} consultants)
                                {filterMonth !== "ALL" && <span className="text-violet-600 ml-2">— {MN[(parseInt(filterMonth.split("-")[1]) || 1) - 1]} {filterMonth.split("-")[0]}</span>}
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 uppercase border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">Consultant</th>
                                        <th className="px-4 py-3">Client</th>
                                        <th className="px-4 py-3">Rates</th>
                                        <th className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300">Ideal (160h)</th>
                                        {visibleMonths.map(dm => (
                                            <th key={`${dm.year}-${dm.month}`}
                                                className="px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-center">
                                                {label(dm)}
                                            </th>
                                        ))}
                                        <th className="px-3 py-3">Terms</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr><td colSpan={5 + visibleMonths.length} className="text-center py-10 text-gray-500">No active consultants found.</td></tr>
                                    ) : (
                                        rows.map((row) => (
                                            <tr key={row.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-4 py-3 sticky left-0 bg-white dark:bg-gray-800 z-10">
                                                    <div className="font-medium text-gray-800 dark:text-white flex items-center gap-2">
                                                        {row.name}
                                                        {row.consultantStatus === "ACTIVE" && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
                                                    </div>
                                                    <div className="text-xs text-gray-400">{row.email}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-700 dark:text-gray-300">{row.clientName}</div>
                                                    <div className="text-xs text-gray-400">Rep: {row.accountManagerName}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-violet-600 font-bold">{curr(row.rates.bill)}</div>
                                                    <div className="text-xs text-gray-500">{curr(row.rates.pay)} cost</div>
                                                </td>
                                                {/* IDEAL */}
                                                <td className="px-4 py-3 bg-indigo-50/50 dark:bg-indigo-900/10 font-mono text-xs">
                                                    <div className="font-bold text-gray-800 dark:text-gray-200">Rev: {curr(row.ideal.revenue)}</div>
                                                    <div className="text-indigo-600 dark:text-indigo-400 font-bold">Margin: {curr(row.ideal.margin)}</div>
                                                    <div className="text-gray-500">{row.ideal.marginPerc.toFixed(1)}% ({curr(row.rates.bill - row.rates.pay)}/hr)</div>
                                                </td>
                                                {/* MONTHLY ACTUALS */}
                                                {visibleMonths.map(dm => {
                                                    const m = row.monthlies.find(ma => ma.month === dm.month && ma.year === dm.year);
                                                    const hours = m?.hours ?? 0;
                                                    const revenue = m?.revenue ?? 0;
                                                    const margin = m?.margin ?? 0;
                                                    return (
                                                        <td key={`${dm.year}-${dm.month}`} className="px-4 py-3 bg-emerald-50/50 dark:bg-emerald-900/10 font-mono text-xs text-center">
                                                            <div className={`font-bold mb-0.5 ${hours > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-gray-400"}`}>
                                                                {hours} hrs
                                                            </div>
                                                            <div className="font-bold text-gray-800 dark:text-gray-200">
                                                                {curr(revenue)}
                                                            </div>
                                                            <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                                {curr(margin)}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-3 py-3 text-center">
                                                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                        {row.paymentTerm}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </FinancePinGate>
    );
}
