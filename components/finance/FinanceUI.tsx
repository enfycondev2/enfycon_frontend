import React from "react";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDateUS(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return "—";
    
    // Check if it's a date-only string (YYYY-MM-DD or Prisma's T00:00:00.000Z)
    const isDateOnly = typeof dateInput === "string" && (
        /^\d{4}-\d{2}-\d{2}$/.test(dateInput) || 
        dateInput.endsWith("T00:00:00.000Z")
    );

    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

    return date.toLocaleDateString("en-US", {
        timeZone: isDateOnly ? "UTC" : "America/New_York",
        month: "2-digit",
        day: "2-digit",
        year: "numeric"
    });
}

export const formatPhoneNumber = (value: string) => {
    // Keep the + and digits only
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) return "+1 ";
    
    // Assume US format for now as requested
    let formatted = "+1 ";
    // If it already started with 1, don't double it
    const actualDigits = digits.startsWith("1") ? digits.substring(1) : digits;
    
    if (actualDigits.length > 0) {
        formatted += actualDigits.substring(0, 3);
    }
    if (actualDigits.length > 3) {
        formatted += "-" + actualDigits.substring(3, 6);
    }
    if (actualDigits.length > 6) {
        formatted += "-" + actualDigits.substring(6, 10);
    }
    return formatted;
};

// Shared Tailwind Classes
export const inputCls = "w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm transition";
export const selectCls = `${inputCls} cursor-pointer`;
export const btnPrimary = "bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition";
export const btnSecondary = "border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition";

// Shared Components
export function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        ACTIVE: "bg-green-100 text-green-700",
        INACTIVE: "bg-gray-100 text-gray-500",
        ENDED: "bg-red-100 text-red-600",
        ON_HOLD: "bg-yellow-100 text-yellow-700",
        PENDING: "bg-yellow-100 text-yellow-700",
        PAID: "bg-green-100 text-green-700",
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-500"}`}>
            {status.replace("_", " ")}
        </span>
    );
}

export function Field({ label, children, hint, spanFull }: { label: string; children: React.ReactNode; hint?: React.ReactNode; spanFull?: boolean }) {
    return (
        <div className={spanFull ? "md:col-span-2" : ""}>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            {children}
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </div>
    );
}

export function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
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
