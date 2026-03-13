"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { financeGet, financePatch, financePost } from "@/lib/financeClient";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { StatusBadge, MONTHS, btnPrimary, btnSecondary, StepIndicator, Field, inputCls, selectCls } from "@/components/finance/FinanceUI";
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
    const [entryMode, setEntryMode] = useState<"MONTHLY" | "WEEKLY">("MONTHLY");
    const [form, setForm] = useState({ consultantId, month: now.getMonth() + 1, year: now.getFullYear(), week: "1", hours: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [ok, setOk] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!window.confirm(`Are you sure you want to log ${form.hours} hours?`)) return;
        setSaving(true); setError(""); setOk(false);
        try {
            const payload = {
                ...form,
                month: +form.month,
                year: +form.year,
                hours: +form.hours,
                week: entryMode === "WEEKLY" ? +form.week : undefined
            };
            await financePost("finance/hours", payload);
            setOk(true);
            setForm(f => ({...f, hours: ""}));
            onLogged();
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl w-fit">
                <button type="button" onClick={() => setEntryMode("MONTHLY")} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${entryMode === "MONTHLY" ? "bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>Monthly Total</button>
                <button type="button" onClick={() => setEntryMode("WEEKLY")} className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${entryMode === "WEEKLY" ? "bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>Weekly Entry</button>
            </div>

            <div className={`grid gap-3 ${entryMode === "WEEKLY" ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"}`}>
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
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Hours</label>
                    <input type="number" step="0.5" required className={iCls} value={form.hours} placeholder={entryMode === "WEEKLY" ? "40" : "160"} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />
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
function CreateInvoiceForm({ projects, hours: allHours, onCreated }: { projects: any[]; hours: any[]; onCreated: () => void }) {
    const now = new Date();

    // Helper: get bill rate from project's latest contract
    function getBillRate(projectId: string) {
        const p = projects.find((proj: any) => proj.id === projectId);
        const contract = p?.contracts?.[0];
        return contract ? String(Number(contract.billRate)) : "";
    }

    // Helper: get logged hours for a consultant in a given month/year
    function getLoggedHours(month: number, year: number) {
        const entry = allHours?.find((h: any) => h.month === month && h.year === year);
        return entry ? String(Number(entry.hours)) : "";
    }

    const defaultProjectId = projects[0]?.id ?? "";
    const defaultMonth = now.getMonth() + 1;
    const defaultYear = now.getFullYear();

    const [form, setForm] = useState({
        projectId: defaultProjectId,
        invoiceMonth: defaultMonth,
        invoiceYear: defaultYear,
        invoiceDate: now.toISOString().slice(0, 10),
        hours: getLoggedHours(defaultMonth, defaultYear),
        billRate: getBillRate(defaultProjectId),
    });
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
            await financePost("finance/invoices", { ...form, invoiceMonth: +form.invoiceMonth, invoiceYear: +form.invoiceYear, hours: +form.hours, billRate: +form.billRate });
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

    function clearForms() { 
        setShowLogHours(false); setShowInvoice(false); setShowPayment(false); setShowContract(false); 
        setShowLogInvoice(false); setShowRecordPayout(false);
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
                clientPaymentTermsDays: res.clientPaymentTermsDays ? String(res.clientPaymentTermsDays) : "30",
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
            
            if (payload.clientPaymentTermsDays) payload.clientPaymentTermsDays = parseInt(payload.clientPaymentTermsDays, 10);
            else payload.clientPaymentTermsDays = 0;
            
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
                payRate: parseFloat(billingForm.payRate),
                currency: billingForm.currency,
                paymentTermsDays: parseInt(billingForm.paymentTermsDays, 10)
            });

            setEditing(false);
            setEditStep(0);
            await load();
        } catch (err: any) { setSaveError(err.message); }
        finally { setSaving(false); }
    }

    async function handleMarkPaid(invoiceId: string) {
        try { await financePatch(`finance/invoices/${invoiceId}/mark-paid`, {}); await load(); }
        catch (err: any) { alert(err.message); }
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

    async function handleReactivateProject(projectId: string) {
        try { await financePatch(`finance/projects/${projectId}/reactivate`, {}); await load(); }
        catch (err: any) { alert(err.message); }
    }

    if (loading) return <div className="p-12 text-center text-gray-400 animate-pulse">Loading…</div>;
    if (error) return <div className="p-12 text-center text-red-500">{error} <button onClick={() => router.back()} className="underline ml-2">Go back</button></div>;
    if (!data) return null;

    const projects: any[] = data.projects ?? [];
    const allInvoices = projects.flatMap((p: any) => (p.invoices ?? []).map((inv: any) => ({ ...inv, projectName: p.clientName ?? "Project" })));

    if (editing) {
        return (
            <>
                <DashboardBreadcrumb title={`Edit ${data.name}`} text={`Finance / Consultants / ${data.name} / Edit`} />
                <div className="max-w-3xl mx-auto py-4">
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
                                                {["W2", "C2C", "1099"].map((v) => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </Field>
                                    </div>
                                    <div className="border-t border-gray-100 dark:border-gray-700 pt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <Field label="Job Code (Optional)" hint="Link to a job submission">
                                            <input className={inputCls} placeholder="e.g. JOB-001" value={editForm.jobCode || ""} onChange={(e) => setEditForm((f: any) => ({ ...f, jobCode: e.target.value }))} />
                                        </Field>
                                        <Field label="Client Payment Terms (Days) *">
                                            <input required type="number" min="0" className={inputCls} value={editForm.clientPaymentTermsDays} onChange={(e) => setEditForm((f: any) => ({ ...f, clientPaymentTermsDays: e.target.value }))} />
                                        </Field>
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
                                            <input required type="number" step="0.01" className={inputCls} value={billingForm.payRate} onChange={(e) => setBillingForm((f: any) => ({ ...f, payRate: e.target.value }))} />
                                        </Field>
                                        <Field label="Currency">
                                            <select className={selectCls} value={billingForm.currency} onChange={(e) => setBillingForm((f: any) => ({ ...f, currency: e.target.value }))}>
                                                {["USD"].map((c) => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </Field>
                                        {editForm.engagementType !== "W2" && (
                                            <Field label="Consultant Payment Terms (Days) *">
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
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
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
                                { label: "Added", value: new Date(data.createdAt).toLocaleDateString() },
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
                            <CreateInvoiceForm projects={projects} hours={data.hours ?? []} onCreated={load} />
                        </Card>
                    )}

                    {showPayment && (
                        <Card title="Record Payment">
                            <RecordPaymentForm projects={projects} onRecorded={load} />
                        </Card>
                    )}

                    {showLogInvoice && (
                        <Card title="Log Consultant Invoice">
                            <LogConsultantInvoiceForm consultantId={id!} hours={data.hours ?? []} projects={projects} onRecorded={load} />
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
                                                {p.contracts.map((c: any) => (
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
                                        <tr><th className="pb-2">Month</th><th className="pb-2">Year</th><th className="pb-2 text-right">Hours</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {data.hours.map((h: any) => (
                                            <tr key={h.id}>
                                                <td className="py-2 text-gray-600 dark:text-gray-300">
                                                    {MONTHS[h.month - 1]} {h.week ? <span className="text-xs text-violet-500 font-medium ml-1 bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded">W{h.week}</span> : null}
                                                </td>
                                                <td className="py-2 text-gray-600 dark:text-gray-300">{h.year}</td>
                                                <td className="py-2 font-semibold text-gray-800 dark:text-white text-right">{h.hours}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* Invoices */}
                    <Card title="Invoices">
                        {!allInvoices.length ? (
                            <p className="text-gray-400 text-sm">No invoices yet. Use &quot;+ Invoice&quot; above.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-xs text-gray-400 uppercase">
                                        <tr>
                                            <th className="pb-2">Period</th>
                                            <th className="pb-2">Project</th>
                                            <th className="pb-2 text-right">Total</th>
                                            <th className="pb-2">Due</th>
                                            <th className="pb-2">Status</th>
                                            <th className="pb-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {allInvoices.map((inv: any) => (
                                            <tr key={inv.id}>
                                                <td className="py-2 text-gray-600 dark:text-gray-300">{MONTHS[(inv.invoiceMonth ?? 1) - 1]} {inv.invoiceYear}</td>
                                                <td className="py-2 text-gray-500 dark:text-gray-400">{inv.projectName}</td>
                                                <td className="py-2 font-semibold text-gray-800 dark:text-white text-right">${Number(inv.totalAmount).toLocaleString()}</td>
                                                <td className="py-2 text-gray-400 text-xs">{inv.expectedPaymentDate ? new Date(inv.expectedPaymentDate).toLocaleDateString() : "—"}</td>
                                                <td className="py-2"><StatusBadge status={inv.status ?? "PENDING"} /></td>
                                                <td className="py-2 text-right">
                                                    {inv.status === "PAID" ? (
                                                        <button onClick={() => handleMarkUnpaid(inv.id)} className="text-xs text-orange-500 hover:underline">Revoke Paid</button>
                                                    ) : (
                                                        <button onClick={() => handleMarkPaid(inv.id)} className="text-xs text-violet-600 hover:underline">Mark Paid</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* Payout History */}
                    <Card title="Payout History" action={
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">AP</span>
                    }>
                        {!data.payouts?.length ? (
                            <div className="p-6 text-center text-gray-400 text-sm">No payouts recorded yet.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-[10px] font-bold tracking-widest border-b border-gray-100 dark:border-gray-700">
                                        <tr>
                                            <th className="text-left px-4 py-3">Period</th>
                                            <th className="text-left px-4 py-3">Hours</th>
                                            <th className="text-left px-4 py-3 text-right">Amount</th>
                                            <th className="text-left px-4 py-3">Inv Date</th>
                                            <th className="text-left px-4 py-3 text-emerald-600">Pay Date</th>
                                            <th className="text-left px-4 py-3 font-mono">Ref #</th>
                                            <th className="text-left px-4 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {data.payouts.map((payout: any) => (
                                            <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition border-b border-gray-50 dark:border-gray-800 last:border-0">
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">{MONTHS[payout.month - 1]} {payout.year}</td>
                                                <td className="px-4 py-3 text-gray-500 font-mono text-[10px]">{Number(payout.hours)}h</td>
                                                <td className="px-4 py-3 font-bold text-gray-800 dark:text-gray-100 text-right font-mono">${Number(payout.amount).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-gray-400 text-[10px]">{payout.consultantInvoiceDate ? new Date(payout.consultantInvoiceDate).toLocaleDateString() : "—"}</td>
                                                <td className="px-4 py-3 text-emerald-600 text-[10px] font-semibold">{payout.paymentDate ? new Date(payout.paymentDate).toLocaleDateString() : "—"}</td>
                                                <td className="px-4 py-3 text-gray-500 font-mono text-[10px]">{payout.referenceNumber || "—"}</td>
                                                <td className="px-4 py-3"><StatusBadge status={payout.status || "PENDING"} /></td>
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
                                        <th className="px-4 py-3 text-left">Pay-In (Client)</th>
                                        <th className="px-4 py-3 text-left">Pay-Out (Consultant)</th>
                                        <th className="px-4 py-3 text-right">Net Margin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {data.months.map((m: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition">
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-gray-800 dark:text-gray-100">{MONTHS[m.month - 1]} {m.year}</div>
                                                <div className="text-xs text-violet-500 font-medium">{m.hours} hrs @ ${data.rates?.bill}/hr</div>
                                            </td>
                                            <td className="px-4 py-4 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <StatusBadge status={m.invoiceStatus || "PENDING"} />
                                                    <span className="font-semibold text-emerald-600">${m.revenue.toLocaleString()}</span>
                                                </div>
                                                <div className="text-[10px] flex flex-col">
                                                    <span className="text-gray-400">Deadline (Pay-In):</span>
                                                    <span className={`font-medium ${m.isOverdue ? "text-red-500 animate-pulse" : "text-gray-600 dark:text-gray-400"}`}>
                                                        {m.expectedPaymentDate ? new Date(m.expectedPaymentDate).toLocaleDateString() : "No Invoice"}
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
                                                        <span className="text-gray-400 italic font-medium">Wait for consultant invoice</span>
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
        </>
    );
}

// ─── Step 1: Log Consultant Invoice ──────────────────────────────────────────────
function LogConsultantInvoiceForm({ consultantId, hours, projects, onRecorded }: { consultantId: string, hours: any[], projects: any[], onRecorded: () => void }) {
    const now = new Date();
    const [form, setForm] = useState({
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        hours: "",
        payRate: "",
        consultantInvoiceDate: now.toISOString().slice(0, 10),
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [ok, setOk] = useState(false);

    // Auto-fill hours & pay rate based on month/year
    useEffect(() => {
        const foundHour = hours.find(h => h.month === form.month && h.year === form.year);
        const autoHours = foundHour ? Number(foundHour.hours).toString() : "";
        let autoPayRate = "";
        if (projects.length > 0) {
            const project = projects.find((p: any) => p.status === "ACTIVE") || projects[0];
            const contract = project?.contracts?.sort((a: any, b: any) => b.id - a.id)?.[0];
            if (contract) autoPayRate = Number(contract.payRate).toString();
        }
        setForm(f => ({ ...f, hours: autoHours, payRate: autoPayRate }));
    }, [form.month, form.year, hours, projects]);

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
                        <option key={p.id} value={p.id}>{MONTHS[p.month - 1]} {p.year} — ${Number(p.amount).toLocaleString()} ({Number(p.hours)}h)</option>
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

export default function ConsultantDetailPage() {
    return (
        <ConsultantDetailContent />
    );
}
