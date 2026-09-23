/**
 * Calendar-date helpers. Stay dates are plain ISO dates ("2026-09-23") interpreted in
 * Africa/Lagos (UTC+1, no DST). Arithmetic is done on UTC midnights to avoid drift.
 */
export const TZ = "Africa/Lagos";

export type ISODate = string;

export function todayInLagos(now = new Date()): ISODate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isISODate(s: unknown): s is ISODate {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

export function toUTC(d: ISODate): Date {
  return new Date(`${d}T00:00:00Z`);
}

export function fromUTC(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: ISODate, n: number): ISODate {
  const x = toUTC(d);
  x.setUTCDate(x.getUTCDate() + n);
  return fromUTC(x);
}

export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / 86_400_000);
}

export function compare(a: ISODate, b: ISODate) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/*
 * Formatting is done by hand, not with Intl: Node and browsers ship different ICU data
 * ("Tue, 1 Sept" vs "Tue 1 Sep"), which would break hydration.
 */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parts(d: ISODate) {
  const x = toUTC(d);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth(), day: x.getUTCDate(), dow: x.getUTCDay() };
}

/** "23 Sep" */
export function formatShort(d: ISODate) {
  const p = parts(d);
  return `${p.day} ${MONTHS[p.m].slice(0, 3)}`;
}
/** "Wed, 23 Sep 2026" */
export function formatLong(d: ISODate) {
  const p = parts(d);
  return `${DAYS[p.dow].slice(0, 3)}, ${p.day} ${MONTHS[p.m].slice(0, 3)} ${p.y}`;
}
/** "September 2026" */
export function formatMonth(d: ISODate) {
  const p = parts(d);
  return `${MONTHS[p.m]} ${p.y}`;
}
/** "Wednesday, 23 September 2026" */
export function formatFullDay(d: ISODate) {
  const p = parts(d);
  return `${DAYS[p.dow]}, ${p.day} ${MONTHS[p.m]} ${p.y}`;
}
/** "Wed" */
export function formatWeekday(d: ISODate) {
  return DAYS[parts(d).dow].slice(0, 3);
}
/** "Sep" */
export function formatMonthShort(d: ISODate) {
  return MONTHS[parts(d).m].slice(0, 3);
}

export function startOfMonth(d: ISODate): ISODate {
  return `${d.slice(0, 7)}-01`;
}

export function addMonths(d: ISODate, n: number): ISODate {
  const x = toUTC(startOfMonth(d));
  x.setUTCMonth(x.getUTCMonth() + n);
  return fromUTC(x);
}

/** Weeks (Monday-first) covering the month containing `month`; null for padding cells. */
export function monthGrid(month: ISODate): (ISODate | null)[][] {
  const first = toUTC(startOfMonth(month));
  const lead = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: (ISODate | null)[] = Array.from({ length: lead }, () => null);
  for (let i = 0; i < daysInMonth; i++) cells.push(addDays(fromUTC(first), i));
  while (cells.length % 7) cells.push(null);
  const weeks: (ISODate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Normalises a (checkIn, checkOut) pair from untrusted input into a valid future stay. */
export function normaliseStay(checkIn: unknown, checkOut: unknown, today = todayInLagos()) {
  let ci = isISODate(checkIn) && compare(checkIn, today) >= 0 ? checkIn : null;
  let co = isISODate(checkOut) ? checkOut : null;
  if (ci && co && compare(co, ci) <= 0) co = null;
  if (!ci && co) {
    ci = null;
    co = null;
  }
  return { checkIn: ci, checkOut: co };
}
