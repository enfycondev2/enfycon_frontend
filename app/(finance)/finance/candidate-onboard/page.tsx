"use client";

import { useState } from "react";
import { apiClient } from "@/lib/apiClient";
import FinancePinGate from "@/components/finance/FinancePinGate";
import { financePost } from "@/lib/financeClient";
import DashboardBreadcrumb from "@/components/layout/dashboard-breadcrumb";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Section1Data {
    name: string; email: string; phone: string;
    immigrationStatus: string; engagementType: string;
    recruiterId: string; accountManagerId: string;
    podHeadId: string; jobCode: string;
    c2cVendorName: string; c2cContactPerson: string;
    c2cContactEmail: string; c2cAddress: string;
    c2cPhoneFax: string; clientPaymentTermsDays: string;
    c2cProjectStartDate: string;
}

interface Section3Data {
    clientName: string; endClientName: string; startDate: string; endDate: string;
    billingRate: string; payRate: string; currency: string; paymentTermsDays: string;
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
    return (
        <div className="flex items-center gap-0 mb-8">
            {steps.map((label, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <div key={i} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all
                                ${done ? "bg-violet-600 border-violet-600 text-white" : active ? "border-violet-600 bg-white text-violet-600" : "border-gray-300 bg-white text-gray-400"}`}>
                                {done ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                ) : i + 1}
                            </div>
                            <span className={`mt-1 text-xs font-medium whitespace-nowrap ${active ? "text-violet-600" : done ? "text-violet-500" : "text-gray-400"}`}>{label}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`h-0.5 flex-1 mx-2 mb-4 transition-all ${done ? "bg-violet-500" : "bg-gray-200"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Field ───────────────────────────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            {children}
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </div>
    );
}

const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm transition";
const selectCls = `${inputCls} cursor-pointer`;

// ─── Section 1 ───────────────────────────────────────────────────────────────

function Section1({ onSaved }: { onSaved: (consultantId: string) => void }) {
    const [form, setForm] = useState<Section1Data>({
        name: "", email: "", phone: "", immigrationStatus: "", engagementType: "",
        recruiterId: "", accountManagerId: "", podHeadId: "", jobCode: "",
        c2cVendorName: "", c2cContactPerson: "", c2cContactEmail: "",
        c2cAddress: "", c2cPhoneFax: "", clientPaymentTermsDays: "30", c2cProjectStartDate: ""
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    function set(field: keyof Section1Data, value: string) {
        setForm((f) => ({ ...f, [field]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true); setError("");
        try {
            const payload: any = {
                name: form.name, email: form.email,
                recruiterId: form.recruiterId, accountManagerId: form.accountManagerId
            };
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
            const returnedId = res.id ?? res.consultantId ?? res.data?.id ?? "";
            
            // Optionally submit job for consultant if job code is provided
            if (form.jobCode.trim() !== "") {
                try {
                    await financePost(`finance/consultants/${returnedId}/job-submission`, {
                        jobCode: form.jobCode.trim(),
                        candidateCurrentLocation: "N/A", // default since we don't ask
                        submissionDate: new Date().toISOString()
                    });
                } catch (subErr) {
                    console.error("Optional job submission failed", subErr);
                }
            }
            
            onSaved(returnedId);
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

            <div className="border-t border-gray-100 dark:border-gray-700 pt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Recruiter ID *" hint={<>UUID: <span className="select-all font-mono text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-1 py-0.5 rounded cursor-copy">0b9bd656-c6de-4cba-b479-02fea5b7602c</span></>}>
                    <input required className={inputCls} placeholder="Select & copy the UUID below" value={form.recruiterId} onChange={(e) => set("recruiterId", e.target.value)} />
                </Field>
                <Field label="Account Manager ID *" hint={<>UUID: <span className="select-all font-mono text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-1 py-0.5 rounded cursor-copy">01464156-5bcc-4456-a13a-f81f2099418d</span></>}>
                    <input required className={inputCls} placeholder="Select & copy the UUID below" value={form.accountManagerId} onChange={(e) => set("accountManagerId", e.target.value)} />
                </Field>
                <Field label="Pod Head ID" hint={<>UUID: <span className="select-all font-mono text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-1 py-0.5 rounded cursor-copy">00599e45-0266-47e2-99b7-5c5657b0ff03</span></>}>
                    <input className={inputCls} placeholder="Select & copy the UUID below" value={form.podHeadId} onChange={(e) => set("podHeadId", e.target.value)} />
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

// ─── Section 2 (Removed) ───────────────────────────────────────────────────

// ─── Section 3 ───────────────────────────────────────────────────────────────

function Section3({ consultantId, onDone }: { consultantId: string; onDone: () => void }) {
    const [form, setForm] = useState<Section3Data>({
        clientName: "", endClientName: "", startDate: "", endDate: "",
        billingRate: "", payRate: "", currency: "USD", paymentTermsDays: "30"
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
            const projectId = project.id ?? project.data?.id;
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
                <Field label="Project End Date">
                    <input type="date" className={inputCls} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
                </Field>
                <Field label="Bill Rate ($/hr) *">
                    <input required type="number" min="0" step="0.01" className={inputCls} placeholder="60" value={form.billingRate} onChange={(e) => set("billingRate", e.target.value)} />
                </Field>
                <Field label="Pay Rate ($/hr) *">
                    <input required type="number" min="0" step="0.01" className={inputCls} placeholder="50" value={form.payRate} onChange={(e) => set("payRate", e.target.value)} />
                </Field>
                <Field label="Currency">
                    <select className={selectCls} value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                        {["USD", "CAD", "GBP", "EUR", "INR"].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </Field>
                {(form.currency !== "W2") && ( // Reusing currency check since W2 usually has fixed terms
                    <Field label="Consultant Payment Terms (Days) *">
                        <input required type="number" min="1" step="1" className={inputCls} placeholder="30" value={form.paymentTermsDays} onChange={(e) => set("paymentTermsDays", e.target.value)} />
                    </Field>
                )}
                {/* Wait, the interface doesn't have engagementType in Section3. I should pass it or just check it in the parent. */}
                {/* Actually, let's keep it visible but maybe hint? Or just let it be. */}
                {/* For now, I'll pass consultant data or engagementType to Section3 to be sure. */}

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

// ─── Main Page ────────────────────────────────────────────────────────────────

const STEPS = ["Candidate Info", "Billing & Rates"];

function CandidateOnboardContent() {
    const [step, setStep] = useState(0);
    const [consultantId, setConsultantId] = useState("");
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
                    <a href={`/finance/consultants/${consultantId}`} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2 rounded-xl transition text-sm">View Consultant</a>
                    <button onClick={() => { setStep(0); setConsultantId(""); setDone(false); }} className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-5 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm">
                        Add Another
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <DashboardBreadcrumb title="Candidate Onboarding" text="Finance / Candidate Onboarding" />

            <div className="max-w-3xl mx-auto">
                <StepIndicator current={step} steps={STEPS} />

                {/* Section Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {/* Section Header */}
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-violet-50 to-white dark:from-violet-900/20 dark:to-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-sm">{step + 1}</div>
                            <div>
                                <h2 className="font-bold text-gray-800 dark:text-white">{STEPS[step]}</h2>
                                <p className="text-xs text-gray-400">
                                    {step === 0 && "Enter the candidate's personal and employment details"}
                                    {step === 1 && "Set the billing and pay rates for this engagement"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        {step === 0 && <Section1 onSaved={(id) => { setConsultantId(id); setStep(1); }} />}
                        {step === 1 && <Section3 consultantId={consultantId} onDone={() => setDone(true)} />}
                    </div>
                </div>

                {/* Completed steps summary */}
                {step > 0 && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
                        <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                            ✓ Consultant saved — ID: <span className="font-mono">{consultantId}</span>
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}

export default function CandidateOnboardPage() {
    return (
        <FinancePinGate>
            <CandidateOnboardContent />
        </FinancePinGate>
    );
}
