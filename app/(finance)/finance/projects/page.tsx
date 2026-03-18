"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { financeGet, financePost, financePatch } from "@/lib/financeClient";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { formatDateUS } from "@/components/finance/FinanceUI";

function AddProjectModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
    const [form, setForm] = useState({ consultantId: "", clientName: "", endClientName: "", startDate: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            await financePost("finance/projects", form);
            onAdded();
            onClose();
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Assign Consultant to Project</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {[
                        { label: "Consultant ID", field: "consultantId", type: "text", required: true },
                        { label: "Client Name", field: "clientName", type: "text", required: true },
                        { label: "End Client Name", field: "endClientName", type: "text", required: false },
                        { label: "Start Date", field: "startDate", type: "date", required: true },
                    ].map(({ label, field, type, required }) => (
                        <div key={field}>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{label}</label>
                            <input type={type} required={required} value={(form as any)[field]}
                                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                    ))}
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl py-2 transition">
                            {saving ? "Saving…" : "Create Project"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ContractPanel({ projectId }: { projectId: string }) {
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ projectId, billRate: "", payRate: "", currency: "USD", paymentTermsDays: "30" });
    const [saving, setSaving] = useState(false);

    async function load() {
        try {
            const data = await financeGet(`finance/contracts/by-project/${projectId}`);
            setContracts(Array.isArray(data) ? data : [data]);
        } catch { setContracts([]); }
        finally { setLoading(false); }
    }

    useEffect(() => { load(); }, [projectId]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try { await financePost("finance/contracts", { ...form, billRate: +form.billRate, payRate: +form.payRate, paymentTermsDays: +form.paymentTermsDays }); load(); setShowForm(false); }
        catch { /* ignore, shown inline */ }
        finally { setSaving(false); }
    }

    return (
        <div className="mt-2 pl-4 border-l-2 border-violet-200 dark:border-violet-800">
            {loading ? <p className="text-xs text-gray-400">Loading contracts…</p> : (
                <>
                    {contracts.length === 0 ? <p className="text-xs text-gray-400">No contracts yet.</p> : (
                        contracts.map((c: any) => (
                            <p key={c.id} className="text-xs text-gray-500">
                                Bill: <strong>${c.billRate}</strong> | Pay: <strong>${c.payRate}</strong> | {c.currency} | Net {c.paymentTermsDays}
                            </p>
                        ))
                    )}
                    <button onClick={() => setShowForm(!showForm)} className="text-xs text-violet-600 hover:underline mt-1">
                        {showForm ? "Cancel" : "+ Set Contract"}
                    </button>
                    {showForm && (
                        <form onSubmit={handleSave} className="mt-2 flex flex-wrap gap-2 items-end">
                            <input type="number" step="0.01" placeholder="Bill Rate ($/hr)" value={form.billRate} onChange={(e) => setForm((f) => ({ ...f, billRate: e.target.value }))}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-xs w-28 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white" required />
                            <input type="number" step="0.01" placeholder="Pay Rate ($/hr)" value={form.payRate} onChange={(e) => setForm((f) => ({ ...f, payRate: e.target.value }))}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-xs w-28 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white" required />
                            <input type="number" placeholder="Net Days" value={form.paymentTermsDays} onChange={(e) => setForm((f) => ({ ...f, paymentTermsDays: e.target.value }))}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-xs w-24 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white" required />
                            <input type="text" placeholder="Currency" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-xs w-20 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white" />
                            <button type="submit" disabled={saving} className="bg-violet-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition">
                                {saving ? "…" : "Save"}
                            </button>
                        </form>
                    )}
                </>
            )}
        </div>
    );
}

function ProjectsContent() {
    const searchParams = useSearchParams();
    const filterConsultantId = searchParams.get("consultantId") ?? "";
    const [consultantId, setConsultantId] = useState(filterConsultantId);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());

    async function load() {
        if (!consultantId.trim()) { setProjects([]); return; }
        setLoading(true);
        setError("");
        try {
            const data = await financeGet(`finance/projects/by-consultant/${consultantId.trim()}`);
            setProjects(Array.isArray(data) ? data : []);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    }

    useEffect(() => { load(); }, [consultantId]);

    async function handleEndProject(id: string) {
        const endDate = new Date().toISOString().slice(0, 10);
        try { await financePatch(`finance/projects/${id}/end`, { endDate }); load(); }
        catch (err: any) { alert(err.message); }
    }

    function toggleContracts(id: string) {
        setExpandedContracts((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    return (
        <>
            <DashboardBreadcrumb title="Projects" text="Finance / Projects" />
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="text-sm text-gray-500 shrink-0">Consultant ID:</label>
                        <input value={consultantId} onChange={(e) => setConsultantId(e.target.value)} placeholder="Paste consultant ID…"
                            className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-64" />
                        <button onClick={load} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition truncate">Search</button>
                    </div>
                    <button onClick={() => setShowAdd(true)} className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Assign Project
                    </button>
                </div>

                {!consultantId.trim() ? (
                    <div className="p-12 text-center text-gray-400 text-sm">Enter a Consultant ID to view their projects.</div>
                ) : loading ? (
                    <div className="p-12 text-center text-gray-400 animate-pulse">Loading projects…</div>
                ) : error ? (
                    <div className="p-12 text-center text-red-500">{error}</div>
                ) : projects.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">No projects found for this consultant.</div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {projects.map((p: any) => (
                            <div key={p.id} className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-white">{p.clientName ?? p.title ?? "Project"}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">Started: {formatDateUS(p.startDate)}</p>
                                        <button onClick={() => toggleContracts(p.id)} className="text-xs text-violet-600 hover:underline mt-1">
                                            {expandedContracts.has(p.id) ? "Hide Contracts ▲" : "View Contracts ▼"}
                                        </button>
                                        {expandedContracts.has(p.id) && <ContractPanel projectId={p.id} />}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "ENDED" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                                            {p.status ?? "ACTIVE"}
                                        </span>
                                        {p.status !== "ENDED" && (
                                            <button onClick={() => handleEndProject(p.id)} className="text-xs border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-0.5 rounded-lg transition">
                                                End
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {showAdd && <AddProjectModal onClose={() => setShowAdd(false)} onAdded={load} />}
        </>
    );
}

export default function ProjectsPage() {
    return (
        <ProjectsContent />
    );
}
