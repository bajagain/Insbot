export const NOT_AVAILABLE = "Not available";

/** 12400 → "12.4K", 1200000 → "1.2M". */
export function formatCount(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return NOT_AVAILABLE;
  if (value < 1000) return String(value);
  if (value < 1_000_000) {
    const k = value / 1000;
    return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}K`;
  }
  const m = value / 1_000_000;
  return `${m >= 100 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}M`;
}

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return NOT_AVAILABLE;
  return value.toLocaleString("en-US");
}

export function orNotAvailable(value: string | undefined | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : NOT_AVAILABLE;
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Format an ISO timestamp for display; returns "Not available" if invalid. */
export function formatDate(value: string | undefined | null): string {
  if (!value) return NOT_AVAILABLE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return NOT_AVAILABLE;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Discord embed descriptions cap at 4096 chars. */
export const EMBED_DESCRIPTION_LIMIT = 4096;
export const EMBED_FIELD_VALUE_LIMIT = 1024;
