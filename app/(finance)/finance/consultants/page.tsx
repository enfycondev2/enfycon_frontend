"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FinancePinGate from "@/components/finance/FinancePinGate";
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
    const [consultants, setConsultants] = useState<Consultant[]>([]);
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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
                            Full Onboard →
                        </Link>
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
