"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import FinancePinGate from "@/components/finance/FinancePinGate";
import { financeGet } from "@/lib/financeClient";

const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

interface Row {
    id: string; name: string; email: string; phone: string;
    consultantStatus: string; clientName: string; endClientName: string | null;
    projectStartDate: string | null; projectEndDate: string | null;
    recruiterName: string; accountManagerName: string;
    paymentTerm: string; paymentTermsDays: number;
    rates: { bill: number; pay: number };
    ideal: { hours: number; revenue: number; cost: number; margin: number; marginPerc: number };
    monthlies: MonthActual[];
}

const curr = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const label = (dm: { month: number; year: number }) => `${MN[dm.month - 1]} ${dm.year}`;

function DeadlineBadge({ m }: { m: MonthActual }) {
    if (!m.expectedPaymentDate) return <span className="text-gray-300 text-xs">—</span>;
    if (m.clientPaid) return (
        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            ✓ Received
        </span>
    );
    if (m.isOverdue) return (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
            ⚠ {Math.abs(m.daysUntilDue ?? 0)}d OVERDUE
        </span>
    );
    const d = m.daysUntilDue ?? 0;
    if (d <= 7) return (
        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            ⏰ In {d}d
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
            📅 {new Date(m.expectedPaymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
    );
}

function PayoutBadge({ m }: { m: MonthActual }) {
    if (!m.cost && !m.consultantPaid) return <span className="text-gray-300 text-xs">—</span>;
    if (m.consultantPaid) return (
        <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            ✓ Paid {curr(m.payoutAmount)}
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            ⏳ Due {curr(m.cost)}
        </span>
    );
}

function MonthCell({ m }: { m: MonthActual }) {
    return (
        <td className="px-3 py-3 text-xs font-mono min-w-[190px] align-top">
            {/* Hours + Revenue line */}
            <div className={`font-bold text-sm ${m.hours > 0 ? "text-gray-800 dark:text-white" : "text-gray-300 dark:text-gray-600"}`}>
                {m.hours > 0 ? `${m.hours}h` : "—"}
                {m.revenue > 0 && <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-bold">{curr(m.revenue)}</span>}
            </div>
            {/* Margin */}
            {m.margin > 0 && (
                <div className="text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold mt-0.5">
                    ↑ {curr(m.margin)} margin
                </div>
            )}
            {/* Client Payment Deadline */}
            <div className="mt-1.5 space-y-1">
                <div className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">📥 From Client</div>
                <DeadlineBadge m={m} />
                {m.expectedPaymentDate && !m.clientPaid && (
                    <div className="text-[9px] text-gray-400">Due {new Date(m.expectedPaymentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</div>
                )}
            </div>
            {/* Payout to Consultant */}
            <div className="mt-1.5 space-y-1">
                <div className="text-[9px] uppercase font-bold text-gray-400 tracking-widest">📤 To Consultant</div>
                <PayoutBadge m={m} />
                {m.consultantPaid && m.payoutDate && (
                    <div className="text-[9px] text-gray-400">Paid {new Date(m.payoutDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}{m.payoutRef ? ` · ${m.payoutRef}` : ""}</div>
                )}
            </div>
        </td>
    );
}

function RosterContent() {
    const [rows, setRows] = useState<Row[]>([]);
    const [displayMonths, setDisplayMonths] = useState<{ month: number; year: number }[]>([]);
    const [availableMonths, setAvailableMonths] = useState<{ month: number; year: number }[]>([]);
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

    const visibleMonths = filterMonth === "ALL"
        ? displayMonths
        : displayMonths.filter(dm => `${dm.year}-${dm.month}` === filterMonth);

    // Summary stats
    const today = new Date();
    const overdueCount = rows.reduce((n, r) => n + r.monthlies.filter(m => m.isOverdue).length, 0);
    const pendingPayoutCount = rows.reduce((n, r) => n + r.monthlies.filter(m => m.cost > 0 && !m.consultantPaid).length, 0);
    const totalReceivable = rows.reduce((n, r) => n + r.monthlies.reduce((s, m) => s + (m.clientPaid ? 0 : m.invoiceTotal), 0), 0);
    const totalPayable = rows.reduce((n, r) => n + r.monthlies.reduce((s, m) => s + (m.consultantPaid ? 0 : m.cost), 0), 0);

    return (
        <>
            <DashboardBreadcrumb title="Consultant Roster" text="Finance / Live Consultant Roster" />
            <div className="space-y-5">

                {/* Summary Dashboard */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow">
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Total Consultants</p>
                        <p className="text-3xl font-black text-gray-800 dark:text-white mt-1">{rows.length}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{rows.filter(r => r.consultantStatus === "ACTIVE").length} active</p>
                    </div>
                    <div className={`rounded-2xl border p-4 shadow ${overdueCount > 0 ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"}`}>
                        <p className="text-xs text-red-500 uppercase tracking-widest font-bold">⚠ Overdue Invoices</p>
                        <p className={`text-3xl font-black mt-1 ${overdueCount > 0 ? "text-red-600" : "text-gray-300"}`}>{overdueCount}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Not yet received from client</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow">
                        <p className="text-xs text-emerald-600 uppercase tracking-widest font-bold">📥 Outstanding AR</p>
                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{curr(totalReceivable)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Pending from clients</p>
                    </div>
                    <div className={`rounded-2xl border p-4 shadow ${pendingPayoutCount > 0 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"}`}>
                        <p className="text-xs text-amber-600 uppercase tracking-widest font-bold">📤 Outstanding AP</p>
                        <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">{curr(totalPayable)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{pendingPayoutCount} unpaid consultant(s)</p>
                    </div>
                </div>

                {/* Legend */}
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-6 gap-y-1">
                    <span><span className="text-emerald-600 font-bold">✓ Received</span> = Client paid invoice</span>
                    <span><span className="text-red-600 font-bold">⚠ OVERDUE</span> = Past due date, not received</span>
                    <span><span className="text-orange-500 font-bold">⏰ In Xd</span> = Due within 7 days</span>
                    <span><span className="text-violet-600 font-bold">✓ Paid</span> = Consultant payout sent</span>
                    <span><span className="text-amber-600 font-bold">⏳ Due</span> = Consultant payout pending</span>
                    <span><span className="text-indigo-600 font-bold">↑ Margin</span> = AR − AP for that month</span>
                </div>

                {/* Month Filter */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h2 className="font-bold text-gray-800 dark:text-white">
                        Live Roster <span className="text-gray-400 font-normal text-sm">({rows.length} consultants)</span>
                    </h2>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-500">Filter:</label>
                        <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="ALL">All months</option>
                            {availableMonths.map((am) => (
                                <option key={`${am.year}-${am.month}`} value={`${am.year}-${am.month}`}>
                                    {MN[am.month - 1]} {am.year}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-500 p-4 rounded-xl border border-red-200">{error}</div>}

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 uppercase border-b border-gray-100 dark:border-gray-700 whitespace-nowrap">
                                    <tr>
                                        <th className="px-4 py-3 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10 min-w-[180px]">Consultant</th>
                                        <th className="px-4 py-3 min-w-[150px]">Client</th>
                                        <th className="px-4 py-3 min-w-[100px]">Rates</th>
                                        <th className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 min-w-[160px]">
                                            Ideal (160h/mo)
                                        </th>
                                        {visibleMonths.map(dm => (
                                            <th key={`${dm.year}-${dm.month}`}
                                                className="px-3 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-center min-w-[190px]">
                                                {label(dm)}<br />
                                                <span className="text-[9px] normal-case font-normal text-gray-400">Hours · AR · AP · Status</span>
                                            </th>
                                        ))}
                                        <th className="px-3 py-3 min-w-[80px]">Terms</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                    {rows.length === 0 ? (
                                        <tr><td colSpan={5 + visibleMonths.length} className="text-center py-12 text-gray-400">No consultants found.</td></tr>
                                    ) : (
                                        rows.map((row) => (
                                            <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition align-top">
                                                {/* Consultant */}
                                                <td className="px-4 py-3 sticky left-0 bg-white dark:bg-gray-800 z-10">
                                                    <Link href={`/finance/consultants/${row.id}`} className="font-semibold text-gray-800 dark:text-white hover:text-violet-600 flex items-center gap-1.5">
                                                        {row.name}
                                                        {row.consultantStatus === "ACTIVE" && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
                                                    </Link>
                                                    <div className="text-xs text-gray-400">{row.email}</div>
                                                    <div className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">Rep: {row.recruiterName}</div>
                                                </td>
                                                {/* Client */}
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">{row.clientName}</div>
                                                    {row.endClientName && <div className="text-[10px] text-gray-400">End: {row.endClientName}</div>}
                                                    <div className="text-[10px] text-gray-400 mt-0.5">AM: {row.accountManagerName}</div>
                                                    {row.projectStartDate && (
                                                        <div className="text-[10px] text-blue-500 mt-1 font-medium">
                                                            📅 {new Date(row.projectStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                            {row.projectEndDate
                                                                ? ` → ${new Date(row.projectEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
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
                                                {/* IDEAL */}
                                                <td className="px-4 py-3 bg-indigo-50/30 dark:bg-indigo-900/10">
                                                    <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{curr(row.ideal.revenue)}</div>
                                                    <div className="text-xs text-orange-500">−{curr(row.ideal.cost)}</div>
                                                    <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">{curr(row.ideal.margin)}</div>
                                                    <div className="text-[10px] text-gray-400">{row.ideal.marginPerc.toFixed(1)}% margin</div>
                                                </td>
                                                {/* MONTHLY */}
                                                {visibleMonths.map(dm => {
                                                    const m = row.monthlies.find(ma => ma.month === dm.month && ma.year === dm.year);
                                                    if (!m) return (
                                                        <td key={`${dm.year}-${dm.month}`} className="px-3 py-3 text-center text-gray-300 dark:text-gray-600 text-xs">
                                                            No data
                                                        </td>
                                                    );
                                                    return <MonthCell key={`${dm.year}-${dm.month}`} m={m} />;
                                                })}
                                                {/* Terms */}
                                                <td className="px-3 py-3 text-center">
                                                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-[10px] font-medium border border-gray-200 dark:border-gray-600">
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
        </>
    );
}

export default function RosterPage() {
    return (
        <FinancePinGate>
            <RosterContent />
        </FinancePinGate>
    );
}
