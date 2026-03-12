"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StepIndicator, Field, inputCls, selectCls } from "@/components/finance/FinanceUI";
import FinancePinGate from "@/components/finance/FinancePinGate";
import { financePost, financeGet } from "@/lib/financeClient";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Section1Data {
    name: string; 
    email: string; 
    phone: string;
    immigrationStatus: string; 
    engagementType: string;
    recruiterId: string; 
    accountManagerId: string;
    podHeadId: string; 
    jobCode: string;
    c2cVendorName: string; 
    c2cContactPerson: string;
    c2cContactEmail: string; 
    c2cAddress: string;
    c2cPhoneFax: string; 
    clientPaymentTermsDays: string;
    c2cProjectStartDate: string;
}

interface Section3Data {
    clientName: string; 
    endClientName: string; 
    startDate: string; 
    endDate: string;
    billingRate: string; 
    payRate: string; 
    currency: string; 
    paymentTermsDays: string;
}

// ─── Section 1: Candidate Info ───────────────────────────────────────────────

function Section1({ onSaved }: { onSaved: (consultantId: string, engagementType: string) => void }) {
    const [form, setForm] = useState<Section1Data>({
        name: "", email: "", phone: "", immigrationStatus: "", engagementType: "",
        recruiterId: "", accountManagerId: "", podHeadId: "", jobCode: "",
        c2cVendorName: "", c2cContactPerson: "", c2cContactEmail: "",
        c2cAddress: "", c2cPhoneFax: "", clientPaymentTermsDays: "30", c2cProjectStartDate: ""
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [options, setOptions] = useState<{ recruiters: any[], accountManagers: any[], podHeads: any[] }>({ recruiters: [], accountManagers: [], podHeads: [] });

    useEffect(() => {
        financeGet("finance/options/staff")
            .then(res => setOptions(res))
            .catch(err => console.error("Failed to fetch staff options", err));
    }, []);

    function set(field: keyof Section1Data, value: string) {
        setForm((f) => ({ ...f, [field]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true); setError("");
        try {
            const payload: any = {
                name: form.name, 
                email: form.email
            };
            if (form.recruiterId) payload.recruiterId = form.recruiterId;
            if (form.accountManagerId) payload.accountManagerId = form.accountManagerId;
            if (form.podHeadId) payload.podHeadId = form.podHeadId;
            if (form.phone) payload.phone = form.phone;
            if (form.immigrationStatus) payload.immigrationStatus = form.immigrationStatus;

            if (form.engagementType) {
                payload.engagementType = form.engagementType;
                if (form.clientPaymentTermsDays) payload.clientPaymentTermsDays = parseInt(form.clientPaymentTermsDays, 10);
                
                if (form.engagementType === "C2C") {
                    payload.c2cVendorName = form.c2cVendorName;
                    payload.c2cContactPerson = form.c2cContactPerson;
                    payload.c2cContactEmail = form.c2cContactEmail;
                    payload.c2cAddress = form.c2cAddress;
                    payload.c2cPhoneFax = form.c2cPhoneFax;
                    if (form.c2cProjectStartDate) payload.c2cProjectStartDate = new Date(form.c2cProjectStartDate).toISOString();
                }
            }

            const res = await financePost("finance/consultants", payload);
            const returnedId = res?.id ?? res?.consultantId ?? res?.data?.id ?? "";
            
            if (!returnedId) throw new Error("Failed to get consultant ID from server.");

            if (form.jobCode.trim() !== "") {
                try {
                    await financePost(`finance/consultants/${returnedId}/job-submission`, {
                        jobCode: form.jobCode.trim(),
                        candidateCurrentLocation: "N/A",
                        submissionDate: new Date().toISOString()
                    });
                } catch (subErr) {
                    console.error("Optional job submission failed", subErr);
                }
            }
            
            onSaved(returnedId, form.engagementType);
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Full Name *">
                    <input required className={inputCls} placeholder="John Smith" value={form.name} onChange={(e) => set("name", e.target.value)} />
                </Field>
                <Field label="Email Address *">
                    <input required type="email" className={inputCls} placeholder="john@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </Field>
                <Field label="Phone">
                    <input type="tel" className={inputCls} placeholder="+1-555-0100" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </Field>
                <Field label="Immigration Status">
                    <select className={selectCls} value={form.immigrationStatus} onChange={(e) => set("immigrationStatus", e.target.value)}>
                        <option value="">— Select —</option>
                        {["H1B", "OPT", "GC", "US_CITIZEN", "TN", "CPT"].map((v) => <option key={v} value={v}>{v.replace("_", " ")}</option>)}
                    </select>
                </Field>
                <Field label="Engagement Type">
                    <select className={selectCls} value={form.engagementType} onChange={(e) => set("engagementType", e.target.value)}>
                        <option value="">— Select —</option>
                        {["W2", "C2C", "1099"].map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                </Field>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Job Code (Optional)" hint="Link to a job submission">
                    <input className={inputCls} placeholder="e.g. JOB-001" value={form.jobCode} onChange={(e) => set("jobCode", e.target.value)} />
                </Field>
                <Field label="Client Payment Terms (Days) *">
                    <input required type="number" min="0" className={inputCls} placeholder="30" value={form.clientPaymentTermsDays} onChange={(e) => set("clientPaymentTermsDays", e.target.value)} />
                </Field>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <Field label="Recruiter">
                    <select className={selectCls} value={form.recruiterId} onChange={(e) => set("recruiterId", e.target.value)}>
                        <option value="">— Unassigned —</option>
                        {options.recruiters.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </Field>
                <Field label="Account Manager">
                    <select className={selectCls} value={form.accountManagerId} onChange={(e) => set("accountManagerId", e.target.value)}>
                        <option value="">— Unassigned —</option>
                        {options.accountManagers.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </Field>
                <Field label="Pod Head">
                    <select className={selectCls} value={form.podHeadId} onChange={(e) => set("podHeadId", e.target.value)}>
                        <option value="">— Unassigned —</option>
                        {options.podHeads.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </Field>
            </div>

            {form.engagementType === "C2C" && (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-5 space-y-5">
                    <h3 className="text-sm font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Agency / Vendor Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-violet-50/50 dark:bg-violet-900/10 p-4 rounded-xl border border-violet-100 dark:border-violet-900/30">
                        <Field label="Agency / Vendor Name *">
                            <input required className={inputCls} placeholder="Apex Systems" value={form.c2cVendorName} onChange={(e) => set("c2cVendorName", e.target.value)} />
                        </Field>
                        <Field label="Contact Person *">
                            <input required className={inputCls} placeholder="Jane Doe" value={form.c2cContactPerson} onChange={(e) => set("c2cContactPerson", e.target.value)} />
                        </Field>
                        <Field label="Contact Email *">
                            <input required type="email" className={inputCls} placeholder="jane@apex.com" value={form.c2cContactEmail} onChange={(e) => set("c2cContactEmail", e.target.value)} />
                        </Field>
                        <Field label="Phone & Fax">
                            <input className={inputCls} placeholder="123-456-7890" value={form.c2cPhoneFax} onChange={(e) => set("c2cPhoneFax", e.target.value)} />
                        </Field>
                        <Field label="Address">
                            <input className={inputCls} placeholder="123 Main St, City, ST" value={form.c2cAddress} onChange={(e) => set("c2cAddress", e.target.value)} />
                        </Field>
                        <Field label="Vendor Assignment Start Date">
                            <input type="date" className={inputCls} value={form.c2cProjectStartDate} onChange={(e) => set("c2cProjectStartDate", e.target.value)} />
                        </Field>
                    </div>
                </div>
            )}

            {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2">{error}</p>}

            <div className="flex justify-end pt-2">
                <button type="submit" disabled={saving}
                    className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold px-8 py-2.5 rounded-xl transition flex items-center gap-2">
                    {saving ? "Saving…" : <>Save & Continue <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></>}
                </button>
            </div>
        </form>
    );
}

// ─── Section 3: Billing & Rates ─────────────────────────────────────────────

function Section3({ consultantId, engagementType, onDone }: { consultantId: string; engagementType: string; onDone: () => void }) {
    const [form, setForm] = useState<Section3Data>({
        clientName: "", 
        endClientName: "", 
        startDate: "", 
        endDate: "",
        billingRate: "", 
        payRate: "", 
        currency: "USD", 
        paymentTermsDays: "30"
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    function set(field: keyof Section3Data, value: string) {
        setForm((f) => ({ ...f, [field]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true); setError("");
        try {
            const projectPayload: any = {
                consultantId,
                clientName: form.clientName,
                startDate: new Date(form.startDate).toISOString()
            };
            if (form.endClientName) projectPayload.endClientName = form.endClientName;
            if (form.endDate) projectPayload.endDate = new Date(form.endDate).toISOString();

            const project = await financePost("finance/projects", projectPayload);
            const projectId = project?.id ?? project?.data?.id;
            
            if (!projectId) throw new Error("Failed to create project.");

            await financePost("finance/contracts", {
                projectId,
                billRate: parseFloat(form.billingRate),
                payRate: parseFloat(form.payRate),
                currency: form.currency,
                paymentTermsDays: parseInt(form.paymentTermsDays, 10)
            });
            onDone();
        } catch (err: any) { setError(err.message); }
        finally { setSaving(false); }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Client Name *">
                    <input required className={inputCls} placeholder="Tech Corp" value={form.clientName} onChange={(e) => set("clientName", e.target.value)} />
                </Field>
                <Field label="End Client Name">
                    <input className={inputCls} placeholder="Google / Amazon (Optional)" value={form.endClientName} onChange={(e) => set("endClientName", e.target.value)} />
                </Field>
                <Field label="Project Start Date *">
                    <input required type="date" className={inputCls} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
                </Field>
                <Field label="Project End Date" hint="Quick-select or enter manually">
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            {[{label: "3 Mo", months: 3}, {label: "6 Mo", months: 6}, {label: "12 Mo", months: 12}].map(({ label, months }) => {
                                const disabled = !form.startDate;
                                return (
                                    <button
                                        key={months}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => {
                                            if (!form.startDate) return;
                                            const d = new Date(form.startDate);
                                            d.setMonth(d.getMonth() + months);
                                            set("endDate", d.toISOString().slice(0, 10));
                                        }}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                                            disabled
                                                ? "border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-600"
                                                : "border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/40"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                        <input type="date" className={inputCls} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
                        {form.endDate && form.startDate && (
                            <p className="text-[11px] text-violet-600 dark:text-violet-400 font-medium text-center">
                                📅 End: {new Date(form.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </p>
                        )}
                    </div>
                </Field>
                <Field label="Bill Rate ($/hr) *">
                    <input required type="number" min="0" step="0.01" className={inputCls} placeholder="60" value={form.billingRate} onChange={(e) => set("billingRate", e.target.value)} />
                </Field>
                <Field label="Pay Rate ($/hr) *">
                    <input required type="number" min="0" step="0.01" className={inputCls} placeholder="50" value={form.payRate} onChange={(e) => set("payRate", e.target.value)} />
                </Field>
                {engagementType !== "W2" && (
                    <Field label="Consultant Payment Terms (Days) *">
                        <input required type="number" min="1" step="1" className={inputCls} placeholder="30" value={form.paymentTermsDays} onChange={(e) => set("paymentTermsDays", e.target.value)} />
                    </Field>
                )}
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2">{error}</p>}

            <div className="flex justify-end pt-2">
                <button type="submit" disabled={saving}
                    className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold px-8 py-2.5 rounded-xl transition flex items-center gap-2">
                    {saving ? "Saving…" : <>Finish <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></>}
                </button>
            </div>
        </form>
    );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

const STEPS = ["Candidate Info", "Billing & Rates"];

function CandidateOnboardContent() {
    const [step, setStep] = useState(0);
    const [consultantId, setConsultantId] = useState("");
    const [engagementType, setEngagementType] = useState("");
    const [done, setDone] = useState(false);

    if (done) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Candidate Onboarded!</h2>
                <p className="text-gray-500 dark:text-gray-400">All details have been saved successfully.</p>
                <div className="flex gap-3 mt-2">
                    <Link href={`/finance/consultants/${consultantId}`} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2 rounded-xl transition text-sm">View Consultant</Link>
                    <button onClick={() => { setStep(0); setConsultantId(""); setEngagementType(""); setDone(false); }} className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-5 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm">
                        Add Another
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-1 rounded mb-4 text-center font-bold">MODE: STABLE ONBOARDING</div>
            <DashboardBreadcrumb title="Candidate Onboarding" text="Finance / Onboarding" />

            <div className="mt-8">
                <StepIndicator current={step} steps={STEPS} />

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-violet-50 to-white dark:from-violet-900/20 dark:to-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm">{step + 1}</div>
                            <div>
                                <h2 className="font-bold text-gray-800 dark:text-white">{STEPS[step]}</h2>
                                <p className="text-xs text-gray-400">
                                    {step === 0 ? "Personal and employment details" : "Billing and pay rates"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        {step === 0 && <Section1 onSaved={(id, type) => { setConsultantId(id); setEngagementType(type); setStep(1); }} />}
                        {step === 1 && <Section3 consultantId={consultantId} engagementType={engagementType} onDone={() => setDone(true)} />}
                    </div>
                </div>

                {step > 0 && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <p className="text-xs text-green-700 dark:text-green-400 font-medium">Consultant saved successfully.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CandidateOnboardPage() {
    return (
        <FinancePinGate>
            <CandidateOnboardContent />
        </FinancePinGate>
    );
}
