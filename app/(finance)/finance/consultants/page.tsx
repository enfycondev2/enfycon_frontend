"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { financeGet, financePost } from "@/lib/financeClient";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { StatusBadge, inputCls } from "@/components/finance/FinanceUI";

const STATUS_OPTIONS = ["ACTIVE", "ENDED"];

interface Consultant {
    id: string;
    name: string;
    email: string;
    phone?: string;
    status: string;
    createdAt: string;
}





function ConsultantsContent() {
    const [allConsultants, setAllConsultants] = useState<Consultant[]>([]);
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function load() {
        setLoading(true);
        setError("");
        try {
            const data = await financeGet("finance/consultants");
            const list = Array.isArray(data) ? data : data?.data ?? [];
            setAllConsultants(list);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const filteredConsultants = (status 
        ? allConsultants.filter(c => c.status === status)
        : allConsultants
    ).sort((a, b) => {
        if (a.status === b.status) return 0;
        return a.status === "ACTIVE" ? -1 : 1;
    });

    const counts = {
        ALL: allConsultants.length,
        ACTIVE: allConsultants.filter(c => c.status === "ACTIVE").length,
        ENDED: allConsultants.filter(c => c.status === "ENDED").length,
    };

    return (
        <>
            <DashboardBreadcrumb title="Consultants" text="Finance / Consultants" />
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Filter:</span>
                        <button onClick={() => setStatus("")} className={`px-3 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${status === "" ? "bg-violet-600 text-white shadow-md shadow-violet-200 dark:shadow-none" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"}`}>
                            All <span className={`px-1.5 rounded-md ${status === "" ? "bg-violet-500" : "bg-gray-200 dark:bg-gray-600"}`}>{counts.ALL}</span>
                        </button>
                        {STATUS_OPTIONS.map((s) => (
                            <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${status === s ? "bg-violet-600 text-white shadow-md shadow-violet-200 dark:shadow-none" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"}`}>
                                {s.replace("_", " ")} <span className={`px-1.5 rounded-md ${status === s ? "bg-violet-500" : "bg-gray-200 dark:bg-gray-600 text-[10px]"}`}>{counts[s as keyof typeof counts]}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/finance/candidate-onboard" className="flex items-center gap-2 border border-violet-300 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-sm font-semibold px-4 py-2 rounded-xl transition shrink-0">
                            Full Onboard →
                        </Link>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="p-12 text-center text-gray-400 animate-pulse">Loading consultants…</div>
                ) : error ? (
                    <div className="p-12 text-center text-red-500">{error}</div>
                ) : filteredConsultants.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">No consultants found for this filter.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-[10px] font-bold tracking-wider border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="text-center px-4 py-3 w-12 border-r border-gray-100 dark:border-gray-700/50">SL</th>
                                    <th className="text-left px-4 py-3">Name</th>
                                    <th className="text-left px-4 py-3">Email</th>
                                    <th className="text-left px-4 py-3">Phone</th>
                                    <th className="text-left px-4 py-3 text-center">Status</th>
                                    <th className="text-left px-4 py-3">Added</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredConsultants.map((c, index) => (
                                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition border-b border-gray-100/50 dark:border-gray-700/50 last:border-0">
                                        <td className="px-4 py-3 text-center font-bold text-gray-400 border-r border-gray-100/50 dark:border-gray-700/50">{index + 1}</td>
                                        <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">{c.name}</td>
                                        <td className="px-4 py-3 text-gray-500">{c.email}</td>
                                        <td className="px-4 py-3 text-gray-500">{c.phone ?? "—"}</td>
                                        <td className="px-4 py-3 text-center"><StatusBadge status={c.status} /></td>
                                        <td className="px-4 py-3 text-gray-400 text-[11px]">{new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                        <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                                            <Link href={`/finance/consultants/${c.id}?edit=true`} className="inline-flex items-center gap-1 bg-violet-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-violet-700 transition">Edit</Link>
                                            <Link href={`/finance/consultants/${c.id}`} className="inline-flex items-center gap-1 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 px-3 py-1 rounded-lg text-xs font-bold hover:bg-violet-100 transition">View Details</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </>
    );
}

export default function ConsultantsPage() {
    return (
        <ConsultantsContent />
    );
}
