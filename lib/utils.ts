import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUsDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "-";
  
  const str = dateString instanceof Date ? dateString.toISOString() : String(dateString);
  const date = new Date(str);
  if (isNaN(date.getTime())) return "-";

  // If the stored date is exactly midnight UTC, it represents a strict Date (no time context).
  // Applying an EST timezone to midnight UTC shifts it back 4/5 hours into the previous day.
  // We use UTC timezone for these to strictly preserve the calendar date the user entered.
  const isMidnightUTC = str.endsWith("T00:00:00.000Z") || (str.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(str));
  const timeZone = isMidnightUTC ? "UTC" : "America/New_York";

  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export function formatUsTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    second: "2-digit",
    timeZoneName: "short"
  }).format(date);
}

export function getGreeting(): string {
  const estHourString = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  }).format(new Date());
  const hour = parseInt(estHourString, 10);

  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}
