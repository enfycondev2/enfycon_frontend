"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import FinancePinGate from "@/components/finance/FinancePinGate";
import { financeGet, financePatch, financePost } from "@/lib/financeClient";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "ENDED", "ON_HOLD"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const iCls = "w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";
const btnPrimary = "bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition";
const btnSecondary = "border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition";

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        ACTIVE: "bg-green-100 text-green-700",
        INACTIVE: "bg-gray-100 text-gray-500",
        ENDED: "bg-red-100 text-red-600",
        ON_HOLD: "bg-yellow-100 text-yellow-700",
        PENDING: "bg-yellow-100 text-yellow-700",
        PAID: "bg-green-100 text-green-700",
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-500"}`}>{status.replace("_", " ")}</span>;
}

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
    const [form, setForm] = useState({ consultantId, month: now.getMonth() + 1, year: now.getFullYear(), hours: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [ok, setOk] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true); setError(""); setOk(false);
        try {
            await financePost("finance/hours", { ...form, month: +form.month, year: +form.year, hours: +form.hours });
            setOk(true);
            onLogged();
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    }

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
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
            <div>
                <label className="block text-xs text-gray-500 mb-1">Hours</label>
                <input type="number" step="0.5" required className={iCls} value={form.hours} placeholder="160" onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />
            </div>
            <div className="flex items-end gap-2">
                <button type="submit" disabled={saving} className={`${btnPrimary} flex-1`}>{saving ? "Saving…" : "Log"}</button>
            </div>
            {error && <p className="col-span-full text-red-500 text-xs">{error}</p>}
            {ok && <p className="col-span-full text-green-600 text-xs">✓ Hours saved!</p>}
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

// ─── Main Detail ──────────────────────────────────────────────────────────────
function ConsultantDetailContent() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", status: "" });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [showLogHours, setShowLogHours] = useState(false);
    const [showInvoice, setShowInvoice] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [showContract, setShowContract] = useState(false);
    const [showPayout, setShowPayout] = useState(false);

    function clearForms() { setShowLogHours(false); setShowInvoice(false); setShowPayment(false); setShowContract(false); setShowPayout(false); }

    async function load() {
        setLoading(true); setError("");
        try {
            const res = await financeGet(`finance/consultants/${id}`);
            setData(res);
            setEditForm({ name: res.name, email: res.email, phone: res.phone ?? "", status: res.status });
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    }

    useEffect(() => { load(); }, [id]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true); setSaveError("");
        try { await financePatch(`finance/consultants/${id}`, editForm); setEditing(false); await load(); }
        catch (err: any) { setSaveError(err.message); }
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

    return (
        <>
            <DashboardBreadcrumb title={data.name} text={`Finance / Consultants / ${data.name}`} />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* ── Left: Info Card ─────────────────────────────────── */}
                <div className="xl:col-span-1 space-y-4">
                    <Card title="Consultant Info" action={
                        <button onClick={() => setEditing(!editing)} className="text-xs text-violet-600 hover:underline">
                            {editing ? "Cancel" : "Edit"}
                        </button>
                    }>
                        {editing ? (
                            <form onSubmit={handleSave} className="space-y-3">
                                {[
                                    { label: "Name", field: "name", type: "text" },
                                    { label: "Email", field: "email", type: "email" },
                                    { label: "Phone", field: "phone", type: "tel" },
                                ].map(({ label, field, type }) => (
                                    <div key={field}>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                                        <input type={type} value={(editForm as any)[field]} onChange={(e) => setEditForm(f => ({ ...f, [field]: e.target.value }))} className={iCls} />
                                    </div>
                                ))}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                                    <select value={editForm.status} onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))} className={iCls}>
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                                    </select>
                                </div>
                                {saveError && <p className="text-red-500 text-xs">{saveError}</p>}
                                <button type="submit" disabled={saving} className={`w-full ${btnPrimary}`}>{saving ? "Saving…" : "Save Changes"}</button>
                            </form>
                        ) : (
                            <dl className="space-y-3 text-sm">
                                {[
                                    { label: "Name", value: data.name },
                                    { label: "Email", value: data.email },
                                    { label: "Phone", value: data.phone ?? "—" },
                                    { label: "Status", value: <StatusBadge status={data.status} /> },
                                    { label: "Recruiter", value: data.recruiter?.fullName ?? "—" },
                                    { label: "Acct Manager", value: data.accountManager?.fullName ?? "—" },
                                    { label: "Added", value: new Date(data.createdAt).toLocaleDateString() },
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex justify-between gap-2">
                                        <dt className="text-gray-400">{label}</dt>
                                        <dd className="font-medium text-gray-700 dark:text-gray-200 text-right">{value as any}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
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
                        <button onClick={() => { clearForms(); setShowPayout(v => !v); }}
                            className={`text-xs font-semibold px-3 py-2 rounded-xl border transition ${showPayout ? "bg-orange-500 text-white border-orange-500" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"} col-span-2`}>
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

                    {showPayout && (
                        <Card title="Pay Consultant">
                            <PayoutForm consultantId={id!} hours={data.hours ?? []} projects={projects} onRecorded={load} />
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
                                                <td className="py-2 text-gray-600 dark:text-gray-300">{MONTHS[h.month - 1]}</td>
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
                </div>

                {/* ── Payouts (What you paid to the consultant) ────────────────── */}
                <div className="xl:col-span-3 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden mt-6">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-orange-50/50 dark:bg-orange-900/10">
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2">
                            <span>Payout History</span>
                            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-semibold">AP</span>
                        </h3>
                    </div>
                    {(data.payouts?.length ?? 0) === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm">No payouts recorded yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs">
                                    <tr>
                                        <th className="text-left px-4 py-3">Period</th>
                                        <th className="text-left px-4 py-3">Hours</th>
                                        <th className="text-left px-4 py-3">Pay Rate</th>
                                        <th className="text-left px-4 py-3">Amount Paid</th>
                                        <th className="text-left px-4 py-3">Date</th>
                                        <th className="text-left px-4 py-3">Ref #</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {data.payouts.map((payout: any) => (
                                        <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">{MONTHS[payout.month - 1]} {payout.year}</td>
                                            <td className="px-4 py-3 text-gray-500">{Number(payout.hours)}h</td>
                                            <td className="px-4 py-3 text-gray-500">${Number(payout.payRate)}/hr</td>
                                            <td className="px-4 py-3 font-semibold text-orange-600">${Number(payout.amount).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-gray-400 text-xs">{new Date(payout.paymentDate).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">{payout.referenceNumber || "—"}</td>
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

// ─── Payout Form (to the consultant) ─────────────────────────────────────────
function PayoutForm({ consultantId, hours, projects, onRecorded }: { consultantId: string, hours: any[], projects: any[], onRecorded: () => void }) {
    const now = new Date();
    const [form, setForm] = useState({
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        hours: "",
        payRate: "",
        paymentDate: now.toISOString().slice(0, 10),
        referenceNumber: ""
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [ok, setOk] = useState(false);

    // Auto-fill hours & pay rate
    useEffect(() => {
        const foundHour = hours.find(h => h.month === form.month && h.year === form.year);
        const autoHours = foundHour ? Number(foundHour.hours).toString() : "";
        let autoPayRate = "";
        if (projects.length > 0) {
            const contract = projects[0]?.contracts?.sort((a: any, b: any) => b.id - a.id)?.[0];
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
                paymentDate: form.paymentDate,
                referenceNumber: form.referenceNumber || undefined,
            });
            setOk(true);
            setTimeout(() => setOk(false), 3000);
            onRecorded();
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    }

    const tTotal = (Number(form.hours || 0) * Number(form.payRate || 0));

    return (
        <form onSubmit={handleSave} className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl">
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
                <select required value={form.month} onChange={(e) => setForm(f => ({ ...f, month: +e.target.value }))} className={iCls}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
                <input required type="number" value={form.year} onChange={(e) => setForm(f => ({ ...f, year: +e.target.value }))} className={iCls} />
            </div>
            <div>
                <label className="block text-xs font-medium text-orange-600 mb-1 flex items-center justify-between">
                    <span>Pay Rate ($/hr)</span>
                    <span className="text-[10px] text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-md italic">auto</span>
                </label>
                <input required type="number" step="0.01" value={form.payRate} onChange={(e) => setForm(f => ({ ...f, payRate: e.target.value }))}
                    className="w-full border-2 border-orange-200 dark:border-orange-800/50 rounded-lg px-3 py-1.5 text-sm bg-orange-50/30 dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
                <label className="block text-xs font-medium text-orange-600 mb-1 flex items-center justify-between">
                    <span>Hours</span>
                    <span className="text-[10px] text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-md italic">auto</span>
                </label>
                <input required type="number" step="0.5" value={form.hours} onChange={(e) => setForm(f => ({ ...f, hours: e.target.value }))}
                    className="w-full border-2 border-orange-200 dark:border-orange-800/50 rounded-lg px-3 py-1.5 text-sm bg-orange-50/30 dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Payment Date</label>
                <input required type="date" value={form.paymentDate} onChange={(e) => setForm(f => ({ ...f, paymentDate: e.target.value }))} className={iCls} />
            </div>
            <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Reference # (Optional)</label>
                <input type="text" placeholder="ACH-10029..." value={form.referenceNumber} onChange={(e) => setForm(f => ({ ...f, referenceNumber: e.target.value }))} className={iCls} />
            </div>
            <div className="col-span-full pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <p className="text-gray-500 text-sm">Payout Total: <strong className="text-orange-600 font-bold">${tTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
                <button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-xl text-sm transition">
                    {saving ? "Saving…" : "Record Payout"}
                </button>
            </div>
            {error && <p className="col-span-full text-red-500 text-xs">{error}</p>}
            {ok && <p className="col-span-full text-green-600 text-xs">✓ Payout recorded!</p>}
        </form>
    );
}

export default function ConsultantDetailPage() {
    return (
        <FinancePinGate>
            <ConsultantDetailContent />
        </FinancePinGate>
    );
}
