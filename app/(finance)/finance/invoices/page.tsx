"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { financeGet, financePost, financePatch, financeDelete } from "@/lib/financeClient";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";

const STATUS_OPTIONS = ["", "PENDING", "PAID"];
import { MONTHS, formatDateUS } from "@/components/finance/FinanceUI";
const curr = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function InvoicesContent() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    
    const searchParams = useSearchParams();
    const queryProjectId = searchParams.get("projectId") || "";
    const queryMonth = searchParams.get("month") ? Number(searchParams.get("month")) : null;
    const queryYear = searchParams.get("year") ? Number(searchParams.get("year")) : null;
    const queryHoursRecordId = searchParams.get("hoursRecordId") || "";

    const [projectId, setProjectId] = useState(queryProjectId);
    const [showAdd, setShowAdd] = useState(!!queryProjectId);

    const now = new Date();
    const [form, setForm] = useState({
        projectId: queryProjectId,
        hoursRecordId: queryHoursRecordId,
        invoiceMonth: queryMonth || (now.getMonth() + 1),
        invoiceYear: queryYear || now.getFullYear(),
        invoiceDate: now.toISOString().slice(0, 10),
        hours: "",
        billRate: "",
        referenceNumber: "",
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    async function load() {
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            if (projectId.trim()) params.set("projectId", projectId.trim());
            if (status) params.set("status", status);
            const [invoiceData, summaryData] = await Promise.all([
                financeGet(`finance/invoices?${params.toString()}`),
                financeGet("finance/summary"),
            ]);
            setInvoices(Array.isArray(invoiceData) ? invoiceData : invoiceData?.data ?? []);
            setSummary(summaryData);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    }

    useEffect(() => { load(); }, [status]);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setSaveError("");
        try {
            await financePost("finance/invoices", {
                projectId: form.projectId,
                hoursRecordId: form.hoursRecordId || undefined,
                invoiceMonth: +form.invoiceMonth,
                invoiceYear: +form.invoiceYear,
                invoiceDate: form.invoiceDate,
                hours: +form.hours,
                billRate: +form.billRate,
                referenceNumber: form.referenceNumber,
            });
            setShowAdd(false);
            load();
        } catch (err: any) { setSaveError(err.message); }
        finally { setSaving(false); }
    }

    async function handleMarkPaid(id: string) {
        try { await financePatch(`finance/invoices/${id}/mark-paid`); load(); }
        catch (err: any) { alert(err.message); }
    }

    async function handleMarkUnpaid(id: string) {
        try { await financePatch(`finance/invoices/${id}/mark-unpaid`); load(); }
        catch (err: any) { alert(err.message); }
    }

    async function handleDeleteInvoice(id: string) {
        if (!window.confirm("Are you sure you want to delete this invoice? This will also disconnect any history for this month. You cannot delete an invoice if payments are already recorded.")) return;
        try {
            await financeDelete(`finance/invoices/${id}`);
            load();
        } catch (err: any) {
            alert(err.message);
        }
    }

    // Check if invoice is overdue
    function isOverdue(inv: any) {
        if (inv.status !== "PENDING" || !inv.expectedPaymentDate) return false;
        return new Date(inv.expectedPaymentDate) < new Date();
    }

    function daysUntilDue(inv: any) {
        if (!inv.expectedPaymentDate) return null;
        const diff = Math.ceil((new Date(inv.expectedPaymentDate).getTime() - Date.now()) / 86400000);
        return diff;
    }

    return (
        <>
            <DashboardBreadcrumb title="Invoices & Financials" text="Finance / Invoices & AR/AP Summary" />

            {/* ─── AR/AP Summary Cards ─────────────────────────────────────────── */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {/* Total Receivable */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-5">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Receivable (from Clients)</p>
                        <p className="text-2xl font-bold text-emerald-600">{curr(summary.receivable.total)}</p>
                        <p className="text-xs text-gray-400 mt-1">{summary.receivable.pendingCount} pending invoices</p>
                    </div>

                    {/* Total Payable */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-5">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Payable (to Consultants)</p>
                        <p className="text-2xl font-bold text-orange-500">{curr(summary.payable.total)}</p>
                        <p className="text-xs text-gray-400 mt-1">hours × pay rate</p>
                    </div>

                    {/* Net Position */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-5">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Net Position (AR − AP)</p>
                        <p className={`text-2xl font-bold ${summary.netPosition >= 0 ? "text-violet-600" : "text-red-500"}`}>{curr(summary.netPosition)}</p>
                        <p className="text-xs text-gray-400 mt-1">your margin on pending</p>
                    </div>

                    {/* Overdue */}
                    <div className={`rounded-2xl shadow border p-5 ${summary.receivable.overdue > 0
                        ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                        : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"}`}>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Overdue</p>
                        <p className={`text-2xl font-bold ${summary.receivable.overdue > 0 ? "text-red-600" : "text-gray-400"}`}>
                            {curr(summary.receivable.overdue)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {summary.overdueInvoices.length > 0
                                ? `${summary.overdueInvoices.length} overdue invoice(s)`
                                : "All invoices on time ✓"}
                        </p>
                    </div>
                </div>
            )}

            {/* ─── Overdue & Due Soon Alerts ──────────────────────────────── */}
            {summary?.overdueInvoices?.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                    <h3 className="text-sm font-bold text-red-700 dark:text-red-400 mb-2">⚠ Overdue Invoices</h3>
                    <div className="space-y-1">
                        {summary.overdueInvoices.map((inv: any) => (
                            <div key={inv.id} className="flex justify-between text-xs text-red-600 dark:text-red-400">
                                <span>{inv.consultant} → {inv.client} ({MONTHS[inv.month - 1]} {inv.year})</span>
                                <span className="font-semibold">{curr(inv.remaining)} — {inv.daysOverdue} days overdue</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {summary?.dueSoonInvoices?.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-4">
                    <h3 className="text-sm font-bold text-yellow-700 dark:text-yellow-400 mb-2">🕐 Due Within 7 Days</h3>
                    <div className="space-y-1">
                        {summary.dueSoonInvoices.map((inv: any) => (
                            <div key={inv.id} className="flex justify-between text-xs text-yellow-700 dark:text-yellow-400">
                                <span>{inv.consultant} → {inv.client} ({MONTHS[inv.month - 1]} {inv.year})</span>
                                <span className="font-semibold">{curr(inv.remaining)} — due in {inv.dueInDays} days</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Historical Card ─────────────────────────────────────────── */}
            {summary && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-5">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Billed (All Time)</p>
                        <p className="text-xl font-bold text-gray-700 dark:text-gray-200">{curr(summary.historical.totalBilled)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-5">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Collected (All Time)</p>
                        <p className="text-xl font-bold text-green-600">{curr(summary.historical.totalCollected)}</p>
                    </div>
                </div>
            )}

            {/* ─── Invoice Table ───────────────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex flex-wrap items-center gap-2">
                        <input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Filter by Project ID…"
                            className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-52" />
                        {STATUS_OPTIONS.map((s) => (
                            <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition ${status === s ? "bg-violet-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"}`}>
                                {s || "All"}
                            </button>
                        ))}
                        <button onClick={load} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-xl text-xs hover:bg-gray-200 transition">Search</button>
                    </div>
                    <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        New Invoice
                    </button>
                </div>

                {/* Create form */}
                {showAdd && (
                    <form onSubmit={handleCreate} className="p-4 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-800 flex flex-wrap gap-3 items-end">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Project ID</label>
                            <input required value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white w-48 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
                            <select value={form.invoiceMonth} onChange={(e) => setForm((f) => ({ ...f, invoiceMonth: +e.target.value }))}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
                            <input required type="number" value={form.invoiceYear} onChange={(e) => setForm((f) => ({ ...f, invoiceYear: +e.target.value }))}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white w-24 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Date</label>
                            <input required type="date" value={form.invoiceDate} onChange={(e) => setForm((f) => ({ ...f, invoiceDate: e.target.value }))}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Hours</label>
                            <input required type="number" step="0.5" placeholder="160" value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white w-24 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Bill Rate ($/hr)</label>
                            <input required type="number" step="0.01" placeholder="95" value={form.billRate} onChange={(e) => setForm((f) => ({ ...f, billRate: e.target.value }))}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white w-28 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Invoice # (Ref)</label>
                            <input value={form.referenceNumber} onChange={(e) => setForm((f) => ({ ...f, referenceNumber: e.target.value }))}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white w-28 focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                        {saveError && <p className="text-red-500 text-xs w-full">{saveError}</p>}
                        <div className="flex gap-2">
                            <button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-xl transition">
                                {saving ? "Saving…" : "Create"}
                            </button>
                            <button type="button" onClick={() => setShowAdd(false)} className="border border-gray-300 dark:border-gray-600 text-gray-500 px-3 py-1.5 rounded-xl text-sm hover:bg-gray-100 transition">Cancel</button>
                        </div>
                    </form>
                )}

                {/* Table */}
                {loading ? (
                    <div className="p-12 text-center text-gray-400 animate-pulse">Loading invoices…</div>
                ) : error ? (
                    <div className="p-12 text-center text-red-500">{error}</div>
                ) : invoices.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">No invoices found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs">
                                <tr>
                                    <th className="text-left px-4 py-3">Consultant</th>
                                    <th className="text-left px-4 py-3">Client</th>
                                    <th className="text-left px-4 py-3">Period</th>
                                    <th className="text-left px-4 py-3">Hours</th>
                                    <th className="text-left px-4 py-3">Total</th>
                                    <th className="text-left px-4 py-3">Due Date</th>
                                    <th className="text-left px-4 py-3">Status</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {invoices.map((inv: any) => {
                                    const overdue = isOverdue(inv);
                                    const days = daysUntilDue(inv);
                                    return (
                                        <tr key={inv.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition ${overdue ? "bg-red-50/50 dark:bg-red-900/10" : ""}`}>
                                            <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200 text-sm">
                                                {inv.project?.consultant?.name ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm">
                                                {inv.project?.client?.name ?? inv.project?.clientName ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{MONTHS[(inv.invoiceMonth ?? 1) - 1]} {inv.invoiceYear}</td>
                                            <td className="px-4 py-3 text-gray-500">{Number(inv.hours)}</td>
                                            <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">${Number(inv.totalAmount).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-xs">
                                                <span className={overdue ? "text-red-600 font-bold" : "text-gray-400"}>
                                                    {formatDateUS(inv.expectedPaymentDate)}
                                                </span>
                                                {overdue && <span className="ml-1 text-red-500 text-[10px]">({Math.abs(days!)}d overdue)</span>}
                                                {!overdue && days !== null && days >= 0 && days <= 7 && inv.status === "PENDING" && (
                                                    <span className="ml-1 text-yellow-600 text-[10px]">(in {days}d)</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inv.status === "PAID"
                                                    ? "bg-green-100 text-green-700"
                                                    : overdue ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                                                    {overdue ? "OVERDUE" : inv.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right space-x-2">
                                                <button onClick={() => {
                                                    setForm({
                                                        projectId: inv.projectId,
                                                        hoursRecordId: inv.hoursId || "",
                                                        invoiceMonth: inv.invoiceMonth,
                                                        invoiceYear: inv.invoiceYear,
                                                        invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().slice(0, 10) : now.toISOString().slice(0, 10),
                                                        hours: String(inv.hours),
                                                        billRate: String(inv.billRate),
                                                        referenceNumber: inv.referenceNumber || "",
                                                    });
                                                    setShowAdd(true);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }} className="text-xs text-violet-600 hover:underline">
                                                    Edit
                                                </button>
                                                {inv.status === "PENDING" && (
                                                    <button onClick={() => handleMarkPaid(inv.id)} className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg transition">
                                                        Mark Paid
                                                    </button>
                                                )}
                                                {inv.status === "PAID" && (
                                                    <button onClick={() => handleMarkUnpaid(inv.id)} className="text-xs text-orange-600 hover:underline">
                                                        Revoke
                                                    </button>
                                                )}
                                                <button onClick={() => handleDeleteInvoice(inv.id)} className="text-xs text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition" title="Delete Invoice">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

export default function InvoicesPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <InvoicesContent />
        </Suspense>
    );
}
