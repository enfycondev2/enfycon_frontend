"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import FinancePinGate from "@/components/finance/FinancePinGate";
import { financeGet, financePost } from "@/lib/financeClient";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";

import { MONTHS } from "@/components/finance/FinanceUI";

function HoursContent() {
    const searchParams = useSearchParams();
    const filterConsultantId = searchParams.get("consultantId") ?? "";
    const [consultantId, setConsultantId] = useState(filterConsultantId);
    const [hours, setHours] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const now = new Date();
    // Log hours form — matches CreateHoursDto: { consultantId, month, year, hours, week? }
    const [entryMode, setEntryMode] = useState<"MONTHLY" | "WEEKLY">("MONTHLY");
    const [form, setForm] = useState({
        consultantId: filterConsultantId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        week: 1,
        hours: "",
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [saved, setSaved] = useState(false);

    async function load(id?: string) {
        const cid = id ?? consultantId;
        if (!cid.trim()) { setHours([]); return; }
        setLoading(true);
        setError("");
        try {
            const data = await financeGet(`finance/hours/${cid.trim()}`);
            setHours(Array.isArray(data) ? data : []);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    }

    useEffect(() => { load(); }, [consultantId]);

    async function handleLog(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setSaveError("");
        setSaved(false);
        try {
            const payload: any = {
                consultantId: form.consultantId,
                month: +form.month,
                year: +form.year,
                hours: +form.hours,
            };
            if (entryMode === "WEEKLY") {
                payload.week = +form.week;
            }
            
            await financePost("finance/hours", payload);
            setSaved(true);
            setForm(f => ({ ...f, hours: "" })); // reset hours input after saving
            load(form.consultantId);
        } catch (err: any) { setSaveError(err.message); }
        finally { setSaving(false); }
    }

    return (
        <>
            <DashboardBreadcrumb title="Hours" text="Finance / Hours" />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Log Hours Form */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Log Hours</h3>
                    <form onSubmit={handleLog} className="space-y-4">
                        <div className="flex bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl mb-4">
                            <button type="button" onClick={() => setEntryMode("MONTHLY")} className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition ${entryMode === "MONTHLY" ? "bg-white dark:bg-gray-600 shadow-sm text-gray-800 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                                Monthly Total
                            </button>
                            <button type="button" onClick={() => setEntryMode("WEEKLY")} className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition ${entryMode === "WEEKLY" ? "bg-white dark:bg-gray-600 shadow-sm text-gray-800 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                                Weekly Entry
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Consultant ID</label>
                            <input type="text" required value={form.consultantId}
                                onChange={(e) => setForm((f) => ({ ...f, consultantId: e.target.value }))}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Month</label>
                                <select value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: +e.target.value }))}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm">
                                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Year</label>
                                <input type="number" required value={form.year}
                                    onChange={(e) => setForm((f) => ({ ...f, year: +e.target.value }))}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                            </div>
                        </div>
                        {entryMode === "WEEKLY" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Week</label>
                                <select value={form.week} onChange={(e) => setForm((f) => ({ ...f, week: +e.target.value }))}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm">
                                    {[1, 2, 3, 4, 5].map((w) => <option key={w} value={w}>Week {w}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Year</label>
                            <input type="number" required value={form.year}
                                onChange={(e) => setForm((f) => ({ ...f, year: +e.target.value }))}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Hours</label>
                            <input type="number" step="0.5" required value={form.hours} placeholder="160"
                                onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                        </div>
                        {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
                        {saved && <p className="text-green-500 text-sm">✓ Hours logged successfully!</p>}
                        <button type="submit" disabled={saving}
                            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition text-sm">
                            {saving ? "Logging…" : "Log Hours"}
                        </button>
                    </form>
                </div>

                {/* Hours History */}
                <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
                        <label className="text-sm text-gray-500 shrink-0">Consultant ID:</label>
                        <input value={consultantId} onChange={(e) => setConsultantId(e.target.value)} placeholder="Paste consultant ID…"
                            className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1 max-w-xs" />
                        <button onClick={() => load()} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition">View History</button>
                    </div>

                    {!consultantId.trim() ? (
                        <div className="p-12 text-center text-gray-400 text-sm">Enter a Consultant ID to view hours history.</div>
                    ) : loading ? (
                        <div className="p-12 text-center text-gray-400 animate-pulse">Loading hours…</div>
                    ) : error ? (
                        <div className="p-12 text-center text-red-500">{error}</div>
                    ) : hours.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">No hours logged yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs">
                                    <tr>
                                        <th className="text-left px-4 py-3">Month</th>
                                        <th className="text-left px-4 py-3">Year</th>
                                        <th className="text-left px-4 py-3">Hours</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {hours.map((h: any) => (
                                        <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                                                {MONTHS[(h.month ?? 1) - 1]}
                                                {h.week ? <span className="ml-2 text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-bold">W{h.week}</span> : null}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{h.year}</td>
                                            <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{h.hours}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default function HoursPage() {
    return (
        <FinancePinGate>
            <HoursContent />
        </FinancePinGate>
    );
}
