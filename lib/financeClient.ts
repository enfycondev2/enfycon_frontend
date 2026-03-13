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
    sessionStorage.removeItem(PIN_KEY);
}

function financeHeaders(pin?: string): Record<string, string> {
    const p = pin ?? getStoredPin() ?? "";
    return { "x-finance-pin": p, "Content-Type": "application/json" };
}

export async function financeGet(endpoint: string, pin?: string): Promise<any> {
    const res = await apiClient(endpoint, {
        method: "GET",
        headers: financeHeaders(pin),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? `GET ${endpoint} failed: ${res.status}`);
    }
    return res.json();
}

export async function financePost(endpoint: string, body: any, pin?: string): Promise<any> {
    const res = await apiClient(endpoint, {
        method: "POST",
        headers: financeHeaders(pin),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? `POST ${endpoint} failed: ${res.status}`);
    }
    return res.json();
}

export async function financePatch(endpoint: string, body?: any, pin?: string): Promise<any> {
    const res = await apiClient(endpoint, {
        method: "PATCH",
        headers: financeHeaders(pin),
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? `PATCH ${endpoint} failed: ${res.status}`);
    }
    return res.json();
}

export async function financeLock(): Promise<void> {
    try {
        await apiClient("/finance/lock", { method: "POST" });
    } catch {
        // Silently fail if lock fails
    }
}
