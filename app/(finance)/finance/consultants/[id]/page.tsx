"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { financeDelete, financeGet, financePatch, financePost } from "@/lib/financeClient";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { StatusBadge, MONTHS, btnPrimary, btnSecondary, StepIndicator, Field, inputCls, selectCls, formatDateUS } from "@/components/finance/FinanceUI";
import AutoComplete from "@/components/finance/AutoComplete";
import { apiClient } from "@/lib/apiClient";

const STATUS_OPTIONS = ["ACTIVE", "ENDED"];

const iCls = "w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";



function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h3>
                {action}
            </div>
            {children}
        </div>
    );
}

// ─── Log Hours inline form ────────────────────────────────────────────────────
function LogHoursForm({ consultantId, onLogged }: { consultantId: string; onLogged: () => void }) {
    const now = new Date();
    const [entryMode, setEntryMode] = useState<"MONTHLY" | "WEEKLY" | "SEMI_MONTHLY" | "CUSTOM">("MONTHLY");
    const [form, setForm] = useState({ 
        consultantId, 
        month: now.getMonth() + 1, 
        year: now.getFullYear(), 
        week: "1", 
        hours: "",
        startDate: now.toISOString().slice(0, 10),
        endDate: now.toISOString().slice(0, 10)
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [ok, setOk] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const periodLabel = entryMode === "WEEKLY" ? `Week ${form.week}` 
            : entryMode === "SEMI_MONTHLY" ? (form.week === "6" ? "1rd Half" : "2nd Half") 
            : entryMode === "CUSTOM" ? `${form.startDate} to ${form.endDate}`
            : "the Month";
        
        if (!window.confirm(`Are you sure you want to log ${form.hours} hours for ${periodLabel}?`)) return;
        setSaving(true); setError(""); setOk(false);
        try {
            const payload = {
                ...form,
                month: +form.month,
                year: +form.year,
                hours: +form.hours,
                week: entryMode === "MONTHLY" ? undefined : +form.week,
                startDate: entryMode === "CUSTOM" ? form.startDate : undefined,
                endDate: entryMode === "CUSTOM" ? form.endDate : undefined
            };
            await financePost("finance/hours", payload);
            setOk(true);
            setForm(f => ({...f, hours: ""}));
            onLogged();
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    }

    const handleModeChange = (mode: "MONTHLY" | "WEEKLY" | "SEMI_MONTHLY" | "CUSTOM") => {
        setEntryMode(mode);
        if (mode === "WEEKLY") setForm(f => ({ ...f, week: "1" }));
        if (mode === "SEMI_MONTHLY") setForm(f => ({ ...f, week: "6" }));
        if (mode === "CUSTOM") setForm(f => ({ ...f, week: "8" })); // 8 as discriminator for custom
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit">
                <button type="button" onClick={() => handleModeChange("MONTHLY")} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${entryMode === "MONTHLY" ? "bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>Monthly Total</button>
                <button type="button" onClick={() => handleModeChange("SEMI_MONTHLY")} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${entryMode === "SEMI_MONTHLY" ? "bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>Semi-Monthly (15 Days)</button>
                <button type="button" onClick={() => handleModeChange("WEEKLY")} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${entryMode === "WEEKLY" ? "bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>Weekly Entry</button>
                <button type="button" onClick={() => handleModeChange("CUSTOM")} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${entryMode === "CUSTOM" ? "bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>Custom Range</button>
            </div>

            <div className={`grid gap-3 ${entryMode !== "MONTHLY" ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"}`}>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Month</label>
                    <select className={iCls} value={form.month} onChange={e => setForm(f => ({ ...f, month: +e.target.value }))}>
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Year</label>
                    <input type="number" className={iCls} value={form.year} onChange={e => setForm(f => ({ ...f, year: +e.target.value }))} />
                </div>
                {entryMode === "WEEKLY" && (
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Week</label>
                        <select className={iCls} value={form.week} onChange={e => setForm(f => ({ ...f, week: e.target.value }))}>
                            {[1, 2, 3, 4, 5].map(w => <option key={w} value={w}>Week {w}</option>)}
                        </select>
                    </div>
                )}
                {entryMode === "SEMI_MONTHLY" && (
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Period</label>
                        <select className={iCls} value={form.week} onChange={e => setForm(f => ({ ...f, week: e.target.value }))}>
                            <option value="6">1st Half (1-15)</option>
                            <option value="7">2nd Half (16-End)</option>
                        </select>
                    </div>
                )}
                {entryMode === "CUSTOM" && (
                    <>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                            <input type="date" required className={iCls} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">End Date</label>
                            <input type="date" required className={iCls} value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                        </div>
                    </>
                )}
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Hours</label>
                    <input type="number" step="0.5" required className={iCls} value={form.hours} placeholder={entryMode === "MONTHLY" ? "160" : "80"} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />
                </div>
                <div className="flex items-end gap-2">
                    <button type="submit" disabled={saving} className={`${btnPrimary} w-full`}>{saving ? "Saving…" : "Log"}</button>
                </div>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            {ok && <p className="text-green-600 text-xs">✓ Hours saved!</p>}
        </form>
    );
}

// ─── Create Invoice inline form ───────────────────────────────────────────────
function CreateInvoiceForm({ projects, hours: allHours, onCreated, initialPeriod }: { projects: any[]; hours: any[]; onCreated: () => void; initialPeriod?: any }) {
    const now = new Date();

    // Helper: get bill rate from project's latest contract
    function getBillRate(projectId: string) {
        const p = projects.find((proj: any) => proj.id === projectId);
        const contract = p?.contracts?.[0];
        return contract ? String(Number(contract.billRate)) : "";
    }

    // Helper: get logged hours for a consultant in a given month/year (sum all entries or filter by week)
    // Helper: get logged hours for a consultant in a given month/year
    function getLoggedHours(month: number, year: number, week?: number) {
        if (!allHours?.length) return "";
        
        // Filter by month and year first
        const monthMatches = allHours.filter(h => h.month === month && h.year === year);
        if (monthMatches.length === 0) return "";

        // If a specific period is requested (W1, 1st Half, etc.), find that exact match
        if (week !== undefined && week !== 0) {
            const exact = monthMatches.find(h => h.week === week);
            return exact ? String(Number(exact.hours)) : "";
        }

        // For "Full Month" (week === 0 or undefined):
        // 1. Check if there's an explicit "Full Month" log (no week)
        const fullMonthLog = monthMatches.find(h => !h.week || h.week === 0);
        if (fullMonthLog) return String(Number(fullMonthLog.hours));

        // 2. If no full month log, sum up all specific period logs (weeks/halves/custom)
        const periodLogs = monthMatches.filter(h => h.week && h.week > 0);
        if (periodLogs.length > 0) {
            const sum = periodLogs.reduce((acc, curr) => acc + Number(curr.hours), 0);
            return String(sum);
        }

        return "";
    }

    const defaultProjectId = projects[0]?.id ?? "";
    const defaultMonth = now.getMonth() + 1;
    const defaultYear = now.getFullYear();

    const [form, setForm] = useState({
        projectId: initialPeriod?.projectId ?? defaultProjectId,
        invoiceMonth: initialPeriod?.month ?? defaultMonth,
        invoiceYear: initialPeriod?.year ?? defaultYear,
        invoiceDate: now.toISOString().slice(0, 10),
        hours: initialPeriod?.hours ? String(initialPeriod.hours) : getLoggedHours(initialPeriod?.month ?? defaultMonth, initialPeriod?.year ?? defaultYear, initialPeriod?.week ?? 0),
        billRate: getBillRate(initialPeriod?.projectId ?? defaultProjectId),
        referenceNumber: "", // New: Client Invoice #
        week: initialPeriod?.week ?? 0, // 0 for full month, 1-5 for W1-W5, 6-7 for halves, 8 for custom
    });

    // Reactive Auto-fill: Update hours and billRate whenever selection or data changes
    useEffect(() => {
        const autoHours = getLoggedHours(form.invoiceMonth, form.invoiceYear, form.week === 0 ? undefined : form.week);
        const autoBill = getBillRate(form.projectId);
        
        setForm(f => ({
            ...f,
            hours: autoHours || f.hours,
            billRate: autoBill || f.billRate
        }));
    }, [form.invoiceMonth, form.invoiceYear, form.projectId, form.week, allHours, projects]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [ok, setOk] = useState(false);

    function handleProjectChange(projectId: string) {
        setForm(f => ({ ...f, projectId, billRate: getBillRate(projectId) }));
    }

    function handleMonthChange(month: number) {
        setForm(f => ({ ...f, invoiceMonth: month, hours: getLoggedHours(month, f.invoiceYear) }));
    }

    function handleYearChange(year: number) {
        setForm(f => ({ ...f, invoiceYear: year, hours: getLoggedHours(f.invoiceMonth, year) }));
    }

    const previewTotal = (+form.hours || 0) * (+form.billRate || 0);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true); setError(""); setOk(false);
        try {
            await financePost("finance/invoices", { 
                ...form, 
                invoiceMonth: +form.invoiceMonth, 
                invoiceYear: +form.invoiceYear, 
                hours: +form.hours, 
                billRate: +form.billRate,
                week: form.week === 0 ? undefined : +form.week
            });
            setOk(true);
            onCreated();
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    }

    if (!projects.length) return <p className="text-sm text-gray-400 pt-2">Add a project first before generating an invoice.</p>;

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="col-span-full sm:col-span-1">
                <label className="block text-xs text-gray-500 mb-1">Project</label>
                <select className={iCls} value={form.projectId} onChange={e => handleProjectChange(e.target.value)}>
                    {projects.map((p: any) => <option key={p.id} value={p.id}>{p.clientName ?? "Project"}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Month</label>
                <select className={iCls} value={form.invoiceMonth} onChange={e => handleMonthChange(+e.target.value)}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Year</label>
                <input type="number" className={iCls} value={form.invoiceYear} onChange={e => handleYearChange(+e.target.value)} />
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Period</label>
                <select className={iCls} value={form.week} onChange={e => setForm(f => ({ ...f, week: +e.target.value }))}>
                    <option value="0">Full Month</option>
                    <option value="6">1st Half (1-15)</option>
                    <option value="7">2nd Half (16-End)</option>
                    <option value="8">Custom Range</option>
                    {[1,2,3,4,5].map(w => <option key={w} value={w}>Week {w}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Invoice Date</label>
                <input type="date" required className={iCls} value={form.invoiceDate} onChange={e => setForm(f => ({ ...f, invoiceDate: e.target.value }))} />
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Hours Billed <span className="text-violet-500">(auto-filled)</span></label>
                <input type="number" step="0.5" required className={`${iCls} ${form.hours ? 'ring-1 ring-violet-300' : ''}`} value={form.hours} placeholder="160" onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Bill Rate ($/hr) <span className="text-violet-500">(auto-filled)</span></label>
                <input type="number" step="0.01" required className={`${iCls} ${form.billRate ? 'ring-1 ring-violet-300' : ''}`} value={form.billRate} placeholder="95" onChange={e => setForm(f => ({ ...f, billRate: e.target.value }))} />
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Invoice # <span className="text-gray-400">(optional)</span></label>
                <input type="text" className={iCls} value={form.referenceNumber} placeholder="INV-2024-001" onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} />
            </div>
            <div className="col-span-full flex items-center gap-4">
                <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Generate Invoice"}</button>
                {previewTotal > 0 && <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Total: <span className="text-emerald-600">${previewTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>}
            </div>
            {error && <p className="col-span-full text-red-500 text-xs">{error}</p>}
            {ok && <p className="col-span-full text-green-600 text-xs">✓ Invoice created!</p>}
        </form>
    );
}

// ─── Record Payment inline form ───────────────────────────────────────────────
function RecordPaymentForm({ projects, onRecorded }: { projects: any[]; onRecorded: () => void }) {
    const now = new Date();
    const pendingInvoices = projects.flatMap((p: any) => (p.invoices ?? []).filter((inv: any) => inv.status !== "PAID").map((inv: any) => ({ ...inv, project: p.clientName ?? "Project" })));

    const firstInv = pendingInvoices[0];
    const [form, setForm] = useState({
        invoiceId: firstInv?.id ?? "",
        amountReceived: firstInv ? String(Number(firstInv.totalAmount)) : "",
        paymentDate: now.toISOString().slice(0, 10),
        referenceNumber: ""
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [ok, setOk] = useState(false);

    function handleInvoiceChange(invoiceId: string) {
        const inv = pendingInvoices.find((i: any) => i.id === invoiceId);
        setForm(f => ({
            ...f,
            invoiceId,
            amountReceived: inv ? String(Number(inv.totalAmount)) : "",
        }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true); setError(""); setOk(false);
        try {
            await financePost("finance/payments", { ...form, amountReceived: +form.amountReceived });
            setOk(true);
            onRecorded();
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    }

    if (!pendingInvoices.length) return <p className="text-sm text-gray-400 pt-2">No pending invoices to record payment for.</p>;

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Invoice</label>
                <select className={iCls} value={form.invoiceId} onChange={e => handleInvoiceChange(e.target.value)}>
                    {pendingInvoices.map((inv: any) => (
                        <option key={inv.id} value={inv.id}>{inv.project} — {MONTHS[(inv.invoiceMonth ?? 1) - 1]} {inv.invoiceYear} (${Number(inv.totalAmount).toFixed(0)})</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Amount ($) <span className="text-violet-500">(auto-filled)</span></label>
                <input type="number" step="0.01" required className={`${iCls} ${form.amountReceived ? 'ring-1 ring-violet-300' : ''}`} value={form.amountReceived} placeholder="15000" onChange={e => setForm(f => ({ ...f, amountReceived: e.target.value }))} />
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Payment Date</label>
                <input type="date" required className={iCls} value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} />
            </div>
            <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Reference # (optional)</label>
                <input type="text" className={iCls} value={form.referenceNumber} placeholder="ACH-20260401-001" onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} />
            </div>
            <div className="col-span-2 flex items-end">
                <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : "Record Payment"}</button>
            </div>
            {error && <p className="col-span-full text-red-500 text-xs">{error}</p>}
            {ok && <p className="col-span-full text-green-600 text-xs">✓ Payment recorded!</p>}
        </form>
    );
}

// ─── Add/Edit Contract inline form ───────────────────────────────────────────
function AddContractForm({ projects, onCreated }: { projects: any[]; onCreated: () => void }) {
    // Helper: get the latest contract for a project
    function getExistingContract(projectId: string) {
        const p = projects.find((proj: any) => proj.id === projectId);
        return p?.contracts?.[0] ?? null;
    }

    function buildFormFromProject(projectId: string) {
        const existing = getExistingContract(projectId);
        return {
            projectId,
            billRate: existing ? String(Number(existing.billRate)) : "",
            payRate: existing ? String(Number(existing.payRate)) : "",
            paymentTermsDays: existing ? String(existing.paymentTermsDays) : "30",
            currency: existing?.currency ?? "USD",
            vendorName: existing?.vendorName ?? "",
            invoiceFrequency: existing?.invoiceFrequency ?? "MONTHLY",
        };
    }

    const [form, setForm] = useState(() => buildFormFromProject(projects[0]?.id ?? ""));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [ok, setOk] = useState(false);

    const hasExisting = !!getExistingContract(form.projectId);

    function handleProjectChange(newProjectId: string) {
        setForm(buildFormFromProject(newProjectId));
        setOk(false);
        setError("");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true); setError(""); setOk(false);
        try {
            await financePost("finance/contracts", {
                projectId: form.projectId,
                billRate: +form.billRate,
                payRate: +form.payRate,
                paymentTermsDays: +form.paymentTermsDays,
                currency: form.currency,
                ...(form.vendorName ? { vendorName: form.vendorName } : {}),
                ...(form.invoiceFrequency ? { invoiceFrequency: form.invoiceFrequency } : {}),
            });
            setOk(true);
            onCreated();
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    }

    if (!projects.length) return <p className="text-sm text-gray-400 pt-2">Add a project first before setting rates.</p>;

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="col-span-full sm:col-span-1">
                <label className="block text-xs text-gray-500 mb-1">Project</label>
                <select className={iCls} value={form.projectId} onChange={e => handleProjectChange(e.target.value)}>
                    {projects.map((p: any) => <option key={p.id} value={p.id}>{p.clientName ?? "Project"} ({p.status})</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Bill Rate ($/hr)</label>
                <input type="number" step="0.01" required className={iCls} value={form.billRate} placeholder="95" onChange={e => setForm(f => ({ ...f, billRate: e.target.value }))} />
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Pay Rate ($/hr)</label>
                <input type="number" step="0.01" required className={iCls} value={form.payRate} placeholder="70" onChange={e => setForm(f => ({ ...f, payRate: e.target.value }))} />
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Payment Terms (days)</label>
                <input type="number" required className={iCls} value={form.paymentTermsDays} placeholder="30" onChange={e => setForm(f => ({ ...f, paymentTermsDays: e.target.value }))} />
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Currency</label>
                <input type="text" className={iCls} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} />
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Invoice Frequency</label>
                <select className={iCls} value={form.invoiceFrequency} onChange={e => setForm(f => ({ ...f, invoiceFrequency: e.target.value }))}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="BI_WEEKLY">Bi-Weekly</option>
                    <option value="WEEKLY">Weekly</option>
                </select>
            </div>
            <div>
                <label className="block text-xs text-gray-500 mb-1">Vendor (optional)</label>
                <input type="text" className={iCls} value={form.vendorName} placeholder="Vendor name" onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))} />
            </div>
            <div className="col-span-full flex gap-2 items-center">
                <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : hasExisting ? "Update Rates" : "Set Rates"}</button>
                {hasExisting && <span className="text-xs text-gray-400">ℹ Existing contract found — values pre-filled</span>}
            </div>
            {error && <p className="col-span-full text-red-500 text-xs">{error}</p>}
            {ok && <p className="col-span-full text-green-600 text-xs">✓ Contract saved!</p>}
        </form>
    );
}

const STEPS = ["Consultant Info", "Billing & Rates"];



// ─── Main Detail ──────────────────────────────────────────────────────────────
function ConsultantDetailContent() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editing, setEditing] = useState(false);
    const [editStep, setEditStep] = useState(0);
    const [editForm, setEditForm] = useState<any>({
        name: "", email: "", phone: "", status: "",
        immigrationStatus: "", engagementType: "",
        recruiterId: "", accountManagerId: "", podHeadId: "", jobCode: "",
        c2cVendorName: "", c2cContactPerson: "", c2cContactEmail: "",
        c2cAddress: "", c2cPhoneFax: "", clientPaymentTermsDays: "30", c2cProjectStartDate: ""
    });
    const [billingForm, setBillingForm] = useState<any>({
        clientName: "", endClientName: "", startDate: "", endDate: "",
        billingRate: "", payRate: "", currency: "USD", paymentTermsDays: "30"
    });
    const [duration, setDuration] = useState("ONGOING");
    const [options, setOptions] = useState<{ recruiters: any[], accountManagers: any[], podHeads: any[] }>({ recruiters: [], accountManagers: [], podHeads: [] });

    const [activeMarkPaid, setActiveMarkPaid] = useState<any>(null); // For Invoice
    const [activeMarkPaidPayout, setActiveMarkPaidPayout] = useState<any>(null);
    const [activeEditInvoice, setActiveEditInvoice] = useState<any>(null);
    const [activeEditPayment, setActiveEditPayment] = useState<any>(null);
    const [activeEditPayout, setActiveEditPayout] = useState<any>(null);

    const [modalForm, setModalForm] = useState({
        paymentDate: new Date().toISOString().slice(0, 10),
        referenceNumber: "",
        amount: ""
    });

    async function handleMarkPaid(invoiceId: string) {
        try {
            await financePatch(`finance/invoices/${invoiceId}/mark-paid`, {
                paymentDate: modalForm.paymentDate,
                referenceNumber: modalForm.referenceNumber || "MANUAL_MARK_PAID"
            });
            setActiveMarkPaid(null);
            await load();
        } catch (err: any) { alert(err.message); }
    }

    async function handleMarkPayoutPaidSubmit() {
        if (!activeMarkPaidPayout) return;
        try {
            await financePost("finance/payouts", {
                consultantId: data.id,
                month: activeMarkPaidPayout.month,
                year: activeMarkPaidPayout.year,
                hours: Number(activeMarkPaidPayout.hours),
                payRate: Number(activeMarkPaidPayout.payRate),
                consultantInvoiceDate: activeMarkPaidPayout.consultantInvoiceDate ? new Date(activeMarkPaidPayout.consultantInvoiceDate).toISOString().slice(0, 10) : undefined,
                paymentDate: modalForm.paymentDate,
                referenceNumber: modalForm.referenceNumber || "DIRECT_PAY",
            });
            setActiveMarkPaidPayout(null);
            await load();
        } catch (err: any) { alert(err.message); }
    }

    async function handleUpdateInvoice(e: React.FormEvent) {
        e.preventDefault();
        try {
            await financePatch(`finance/invoices/${activeEditInvoice.id}`, {
                hours: Number(activeEditInvoice.hours),
                billRate: Number(activeEditInvoice.billRate),
                invoiceDate: activeEditInvoice.invoiceDate,
                referenceNumber: activeEditInvoice.referenceNumber
            });
            setActiveEditInvoice(null);
            await load();
        } catch (err: any) { alert(err.message); }
    }

    async function handleUpdatePayment(e: React.FormEvent) {
        e.preventDefault();
        try {
            await financePatch(`finance/payments/${activeEditPayment.id}`, {
                amountReceived: Number(activeEditPayment.amountReceived),
                paymentDate: activeEditPayment.paymentDate,
                referenceNumber: activeEditPayment.referenceNumber
            });
            setActiveEditPayment(null);
            await load();
        } catch (err: any) { alert(err.message); }
    }

    async function handleUpdatePayout(e: React.FormEvent) {
        e.preventDefault();
        try {
            await financePatch(`finance/payouts/${activeEditPayout.id}`, {
                hours: Number(activeEditPayout.hours),
                payRate: Number(activeEditPayout.payRate),
                consultantInvoiceDate: activeEditPayout.consultantInvoiceDate,
                paymentDate: activeEditPayout.paymentDate,
                referenceNumber: activeEditPayout.referenceNumber
            });
            setActiveEditPayout(null);
            await load();
        } catch (err: any) { alert(err.message); }
    }

    function handleStartDateChange(val: string) {
        setBillingForm((f: any) => ({ ...f, startDate: val }));
        if (duration === "3_MONTHS" || duration === "6_MONTHS" || duration === "12_MONTHS") {
            const start = new Date(val || new Date());
            const d = new Date(start);
            if (duration === "3_MONTHS") d.setMonth(d.getMonth() + 3);
            if (duration === "6_MONTHS") d.setMonth(d.getMonth() + 6);
            if (duration === "12_MONTHS") d.setFullYear(d.getFullYear() + 1);
            setBillingForm((f: any) => ({ ...f, endDate: d.toISOString().split("T")[0] }));
        }
    }

    function handleDurationChange(val: string) {
        setDuration(val);
        if (val === "ONGOING") {
            setBillingForm((f: any) => ({ ...f, endDate: "" }));
        } else if (val !== "CUSTOM") {
            const start = billingForm.startDate ? new Date(billingForm.startDate) : new Date();
            const d = new Date(start);
            if (val === "3_MONTHS") d.setMonth(d.getMonth() + 3);
            if (val === "6_MONTHS") d.setMonth(d.getMonth() + 6);
            if (val === "12_MONTHS") d.setFullYear(d.getFullYear() + 1);
            setBillingForm((f: any) => ({ ...f, endDate: d.toISOString().split("T")[0] }));
        }
    }
    useEffect(() => {
        if (searchParams.get("edit") === "true") {
            setEditing(true);
        }
    }, [searchParams]);

    useEffect(() => {
        financeGet("finance/options/staff")
            .then(res => setOptions(res))
            .catch(err => console.error("Failed to fetch staff options", err));
    }, []);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [showLogHours, setShowLogHours] = useState(false);
    const [showInvoice, setShowInvoice] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [showContract, setShowContract] = useState(false);
    const [showLogInvoice, setShowLogInvoice] = useState(false);
    const [showRecordPayout, setShowRecordPayout] = useState(false);
    const [prefillPeriod, setPrefillPeriod] = useState<any>(null);
    const [activeEditHours, setActiveEditHours] = useState<any>(null);
    const topRef = useRef<HTMLDivElement>(null);

    function clearForms() { 
        setShowLogHours(false); setShowInvoice(false); setShowPayment(false); setShowContract(false); 
        setShowLogInvoice(false); setShowRecordPayout(false);
        setPrefillPeriod(null);
        setActiveEditHours(null);
    }

    async function load() {
        setLoading(true); setError("");
        try {
            const res = await financeGet(`finance/consultants/${id}`);
            setData(res);
            setEditForm({
                name: res.name, email: res.email, phone: res.phone ?? "", status: res.status,
                immigrationStatus: res.immigrationStatus ?? "",
                engagementType: res.engagementType ?? "",
                recruiterId: res.recruiterId ?? "",
                accountManagerId: res.accountManagerId ?? "",
                podHeadId: res.podHeadId ?? "",
                c2cVendorName: res.c2cVendorName ?? "",
                c2cContactPerson: res.c2cContactPerson ?? "",
                c2cContactEmail: res.c2cContactEmail ?? "",
                c2cAddress: res.c2cAddress ?? "",
                c2cPhoneFax: res.c2cPhoneFax ?? "",
                clientPaymentTermsDays: (res.clientPaymentTermsDays !== null && res.clientPaymentTermsDays !== undefined) ? String(res.clientPaymentTermsDays) : "30",
                c2cProjectStartDate: res.c2cProjectStartDate ? new Date(res.c2cProjectStartDate).toISOString().slice(0, 10) : ""
            });

            const activeProject = res.projects?.find((p: any) => p.status === "ACTIVE") ?? res.projects?.[0];
            const contract = activeProject?.contracts?.[0];

            setBillingForm({
                clientName: activeProject?.clientName ?? "",
                endClientName: activeProject?.endClientName ?? "",
                startDate: activeProject?.startDate ? new Date(activeProject.startDate).toISOString().slice(0, 10) : "",
                endDate: activeProject?.endDate ? new Date(activeProject.endDate).toISOString().slice(0, 10) : "",
                billingRate: contract ? String(Number(contract.billRate)) : "",
                payRate: contract ? String(Number(contract.payRate)) : "",
                currency: contract?.currency ?? "USD",
                paymentTermsDays: contract?.paymentTermsDays ? String(contract.paymentTermsDays) : "30"
            });
            setDuration(activeProject?.endDate ? "CUSTOM" : "ONGOING");

            // Try to fetch submission if possible - for now we'll just use default/blank or from res if we had it
            // Based on recruiter-submissions service, we don't have a direct "by consultant" search but we can filter by recruiter.
            // For now, we'll keep it as is or pull from a separate call if needed.
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    }

    useEffect(() => { load(); }, [id]);

    async function handleSaveStep1(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true); setSaveError("");
        try {
            const payload = { ...editForm };
            const jobCodeToSubmit = payload.jobCode;
            delete payload.jobCode;
            
            // Clean up engagement fields if not C2C, avoiding empty string validation errors
            if (payload.engagementType !== "C2C") {
                payload.c2cVendorName = null;
                payload.c2cContactPerson = null;
                payload.c2cContactEmail = null;
                payload.c2cAddress = null;
                payload.c2cPhoneFax = null;
                payload.c2cProjectStartDate = null;
            } else {
                if (payload.c2cContactEmail === "") payload.c2cContactEmail = null;
                if (payload.c2cProjectStartDate === "") payload.c2cProjectStartDate = null;
                else payload.c2cProjectStartDate = new Date(payload.c2cProjectStartDate).toISOString();
            }
            
            if (payload.engagementType === "Referral") {
                payload.clientPaymentTermsDays = 0;
            } else if (payload.clientPaymentTermsDays) {
                payload.clientPaymentTermsDays = parseInt(payload.clientPaymentTermsDays, 10);
            } else {
                payload.clientPaymentTermsDays = 0;
            }
            
            // Convert empty strings to null for optional references
            if (payload.podHeadId === "") payload.podHeadId = null;
            if (payload.phone === "") payload.phone = null;
            if (payload.immigrationStatus === "") payload.immigrationStatus = null;
            if (payload.engagementType === "") payload.engagementType = null;

            await financePatch(`finance/consultants/${id}`, payload);

            if (jobCodeToSubmit?.trim()) {
                try {
                    await financePost(`finance/consultants/${id}/job-submission`, {
                        jobCode: jobCodeToSubmit.trim(),
                        candidateCurrentLocation: "N/A",
                        submissionDate: new Date().toISOString()
                    });
                } catch (err) {
                    console.error("Optional job submission failed", err);
                }
            }

            setEditStep(1);
        } catch (err: any) { setSaveError(err.message); }
        finally { setSaving(false); }
    }

    // Helper for apiClient since it might be named differently in this scope or needs import
    // Actually, I should check how apiClient is imported in this file. It's not yet.
    // I'll add it to the imports if needed, but wait, the original file uses financePost.
    // Onboarding used apiClient. I'll stick to what works.

    async function handleSaveStep3(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true); setSaveError("");
        try {
            // Upsert clients to main module if new
            if (billingForm.clientName) {
                await apiClient("clients", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: billingForm.clientName, type: "CLIENT" })
                }).catch(err => console.error("Client upsert failed", err));
            }
            if (billingForm.endClientName) {
                await apiClient("clients", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: billingForm.endClientName, type: "END_CLIENT" })
                }).catch(err => console.error("End client upsert failed", err));
            }

            const activeProject = data.projects?.find((p: any) => p.status === "ACTIVE") ?? data.projects?.[0];
            let projectId = activeProject?.id;

            const projectPayload: any = {
                consultantId: id,
                clientName: billingForm.clientName,
                startDate: new Date(billingForm.startDate).toISOString()
            };
            if (billingForm.endClientName) projectPayload.endClientName = billingForm.endClientName;
            if (billingForm.endDate) projectPayload.endDate = new Date(billingForm.endDate).toISOString();

            if (projectId) {
                await financePatch(`finance/projects/${projectId}`, projectPayload);
            } else {
                const res = await financePost("finance/projects", projectPayload);
                projectId = res.id ?? res.data?.id;
            }

            await financePost("finance/contracts", {
                projectId,
                billRate: parseFloat(billingForm.billingRate),
                payRate: editForm.engagementType === "Referral" ? 0 : parseFloat(billingForm.payRate || "0"),
                currency: billingForm.currency,
                paymentTermsDays: parseInt(billingForm.paymentTermsDays, 10)
            });

            setEditing(false);
            setEditStep(0);
            await load();
        } catch (err: any) { setSaveError(err.message); }
        finally { setSaving(false); }
    }
    async function handleReactivateProject(id: string) {
        try { await financePatch(`finance/projects/${id}/reactivate`, {}); load(); } catch (err) { console.error(err); }
    }

    async function handleUpdateHours(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            await financePatch(`finance/hours/${activeEditHours.id}`, {
                hours: activeEditHours.hours,
                month: activeEditHours.month,
                year: activeEditHours.year,
                startDate: activeEditHours.startDate,
                endDate: activeEditHours.endDate,
                week: activeEditHours.week
            });
            setActiveEditHours(null);
            load();
        } catch (err) {
            console.error("Failed to update hours", err);
        } finally {
            setSaving(false);
        }
    }
    async function handleMarkUnpaid(invoiceId: string) {
        try { await financePatch(`finance/invoices/${invoiceId}/mark-unpaid`, {}); await load(); }
        catch (err: any) { alert(err.message); }
    }

    async function handleEndProject(projectId: string) {
        const today = new Date().toISOString().slice(0, 10);
        try { await financePatch(`finance/projects/${projectId}/end`, { endDate: today }); await load(); }
        catch (err: any) { alert(err.message); }
    }

     async function handleDeleteInvoice(invoiceId: string) {
        if (!window.confirm("Are you sure you want to delete this invoice? This will also disconnect any history for this month. You cannot delete an invoice if payments are already recorded.")) return;
        try {
            await financeDelete(`finance/invoices/${invoiceId}`);
            await load();
        } catch (err: any) {
            alert(err.message);
        }
    }

    async function handleDeletePayment(paymentId: string) {
        if (!window.confirm("Are you sure you want to delete this payment record? This will reduce the 'Amount Collected' for the invoice.")) return;
        try {
            await financeDelete(`finance/payments/${paymentId}`);
            await load();
        } catch (err: any) {
            alert(err.message);
        }
    }

    async function handleDeletePayout(payoutId: string) {
        if (!window.confirm("Are you sure you want to delete this payout/invoice record?")) return;
        try {
            await financeDelete(`finance/payouts/${payoutId}`);
            await load();
        } catch (err: any) {
            alert(err.message);
        }
    }

    async function handleDeleteHours(h: any) {
        const period = h.week === 6 ? "1st Half" : h.week === 7 ? "2nd Half" : h.week === 8 ? "Custom Range" : h.week ? `Week ${h.week}` : "Full Month";
        const label = `${MONTHS[h.month - 1]} ${h.year} (${period})`;
        if (!window.confirm(`Delete these hours for ${label}?\n\nThis will ALSO automatically delete:\n1. Associated Client Invoice (AR)\n2. Associated Consultant Payout (AP)\n\nThis is necessary to keep your books in sync. Continue?`)) return;
        try {
            await financeDelete(`finance/hours/${h.id}`);
            await load();
        } catch (err: any) {
            alert(err.message);
        }
    }

    async function handleRevokePayout(payoutId: string) {
        if (!window.confirm("Move this payout back to PENDING status?")) return;
        try {
            await financePatch(`finance/payouts/${payoutId}/revoke`, {});
            await load();
        } catch (err: any) { alert(err.message); }
    }

    async function handleMarkPayoutPaid(payout: any) {
        setModalForm({
            paymentDate: new Date().toISOString().slice(0, 10),
            referenceNumber: "",
            amount: Number(payout.amount).toString()
        });
        setActiveMarkPaidPayout(payout);
    }

    if (loading) return <div className="p-12 text-center text-gray-400 animate-pulse">Loading…</div>;
    if (error) return <div className="p-12 text-center text-red-500">{error} <button onClick={() => router.back()} className="underline ml-2">Go back</button></div>;
    if (!data) return null;

    const projects: any[] = data.projects ?? [];
    const allInvoices = projects.flatMap((p: any) => (p.invoices ?? []).map((inv: any) => ({ ...inv, projectName: p.clientName ?? "Project" })));
    const allPayments = allInvoices.flatMap((inv: any) => (inv.payments ?? [])
        .map((p: any) => ({ ...p, invoiceMonth: inv.invoiceMonth, invoiceYear: inv.invoiceYear, projectName: inv.projectName })))
        .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    const consultantInvoices = (data.payouts ?? [])
        .sort((a: any, b: any) => (b.year - a.year) || (b.month - a.month) || (b.week - a.week));
    const consultantPayouts = (data.payouts ?? [])
        .filter((p: any) => p.status === 'PAID')
        .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    if (editing) {
        return (
            <>
                <DashboardBreadcrumb title={`Edit ${data.name}`} text={`Finance / Consultants / ${data.name} / Edit`} />
                <div className="max-w-7xl mx-auto px-4 py-8 space-y-8" ref={topRef}>
                    <StepIndicator current={editStep} steps={STEPS} />
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-violet-50 to-white dark:from-violet-900/20 dark:to-gray-800 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm">{editStep + 1}</div>
                                <div>
                                    <h2 className="font-bold text-gray-800 dark:text-white">{STEPS[editStep]}</h2>
                                    <p className="text-xs text-gray-400">Update the consultant&apos;s details in 2 easy steps</p>
                                </div>
                            </div>
                            <button onClick={() => { setEditing(false); setEditStep(0); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            {editStep === 0 && (
                                <form onSubmit={handleSaveStep1} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <Field label="Full Name *">
                                            <input required className={inputCls} value={editForm.name} onChange={(e) => setEditForm((f: any) => ({ ...f, name: e.target.value }))} />
                                        </Field>
                                        <Field label="Email Address *">
                                            <input required type="email" className={inputCls} value={editForm.email} onChange={(e) => setEditForm((f: any) => ({ ...f, email: e.target.value }))} />
                                        </Field>
                                        <Field label="Phone">
                                            <input type="tel" className={inputCls} value={editForm.phone} onChange={(e) => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} />
                                        </Field>
                                        <Field label="Status">
                                            <select className={selectCls} value={editForm.status} onChange={(e) => setEditForm((f: any) => ({ ...f, status: e.target.value }))}>
                                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Immigration Status">
                                            <select className={selectCls} value={editForm.immigrationStatus} onChange={(e) => setEditForm((f: any) => ({ ...f, immigrationStatus: e.target.value }))}>
                                                <option value="">— Select —</option>
                                                {["H1B", "OPT", "GC", "US_CITIZEN", "TN", "CPT"].map((v) => <option key={v} value={v}>{v.replace("_", " ")}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Engagement Type">
                                            <select className={selectCls} value={editForm.engagementType} onChange={(e) => setEditForm((f: any) => ({ ...f, engagementType: e.target.value }))}>
                                                <option value="">— Select —</option>
                                                {["W2", "C2C", "1099", "Referral"].map((v) => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </Field>
                                    </div>
                                    <div className="border-t border-gray-100 dark:border-gray-700 pt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <Field label="Job Code (Optional)" hint="Link to a job submission">
                                            <input className={inputCls} placeholder="e.g. JOB-001" value={editForm.jobCode || ""} onChange={(e) => setEditForm((f: any) => ({ ...f, jobCode: e.target.value }))} />
                                        </Field>
                                        {editForm.engagementType !== "Referral" && (
                                            <Field label="Consultant Payment Terms (Days) *">
                                                <input required type="number" min="0" className={inputCls} value={editForm.clientPaymentTermsDays} onChange={(e) => setEditForm((f: any) => ({ ...f, clientPaymentTermsDays: e.target.value }))} />
                                            </Field>
                                        )}
                                    </div>
                                    <div className="border-t border-gray-100 dark:border-gray-700 pt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        <Field label="Recruiter">
                                            <select className={selectCls} value={editForm.recruiterId} onChange={(e) => setEditForm((f: any) => ({ ...f, recruiterId: e.target.value }))}>
                                                <option value="">— Unassigned —</option>
                                                {options.recruiters.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Account Manager">
                                            <select className={selectCls} value={editForm.accountManagerId} onChange={(e) => setEditForm((f: any) => ({ ...f, accountManagerId: e.target.value }))}>
                                                <option value="">— Unassigned —</option>
                                                {options.accountManagers.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Pod Head">
                                            <select className={selectCls} value={editForm.podHeadId} onChange={(e) => setEditForm((f: any) => ({ ...f, podHeadId: e.target.value }))}>
                                                <option value="">— Unassigned —</option>
                                                {options.podHeads.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                        </Field>
                                    </div>

                                    {editForm.engagementType === "C2C" && (
                                        <div className="border-t border-gray-100 dark:border-gray-700 pt-5 space-y-5">
                                            <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Agency / Vendor Details</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-violet-50/50 dark:bg-violet-900/10 p-4 rounded-xl border border-violet-100 dark:border-violet-900/30">
                                                <Field label="Agency / Vendor Name">
                                                    <input className={inputCls} value={editForm.c2cVendorName} onChange={(e) => setEditForm((f: any) => ({ ...f, c2cVendorName: e.target.value }))} />
                                                </Field>
                                                <Field label="Contact Person">
                                                    <input className={inputCls} value={editForm.c2cContactPerson} onChange={(e) => setEditForm((f: any) => ({ ...f, c2cContactPerson: e.target.value }))} />
                                                </Field>
                                                <Field label="Contact Email">
                                                    <input type="email" className={inputCls} value={editForm.c2cContactEmail} onChange={(e) => setEditForm((f: any) => ({ ...f, c2cContactEmail: e.target.value }))} />
                                                </Field>
                                                <Field label="Phone & Fax">
                                                    <input className={inputCls} placeholder="123-456-7890" value={editForm.c2cPhoneFax} onChange={(e) => setEditForm((f: any) => ({ ...f, c2cPhoneFax: e.target.value }))} />
                                                </Field>
                                                <Field label="Address">
                                                    <input className={inputCls} value={editForm.c2cAddress} onChange={(e) => setEditForm((f: any) => ({ ...f, c2cAddress: e.target.value }))} />
                                                </Field>
                                                <Field label="Vendor Assignment Start Date">
                                                    <input type="date" className={inputCls} value={editForm.c2cProjectStartDate} onChange={(e) => setEditForm((f: any) => ({ ...f, c2cProjectStartDate: e.target.value }))} />
                                                </Field>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-end pt-4">
                                        <button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-8 py-2.5 rounded-xl transition flex items-center gap-2">
                                            {saving ? "Saving…" : <>Next Step <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></>}
                                        </button>
                                    </div>
                                </form>
                            )}
                            {editStep === 1 && (
                                <form onSubmit={handleSaveStep3} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <Field label="Client Name *">
                                            <AutoComplete clientType="CLIENT" value={billingForm.clientName} onChange={(v) => setBillingForm((f: any) => ({ ...f, clientName: v }))} placeholder="Search or type client..." />
                                        </Field>
                                        <Field label="End Client Name">
                                            <AutoComplete clientType="END_CLIENT" value={billingForm.endClientName} onChange={(v) => setBillingForm((f: any) => ({ ...f, endClientName: v }))} placeholder="Search or type end client..." />
                                        </Field>
                                        <Field label="Project Start Date *">
                                            <input required type="date" className={inputCls} value={billingForm.startDate} onChange={(e) => handleStartDateChange(e.target.value)} />
                                        </Field>
                                        <Field label="Project End Date">
                                            <div className="flex flex-col gap-2">
                                                <select className={selectCls} value={duration} onChange={(e) => handleDurationChange(e.target.value)}>
                                                    <option value="ONGOING">Ongoing</option>
                                                    <option value="3_MONTHS">3 Months</option>
                                                    <option value="6_MONTHS">6 Months</option>
                                                    <option value="12_MONTHS">12 Months</option>
                                                    <option value="CUSTOM">Custom Date</option>
                                                </select>
                                                {duration !== "ONGOING" && (
                                                    <input 
                                                        type="date" 
                                                        className={inputCls} 
                                                        value={billingForm.endDate} 
                                                        onChange={(e) => { setDuration("CUSTOM"); setBillingForm((f: any) => ({ ...f, endDate: e.target.value })); }} 
                                                    />
                                                )}
                                            </div>
                                        </Field>
                                        <Field label="Bill Rate ($/hr) *">
                                            <input required type="number" step="0.01" className={inputCls} value={billingForm.billingRate} onChange={(e) => setBillingForm((f: any) => ({ ...f, billingRate: e.target.value }))} />
                                        </Field>
                                        <Field label="Pay Rate ($/hr) *">
                                            <input required disabled={editForm.engagementType === "Referral"} type="number" step="0.01" className={inputCls} value={editForm.engagementType === "Referral" ? "0" : billingForm.payRate} onChange={(e) => setBillingForm((f: any) => ({ ...f, payRate: e.target.value }))} />
                                        </Field>
                                        <Field label="Currency">
                                            <select className={selectCls} value={billingForm.currency} onChange={(e) => setBillingForm((f: any) => ({ ...f, currency: e.target.value }))}>
                                                {["USD"].map((c) => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </Field>
                                        {editForm.engagementType !== "W2" && (
                                            <Field label="Client Payment Terms (Days) *">
                                                <input required type="number" className={inputCls} value={billingForm.paymentTermsDays} onChange={(e) => setBillingForm((f: any) => ({ ...f, paymentTermsDays: e.target.value }))} />
                                            </Field>
                                        )}
                                    </div>
                                    <div className="flex justify-between pt-4">
                                        <button type="button" onClick={() => setEditStep(0)} className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Previous
                                        </button>
                                        <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-2.5 rounded-xl transition flex items-center gap-2">
                                            {saving ? "Saving…" : <>Finish & Save <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></>}
                                        </button>
                                    </div>
                                </form>
                            )}
                            {saveError && <p className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{saveError}</p>}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <DashboardBreadcrumb title={data.name} text={`Finance / Consultants / ${data.name}`} />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" ref={topRef}>
                {/* ── Left: Info Card ─────────────────────────────────── */}
                <div className="xl:col-span-1 space-y-4">
                    <Card title="Consultant Info" action={
                        <button onClick={() => setEditing(true)} className="text-xs text-violet-600 hover:underline">
                            Edit
                        </button>
                    }>
                        <dl className="space-y-3 text-sm">
                            {[
                                { label: "Name", value: data.name },
                                { label: "Email", value: data.email },
                                { label: "Phone", value: data.phone ?? "—" },
                                { label: "Status", value: <StatusBadge status={data.status} /> },
                                { label: "Recruiter", value: data.recruiter?.fullName ?? "—" },
                                { label: "Acct Manager", value: data.accountManager?.fullName ?? "—" },
                                { label: "Pod Head", value: data.podHead?.fullName ?? "—" },
                                { label: "Added", value: formatDateUS(data.createdAt) },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between gap-2">
                                    <dt className="text-gray-400">{label}</dt>
                                    <dd className="font-medium text-gray-700 dark:text-gray-200 text-right">{value as any}</dd>
                                </div>
                            ))}
                        </dl>
                    </Card>

                    {/* Quick Action buttons */}
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { clearForms(); setShowLogHours(v => !v); }}
                            className={`text-xs font-semibold px-3 py-2 rounded-xl border transition ${showLogHours ? "bg-violet-600 text-white border-violet-600" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                            + Log Hours
                        </button>
                        <button onClick={() => { clearForms(); setShowContract(v => !v); }}
                            className={`text-xs font-semibold px-3 py-2 rounded-xl border transition ${showContract ? "bg-emerald-600 text-white border-emerald-600" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                            + Set Rates
                        </button>
                        <button onClick={() => { clearForms(); setShowInvoice(v => !v); }}
                            className={`text-xs font-semibold px-3 py-2 rounded-xl border transition ${showInvoice ? "bg-violet-600 text-white border-violet-600" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                            + Invoice
                        </button>
                        <button onClick={() => { clearForms(); setShowPayment(v => !v); }}
                            className={`text-xs font-semibold px-3 py-2 rounded-xl border transition ${showPayment ? "bg-violet-600 text-white border-violet-600" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                            + Payment
                        </button>
                        <button onClick={() => { clearForms(); setShowLogInvoice(v => !v); }}
                            className={`text-xs font-semibold px-3 py-2 rounded-xl border transition ${showLogInvoice ? "bg-orange-500 text-white border-orange-500" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                            + Log Cnslt Inv
                        </button>
                        <button onClick={() => { clearForms(); setShowRecordPayout(v => !v); }}
                            className={`text-xs font-semibold px-3 py-2 rounded-xl border transition ${showRecordPayout ? "bg-orange-600 text-white border-orange-600" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                            + Pay Consultant
                        </button>
                    </div>
                </div>

                {/* ── Right: Projects, Hours + Inline Forms ───────────── */}
                <div className="xl:col-span-2 space-y-6">

                    {/* Inline forms slide in */}
                    {showLogHours && (
                        <Card title="Log Hours">
                            <LogHoursForm consultantId={id!} onLogged={load} />
                        </Card>
                    )}

                    {showContract && (
                        <Card title="Set Bill / Pay Rates">
                            <AddContractForm projects={projects} onCreated={load} />
                        </Card>
                    )}

                    {showInvoice && (
                        <Card title="Create Invoice">
                            <CreateInvoiceForm projects={projects} hours={data.hours ?? []} initialPeriod={prefillPeriod} onCreated={load} />
                        </Card>
                    )}

                    {showPayment && (
                        <Card title="Record Payment">
                            <RecordPaymentForm projects={projects} onRecorded={load} />
                        </Card>
                    )}

                    {showLogInvoice && (
                        <Card title="Log Consultant Invoice">
                            <LogConsultantInvoiceForm consultantId={id!} hours={data.hours ?? []} projects={projects} initialPeriod={prefillPeriod} onRecorded={load} />
                        </Card>
                    )}

                    {showRecordPayout && (
                        <Card title="Record Payment (Payout)">
                            <RecordPayoutForm consultantId={id!} payouts={data.payouts ?? []} onRecorded={load} />
                        </Card>
                    )}

                    {/* Projects & Contracts */}
                    <Card title="Projects & Rates" action={
                        <Link href={`/finance/projects?consultantId=${id}`} className="text-xs text-violet-600 hover:underline">Manage →</Link>
                    }>
                        {!projects.length ? (
                            <p className="text-gray-400 text-sm">No projects assigned yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {projects.map((p: any) => (
                                    <div key={p.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{p.clientName ?? "Project"}</p>
                                                {p.endClientName && <p className="text-xs text-gray-400">End client: {p.endClientName}</p>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={p.status ?? "ACTIVE"} />
                                                {p.status === "ACTIVE" ? (
                                                    <button onClick={() => handleEndProject(p.id)} className="text-xs text-red-500 hover:underline">End</button>
                                                ) : (
                                                    <button onClick={() => handleReactivateProject(p.id)} className="text-xs text-green-600 hover:underline">Reactivate</button>
                                                )}
                                            </div>
                                        </div>
                                        {(p.contracts && p.contracts.length > 0) ? (
                                            <div className="mt-2 space-y-1">
                                                {/* Only show the latest contract rate to avoid redundancy */}
                                                {[p.contracts[0]].map((c: any) => (
                                                    <div key={c.id} className="flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 text-xs">
                                                        <span className="text-gray-500">Bill: <strong className="text-emerald-600 dark:text-emerald-400">${Number(c.billRate).toFixed(2)}/hr</strong></span>
                                                        <span className="text-gray-500">Pay: <strong className="text-orange-600 dark:text-orange-400">${Number(c.payRate).toFixed(2)}/hr</strong></span>
                                                        <span className="text-gray-500">Margin: <strong className="text-violet-600 dark:text-violet-400">${(Number(c.billRate) - Number(c.payRate)).toFixed(2)}/hr</strong></span>
                                                        <span className="text-gray-400">Net {c.paymentTermsDays}</span>
                                                        <span className="text-gray-400">{c.currency}</span>
                                                        {c.vendorName && <span className="text-gray-400">Vendor: {c.vendorName}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-amber-500 mt-1">⚠ No rates set — click &quot;+ Set Rates&quot; above</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Hours History */}
                    <Card title="Hours History">
                        {!data.hours?.length ? (
                            <p className="text-gray-400 text-sm">No hours logged yet. Use &quot;+ Log Hours&quot; above.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-xs text-gray-400 uppercase">
                                        <tr>
                                            <th className="pb-2">Month</th>
                                            <th className="pb-2">Period</th>
                                            <th className="pb-2">Year</th>
                                            <th className="pb-2 text-right pr-4">Hours</th>
                                            <th className="pb-2 text-center">Client Inv</th>
                                            <th className="pb-2 text-center">Cnslt Inv</th>
                                            <th className="pb-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {data.hours.map((h: any) => {
                                            // A row is "accounted for" ONLY if there's an exact period match (e.g. Week 1 hours -> Week 1 invoice)
                                            const hasInv = allInvoices.some((inv: any) => 
                                                inv.invoiceMonth === h.month && 
                                                inv.invoiceYear === h.year && 
                                                (h.week || 0) === (inv.week || 0)
                                            );
                                            const hasPay = consultantInvoices.some((p: any) => 
                                                p.month === h.month && 
                                                p.year === h.year && 
                                                (h.week || 0) === (p.week || 0)
                                            );
                                            return (
                                                <tr key={h.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition">
                                                    <td className="py-2 text-gray-600 dark:text-gray-300 font-medium">
                                                        {MONTHS[h.month - 1]} 
                                                    </td>
                                                    <td className="py-2">
                                                        {h.week === 8 ? (
                                                            h.startDate && h.endDate ? (
                                                                <span className="text-[10px] text-violet-500 font-medium bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded">
                                                                    {formatDateUS(h.startDate)} - {formatDateUS(h.endDate)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-violet-500 font-medium bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded">Custom Range</span>
                                                            )
                                                        ) : h.week === 6 ? (
                                                            <span className="text-[10px] text-violet-500 font-medium bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded">1st Half (1-15)</span>
                                                        ) : h.week === 7 ? (
                                                            <span className="text-[10px] text-violet-500 font-medium bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded">2nd Half (16-End)</span>
                                                        ) : h.week ? (
                                                            <span className="text-[10px] text-violet-500 font-medium bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded">Week {h.week}</span>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-400 font-medium bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded">Full Month</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 text-gray-600 dark:text-gray-300 text-xs">{h.year}</td>
                                                    <td className="py-2 font-semibold text-gray-800 dark:text-white text-right pr-4">{h.hours}</td>
                                                    <td className="py-2 text-center">
                                                        {hasInv ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30">
                                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> INV
                                                            </span>
                                                        ) : (
                                                            <button 
                                                                onClick={() => { clearForms(); setPrefillPeriod(h); setShowInvoice(true); topRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                                                                className="p-1 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded transition flex mx-auto"
                                                                title="Generate Client Invoice for this period"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="py-2 text-center">
                                                        {hasPay ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-900/30">
                                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> AP
                                                            </span>
                                                        ) : (
                                                            <button 
                                                                onClick={() => { clearForms(); setPrefillPeriod(h); setShowLogInvoice(true); topRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                                                                className="p-1 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded transition flex mx-auto"
                                                                title="Log Consultant Invoice for this period"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="py-2 text-right">
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => setActiveEditHours(h)} className="text-gray-400 hover:text-violet-500 transition-colors" title="Edit Hours">
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                            </button>
                                                            <button onClick={() => handleDeleteHours(h)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete Hours & Sync Books">
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* Client Invoices */}
                    <Card title="1. Client Invoices (AR)">
                        {!allInvoices.length ? (
                            <p className="text-gray-400 text-sm">No invoices yet. Use &quot;+ Invoice&quot; above.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-xs text-gray-400 uppercase">
                                        <tr>
                                            <th className="pb-2">Period</th>
                                            <th className="pb-2">Project</th>
                                            <th className="pb-2 text-right">INVOICE AMT</th>
                                            <th className="pb-2 text-right">PAID</th>
                                            <th className="pb-2 text-right">EXPECTED</th>
                                            <th className="pb-2 pl-4">STATUS</th>
                                            <th className="pb-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {allInvoices.map((inv: any) => (
                                            <tr key={inv.id}>
                                                <td className="py-2 text-gray-600 dark:text-gray-300">
                                                    {MONTHS[(inv.invoiceMonth ?? 1) - 1]} {inv.invoiceYear}
                                                    {inv.week === 6 ? <span className="ml-1 text-[10px] bg-sky-50 text-sky-600 px-1 rounded">1st Half</span>
                                                        : inv.week === 7 ? <span className="ml-1 text-[10px] bg-sky-50 text-sky-600 px-1 rounded">2nd Half</span>
                                                        : inv.week === 8 ? <span className="ml-1 text-[10px] bg-sky-50 text-sky-600 px-1 rounded">Custom</span>
                                                        : inv.week ? <span className="ml-1 text-[10px] bg-sky-50 text-sky-600 px-1 rounded">W{inv.week}</span> : null}
                                                </td>
                                                <td className="py-2 text-gray-500 dark:text-gray-400">{inv.projectName}</td>
                                                <td className="py-2 font-semibold text-gray-800 dark:text-white text-right">${Number(inv.totalAmount).toLocaleString()}</td>
                                                <td className="py-2 font-bold text-emerald-600 text-right">${Number(inv.payments?.reduce((s: any, p: any) => s + Number(p.amountReceived), 0) ?? 0).toLocaleString()}</td>
                                                <td className="py-2 text-gray-400 text-xs text-right">{formatDateUS(inv.expectedPaymentDate)}</td>
                                                <td className="py-2 pl-4"><StatusBadge status={inv.status ?? "PENDING"} /></td>
                                                <td className="py-2 text-right flex items-center justify-end gap-2">
                                                    {inv.status === "PAID" ? (
                                                        <button onClick={() => handleMarkUnpaid(inv.id)} className="text-xs text-orange-500 hover:underline">Revoke Paid</button>
                                                    ) : (
                                                        <button onClick={() => { setActiveMarkPaid(inv); setModalForm({ paymentDate: new Date().toISOString().slice(0, 10), referenceNumber: "", amount: inv.totalAmount.toString() }); }} className="text-xs text-violet-600 hover:underline">Mark Paid</button>
                                                    )}
                                                    <button onClick={() => setActiveEditInvoice(inv)} className="text-gray-400 hover:text-violet-600 p-1" title="Edit Invoice">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleDeleteInvoice(inv.id)} className="text-xs text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition" title="Delete Invoice">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* Client Payments */}
                    <Card title="2. Client Payments (Received)">
                        {!allPayments.length ? (
                            <p className="text-gray-400 text-sm">No payments received yet. Use &quot;+ Payment&quot; above.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-xs text-gray-400 uppercase">
                                        <tr>
                                            <th className="pb-2">Date</th>
                                            <th className="pb-2">Invoice Period</th>
                                            <th className="pb-2">Reference</th>
                                            <th className="pb-2 text-right">AMOUNT RECVD</th>
                                            <th className="pb-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {allPayments.map((p: any) => (
                                            <tr key={p.id}>
                                                <td className="py-2 text-gray-600 dark:text-gray-300 font-medium">{formatDateUS(p.paymentDate)}</td>
                                                <td className="py-2 text-gray-400 text-xs">{MONTHS[p.invoiceMonth - 1]} {p.invoiceYear}</td>
                                                <td className="py-2 text-gray-500 italic text-xs">{p.referenceNumber || "Bank Transfer"}</td>
                                                <td className="py-2 font-bold text-emerald-600 text-right font-mono">${Number(p.amountReceived).toLocaleString()}</td>
                                                <td className="py-2 text-right flex items-center justify-end gap-2">
                                                    <button onClick={() => setActiveEditPayment(p)} className="text-gray-400 hover:text-violet-600 p-1" title="Edit Payment">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleDeletePayment(p.id)} className="text-red-400 hover:text-red-600 transition" title="Delete Payment">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* Consultant Invoices */}
                    <Card title="3. Consultant Invoices (AP)">
                        {!consultantInvoices.length ? (
                            <p className="text-gray-400 text-sm">No consultant invoices recorded yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-xs text-gray-400 uppercase">
                                        <tr>
                                            <th className="pb-2">Period</th>
                                            <th className="pb-2">Hours</th>
                                            <th className="pb-2 text-right">INV AMOUNT</th>
                                            <th className="pb-2 text-right">CNSLT INV DATE</th>
                                            <th className="pb-2 text-right pr-4">STATUS</th>
                                            <th className="pb-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {consultantInvoices.map((inv: any) => (
                                            <tr key={inv.id}>
                                                <td className="py-2 text-gray-600 dark:text-gray-300 font-medium">
                                                    {MONTHS[inv.month - 1]} {inv.year}
                                                    {inv.week === 6 ? <span className="ml-1 text-[10px] bg-sky-50 text-sky-600 px-1 rounded">1st Half</span>
                                                        : inv.week === 7 ? <span className="ml-1 text-[10px] bg-sky-50 text-sky-600 px-1 rounded">2nd Half</span>
                                                        : inv.week === 8 ? <span className="ml-1 text-[10px] bg-sky-50 text-sky-600 px-1 rounded">Custom</span>
                                                        : inv.week ? <span className="ml-1 text-[10px] bg-sky-50 text-sky-600 px-1 rounded">W{inv.week}</span> : null}
                                                </td>
                                                <td className="py-2 text-gray-400 text-xs font-mono">{Number(inv.hours)}h</td>
                                                <td className="py-2 font-bold text-orange-600 text-right">${Number(inv.amount).toLocaleString()}</td>
                                                <td className="py-2 text-gray-400 text-xs text-right italic">{inv.consultantInvoiceDate ? formatDateUS(inv.consultantInvoiceDate) : "—"}</td>
                                                <td className="py-2 text-right pr-4"><StatusBadge status={inv.status ?? "PENDING"} /></td>
                                                <td className="py-2 text-right flex items-center justify-end gap-2">
                                                    {inv.status === "PAID" ? (
                                                        <button onClick={() => handleRevokePayout(inv.id)} className="text-xs text-orange-500 hover:underline">Revoke</button>
                                                    ) : (
                                                        <button onClick={() => handleMarkPayoutPaid(inv)} className="text-xs text-violet-600 hover:underline">Mark Paid</button>
                                                    )}
                                                    <button onClick={() => setActiveEditPayout(inv)} className="text-gray-400 hover:text-violet-600 p-1" title="Edit Payout">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleDeletePayout(inv.id)} className="text-xs text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition" title="Delete record">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* Consultant Payouts */}
                    <Card title="4. Consultant Payouts (Processed)">
                        {!consultantPayouts.length ? (
                            <p className="text-gray-400 text-sm">No payouts processed yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-xs text-gray-400 uppercase">
                                        <tr>
                                            <th className="pb-2">Date</th>
                                            <th className="pb-2">Invoice Period</th>
                                            <th className="pb-2">Reference</th>
                                            <th className="pb-2 text-right pr-4">AMOUNT PAID</th>
                                            <th className="pb-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {consultantPayouts.map((p: any) => (
                                            <tr key={p.id}>
                                                <td className="py-2 text-emerald-600 dark:text-emerald-400 font-semibold">{formatDateUS(p.paymentDate)}</td>
                                                <td className="py-2 text-gray-600 dark:text-gray-300">
                                                    {MONTHS[p.month - 1]} {p.year}
                                                    {p.week === 6 ? <span className="ml-1 text-[10px] bg-sky-50 text-sky-600 px-1 rounded">1st Half</span>
                                                        : p.week === 7 ? <span className="ml-1 text-[10px] bg-sky-50 text-sky-600 px-1 rounded">2nd Half</span>
                                                        : p.week === 8 ? <span className="ml-1 text-[10px] bg-sky-50 text-sky-600 px-1 rounded">Custom</span>
                                                        : p.week ? <span className="ml-1 text-[10px] bg-sky-50 text-sky-600 px-1 rounded">W{p.week}</span> : null}
                                                </td>
                                                <td className="py-2 text-gray-500 font-mono text-xs">{p.referenceNumber || "—"}</td>
                                                <td className="py-2 font-bold text-gray-800 dark:text-gray-100 text-right pr-4 font-mono">${Number(p.amount).toLocaleString()}</td>
                                                <td className="py-2 text-right">
                                                    <button onClick={() => handleRevokePayout(p.id)} className="text-gray-400 hover:text-orange-500 p-1 rounded hover:bg-orange-50 transition" title="Revoke Payment (Return to Pending)">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>

                {/* ── Monthly Financial Timeline ──────────────────────────────────── */}
                <div className="xl:col-span-3 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden mt-6">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900/40 dark:to-gray-800 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                                <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white text-sm">Monthly Financial Timeline</h3>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Pay-In vs Pay-Out Deadlines</p>
                            </div>
                        </div>
                    </div>
                    {(!data.months || data.months.length === 0) ? (
                        <div className="p-12 text-center text-gray-400 text-sm">No activity recorded for this consultant yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50/50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 uppercase text-[10px] font-bold tracking-widest border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Period & Hours</th>
                                        <th className="px-4 py-3 text-left">Client AR & Pay-In</th>
                                        <th className="px-4 py-3 text-left">Cnslt AP & Pay-Out</th>
                                        <th className="px-4 py-3 text-right">Net Margin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {data.months.map((m: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition">
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-gray-800 dark:text-gray-100">
                                                    {MONTHS[m.month - 1]} {m.year}
                                                    {m.week && (
                                                        <span className="ml-2 text-[10px] bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded uppercase font-bold">
                                                            {m.week === 6 ? "1st Half" : m.week === 7 ? "2nd Half" : m.week === 8 ? "Custom" : `W${m.week}`}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-violet-500 font-medium">{m.hours} hrs @ ${data.rates?.bill}/hr</div>
                                            </td>
                                            <td className="px-4 py-4 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <StatusBadge status={m.invoiceStatus || "PENDING"} />
                                                    <span className="font-semibold text-emerald-600">${m.revenue.toLocaleString()}</span>
                                                </div>
                                                <div className="text-[10px] flex flex-col">
                                                    <span className="text-gray-400">Expected Pay-In from Client:</span>
                                                    <span className={`font-medium ${m.isOverdue ? "text-red-500 animate-pulse" : "text-gray-600 dark:text-gray-400"}`}>
                                                        {m.expectedPaymentDate ? formatDateUS(m.expectedPaymentDate) : "No Invoice"}
                                                        {m.isOverdue && " — OVERDUE"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <StatusBadge status={m.consultantPaid ? "PAID" : (m.consultantInvoiceDate ? "PENDING" : "DUE")} />
                                                    <span className="font-semibold text-orange-500">${m.cost.toLocaleString()}</span>
                                                </div>
                                                <div className="text-[10px] flex flex-col gap-0.5">
                                                    {m.consultantPaid ? (
                                                        <>
                                                            <span className="text-gray-400">Paid on: <strong className="text-emerald-600 font-mono">{m.payoutDate}</strong></span>
                                                            <span className="text-gray-400 italic">Inv: {m.consultantInvoiceDate || "—"}</span>
                                                        </>
                                                    ) : m.consultantInvoiceDate ? (
                                                        <>
                                                            <span className="text-orange-600 font-bold bg-orange-50 dark:bg-orange-900/20 px-1 py-0.5 rounded w-fit">INVOICED: {m.consultantInvoiceDate}</span>
                                                            <span className="text-gray-400">Due by: <strong className={m.isConsultantDueOverdue ? "text-red-500 underline" : "text-gray-600 dark:text-gray-400"}>{m.consultantDueDate}</strong></span>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-400 italic font-medium">Waiting for Cnslt Invoice</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="font-bold text-emerald-600">${m.margin.toLocaleString()}</div>
                                                <div className="text-[10px] text-gray-400">{m.marginPerc.toFixed(1)}% Margin</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4">
                <Link href="/finance/consultants" className="text-sm text-gray-400 hover:text-violet-600 hover:underline">← Back to Consultants</Link>
            </div>

            {activeMarkPaid && (
                <Modal title="Mark Invoice as Paid" onClose={() => setActiveMarkPaid(null)}>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">Record a payment for this invoice. This will automatically update the invoice status to PAID.</p>
                        <Field label="Payment Date">
                            <input type="date" className={inputCls} value={modalForm.paymentDate} onChange={e => setModalForm(f => ({ ...f, paymentDate: e.target.value }))} />
                        </Field>
                        <Field label="Reference Number (Check # / ACH)">
                            <input type="text" className={inputCls} placeholder="e.g. ACH-9982" value={modalForm.referenceNumber} onChange={e => setModalForm(f => ({ ...f, referenceNumber: e.target.value }))} />
                        </Field>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button onClick={() => setActiveMarkPaid(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600">Cancel</button>
                            <button onClick={() => handleMarkPaid(activeMarkPaid.id)} className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-violet-100 dark:shadow-none transition hover:bg-violet-700">Confirm Payment</button>
                        </div>
                    </div>
                </Modal>
            )}

            {activeMarkPaidPayout && (
                <Modal title="Mark Consultant Payout as Paid" onClose={() => setActiveMarkPaidPayout(null)}>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">Confirm payment of <strong>${Number(activeMarkPaidPayout.amount).toLocaleString()}</strong> to the consultant.</p>
                        <Field label="Payment Date">
                            <input type="date" className={inputCls} value={modalForm.paymentDate} onChange={e => setModalForm(f => ({ ...f, paymentDate: e.target.value }))} />
                        </Field>
                        <Field label="Reference Number (Check # / ACH / Ref)">
                            <input type="text" className={inputCls} placeholder="e.g. Bank Transfer" value={modalForm.referenceNumber} onChange={e => setModalForm(f => ({ ...f, referenceNumber: e.target.value }))} />
                        </Field>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button onClick={() => setActiveMarkPaidPayout(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600">Cancel</button>
                            <button onClick={handleMarkPayoutPaidSubmit} className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-100 dark:shadow-none transition hover:bg-emerald-700">Confirm Payment</button>
                        </div>
                    </div>
                </Modal>
            )}

            {activeEditInvoice && (
                <Modal title="Edit Invoice Details" onClose={() => setActiveEditInvoice(null)}>
                    <form onSubmit={handleUpdateInvoice} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Hours Worked">
                                <input type="number" step="0.5" className={inputCls} value={activeEditInvoice.hours} onChange={e => setActiveEditInvoice({ ...activeEditInvoice, hours: e.target.value })} />
                            </Field>
                            <Field label="Bill Rate ($/hr)">
                                <input type="number" step="0.01" className={inputCls} value={activeEditInvoice.billRate} onChange={e => setActiveEditInvoice({ ...activeEditInvoice, billRate: e.target.value })} />
                            </Field>
                        </div>
                        <Field label="Invoice Date">
                            <input type="date" className={inputCls} value={activeEditInvoice.invoiceDate?.slice(0, 10)} onChange={e => setActiveEditInvoice({ ...activeEditInvoice, invoiceDate: e.target.value })} />
                        </Field>
                        <Field label="Reference / Invoice #">
                            <input type="text" className={inputCls} value={activeEditInvoice.referenceNumber || ""} onChange={e => setActiveEditInvoice({ ...activeEditInvoice, referenceNumber: e.target.value })} />
                        </Field>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button type="button" onClick={() => setActiveEditInvoice(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600">Cancel</button>
                            <button type="submit" className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg transition hover:bg-violet-700">Save Changes</button>
                        </div>
                    </form>
                </Modal>
            )}

            {activeEditPayment && (
                <Modal title="Edit Payment Record" onClose={() => setActiveEditPayment(null)}>
                    <form onSubmit={handleUpdatePayment} className="space-y-4">
                        <Field label="Amount Received ($)">
                            <input type="number" step="0.01" className={inputCls} value={activeEditPayment.amountReceived} onChange={e => setActiveEditPayment({ ...activeEditPayment, amountReceived: e.target.value })} />
                        </Field>
                        <Field label="Payment Date">
                            <input type="date" className={inputCls} value={activeEditPayment.paymentDate?.slice(0, 10)} onChange={e => setActiveEditPayment({ ...activeEditPayment, paymentDate: e.target.value })} />
                        </Field>
                        <Field label="Reference #">
                            <input type="text" className={inputCls} value={activeEditPayment.referenceNumber || ""} onChange={e => setActiveEditPayment({ ...activeEditPayment, referenceNumber: e.target.value })} />
                        </Field>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button type="button" onClick={() => setActiveEditPayment(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600">Cancel</button>
                            <button type="submit" className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg transition hover:bg-violet-700">Save Changes</button>
                        </div>
                    </form>
                </Modal>
            )}

            {activeEditPayout && (
                <Modal title="Edit Consultant Payout/AP" onClose={() => setActiveEditPayout(null)}>
                    <form onSubmit={handleUpdatePayout} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Hours">
                                <input type="number" step="0.5" className={inputCls} value={activeEditPayout.hours} onChange={e => setActiveEditPayout({ ...activeEditPayout, hours: e.target.value })} />
                            </Field>
                            <Field label="Pay Rate ($/hr)">
                                <input type="number" step="0.01" className={inputCls} value={activeEditPayout.payRate} onChange={e => setActiveEditPayout({ ...activeEditPayout, payRate: e.target.value })} />
                            </Field>
                        </div>
                        <Field label="Consultant Invoice Date">
                            <input type="date" className={inputCls} value={activeEditPayout.consultantInvoiceDate?.slice(0, 10) || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setActiveEditPayout({ ...activeEditPayout, consultantInvoiceDate: e.target.value })} />
                        </Field>
                        <Field label="Payment Date (if paid)">
                            <input type="date" className={inputCls} value={activeEditPayout.paymentDate?.slice(0, 10) || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setActiveEditPayout({ ...activeEditPayout, paymentDate: e.target.value })} />
                        </Field>
                        <Field label="Reference / Payment #">
                            <input type="text" className={inputCls} value={activeEditPayout.referenceNumber || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setActiveEditPayout({ ...activeEditPayout, referenceNumber: e.target.value })} />
                        </Field>
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button type="button" onClick={() => setActiveEditPayout(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600">Cancel</button>
                            <button type="submit" className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg transition hover:bg-violet-700">Save Changes</button>
                        </div>
                    </form>
                </Modal>
            )}

            {activeEditHours && (
                <Modal title="Edit Hours Log" onClose={() => setActiveEditHours(null)}>
                    <form onSubmit={handleUpdateHours} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Month">
                                <select className={selectCls} value={activeEditHours.month} onChange={e => setActiveEditHours({ ...activeEditHours, month: e.target.value })}>
                                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                                </select>
                            </Field>
                            <Field label="Year">
                                <input type="number" className={inputCls} value={activeEditHours.year} onChange={e => setActiveEditHours({ ...activeEditHours, year: e.target.value })} />
                            </Field>
                        </div>
                        <Field label="Hours Worked">
                            <input type="number" step="0.5" className={inputCls} value={activeEditHours.hours} onChange={e => setActiveEditHours({ ...activeEditHours, hours: e.target.value })} />
                        </Field>
                        {activeEditHours.week === 8 && (
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Start Date">
                                    <input type="date" className={inputCls} value={activeEditHours.startDate?.slice(0, 10)} onChange={e => setActiveEditHours({ ...activeEditHours, startDate: e.target.value })} />
                                </Field>
                                <Field label="End Date">
                                    <input type="date" className={inputCls} value={activeEditHours.endDate?.slice(0, 10)} onChange={e => setActiveEditHours({ ...activeEditHours, endDate: e.target.value })} />
                                </Field>
                            </div>
                        )}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button type="button" onClick={() => setActiveEditHours(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600">Cancel</button>
                            <button type="submit" disabled={saving} className="bg-violet-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg transition hover:bg-violet-700">
                                {saving ? "Saving…" : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}

// ─── Step 1: Log Consultant Invoice ──────────────────────────────────────────────
function LogConsultantInvoiceForm({ consultantId, hours, projects, onRecorded, initialPeriod }: { consultantId: string; hours: any[]; projects: any[]; onRecorded: () => void; initialPeriod?: any }) {
    const now = new Date();
    const [form, setForm] = useState({
        month: initialPeriod?.month ?? now.getMonth() + 1,
        year: initialPeriod?.year ?? now.getFullYear(),
        hours: initialPeriod?.hours ? String(initialPeriod.hours) : "",
        payRate: "",
        consultantInvoiceDate: now.toISOString().slice(0, 10),
        referenceNumber: "", // New: Consultant Invoice #
        week: initialPeriod?.week ?? 0, // 0 for full month, 1-5 for W1-W5, 6-7 for halves, 8 for custom
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [ok, setOk] = useState(false);

    // Auto-fill hours & pay rate based on month/year/week
    useEffect(() => {
        // Use the same smart summation logic as CreateInvoiceForm
        const getSum = () => {
            const m = +form.month;
            const y = +form.year;
            const w = +form.week;
            const monthMatches = hours.filter(h => h.month === m && h.year === y);
            if (!monthMatches.length) return "";

            if (w !== 0) {
                const exact = monthMatches.find(h => h.week === w);
                return exact ? String(Number(exact.hours)) : "";
            }

            const fullMonthLog = monthMatches.find(h => !h.week || h.week === 0);
            if (fullMonthLog) return String(Number(fullMonthLog.hours));

            const periodLogs = monthMatches.filter(h => h.week && h.week > 0);
            return periodLogs.length ? String(periodLogs.reduce((acc, curr) => acc + Number(curr.hours), 0)) : "";
        };

        const autoHours = getSum();
        let autoPayRate = "";
        if (projects.length > 0) {
            const project = projects.find((p: any) => p.status === "ACTIVE") || projects[0];
            const contract = project?.contracts?.sort((a: any, b: any) => b.id - a.id)?.[0];
            if (contract) autoPayRate = Number(contract.payRate).toString();
        }
        setForm(f => ({ ...f, hours: autoHours, payRate: autoPayRate }));
    }, [form.month, form.year, form.week, hours, projects]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true); setError(""); setOk(false);
        try {
            await financePost("finance/payouts", {
                consultantId,
                month: +form.month,
                year: +form.year,
                hours: +form.hours,
                payRate: +form.payRate,
                consultantInvoiceDate: form.consultantInvoiceDate,
                referenceNumber: form.referenceNumber || undefined,
                week: form.week === 0 ? undefined : +form.week,
                // paymentDate is left out purposely to mark as PENDING
            });
            setOk(true);
            setTimeout(() => setOk(false), 3000);
            onRecorded();
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    }

    const tTotal = (Number(form.hours || 0) * Number(form.payRate || 0));

    return (
        <form onSubmit={handleSave} className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border border-orange-100 dark:border-orange-900/20">
            <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1">Month</label>
                <select required value={form.month} onChange={(e) => setForm(f => ({ ...f, month: +e.target.value }))} className={iCls}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1">Year</label>
                <input required type="number" value={form.year} onChange={(e) => setForm(f => ({ ...f, year: +e.target.value }))} className={iCls} />
            </div>
            <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1">Period</label>
                <select required value={form.week} onChange={(e) => setForm(f => ({ ...f, week: +e.target.value }))} className={iCls}>
                    <option value="0">Full Month</option>
                    <option value="6">1st Half (1-15)</option>
                    <option value="7">2nd Half (16-End)</option>
                    <option value="8">Custom Range</option>
                    {[1,2,3,4,5].map(w => <option key={w} value={w}>Week {w}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-[10px] font-bold text-orange-600 uppercase tracking-tight mb-1 flex items-center justify-between">
                    <span>Pay Rate</span>
                    <span className="text-[8px] bg-orange-50 text-orange-400 px-1 rounded italic">auto</span>
                </label>
                <input required type="number" step="0.01" value={form.payRate} onChange={(e) => setForm(f => ({ ...f, payRate: e.target.value }))}
                    className="w-full border-2 border-orange-100 dark:border-orange-900/50 rounded-xl px-3 py-2 text-sm bg-orange-50/10 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
                <label className="block text-[10px] font-bold text-orange-600 uppercase tracking-tight mb-1 flex items-center justify-between">
                    <span>Hours Logged</span>
                    <span className="text-[8px] bg-orange-50 text-orange-400 px-1 rounded italic">auto</span>
                </label>
                <input required type="number" step="0.5" value={form.hours} onChange={(e) => setForm(f => ({ ...f, hours: e.target.value }))}
                    className="w-full border-2 border-orange-100 dark:border-orange-900/50 rounded-xl px-3 py-2 text-sm bg-orange-50/10 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight mb-1">Consultant Invoice Received Date</label>
                <input required type="date" value={form.consultantInvoiceDate} onChange={(e) => setForm(f => ({ ...f, consultantInvoiceDate: e.target.value }))} className={iCls} />
            </div>
            <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight mb-1">Consultant Invoice # <span className="text-gray-400">(optional)</span></label>
                <input type="text" value={form.referenceNumber} onChange={(e) => setForm(f => ({ ...f, referenceNumber: e.target.value }))} className={iCls} placeholder="CONS-12345" />
            </div>
            <div className="col-span-2 flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                <p className="text-gray-500 text-xs font-medium">Invoice Total: <strong className="text-orange-600 font-bold">${tTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></p>
                <button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-xs transition uppercase tracking-wider">
                    {saving ? "Logging…" : "Log Invoice"}
                </button>
            </div>
            {error && <p className="col-span-full text-red-500 text-[10px] font-medium mt-1">{error}</p>}
            {ok && <p className="col-span-full text-green-600 text-[10px] font-bold mt-1">✓ Invoice logged! Status set to PENDING.</p>}
        </form>
    );
}

// ─── Step 2: Record Payout / Payment ──────────────────────────────────────────────
function RecordPayoutForm({ consultantId, payouts, onRecorded }: { consultantId: string, payouts: any[], onRecorded: () => void }) {
    const now = new Date();
    
    // Filter for payouts that are not yet fully paid (PENDING)
    const pendingPayouts = payouts.filter(p => p.status === "PENDING" || !p.paymentDate);

    const [form, setForm] = useState({
        payoutId: pendingPayouts[0]?.id || "",
        paymentDate: now.toISOString().slice(0, 10),
        referenceNumber: ""
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [ok, setOk] = useState(false);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        const selected = payouts.find(p => p.id === form.payoutId);
        if (!selected) {
            setError("Please select a valid invoice/period to pay.");
            return;
        }

        setSaving(true); setError(""); setOk(false);
        try {
            await financePost("finance/payouts", {
                consultantId,
                month: selected.month,
                year: selected.year,
                hours: Number(selected.hours),
                payRate: Number(selected.payRate),
                consultantInvoiceDate: selected.consultantInvoiceDate ? new Date(selected.consultantInvoiceDate).toISOString().slice(0, 10) : undefined,
                paymentDate: form.paymentDate,
                referenceNumber: form.referenceNumber || undefined,
                week: selected.week, // preserve the period
            });
            setOk(true);
            setTimeout(() => setOk(false), 3000);
            onRecorded();
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    }

    if (!pendingPayouts.length) {
        return (
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 p-4 rounded-xl text-center">
                <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">All logged invoices have been paid! No pending payouts to record.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSave} className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
            <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1">Select Pending Invoice/Period</label>
                <select required value={form.payoutId} onChange={(e) => setForm(f => ({ ...f, payoutId: e.target.value }))} className={iCls}>
                    {pendingPayouts.map(p => (
                        <option key={p.id} value={p.id}>
                            {MONTHS[p.month - 1]} {p.year} 
                            {p.week === 6 ? " (1st Half)" : p.week === 7 ? " (2nd Half)" : p.week === 8 ? " (Custom)" : p.week ? ` (W${p.week})` : ""}
                            — ${Number(p.amount).toLocaleString()} ({Number(p.hours)}h)
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight mb-1">Payment Date</label>
                <input required type="date" value={form.paymentDate} onChange={(e) => setForm(f => ({ ...f, paymentDate: e.target.value }))} className={iCls} />
            </div>
            <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-tight mb-1">Reference #</label>
                <input type="text" placeholder="Check/ACH/Ref" value={form.referenceNumber} onChange={(e) => setForm(f => ({ ...f, referenceNumber: e.target.value }))} className={iCls} />
            </div>
            <div className="col-span-full flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition uppercase tracking-widest shadow-lg shadow-emerald-200 dark:shadow-none">
                    {saving ? "Recording..." : "Mark as PAID"}
                </button>
            </div>
            {error && <p className="col-span-full text-red-500 text-[10px] font-medium mt-1">{error}</p>}
            {ok && <p className="col-span-full text-emerald-600 text-[10px] font-bold mt-1">✓ Payment recorded. Status set to PAID!</p>}
        </form>
    );
}

function Modal({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
                    <h3 className="font-bold text-gray-800 dark:text-white uppercase tracking-wider text-sm">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function ConsultantDetailPage() {
    return (
        <ConsultantDetailContent />
    );
}
