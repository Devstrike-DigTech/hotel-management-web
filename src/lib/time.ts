/**
 * Instants (ISO timestamps from the API) shown in Africa/Lagos. Lagos is UTC+1 all year, with
 * no daylight saving, so the offset is fixed and formatting is done by hand: server and
 * browser ICU data differ and would break hydration (see dates.ts).
 */
import { formatLong, formatShort, type ISODate } from "./dates";

const LAGOS_OFFSET_MS = 60 * 60_000;

function lagos(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Date(d.getTime() + LAGOS_OFFSET_MS);
}

/** "2026-09-23T13:52:00Z" -> "2:52 pm" */
export function formatLagosClock(iso: string | Date): string {
  const d = lagos(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? "pm" : "am"}`;
}

/** The Lagos calendar date of an instant, as an ISO date. */
export function lagosDate(iso: string | Date): ISODate {
  return lagos(iso).toISOString().slice(0, 10);
}

/** "Wed, 23 Sep 2026, 2:52 pm" */
export function formatLagosDateTime(iso: string | Date): string {
  return `${formatLong(lagosDate(iso))}, ${formatLagosClock(iso)}`;
}

/** "23 Sep, 2:52 pm" */
export function formatLagosShort(iso: string | Date): string {
  return `${formatShort(lagosDate(iso))}, ${formatLagosClock(iso)}`;
}

/** "Today", "Yesterday", "3 days ago" or a short date, relative to now. */
export function relativeDay(iso: string, now = new Date()): string {
  const a = lagosDate(iso);
  const b = lagosDate(now);
  const days = Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days > 1 && days < 7) return `${days} days ago`;
  return formatShort(a);
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-08" or "2026-08-14" -> "August 2026" */
export function formatStayMonth(s: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(s);
  if (!m) return s;
  return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** "Free cancellation until 48 hours before check-in. After that, ..." -> "After that, ..." when the exact time is shown separately. */
export function policyTail(summary: string) {
  return summary.replace(/^Free cancellation[^.]*\.\s*/i, "");
}
