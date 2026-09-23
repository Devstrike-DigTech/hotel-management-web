/** Thousands separators by hand, so server and browser always agree (ICU data differs). */
export function groupDigits(n: number) {
  const neg = n < 0;
  const s = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return neg ? `-${s}` : s;
}

/** 1250000 kobo -> "₦12,500". Kobo are rounded to the nearest naira. */
export function formatNaira(kobo: number | null | undefined): string {
  if (kobo === null || kobo === undefined || Number.isNaN(kobo)) return "—";
  return `₦${groupDigits(kobo / 100)}`;
}

/** Compact form for tight spaces: 45000000 kobo -> "₦450k", 180000000 -> "₦1.8m". */
export function formatNairaCompact(kobo: number): string {
  const n = Math.round(kobo / 100);
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}m`;
  if (n >= 1_000) return `₦${Math.round(n / 1_000)}k`;
  return `₦${n}`;
}

export const VAT_RATE = 0.075;

export function vatOn(kobo: number) {
  return Math.round(kobo * VAT_RATE);
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** "14:00" -> "2:00 pm". Leaves unrecognised strings alone. */
export function formatClock(t: string | null | undefined): string {
  if (!t) return "—";
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  const h = Number(m[1]);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

/** Nigerian phone normalisation for tel: and wa.me links. "0803 123 4567" -> "2348031234567". */
export function toE164Digits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
}

export function formatPhone(phone: string): string {
  const d = toE164Digits(phone);
  if (d.length === 13 && d.startsWith("234")) return `+234 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  return phone;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function roman(n: number) {
  return ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"][n - 1] ?? String(n);
}

/** "Ikoyi, Lagos" rather than "Ikoyi, Lagos, Lagos" when the city and state share a name. */
export function placeName(city: string, state: string) {
  return city.toLowerCase() === state.toLowerCase() ? city : `${city}, ${state}`;
}
