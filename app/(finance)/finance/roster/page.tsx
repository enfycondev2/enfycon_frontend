"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { financeGet } from "@/lib/financeClient";

import { MONTHS, StatusBadge } from "@/components/finance/FinanceUI";

interface MonthActual {
    month: number; year: number; hours: number;
    revenue: number; cost: number; margin: number;
    invoiceId: string | null; invoiceStatus: string | null;
    amountReceived: number; invoiceTotal: number;
    clientPaid: boolean; expectedPaymentDate: string | null;
    isOverdue: boolean; daysUntilDue: number | null;
    consultantPaid: boolean; payoutAmount: number;
    payoutDate: string | null; payoutRef: string | null;
}

interface Totals {
    hours: number; revenue: number; cost: number; margin: number;
    marginPerc: number; paidIn: number; paidOut: number;
}

interface Row {
    id: string; name: string; email: string; phone: string;
    consultantStatus: "ACTIVE" | "ENDED";
    clientName: string; endClientName: string | null;
    projectStartDate: string | null; projectEndDate: string | null;
    recruiterName: string; accountManagerName: string;
    paymentTerm: string; paymentTermsDays: number;
    consultantPaymentTermsDays: number | null;
    rates: { bill: number; pay: number };
    ideal: { hours: number; revenue: number; cost: number; margin: number; marginPerc: number };
    totals: Totals;
    monthlies: MonthActual[];
}

const curr = (v: number) =>
    "$" + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const pct = (v: number) => v.toFixed(1) + "%";
const label = (dm: { month: number; year: number }) => `${MONTHS[dm.month - 1]} ${dm.year}`;
const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

// ─── Avatar ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
    "bg-violet-500","bg-blue-500","bg-emerald-500","bg-orange-500",
    "bg-pink-500","bg-cyan-500","bg-amber-500","bg-indigo-500",
];
function avatarColor(name: string) {
    let h = 0;
    for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string) {
    const p = name.trim().split(/\s+/);
    return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}



// ─── Month cell ───────────────────────────────────────────────────────────────
function MonthCell({ m }: { m: MonthActual }) {
    const noData = m.hours === 0 && !m.invoiceStatus;
    if (noData) return (
        <td className="px-3 py-3 text-center text-gray-300 dark:text-gray-600 text-[11px]">—</td>
    );
    return (
        <td className="px-3 py-3 text-xs font-mono min-w-[176px] align-top space-y-2">
            {/* Hours + Revenue */}
            <div className="font-bold text-gray-800 dark:text-white">
                {m.hours}h
                <span className="ml-1 text-emerald-600 dark:text-emerald-400"> {curr(m.revenue)}</span>
            </div>
            {/* Margin */}
            {m.margin > 0 && (
                <div className="text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold">
                    ↑ {curr(m.margin)} margin
                </div>
            )}
            {/* Client pay-in */}
            <div className="space-y-0.5">
                <div className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">📥 Pay-In</div>
                {m.clientPaid ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-semibold">✓ Received</span>
                ) : m.isOverdue ? (
                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                        ⚠ {Math.abs(m.daysUntilDue ?? 0)}d OVERDUE
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
                        📅 {m.expectedPaymentDate ? fmtDate(m.expectedPaymentDate) : "Pending"}
                    </span>
                )}
            </div>
            {/* Consultant pay-out */}
            <div className="space-y-0.5">
                <div className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">📤 Pay-Out</div>
                {m.consultantPaid ? (
                    <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                        ✓ {curr(m.payoutAmount)}
                    </span>
                ) : m.cost > 0 ? (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                        ⏳ Due {curr(m.cost)}
                    </span>
                ) : <span className="text-gray-300 text-[10px]">—</span>}
            </div>
        </td>
    );
}

