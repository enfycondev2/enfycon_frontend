"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { financeGet } from "@/lib/financeClient";

const MN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const curr = (v: number) => "$" + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const pct = (v: number) => v.toFixed(1) + "%";
const fmtDate = (s: string | null | undefined) =>
    s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

const AVATAR_COLORS = [
    "from-violet-500 to-purple-600","from-blue-500 to-cyan-600","from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600","from-pink-500 to-rose-600","from-cyan-500 to-blue-600",
];
function avatarGradient(name: string) {
    let h = 0; for (const c of name) h = (h << 5) - h + c.charCodeAt(0);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string) {
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

interface MonthEntry {
    month: number; year: number; hours: number;
    revenue: number; amountReceived: number; invoiceTotal: number;
    invoiceDate: string | null;
    clientPaid: boolean; invoiceStatus: string | null;
    expectedPaymentDate: string | null; isOverdue: boolean;
    cost: number; consultantPaid: boolean; payoutAmount: number;
    consultantInvoiceDate: string | null;
    consultantDueDate: string | null; isConsultantDueOverdue: boolean;
    payoutDate: string | null; payoutRef: string | null;
    margin: number; marginPerc: number;
}

interface Detail {
    id: string; name: string; email: string; phone: string | null;
    status: string; engagementType: string | null; immigrationStatus: string | null;
    clientName: string; endClientName: string | null;
    projectStartDate: string | null; projectEndDate: string | null;
    recruiterName: string; accountManagerName: string;
    rates: { bill: number; pay: number };
    paymentTerms: {
        clientDays: number; clientLabel: string;
        consultantDays: number; consultantLabel: string;
    };
    summary: {
        totalHours: number; totalRevenue: number; totalCost: number;
        totalMargin: number; totalMarginPerc: number;
        totalPaidIn: number; totalPaidOut: number; activeMonths: number;
    };
    months: MonthEntry[];
}

// ─── Mini bar chart (pure SVG) ────────────────────────────────────────────────
function BarChart({ months }: { months: MonthEntry[] }) {
    if (!months.length) return null;
    const data = [...months].reverse(); // oldest → newest
    const maxVal = Math.max(...data.map(m => Math.max(m.revenue, m.cost, 1)));
    const W = 56;  // bar group width
    const H = 80;  // chart height
    const BAR_W = 18;
    const totalW = data.length * W + 10;

    return (
        <svg width={totalW} height={H + 24} className="overflow-visible">
            {data.map((m, i) => {
                const rev = (m.revenue / maxVal) * H;
                const cost = (m.cost / maxVal) * H;
                const x = i * W + 4;
                return (
                    <g key={`${m.year}-${m.month}`}>
                        {/* Revenue bar */}
                        <rect x={x} y={H - rev} width={BAR_W} height={rev}
                            fill="#10b981" fillOpacity={0.85} rx={2} />
                        {/* Cost bar */}
                        <rect x={x + BAR_W + 2} y={H - cost} width={BAR_W} height={cost}
                            fill="#f97316" fillOpacity={0.75} rx={2} />
                        {/* Month label */}
                        <text x={x + BAR_W} y={H + 14} textAnchor="middle"
                            fontSize={9} fill="#9ca3af">
                            {MN[m.month - 1].slice(0, 3)}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// ─── Summary stat card ────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
    return (
        <div className={`${accent} rounded-2xl p-4`}>
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">{label}</p>
            <p className="text-2xl font-black mt-1">{value}</p>
            {sub && <p className="text-[11px] opacity-60 mt-0.5">{sub}</p>}
        </div>
    );
}

// ─── Month row ────────────────────────────────────────────────────────────────
function MonthRow({ m }: { m: MonthEntry }) {
    const rowBg = m.clientPaid && m.consultantPaid
        ? "bg-emerald-50/40 dark:bg-emerald-900/10"
        : m.isOverdue
            ? "bg-red-50/60 dark:bg-red-900/10"
            : "hover:bg-gray-50/60 dark:hover:bg-gray-800/30";

    return (
        <tr className={`${rowBg} transition border-b border-gray-100 dark:border-gray-700/50 text-sm`}>
            {/* Month */}
            <td className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                {MN[m.month - 1]} {m.year}
                {m.invoiceDate && (
                    <div className="text-[10px] text-gray-400 font-normal mt-0.5">
                        Invoice: {fmtDate(m.invoiceDate)}
                    </div>
                )}
            </td>
            {/* Hours */}
            <td className="px-4 py-3 font-mono font-bold text-gray-800 dark:text-white">
                {m.hours}h
            </td>
            {/* Pay-In (AR) */}
            <td className="px-4 py-3">
                <div className="font-bold text-emerald-700 dark:text-emerald-400">{curr(m.revenue)}</div>
                {/* Client due date */}
                {m.expectedPaymentDate && (
                    <div className="text-[10px] mt-0.5">
                        <span className="text-gray-400">Client due: </span>
                        <span className={m.isOverdue ? "text-red-600 font-bold" : "text-blue-500 font-medium"}>
                            {fmtDate(m.expectedPaymentDate)}
                        </span>
                    </div>
                )}
                <div className="text-[10px] text-gray-400 mt-0.5">
                    {m.clientPaid
                        ? <span className="text-emerald-600 font-semibold">✓ Received {curr(m.amountReceived)}</span>
                        : m.isOverdue
                            ? <span className="text-red-600 font-bold animate-pulse">⚠ OVERDUE</span>
                            : <span className="text-amber-500">⏳ Awaiting payment</span>
                    }
                </div>
            </td>
            {/* Invoice Status */}
            <td className="px-4 py-3">
                {m.invoiceStatus === "PAID" ? (
                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[11px] font-bold">PAID</span>
                ) : m.invoiceStatus === "PENDING" ? (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${m.isOverdue ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300 animate-pulse" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                        {m.isOverdue ? "OVERDUE" : "PENDING"}
                    </span>
                ) : <span className="text-gray-300 text-xs">—</span>}
            </td>
            {/* Pay-Out (AP) */}
            <td className="px-4 py-3">
                <div className="font-bold text-orange-600 dark:text-orange-400">{curr(m.cost)}</div>
                {/* Consultant invoice date */}
                {m.consultantInvoiceDate && (
                    <div className="text-[10px] mt-0.5">
                        <span className="text-gray-400">Consultant inv: </span>
                        <span className="text-gray-600 dark:text-gray-300 font-medium">{fmtDate(m.consultantInvoiceDate)}</span>
                    </div>
                )}
                {/* Consultant due date */}
                {m.consultantDueDate && (
                    <div className="text-[10px] mt-0.5">
                        <span className="text-gray-400">Pay by: </span>
                        <span className={m.isConsultantDueOverdue ? "text-red-600 font-bold" : "text-violet-500 font-medium"}>
                            {fmtDate(m.consultantDueDate)}
                        </span>
                    </div>
                )}
                <div className="text-[10px] text-gray-400 mt-0.5">
                    {m.consultantPaid
                        ? <span className="text-violet-600 font-semibold">✓ Paid {curr(m.payoutAmount)}</span>
                        : m.cost > 0
                            ? <span className={m.isConsultantDueOverdue ? "text-red-600 font-bold animate-pulse" : "text-amber-600"}>⏳ Pending</span>
                            : "—"
                    }
                </div>
                {m.payoutRef && (
                    <div className="text-[9px] text-gray-300 font-mono">{m.payoutRef}</div>
                )}
            </td>
            {/* Payout Status */}
            <td className="px-4 py-3">
                {m.consultantPaid ? (
                    <div>
                        <span className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 px-2 py-0.5 rounded-full text-[11px] font-bold">PAID</span>
                        {m.payoutDate && <div className="text-[10px] text-gray-400 mt-0.5">{fmtDate(m.payoutDate)}</div>}
                    </div>
                ) : m.cost > 0 ? (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${m.isConsultantDueOverdue ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300 animate-pulse" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                        {m.isConsultantDueOverdue ? "OVERDUE" : "PENDING"}
                    </span>
                ) : <span className="text-gray-300 text-xs">—</span>}
            </td>
            {/* Margin */}
            <td className="px-4 py-3">
                <div className={`font-bold ${m.margin >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-red-500"}`}>
                    {m.margin >= 0 ? "+" : ""}{curr(m.margin)}
                </div>
                <div className="text-[10px] text-gray-400">{pct(m.marginPerc)}</div>
            </td>
        </tr>
    );
}

// ─── Main detail content ──────────────────────────────────────────────────────
function DetailContent({ id }: { id: string }) {
    const [data, setData] = useState<Detail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        financeGet(`finance/consultants/${id}/monthly-detail`)
            .then(setData)
            .catch((e: any) => setError(e.message))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="flex justify-center items-center py-32">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
        </div>
    );
    if (error) return (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-500 p-6 rounded-2xl border border-red-200">{error}</div>
    );
    if (!data) return null;

    const s = data.summary;
    const isActive = data.status === "ACTIVE";

    return (
        <>
            <DashboardBreadcrumb
                title={data.name}
                text={`Finance / Roster / ${data.name}`}
            />

            <div className="space-y-6">
                {/* ── Header card ── */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
                    <div className="flex flex-col sm:flex-row items-start gap-5">
                        {/* Avatar */}
                        <div className={`bg-gradient-to-br ${avatarGradient(data.name)} text-white rounded-2xl w-20 h-20 shrink-0 flex items-center justify-center text-3xl font-black shadow-lg`}>
                            {initials(data.name)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl font-black text-gray-900 dark:text-white">{data.name}</h1>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300"}`}>
                                    <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                                    {data.status}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                {data.email && <span>✉ {data.email}</span>}
                                {data.phone && <span>📞 {data.phone}</span>}
                                {data.engagementType && <span>🔖 {data.engagementType}</span>}
                                {data.immigrationStatus && <span>🛂 {data.immigrationStatus}</span>}
                            </div>

                            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                                <span>🏢 <strong className="text-gray-700 dark:text-gray-300">{data.clientName}</strong></span>
                                {data.endClientName && <span>🎯 End: <strong className="text-gray-700 dark:text-gray-300">{data.endClientName}</strong></span>}
                            </div>

                            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1.5 text-[12px] text-gray-400">
                                {data.projectStartDate && (
                                    <span>📅 {fmtDate(data.projectStartDate)} → {data.projectEndDate ? fmtDate(data.projectEndDate) : "Ongoing"}</span>
                                )}
                                <span>👤 AM: {data.accountManagerName}</span>
                                <span>💼 Recruiter: {data.recruiterName}</span>
                            </div>

                            <div className="flex flex-wrap gap-3 mt-2 text-[12px] font-mono">
                                <span className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded font-bold">
                                    Bill: {curr(data.rates.bill)}/hr
                                </span>
                                <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded font-bold">
                                    Pay: {curr(data.rates.pay)}/hr
                                </span>
                                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-bold">
                                    Spread: {curr(data.rates.bill - data.rates.pay)}/hr
                                </span>
                            </div>
                        </div>

                        {/* Payment Terms strip */}
                        <div className="flex flex-wrap gap-3 mt-3">
                            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-3 py-2">
                                <div className="text-lg">📥</div>
                                <div>
                                    <p className="text-[10px] text-blue-500 uppercase font-bold tracking-wide">Client Payment Term</p>
                                    <p className="text-sm font-black text-blue-700 dark:text-blue-300">{data.paymentTerms.clientLabel}</p>
                                    <p className="text-[10px] text-gray-400">Days until client pays after invoice</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-xl px-3 py-2">
                                <div className="text-lg">📤</div>
                                <div>
                                    <p className="text-[10px] text-violet-500 uppercase font-bold tracking-wide">Consultant Payment Term</p>
                                    <p className="text-sm font-black text-violet-700 dark:text-violet-300">{data.paymentTerms.consultantLabel}</p>
                                    <p className="text-[10px] text-gray-400">Days until we pay consultant after invoice</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Summary stats ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard label="Total Pay-In (AR)" value={curr(s.totalRevenue)} sub={`${curr(s.totalPaidIn)} received`} accent="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800" />
                    <StatCard label="Total Pay-Out (AP)" value={curr(s.totalCost)} sub={`${curr(s.totalPaidOut)} paid out`} accent="bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-800" />
                    <StatCard label="Net Margin" value={curr(s.totalMargin)} sub={pct(s.totalMarginPerc)} accent="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800" />
                    <StatCard label="Total Hours" value={`${s.totalHours}h`} sub={`${s.activeMonths} active months`} accent="bg-violet-50 dark:bg-violet-900/20 text-violet-800 dark:text-violet-200 border border-violet-200 dark:border-violet-800" />
                </div>

                {/* ── Chart ── */}
                {data.months.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                        <h2 className="font-bold text-gray-700 dark:text-gray-200 mb-4 text-sm">Monthly Revenue vs Cost</h2>
                        <div className="flex items-end gap-6 overflow-x-auto pb-2">
                            <BarChart months={data.months} />
                            <div className="shrink-0 text-[11px] text-gray-400 space-y-1 pb-4">
                                <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded-sm inline-block" /> Revenue (AR)</div>
                                <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-orange-500 rounded-sm inline-block" /> Cost (AP)</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Monthly breakdown table ── */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <h2 className="font-bold text-gray-800 dark:text-white">Monthly Breakdown</h2>
                        <span className="text-xs text-gray-400">{data.months.length} months on record</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 py-3">Month</th>
                                    <th className="px-4 py-3">Hours</th>
                                    <th className="px-4 py-3 text-emerald-600">Pay-In (AR)</th>
                                    <th className="px-4 py-3 text-emerald-600">Invoice</th>
                                    <th className="px-4 py-3 text-orange-500">Pay-Out (AP)</th>
                                    <th className="px-4 py-3 text-orange-500">Payout</th>
                                    <th className="px-4 py-3 text-indigo-600">Margin</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.months.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-gray-400">No monthly data yet.</td>
                                    </tr>
                                ) : (
                                    data.months.map(m => (
                                        <MonthRow key={`${m.year}-${m.month}`} m={m} />
                                    ))
                                )}
                            </tbody>
                            {/* Footer totals */}
                            {data.months.length > 0 && (
                                <tfoot>
                                    <tr className="bg-gray-800 dark:bg-gray-900 text-white text-sm font-bold">
                                        <td className="px-4 py-3">Totals</td>
                                        <td className="px-4 py-3 font-mono">{s.totalHours}h</td>
                                        <td className="px-4 py-3 text-emerald-400">
                                            {curr(s.totalRevenue)}
                                            <div className="text-[10px] text-emerald-300 font-normal">{curr(s.totalPaidIn)} received</div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">—</td>
                                        <td className="px-4 py-3 text-orange-400">
                                            {curr(s.totalCost)}
                                            <div className="text-[10px] text-orange-300 font-normal">{curr(s.totalPaidOut)} paid</div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">—</td>
                                        <td className="px-4 py-3 text-indigo-300">
                                            {curr(s.totalMargin)}
                                            <div className="text-[10px] text-indigo-200 font-normal">{pct(s.totalMarginPerc)}</div>
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                {/* Back button */}
                <div>
                    <Link href="/finance/roster"
                        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 transition font-medium">
                        ← Back to Roster
                    </Link>
                </div>
            </div>
        </>
    );
}

export default function ConsultantDetailPage() {
    const { id } = useParams<{ id: string }>();
    return (
        <DetailContent id={id} />
    );
}
