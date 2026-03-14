"use client";

import { useEffect, useState } from "react";
import { financeGet, financePost } from "@/lib/financeClient";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";

function PaymentsContent() {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [invoiceFilter, setInvoiceFilter] = useState("");

    const [form, setForm] = useState({ invoiceId: "", amountReceived: "", paymentDate: "", referenceNumber: "" });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [saved, setSaved] = useState(false);

    async function load() {
        setLoading(true);
        setError("");
        try {
            const params = invoiceFilter.trim() ? `?invoiceId=${invoiceFilter.trim()}` : "";
            const data = await financeGet(`finance/payments${params}`);
            setPayments(Array.isArray(data) ? data : data?.data ?? []);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    }

    useEffect(() => { load(); }, []);

    async function handleRecord(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setSaveError("");
        setSaved(false);
        try {
            await financePost("finance/payments", {
                invoiceId: form.invoiceId,
                amountReceived: +form.amountReceived,
                paymentDate: form.paymentDate,
                ...(form.referenceNumber ? { referenceNumber: form.referenceNumber } : {}),
            });
            setSaved(true);
            setForm({ invoiceId: "", amountReceived: "", paymentDate: "", referenceNumber: "" });
            load();
        } catch (err: any) { setSaveError(err.message); }
        finally { setSaving(false); }
    }

    return (
        <>
            <DashboardBreadcrumb title="Payments" text="Finance / Payments" />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Record Payment Form */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Record Payment</h3>
                    <form onSubmit={handleRecord} className="space-y-4">
                        {[
                            { label: "Invoice ID", field: "invoiceId", type: "text" },
                            { label: "Amount Received ($)", field: "amountReceived", type: "number" },
                            { label: "Payment Date", field: "paymentDate", type: "date" },
                            { label: "Reference # (optional)", field: "referenceNumber", type: "text", required: false },
                        ].map(({ label, field, type, required }) => (
                            <div key={field}>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{label}</label>
                                <input type={type} required={required !== false} value={(form as any)[field]}
                                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
                            </div>
                        ))}
                        {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
                        {saved && <p className="text-green-500 text-sm">✓ Payment recorded!</p>}
                        <button type="submit" disabled={saving}
                            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition text-sm">
                            {saving ? "Recording…" : "Record Payment"}
                        </button>
                    </form>
                </div>

                {/* Payments Table */}
                <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
                        <input value={invoiceFilter} onChange={(e) => setInvoiceFilter(e.target.value)} placeholder="Filter by Invoice ID…"
                            className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1 max-w-xs" />
                        <button onClick={load} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition">Filter</button>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-gray-400 animate-pulse">Loading payments…</div>
                    ) : error ? (
                        <div className="p-12 text-center text-red-500">{error}</div>
                    ) : payments.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">No payments found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs">
                                    <tr>
                                        <th className="text-left px-4 py-3">Payment ID</th>
                                        <th className="text-left px-4 py-3">Invoice</th>
                                        <th className="text-left px-4 py-3">Amount</th>
                                        <th className="text-left px-4 py-3">Payment Date</th>
                                        <th className="text-left px-4 py-3">Reference</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {payments.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                                            <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.id?.slice(0, 8)}…</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.invoiceId?.slice(0, 8)}…</td>
                                            <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">${Number(p.amountReceived).toLocaleString()}</td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : "—"}</td>
                                            <td className="px-4 py-3 text-gray-400 text-xs">{p.referenceNumber ?? "—"}</td>
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

export default function PaymentsPage() {
    return (
        <PaymentsContent />
    );
}
