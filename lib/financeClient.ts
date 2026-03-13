import { apiClient } from "./apiClient";

const PIN_KEY = "finance_pin";

export function getStoredPin(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(PIN_KEY);
}

export function setStoredPin(pin: string): void {
    sessionStorage.setItem(PIN_KEY, pin);
}

export function clearStoredPin(): void {
    if (typeof window !== "undefined") {
        sessionStorage.removeItem(PIN_KEY);
        window.dispatchEvent(new Event("finance-locked"));
    }
}

function financeHeaders(pin?: string): Record<string, string> {
    const p = pin ?? getStoredPin() ?? "";
    return { "x-finance-pin": p, "Content-Type": "application/json" };
}

async function handleFinanceResponse(res: Response, endpoint: string) {
    if (res.status === 403) {
        clearStoredPin();
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? `Request to ${endpoint} failed: ${res.status}`);
    }
    return res.json();
}

export async function financeGet(endpoint: string, pin?: string): Promise<any> {
    const res = await apiClient(endpoint, {
        method: "GET",
        headers: financeHeaders(pin),
    });
    return handleFinanceResponse(res, endpoint);
}

export async function financePost(endpoint: string, body: any, pin?: string): Promise<any> {
    const res = await apiClient(endpoint, {
        method: "POST",
        headers: financeHeaders(pin),
        body: JSON.stringify(body),
    });
    return handleFinanceResponse(res, endpoint);
}

export async function financePatch(endpoint: string, body?: any, pin?: string): Promise<any> {
    const res = await apiClient(endpoint, {
        method: "PATCH",
        headers: financeHeaders(pin),
        body: body ? JSON.stringify(body) : undefined,
    });
    return handleFinanceResponse(res, endpoint);
}

export async function financeLock(): Promise<void> {
    try {
        await apiClient("/finance/lock", { method: "POST" });
    } catch {
        // Silently fail if lock fails
    }
}
