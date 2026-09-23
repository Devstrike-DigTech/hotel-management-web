/**
 * M4 rates on the guest side: rate plans per room type, nightly prices by date, the price
 * calendar and promo codes. Components use the small view models here; `adapt*` functions turn
 * the API's shapes into them, so a contract change touches one file.
 */
import type { CancellationPolicy, PriceBreakdown } from "./booking-types";
import type { ISODate } from "./dates";
import { formatNaira } from "./format";

export type RatePlanKind = "BAR" | "NON_REFUNDABLE" | "CORPORATE" | "LONG_STAY" | "PACKAGE";

/** One rate plan as a guest sees it, for one room type. */
export interface PlanOffer {
  id: string;
  code: string;
  name: string;
  kind: RatePlanKind;
  description: string | null;
  includesBreakfast: boolean;
  refundable: boolean;
  /** "10% off", "₦5,000 off"; null when priced like the flexible rate. */
  adjustmentLabel: string | null;
  cancellationPolicy: CancellationPolicy | null;
  /** The plan's own terms in one sentence, from the hotel ("Free cancellation until 48 hours before check-in..."). */
  cancellationSummary: string | null;
  minNights: number | null;
  maxNights: number | null;
  /** Cheapest nightly rate in the coming weeks, before taxes, for "from" prices without dates. */
  fromKobo: number | null;
  /** With dates: the stay priced night by night. */
  quote: PriceBreakdown | null;
  bookable: boolean;
  /** Why it cannot be booked for these dates, in the guest's words. */
  reason: string | null;
}

/** One day of the price calendar. */
export interface CalendarDay {
  date: ISODate;
  /** Cheapest nightly price that day across room types, before taxes; null when nothing is for sale. */
  fromKobo: number | null;
  closedToArrival: boolean;
  soldOut: boolean;
  closedToDeparture: boolean;
  /** Minimum nights for a stay arriving that day; null or 1 when none. */
  minNights: number | null;
  /** The season behind the price ("Weekend", "Detty December"). */
  ruleName: string | null;
}

export type CalendarDays = Record<ISODate, CalendarDay>;

/** A promo code applied to a quote. */
export interface AppliedPromo {
  code: string;
  description?: string | null;
  discountKobo: number;
}

/** Why a promo code was refused (API-M4 `PROMO_INVALID.details.reason`). */
export type PromoInvalidReason =
  | "NOT_FOUND"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "STAY_DATES"
  | "MIN_NIGHTS"
  | "CHANNEL"
  | "ROOM_TYPE"
  | "USED_UP"
  | "PER_GUEST_LIMIT"
  | "FIRST_BOOKING_ONLY"
  | "NO_DISCOUNT";

/** True when the plan keeps the guest's money if they cancel. */
export function isNonRefundable(p: Pick<PlanOffer, "kind" | "refundable">) {
  return p.kind === "NON_REFUNDABLE" || !p.refundable;
}

/** The plan's name as guests read it: the flexible rate is "Flexible", whatever the hotel calls BAR internally. */
export function planTitle(p: Pick<PlanOffer, "kind" | "name">) {
  if (p.kind === "BAR" && /^(bar|best available( rate)?|standard( rate)?)$/i.test(p.name.trim())) return "Flexible";
  return p.name;
}

/** Nights in a quote with more than one distinct price: the ledger then lists each night. */
export function nightlyVaries(b: PriceBreakdown | null | undefined) {
  if (!b || b.lines.length < 2) return false;
  return new Set(b.lines.map((l) => l.amountKobo)).size > 1;
}

/** "₦45,000 to ₦61,000 a night" or "₦45,000 a night". */
export function nightlyRange(b: PriceBreakdown) {
  const amounts = b.lines.map((l) => l.amountKobo);
  if (!amounts.length) return `${formatNaira(b.rateKobo)} a night`;
  const lo = Math.min(...amounts);
  const hi = Math.max(...amounts);
  return lo === hi ? `${formatNaira(lo)} a night` : `${formatNaira(lo)} to ${formatNaira(hi)} a night`;
}

/** Room subtotal (every night) before discounts and taxes. */
export function nightsTotal(b: PriceBreakdown) {
  return b.lines.reduce((n, l) => n + l.amountKobo, 0);
}

/* ------------------------------------------------------------------ adapters (API -> view models) */

/** The price calendar as the API returns it (API-M4.md). Tolerant of a missing optional field. */
export interface RawCalendarDay {
  date: string;
  minRateKobo?: number | null;
  fromKobo?: number | null;
  available?: boolean;
  availableRoomTypes?: number;
  closedToArrival?: boolean;
  closedToDeparture?: boolean;
  stopSell?: boolean;
  minNights?: number | null;
  ruleName?: string | null;
}
export interface RawCalendar {
  days: RawCalendarDay[];
}

