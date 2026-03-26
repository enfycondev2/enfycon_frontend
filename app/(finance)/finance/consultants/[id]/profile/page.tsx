"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { financeGet } from "@/lib/financeClient";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";
import { StatusBadge, formatDateUS } from "@/components/finance/FinanceUI";

export default function ConsultantProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) load();
    }, [id]);

    async function load() {
        try {
            const res = await financeGet(`finance/consultants/${id}`);
            setData(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Consultant not found.</div>;

    const sectionCls = "bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-6";
    const titleCls = "text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2";
    const labelCls = "text-xs text-gray-400 mb-0.5";
    const valCls = "text-sm font-semibold text-gray-800 dark:text-gray-200";

    const InfoItem = ({ label, value }: { label: string, value: any }) => (
        <div>
            <p className={labelCls}>{label}</p>
            <p className={valCls}>{value || "—"}</p>
        </div>
    );

    // Financial calculations
    const allInvoices = (data.projects ?? []).flatMap((p: any) => p.invoices ?? []);
    const totalRevenue = allInvoices.reduce((s: number, i: any) => s + (Number(i.totalAmount) || 0), 0);
    const totalCost = (data.payouts ?? []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
    const totalMargin = totalRevenue - totalCost;
    const marginPerc = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    const unpaidAR = allInvoices.filter((i: any) => i.status !== "PAID").reduce((s: number, i: any) => s + (Number(i.totalAmount) || 0), 0);
    const unpaidAP = (data.payouts ?? []).filter((p: any) => p.status !== "PAID").reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);

    // Smart Period Grouping - Monthly Aggregation
    const periodMap = new Map<string, any>();
    allInvoices.forEach((inv: any) => {
        const key = `${inv.invoiceYear}-${inv.invoiceMonth}`;
        if (!periodMap.has(key)) periodMap.set(key, { ar: [], ap: [], year: inv.invoiceYear, month: inv.invoiceMonth, rev: 0, cost: 0 });
        const entry = periodMap.get(key);
        entry.ar.push(inv);
        entry.rev += Number(inv.totalAmount) || 0;
    });
    (data.payouts ?? []).forEach((p: any) => {
        const key = `${p.year}-${p.month}`;
        if (!periodMap.has(key)) periodMap.set(key, { ar: [], ap: [], year: p.year, month: p.month, rev: 0, cost: 0 });
        const entry = periodMap.get(key);
        entry.ap.push(p);
        entry.cost += Number(p.amount) || 0;
    });
    const sortedPeriods = Array.from(periodMap.values()).sort((a, b) => {
        const valB = (b.year || 0) * 100 + (b.month || 0);
        const valA = (a.year || 0) * 100 + (a.month || 0);
        return valB - valA;
    });

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <div className="flex items-center justify-between mb-8">
                <DashboardBreadcrumb title="Consultant Profile" text={`Finance / Consultants / ${data.name} / Profile`} />
                <Link href={`/finance/consultants/${id}`} className="text-sm font-bold text-violet-600 hover:underline flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back to Detail
                </Link>
            </div>

            {/* Header / Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                <div className="md:col-span-1 bg-gradient-to-br from-violet-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-violet-100 dark:shadow-none min-w-[200px]">
                    <p className="text-[10px] uppercase font-bold opacity-70 tracking-widest mb-1">Consultant</p>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black truncate">{data.name}</h2>
                    </div>
                    <div className="mt-2 text-[10px] font-bold bg-white/20 w-fit px-2 py-0.5 rounded-lg uppercase tracking-wider">{data.status}</div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Current AR (Unpaid)</p>
                    <h3 className="text-2xl font-black text-red-500">${unpaidAR.toLocaleString()}</h3>
                    <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">Total Recv: ${totalRevenue.toLocaleString()}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Current AP (Unpaid)</p>
                    <h3 className="text-2xl font-black text-orange-500">${unpaidAP.toLocaleString()}</h3>
                    <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">Total Paid: ${totalCost.toLocaleString()}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Net Margin</p>
                    <h3 className="text-2xl font-black text-violet-600">${totalMargin.toLocaleString()}</h3>
                    <p className="text-[9px] font-bold text-violet-400 mt-1 uppercase">Profit: {marginPerc.toFixed(1)}%</p>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl p-6 border border-emerald-100 dark:border-emerald-900/20 shadow-sm flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-widest mb-1">Next Payout</p>
                    <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-400 italic">Upcoming</h3>
                </div>
            </div>

            {/* Onboarding Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className={`${sectionCls} !mb-0`}>
                    <h4 className={titleCls}><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> Contact & Employment</h4>
                    <div className="space-y-4">
                        <div className="break-all"><InfoItem label="Email" value={data.email} /></div>
                        <InfoItem label="Phone" value={data.phone} />
                        <InfoItem label="Immigration Status" value={data.immigrationStatus} />
                        <InfoItem label="Engagement Type" value={data.engagementType} />
                    </div>
                </div>

                <div className={`${sectionCls} !mb-0`}>
                    <h4 className={titleCls}><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> Setup & Assignments</h4>
                    <div className="space-y-4">
                        <InfoItem label="Recruiter" value={data.recruiter?.fullName} />
                        <InfoItem label="Acct Manager" value={data.accountManager?.fullName} />
                        <InfoItem label="Pod Head" value={data.podHead?.fullName} />
                        <InfoItem label="Payment Terms" value={data.clientPaymentTermsDays ? `${data.clientPaymentTermsDays} Days` : null} />
                    </div>
                </div>

                <div className={`${sectionCls} !mb-0 flex flex-col`}>
                    <h4 className={titleCls}><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Engagement History</h4>
                    <div className="space-y-4 flex-1">
                        {!data.projects?.length ? (
                            <p className="text-xs text-gray-400 italic">No active projects assigned.</p>
                        ) : data.projects.map((p: any) => (
                            <div key={p.id} className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{p.clientName}</p>
                                <p className="text-[10px] text-emerald-600 font-bold">${p.billingRate}/hr</p>
                                <p className="text-[10px] text-gray-400 mt-1">{formatDateUS(p.startDate)} — {p.endDate ? formatDateUS(p.endDate) : "Ongoing"}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Financial Contract & Rates Card — Inspired by Consultant Page */}
            <div className={sectionCls}>
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50 dark:border-gray-700/50">
                    <h4 className="text-[10px] font-black text-violet-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Contract & Financial Terms
                    </h4>
                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        Last Updated: {data.updatedAt ? formatDateUS(data.updatedAt) : 'N/A'}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-12">
                    <div>
                        <p className={labelCls}>Client Billing Terms</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-xl font-black text-gray-900 dark:text-white">Net {data.clientPaymentTermsDays || 30}</p>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Days</span>
                        </div>
                    </div>
                    
                    <div>
                        <p className={labelCls}>Consultant Payout Terms</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-xl font-black text-gray-900 dark:text-white">Net {data.projects?.[0]?.contracts?.[0]?.paymentTermsDays || 15}</p>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Days</span>
                        </div>
                    </div>

                    <div>
                        <p className={labelCls}>Current Bill Rate (Revenue)</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-emerald-600 font-black text-xl">${Number(data.projects?.[0]?.contracts?.[0]?.billRate || 0).toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-gray-400">/hr</span>
                        </div>
                    </div>

                    <div>
                        <p className={labelCls}>Current Pay Rate (Cost)</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-orange-500 font-black text-xl">${Number(data.projects?.[0]?.contracts?.[0]?.payRate || 0).toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-gray-400">/hr</span>
                        </div>
                    </div>

                    <div className="col-span-full md:col-span-2 pt-4 border-t border-gray-50 dark:border-gray-700/30">
                        <p className={labelCls}>Current End Client</p>
                        <p className="text-base font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight">
                            {data.projects?.[0]?.clientName || "Direct"} <span className="text-gray-400 font-medium">/</span> {data.projects?.[0]?.endClientName || "N/A"}
                        </p>
                    </div>

                    <div className="col-span-full md:col-span-2 pt-4 border-t border-gray-50 dark:border-gray-700/30">
                        <p className={labelCls}>Contract Duration</p>
                        <p className="text-base font-black text-gray-800 dark:text-gray-200">
                            {data.projects?.[0]?.startDate ? formatDateUS(data.projects[0].startDate) : 'N/A'} 
                            <span className="mx-2 text-gray-300">→</span>
                            {data.projects?.[0]?.endDate ? formatDateUS(data.projects[0].endDate) : <span className="text-violet-500 italic uppercase text-sm">Ongoing</span>}
                        </p>
                    </div>
                </div>
            </div>

            {/* QuickBooks-Style Unified Ledger */}
            <div className={`${sectionCls} !p-0 overflow-hidden`}>
                <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/10">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        Financial Ledger (Register)
                    </h4>
                    <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-tighter">
                        <span className="flex items-center gap-1.5 text-emerald-600"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Income (AR)</span>
                        <span className="flex items-center gap-1.5 text-orange-500"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> Expense (AP)</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
                                <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-50 dark:border-gray-900">Date</th>
                                <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-50 dark:border-gray-900">Type / Reference</th>
                                <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-50 dark:border-gray-900">Description / Rates</th>
                                <th className="py-3 px-6 text-[9px] font-black text-emerald-600 uppercase tracking-widest border-r border-gray-50 dark:border-gray-900">Income (AR)</th>
                                <th className="py-3 px-6 text-[9px] font-black text-orange-500 uppercase tracking-widest border-r border-gray-50 dark:border-gray-900">Expense (AP)</th>
                                <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-50 dark:border-gray-900 text-center">Net Terms / Due</th>
                                <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPeriods.map(period => {
                                // Combine AR and AP for this month into a chronological stream
                                const txs = [
                                    ...period.ar.map((inv: any) => ({ 
                                        type: 'INVOICE', 
                                        date: inv.invoiceDate || inv.createdAt, 
                                        ref: `INV-${inv.id.substring(0,4)}`,
                                        rateLabel: `Bill Rate: $${inv.billRate}/hr`,
                                        desc: `${inv.hours} hrs @ $${inv.billRate}/hr`,
                                        income: Number(inv.totalAmount),
                                        expense: null,
                                        termDays: data.clientPaymentTermsDays || 30,
                                        due: new Date(new Date(inv.createdAt).getTime() + (data.clientPaymentTermsDays || 30) * 24 * 60 * 60 * 1000).toISOString(),
                                        status: inv.status,
                                        id: inv.id
                                    })),
                                    ...period.ap.map((pay: any) => ({
                                        type: 'PAYOUT',
                                        date: pay.payoutDate || pay.createdAt,
                                        ref: `PAY-${pay.id.substring(0,4)}`,
                                        rateLabel: `Pay Rate: $${pay.payRate}/hr`,
                                        desc: `${pay.hours} hrs @ $${pay.payRate}/hr`,
                                        income: null,
                                        expense: Number(pay.amount),
                                        termDays: data.projects?.[0]?.contracts?.[0]?.paymentTermsDays || 15,
                                        due: pay.payoutDate || null,
                                        status: pay.status,
                                        id: pay.id
                                    }))
                                ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                const monthName = new Date(period.year, period.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

                                return (
                                    <React.Fragment key={`${period.year}-${period.month}`}>
                                        <tr className="bg-gray-50/80 dark:bg-gray-900/40">
                                            <td colSpan={7} className="py-2.5 px-6 text-[10px] font-black text-violet-600 uppercase tracking-[0.2em] bg-violet-50/30 dark:bg-violet-900/10">
                                                {monthName}
                                            </td>
                                        </tr>
                                        {txs.map((tx, idx) => (
                                            <tr key={tx.id} className={`border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800/20' : 'bg-gray-50/20 dark:bg-gray-800/40'}`}>
                                                <td className="py-4 px-6 text-[11px] font-bold text-gray-500 whitespace-nowrap border-r border-gray-50 dark:border-gray-900">{formatDateUS(tx.date)}</td>
                                                <td className="py-4 px-6 border-r border-gray-50 dark:border-gray-900">
                                                    <div className="flex flex-col">
                                                        <span className={`text-[10px] font-black tracking-tight ${tx.type === 'INVOICE' ? 'text-emerald-600' : 'text-orange-600'}`}>{tx.type}</span>
                                                        <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">{tx.ref}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 border-r border-gray-50 dark:border-gray-900">
                                                    <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">{tx.desc}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 italic uppercase">{tx.rateLabel}</p>
                                                </td>
                                                <td className="py-4 px-6 text-[13px] font-black text-emerald-600 text-right border-r border-gray-50 dark:border-gray-900">
                                                    {tx.income ? `$${tx.income.toLocaleString()}` : '—'}
                                                </td>
                                                <td className="py-4 px-6 text-[13px] font-black text-orange-500 text-right border-r border-gray-50 dark:border-gray-900">
                                                    {tx.expense ? `$${tx.expense.toLocaleString()}` : '—'}
                                                </td>
                                                <td className="py-4 px-6 text-[11px] font-bold text-gray-500 text-center border-r border-gray-50 dark:border-gray-900">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[9px] font-black text-violet-400 uppercase mb-0.5 whitespace-nowrap">NET {tx.termDays} DAYS</span>
                                                        {tx.type === 'INVOICE' ? (
                                                            <span className={tx.status === 'PAID' ? 'text-gray-400' : 'text-red-500'}>{formatDateUS(tx.due)}</span>
                                                        ) : (
                                                            <span>{tx.due ? formatDateUS(tx.due) : '—'}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-tighter ${
                                                        tx.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 
                                                        tx.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {tx.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-violet-600 text-white font-black">
                                <td colSpan={3} className="py-4 px-6 text-[10px] uppercase tracking-widest text-right">Total Net Consultant Profit</td>
                                <td className="py-4 px-6 text-lg text-right border-x border-white/10 decoration-emerald-300 underline underline-offset-4 decoration-2">${totalRevenue.toLocaleString()}</td>
                                <td className="py-4 px-6 text-lg text-right border-r border-white/10 decoration-orange-300 underline underline-offset-4 decoration-2">${totalCost.toLocaleString()}</td>
                                <td colSpan={2} className="py-4 px-6 text-lg text-center bg-violet-700">
                                    <div className="flex flex-col items-center">
                                        <span className="text-xl">${totalMargin.toLocaleString()}</span>
                                        <span className="text-[9px] opacity-70 tracking-widest">NET MARGIN: {marginPerc.toFixed(1)}%</span>
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* C2C Details */}
            {data.engagementType === "C2C" && (
                <div className={sectionCls}>
                    <h4 className={titleCls}><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> C2C Vendor Information</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-gray-50 dark:bg-gray-900/40 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <InfoItem label="Vendor Name" value={data.c2cVendorName} />
                        <InfoItem label="Contact Person" value={data.c2cContactPerson} />
                        <InfoItem label="Contact Email" value={data.c2cContactEmail} />
                        <InfoItem label="Phone / Fax" value={data.c2cPhoneFax} />
                        <div className="md:col-span-3">
                            <InfoItem label="Vendor Address" value={data.c2cAddress} />
                        </div>
                        <InfoItem label="Setup Date" value={formatDateUS(data.c2cProjectStartDate)} />
                    </div>
                </div>
            )}

            {/* System Info */}
            <div className="flex justify-between items-center px-4">
                <p className="text-[10px] text-gray-400 italic uppercase tracking-widest font-medium">Record Created: {formatDateUS(data.createdAt)}</p>
                <button onClick={() => window.print()} className="text-[10px] font-bold text-violet-600 hover:text-violet-700 uppercase tracking-widest flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Print Profile
                </button>
            </div>
        </div>
    );
}
