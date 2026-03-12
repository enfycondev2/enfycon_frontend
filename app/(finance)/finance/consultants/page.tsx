"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FinancePinGate from "@/components/finance/FinancePinGate";
import { financeGet, financePost } from "@/lib/financeClient";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "ENDED", "ON_HOLD"];

interface Consultant {
    id: string;
    name: string;
    email: string;
    phone?: string;
    status: string;
    createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        ACTIVE: "bg-green-100 text-green-700",
        INACTIVE: "bg-gray-100 text-gray-500",
        ENDED: "bg-red-100 text-red-600",
        ON_HOLD: "bg-yellow-100 text-yellow-700",
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-500"}`}>
            {status.replace("_", " ")}
        </span>
    );
}

function AddConsultantModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
    const [form, setForm] = useState({
        name: "", email: "", phone: "",
        immigrationStatus: "", engagementType: "",
        recruiterId: "", accountManagerId: "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const payload: any = { name: form.name, email: form.email, recruiterId: form.recruiterId, accountManagerId: form.accountManagerId };
            if (form.phone) payload.phone = form.phone;
            if (form.immigrationStatus) payload.immigrationStatus = form.immigrationStatus;
            if (form.engagementType) payload.engagementType = form.engagementType;
            await financePost("finance/consultants", payload);
            onAdded();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Add Consultant</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Full Name *</label>
                            <input required className={inputCls} placeholder="John Smith" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                            <input required type="email" className={inputCls} placeholder="john@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                            <input type="tel" className={inputCls} placeholder="+1-555-0100" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Immigration Status</label>
                            <select className={inputCls} value={form.immigrationStatus} onChange={(e) => setForm((f) => ({ ...f, immigrationStatus: e.target.value }))}>
                                <option value="">— Select —</option>
                                {["H1B", "OPT", "GC", "US_CITIZEN", "TN", "CPT"].map((v) => <option key={v} value={v}>{v.replace("_", " ")}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Engagement Type</label>
                            <select className={inputCls} value={form.engagementType} onChange={(e) => setForm((f) => ({ ...f, engagementType: e.target.value }))}>
                                <option value="">— Select —</option>
                                {["W2", "C2C", "1099"].map((v) => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Recruiter ID (UUID) *</label>
                            <input required className={inputCls} placeholder="38def2f5-4780-..." value={form.recruiterId} onChange={(e) => setForm((f) => ({ ...f, recruiterId: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Account Manager ID (UUID) *</label>
                            <input required className={inputCls} placeholder="38def2f5-4780-..." value={form.accountManagerId} onChange={(e) => setForm((f) => ({ ...f, accountManagerId: e.target.value }))} />
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl py-2 transition text-sm">
                            {saving ? "Saving…" : "Add Consultant"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ConsultantsContent() {
    const [consultants, setConsultants] = useState<Consultant[]>([]);
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showAdd, setShowAdd] = useState(false);

    async function load() {
        setLoading(true);
        setError("");
        try {
            const endpoint = status ? `finance/consultants?status=${status}` : "finance/consultants";
            const data = await financeGet(endpoint);
            setConsultants(Array.isArray(data) ? data : data?.data ?? []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, [status]);

    return (
        <>
            <DashboardBreadcrumb title="Consultants" text="Finance / Consultants" />
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Filter:</span>
                        <button onClick={() => setStatus("")} className={`px-3 py-1 rounded-full text-xs font-medium transition ${status === "" ? "bg-violet-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"}`}>All</button>
                        {STATUS_OPTIONS.map((s) => (
                            <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition ${status === s ? "bg-violet-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"}`}>
                                {s.replace("_", " ")}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/finance/candidate-onboard" className="flex items-center gap-2 border border-violet-300 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-sm font-semibold px-4 py-2 rounded-xl transition shrink-0">
                            Full Onboarding →
                        </Link>
                        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add Consultant
                        </button>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="p-12 text-center text-gray-400 animate-pulse">Loading consultants…</div>
                ) : error ? (
                    <div className="p-12 text-center text-red-500">{error}</div>
                ) : consultants.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">No consultants found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="text-left px-4 py-3">Name</th>
                                    <th className="text-left px-4 py-3">Email</th>
                                    <th className="text-left px-4 py-3">Phone</th>
                                    <th className="text-left px-4 py-3">Status</th>
                                    <th className="text-left px-4 py-3">Added</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {consultants.map((c) => (
                                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{c.name}</td>
                                        <td className="px-4 py-3 text-gray-500">{c.email}</td>
                                        <td className="px-4 py-3 text-gray-500">{c.phone ?? "—"}</td>
                                        <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Link href={`/finance/consultants/${c.id}`} className="text-violet-600 hover:underline text-xs font-medium">View →</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showAdd && <AddConsultantModal onClose={() => setShowAdd(false)} onAdded={load} />}
        </>
    );
}

export default function ConsultantsPage() {
    return (
        <FinancePinGate>
            <ConsultantsContent />
        </FinancePinGate>
    );
}