export function adaptCalendar(raw: RawCalendar): CalendarDays {
  const out: CalendarDays = {};
  for (const d of raw?.days ?? []) {
    const price = d.minRateKobo ?? d.fromKobo ?? null;
    const soldOut = d.stopSell === true || d.available === false || d.availableRoomTypes === 0 || price === null;
    out[d.date] = {
      date: d.date,
      fromKobo: soldOut ? null : price,
      closedToArrival: !!d.closedToArrival,
      closedToDeparture: !!d.closedToDeparture,
      soldOut,
      minNights: d.minNights ?? null,
      ruleName: d.ruleName ?? null,
    };
  }
  return out;
}

/* ------------------------------------------------------------------ promo errors in the guest's words */

type Details = Record<string, unknown> | undefined;
const str = (d: Details, ...keys: string[]) => {
  for (const k of keys) if (typeof d?.[k] === "string" && d[k]) return d[k] as string;
  return null;
};
const num = (d: Details, ...keys: string[]) => {
  for (const k of keys) if (typeof d?.[k] === "number") return d[k] as number;
  return null;
};

/** "2026-12-15" or an instant -> "15 Dec 2026". */
function day(s: string | null) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return s;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

/**
 * A promo refusal as a sentence the guest can act on: what is wrong with this code for this stay,
 * and, where there is one, what would make it work. The API's own message (already guest-readable,
 * e.g. "SAVE10 is valid for stays from 1 Dec 2026 to 31 Jan 2027") fills in what we cannot say better.
 */
export function promoMessage(
  code: string,
  err: { code: string; message?: string; details?: Details },
  ctx: { nights: number; roomName?: string; planName?: string; hotelName?: string },
): { message: string; hint: string | null; reason: string } {
  const d = err.details;
  const reason = str(d, "reason") ?? err.code.replace(/^PROMO_/, "");
  const c = `\u201c${code}\u201d`;
  const api = err.message && !/^(Bad Request|PROMO_INVALID)$/i.test(err.message) ? err.message.trim() : null;
  const out = (message: string, hint: string | null = null) => ({ message, hint, reason });
  switch (reason) {
    case "NOT_FOUND":
      return out(`We do not recognise ${c}.`, "Check the spelling; codes are letters and numbers without spaces.");
    case "INACTIVE":
      return out(`${c} is not active at the moment.`, "The hotel has paused it. Book without it, or ask the hotel.");
    case "EXPIRED": {
      const until = day(str(d, "validTo"));
      return out(until ? `${c} expired on ${until}.` : `${c} has expired.`, "Book without it; the rest of your booking is unchanged.");
    }
    case "NOT_STARTED": {
      const from = day(str(d, "validFrom"));
      return out(from ? `${c} can be used for bookings made from ${from}.` : `${c} cannot be used yet.`);
    }
    case "STAY_DATES": {
      const from = day(str(d, "stayFrom", "validFrom")),
        to = day(str(d, "stayTo", "validTo"));
      const range = from && to ? `It covers stays between ${from} and ${to}.` : api && api !== `${code} is not valid for these dates` ? api : null;
      return out(`${c} is not valid for these dates.`, range ? `${range.replace(/\.$/, "")}. Every night of the stay must fall inside.` : "Try different dates, or book without it.");
    }
    case "MIN_NIGHTS": {
      const min = num(d, "minNights");
      const have = num(d, "nights") ?? ctx.nights;
      return out(
        min ? `${c} needs a stay of at least ${min} nights; yours is ${have}.` : `Your stay is too short for ${c}.`,
        min && min > have ? `Add ${min - have} ${min - have === 1 ? "night" : "nights"} in step one to use it.` : null,
      );
    }
    case "USED_UP":
      return out(`${c} has been used as many times as the hotel allowed.`, "It is no longer available.");
    case "PER_GUEST_LIMIT":
      return out(`You have already used ${c} as many times as it allows.`, "It is counted by mobile number.");
    case "ROOM_TYPE":
      return out(`${c} does not apply to the ${ctx.roomName ?? "room you chose"}.`, "Go back to step one to choose another room type.");
    case "CHANNEL":
      return out(`${c} cannot be used for bookings made here.`, ctx.hotelName ? `It may work when booking with ${ctx.hotelName} directly.` : null);
    case "FIRST_BOOKING_ONLY":
      return out(`${c} is for a first stay${ctx.hotelName ? ` at ${ctx.hotelName}` : ""}.`, "Our records show an earlier stay for this mobile number.");
    case "NO_DISCOUNT":
      return out(`${c} does not lower the price of this stay.`, ctx.planName ? `It does not combine with the ${ctx.planName}.` : null);
    default:
      return out(api || `${c} could not be applied.`);
  }
}

export const isPromoError = (code: string) => code.startsWith("PROMO_");

/* ------------------------------------------------------------------ rate plans */