// ─── Main content ─────────────────────────────────────────────────────────────
function RosterContent() {
    const [rows, setRows] = useState<Row[]>([]);
    const [displayMonths, setDisplayMonths] = useState<{ month: number; year: number }[]>([]);
    const [availableMonths, setAvailableMonths] = useState<{ month: number; year: number }[]>([]);
    const [filterMonth, setFilterMonth] = useState("ALL");
    const [filterStatus, setFilterStatus] = useState("ALL");
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

    const visibleMonths = filterMonth === "ALL"
        ? displayMonths
        : displayMonths.filter(dm => `${dm.year}-${dm.month}` === filterMonth);

    const filteredRows = rows.filter(r => filterStatus === "ALL" || r.consultantStatus === filterStatus);

    // Summary stats
    const overdueCount = rows.reduce((n, r) => n + r.monthlies.filter(m => m.isOverdue).length, 0);
    const pendingPayoutCount = rows.reduce((n, r) => n + r.monthlies.filter(m => m.cost > 0 && !m.consultantPaid).length, 0);
    const totalReceivable = rows.reduce((n, r) => n + r.monthlies.reduce((s, m) => s + (m.clientPaid ? 0 : m.invoiceTotal), 0), 0);
    const totalPayable = rows.reduce((n, r) => n + r.monthlies.reduce((s, m) => s + (m.consultantPaid ? 0 : m.cost), 0), 0);
    const activeCount = rows.filter(r => r.consultantStatus === "ACTIVE").length;

    // Totals footer sums
    const grandTotals = filteredRows.reduce(
        (agg, r) => ({
            hours: agg.hours + r.totals.hours,
            revenue: agg.revenue + r.totals.revenue,
            cost: agg.cost + r.totals.cost,
            margin: agg.margin + r.totals.margin,
            paidIn: agg.paidIn + r.totals.paidIn,
            paidOut: agg.paidOut + r.totals.paidOut,
        }),
        { hours: 0, revenue: 0, cost: 0, margin: 0, paidIn: 0, paidOut: 0 },
    );

    return (
        <>
            <DashboardBreadcrumb title="Consultant Roster" text="Finance / Live Consultant Roster" />
            <div className="space-y-5">

                {/* KPI Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Consultants</p>
                        <p className="text-3xl font-black text-gray-800 dark:text-white mt-1">{rows.length}</p>
                        <p className="text-[11px] text-emerald-500 mt-0.5 font-semibold">{activeCount} active</p>
                    </div>
                    <div className={`rounded-2xl border p-4 shadow-sm ${overdueCount > 0 ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"}`}>
                        <p className="text-[10px] text-red-500 uppercase tracking-widest font-bold">⚠ Overdue</p>
                        <p className={`text-3xl font-black mt-1 ${overdueCount > 0 ? "text-red-600" : "text-gray-300"}`}>{overdueCount}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Invoices past due</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                        <p className="text-[10px] text-emerald-600 uppercase tracking-widest font-bold">📥 Outstanding AR</p>
                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{curr(totalReceivable)}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Pending from clients</p>
                    </div>
                    <div className={`rounded-2xl border p-4 shadow-sm ${pendingPayoutCount > 0 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"}`}>
                        <p className="text-[10px] text-amber-600 uppercase tracking-widest font-bold">📤 Outstanding AP</p>
                        <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">{curr(totalPayable)}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{pendingPayoutCount} unpaid consultant(s)</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                        <p className="text-[10px] text-indigo-600 uppercase tracking-widest font-bold">↑ Net Margin</p>
                        <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 mt-1">{curr(grandTotals.margin)}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">All consultants</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h2 className="font-bold text-gray-800 dark:text-white">
                        Live Roster <span className="text-gray-400 font-normal text-sm">({filteredRows.length} consultants)</span>
                    </h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                            <option value="ALL">All statuses</option>
                            <option value="ACTIVE">Active only</option>
                            <option value="ENDED">Ended only</option>
                        </select>
                        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                            <option value="ALL">All months</option>
                            {availableMonths.map(am => (
                                <option key={`${am.year}-${am.month}`} value={`${am.year}-${am.month}`}>
                                    {MONTHS[am.month - 1]} {am.year}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-500 p-4 rounded-xl border border-red-200">{error}</div>}

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/80 uppercase border-b border-gray-100 dark:border-gray-700 whitespace-nowrap">
                                    <tr>
                                        <th className="px-4 py-3 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 min-w-[220px]">Consultant</th>
                                        <th className="px-4 py-3 min-w-[170px]">Project / Client</th>
                                        <th className="px-4 py-3 min-w-[110px]">Rates</th>
                                        <th className="px-4 py-3 bg-indigo-50/60 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 min-w-[150px]">
                                            Ideal 160h/mo
                                        </th>
                                        <th className="px-4 py-3 bg-violet-50/60 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 min-w-[150px]">
                                            Totals (All)
                                        </th>
                                        {visibleMonths.map(dm => (
                                            <th key={`${dm.year}-${dm.month}`}
                                                className="px-3 py-3 bg-emerald-50/60 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 text-center min-w-[176px]">
                                                {label(dm)}<br />
                                                <span className="text-[9px] normal-case font-normal text-gray-400">Hours · Pay-In · Pay-Out</span>
                                            </th>
                                        ))}
                                        <th className="px-3 py-3 min-w-[70px]">Terms</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                    {filteredRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={6 + visibleMonths.length} className="text-center py-16 text-gray-400">
                                                No consultants found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRows.map((row) => (
                                            <tr key={row.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition align-top group">
                                                {/* Consultant */}
                                                <td className="px-4 py-3 sticky left-0 bg-white dark:bg-gray-800 z-10 group-hover:bg-gray-50/60 dark:group-hover:bg-gray-800/40">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className={`${avatarColor(row.name)} text-white rounded-full w-9 h-9 shrink-0 flex items-center justify-center text-xs font-bold shadow-sm`}>
                                                            {initials(row.name).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <Link href={`/finance/roster/${row.id}`} className="font-semibold text-gray-800 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 leading-tight block">
                                                                {row.name}
                                                            </Link>
                                                            <div className="text-[11px] text-gray-400 truncate">{row.email}</div>
                                                            <div className="mt-1">
                                                                <StatusBadge status={row.consultantStatus} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* Client / Project */}
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-gray-700 dark:text-gray-200 text-sm leading-tight">{row.clientName}</div>
                                                    {row.endClientName && (
                                                        <div className="text-[11px] text-gray-400 mt-0.5">End: {row.endClientName}</div>
                                                    )}
                                                    <div className="text-[10px] text-gray-400 mt-0.5">AM: {row.accountManagerName}</div>
                                                    {row.projectStartDate && (
                                                        <div className="text-[10px] text-blue-500 mt-1 font-medium">
                                                            📅 {fmtDate(row.projectStartDate)}
                                                            {row.projectEndDate
                                                                ? ` → ${fmtDate(row.projectEndDate)}`
                                                                : " → Ongoing"}
                                                        </div>
                                                    )}
                                                </td>
                                                {/* Rates */}
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-violet-600 dark:text-violet-400">{curr(row.rates.bill)}<span className="text-[9px] font-normal text-gray-400">/hr</span></div>
                                                    <div className="text-xs text-orange-500">{curr(row.rates.pay)}<span className="text-[9px] font-normal text-gray-400">/hr cost</span></div>
                                                    <div className="text-[10px] text-indigo-500 font-semibold mt-0.5">↑ {curr(row.rates.bill - row.rates.pay)}/hr</div>
                                                </td>
                                                {/* Ideal */}
                                                <td className="px-4 py-3 bg-indigo-50/20 dark:bg-indigo-900/10">
                                                    <div className="text-[11px] text-gray-400">160h/mo</div>
                                                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{curr(row.ideal.revenue)}</div>
                                                    <div className="text-xs text-orange-500">−{curr(row.ideal.cost)}</div>
                                                    <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">{curr(row.ideal.margin)}</div>
                                                    <div className="text-[10px] text-gray-400">{pct(row.ideal.marginPerc)} margin</div>
                                                </td>
                                                {/* Totals */}
                                                <td className="px-4 py-3 bg-violet-50/20 dark:bg-violet-900/10">
                                                    <div className="text-[11px] text-gray-400">{row.totals.hours}h total</div>
                                                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{curr(row.totals.revenue)}</div>
                                                    <div className="text-xs text-orange-500">−{curr(row.totals.cost)}</div>
                                                    <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">{curr(row.totals.margin)}</div>
                                                    <div className="text-[10px] text-gray-400">{pct(row.totals.marginPerc)} margin</div>
                                                </td>
                                                {/* Monthly cells */}
                                                {visibleMonths.map(dm => {
                                                    const m = row.monthlies.find(ma => ma.month === dm.month && ma.year === dm.year);
                                                    if (!m) return (
                                                        <td key={`${dm.year}-${dm.month}`} className="px-3 py-3 text-center text-gray-300 dark:text-gray-600 text-[11px]">No data</td>
                                                    );
                                                    return <MonthCell key={`${dm.year}-${dm.month}`} m={m} />;
                                                })}
                                                {/* Terms */}
                                                <td className="px-3 py-3 text-xs space-y-1.5 min-w-[130px]">
                                                    <div>
                                                        <div className="text-[9px] text-blue-400 uppercase font-bold tracking-wide mb-0.5">📥 Client Terms</div>
                                                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-bold text-[11px] border border-blue-200 dark:border-blue-700">
                                                            {row.paymentTermsDays ? `Net ${row.paymentTermsDays}` : "N/A"}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] text-violet-400 uppercase font-bold tracking-wide mb-0.5">📤 Consultant Terms</div>
                                                        <span className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded font-bold text-[11px] border border-violet-200 dark:border-violet-700">
                                                            {row.consultantPaymentTermsDays ? `Net ${row.consultantPaymentTermsDays}` : "N/A"}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {/* Totals Footer Row */}
                                {filteredRows.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-gray-800 dark:bg-gray-900 text-white text-xs">
                                            <td className="px-4 py-3 sticky left-0 bg-gray-800 dark:bg-gray-900 font-black uppercase tracking-wider text-gray-200" colSpan={2}>
                                                Totals ({filteredRows.length} consultants)
                                            </td>
                                            <td className="px-4 py-3 text-gray-400">—</td>
                                            {/* Ideal total */}
                                            <td className="px-4 py-3 bg-indigo-900/30">
                                                <div className="font-black text-emerald-400">
                                                    {curr(filteredRows.reduce((s, r) => s + r.ideal.revenue, 0))}
                                                </div>
                                                <div className="text-orange-400">
                                                    −{curr(filteredRows.reduce((s, r) => s + r.ideal.cost, 0))}
                                                </div>
                                                <div className="text-indigo-300 font-bold">
                                                    {curr(filteredRows.reduce((s, r) => s + r.ideal.margin, 0))}
                                                </div>
                                            </td>
                                            {/* Actual totals */}
                                            <td className="px-4 py-3 bg-violet-900/30">
                                                <div className="text-gray-300 text-[10px]">{grandTotals.hours}h</div>
                                                <div className="font-black text-emerald-400">{curr(grandTotals.revenue)}</div>
                                                <div className="text-orange-400">−{curr(grandTotals.cost)}</div>
                                                <div className="text-indigo-300 font-bold">{curr(grandTotals.margin)}</div>
                                            </td>
                                            {visibleMonths.map(dm => {
                                                const totH = filteredRows.reduce((s, r) => {
                                                    const m = r.monthlies.find(ma => ma.month === dm.month && ma.year === dm.year);
                                                    return s + (m?.hours ?? 0);
                                                }, 0);
                                                const totR = filteredRows.reduce((s, r) => {
                                                    const m = r.monthlies.find(ma => ma.month === dm.month && ma.year === dm.year);
                                                    return s + (m?.revenue ?? 0);
                                                }, 0);
                                                const totC = filteredRows.reduce((s, r) => {
                                                    const m = r.monthlies.find(ma => ma.month === dm.month && ma.year === dm.year);
                                                    return s + (m?.cost ?? 0);
                                                }, 0);
                                                return (
                                                    <td key={`tot-${dm.year}-${dm.month}`} className="px-3 py-3 bg-emerald-900/20 text-xs font-mono">
                                                        <div className="text-gray-300 text-[10px]">{totH}h</div>
                                                        <div className="font-bold text-emerald-400">{curr(totR)}</div>
                                                        <div className="text-orange-400">−{curr(totC)}</div>
                                                        <div className="text-indigo-300">{curr(totR - totC)}</div>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-3 text-gray-600">—</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default function RosterPage() {
    return (
        <RosterContent />
    );
}