export interface RawPlan {
  id: string;
  code?: string;
  name: string;
  description?: string | null;
  kind?: RatePlanKind;
  includesBreakfast?: boolean;
  refundable?: boolean;
  cancellationPolicy?: CancellationPolicy | null;
  minNights?: number | null;
  maxNights?: number | null;
  adjustment?: { type?: string; kind?: string; value?: number; pct?: number; amountKobo?: number } | null;
  adjustmentLabel?: string | null;
  /** API-M4: "-10%", "Breakfast included", "7+ nights -15%". */
  label?: string | null;
  cancellationSummary?: string | null;
  fromKobo?: number | null;
  fromRateKobo?: number | null;
  nightlyFromKobo?: number | null;
}

export interface RawLivePlan {
  ratePlan?: RawPlan;
  ratePlanId?: string;
  bookable?: boolean;
  unavailableReason?: string | null;
  reason?: string | null;
  quote?: PriceBreakdown | null;
}

function adjustmentLabel(p: RawPlan): string | null {
  if (p.adjustmentLabel !== undefined) return p.adjustmentLabel;
  if (p.label) {
    // "-10%", "-10%, Non-refundable", "-15%, 7+ nights": the discount is the selling point; the rest
    // (non-refundable, breakfast, minimum nights) has its own badge.
    const pct = /-\s*(\d+(?:\.\d+)?)\s*%/.exec(p.label);
    const amt = /-\s*\u20a6\s*([\d,]+)/.exec(p.label);
    return pct ? `${pct[1]}% off` : amt ? `\u20a6${amt[1]} off` : null;
  }
  const a = p.adjustment;
  if (!a) return null;
  const type = (a.type ?? a.kind ?? "").toUpperCase();
  const v = a.pct ?? a.value ?? null;
  if ((type === "PCT" || type === "PERCENT") && v && v < 0) return `${Math.abs(v)}% off`;
  if ((type === "PCT" || type === "PERCENT") && v && v > 0) return null; // a surcharge is not a selling point
  const amt = a.amountKobo ?? (type === "AMOUNT" ? v : null);
  if (amt && amt < 0) return `${formatNaira(Math.abs(amt))} off`;
  return null;
}

function reasonText(why: string, p: PlanOffer): string {
  switch (why) {
    case "MIN_NIGHTS":
      return p.minNights ? `Needs a stay of at least ${p.minNights} nights.` : "Needs a longer stay.";
    case "MAX_NIGHTS":
      return p.maxNights ? `For stays of up to ${p.maxNights} nights.` : "Not for a stay this long.";
    case "SOLD_OUT":
      return "Full on your dates.";
    case "RESTRICTED":
      return "Not open for these dates.";
    case "CHANNEL":
      return "Not sold online.";
    default:
      return "Not available for these dates.";
  }
}

function toOffer(p: RawPlan): PlanOffer {
  const kind = p.kind ?? "BAR";
  return {
    id: p.id,
    code: p.code ?? p.id,
    name: p.name,
    kind,
    description: p.description ?? null,
    includesBreakfast: !!p.includesBreakfast,
    refundable: p.refundable ?? kind !== "NON_REFUNDABLE",
    adjustmentLabel: adjustmentLabel(p),
    cancellationPolicy: p.cancellationPolicy ?? null,
    cancellationSummary: p.cancellationSummary ?? null,
    minNights: p.minNights ?? null,
    maxNights: p.maxNights ?? null,
    fromKobo: p.fromKobo ?? p.fromRateKobo ?? p.nightlyFromKobo ?? null,
    quote: null,
    bookable: true,
    reason: null,
  };
}

/**
 * The rate plans for one room type: the undated list from the hotel, overlaid with live prices
 * for the chosen dates. The flexible rate comes first, then the rest cheapest first.
 */
export function plansFor(
  room: { id: string; basePriceKobo: number; ratePlans?: RawPlan[] | null },
  live: { ratePlans?: RawLivePlan[] | null; quote?: PriceBreakdown | null; bookable?: boolean } | null,
): PlanOffer[] {
  const base = (room.ratePlans ?? []).map(toOffer);
  const byId = new Map(base.map((p) => [p.id, p]));
  for (const lp of live?.ratePlans ?? []) {
    const id = lp.ratePlan?.id ?? lp.ratePlanId;
    if (!id) continue;
    const offer = byId.get(id) ?? (lp.ratePlan ? toOffer(lp.ratePlan) : null);
    if (!offer) continue;
    offer.quote = lp.quote ?? null;
    offer.bookable = lp.bookable ?? !!lp.quote;
    const why = lp.reason ?? lp.unavailableReason ?? null;
    offer.reason = offer.bookable ? null : reasonText(why ?? "", offer);
    if (!byId.has(id)) {
      byId.set(id, offer);
      base.push(offer);
    }
  }
  // Flexible first, then what can be booked (cheapest first), then what cannot for these dates.
  const rank = (p: PlanOffer) => (p.kind === "BAR" ? 0 : p.quote && !p.bookable ? 2 : 1);
  return base.sort((a, b) => rank(a) - rank(b) || (a.quote?.totalKobo ?? a.fromKobo ?? 0) - (b.quote?.totalKobo ?? b.fromKobo ?? 0));
}
