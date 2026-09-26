/**
 * M8: the concierge on the guest side ("Arrange something for your stay"). View models for the
 * hotel's catalogue of lawful services, a guest's requests and quotes, and tolerant normalisers from
 * the API's payloads (API-M8.md). The server validates everything again; checks here only answer
 * the guest sooner. Shared by server components and the browser (no server-only imports).
 */
import { normaliseForm, type FormField } from "./booking-form";
import { formatNaira } from "./format";

export const CONCIERGE_CATEGORIES = [
  "WELLNESS",
  "DINING",
  "ROMANCE_AND_CELEBRATION",
  "GROOMING",
  "TRANSPORT",
  "SECURITY",
  "TOURS_AND_EXPERIENCES",
  "FAMILY",
  "SHOPPING",
  "PHOTOGRAPHY",
  "EVENTS",
  "NIGHTLIFE_RESERVATIONS",
  "BUSINESS",
  "LAUNDRY_EXPRESS",
  "OTHER",
] as const;
export type ConciergeCategory = (typeof CONCIERGE_CATEGORIES)[number];

/** Guest-facing names, in the order a guest browses them. */
export const CATEGORY_NAME: Record<ConciergeCategory, string> = {
  WELLNESS: "Wellness",
  DINING: "Dining in",
  ROMANCE_AND_CELEBRATION: "Occasions",
  GROOMING: "Grooming",
  TRANSPORT: "Getting around",
  SECURITY: "Security",
  TOURS_AND_EXPERIENCES: "Tours",
  FAMILY: "Family",
  SHOPPING: "Shopping",
  PHOTOGRAPHY: "Photography",
  EVENTS: "Events",
  NIGHTLIFE_RESERVATIONS: "Tables",
  BUSINESS: "Business",
  LAUNDRY_EXPRESS: "Laundry",
  OTHER: "Also arranged",
};

/** One line under each category heading: what the concierge means by it. */
export const CATEGORY_LINE: Record<ConciergeCategory, string> = {
  WELLNESS: "Massage and treatments by licensed therapists, in your room or at the spa.",
  DINING: "A private chef, a special dinner, food brought to you.",
  ROMANCE_AND_CELEBRATION: "Flowers, candles, a cake and the room made ready for a birthday or anniversary.",
  GROOMING: "A barber, hair and make-up, in your room.",
  TRANSPORT: "A car with a driver, airport protocol, getting where you need to be.",
  SECURITY: "A licensed security firm for your movements around town.",
  TOURS_AND_EXPERIENCES: "The city with someone who knows it.",
  FAMILY: "A vetted sitter, a cot, things for the children.",
  SHOPPING: "Errands and a personal shopper.",
  PHOTOGRAPHY: "A photographer for an hour or an occasion.",
  EVENTS: "Small gatherings and set-ups.",
  NIGHTLIFE_RESERVATIONS: "A table held for you at a restaurant or lounge.",
  BUSINESS: "Printing, a meeting set up, an interpreter.",
  LAUNDRY_EXPRESS: "Washed, pressed and back the same day.",
  OTHER: "Other things the concierge can help with.",
};

export type ConciergePricing = "FIXED" | "FROM" | "PER_HOUR" | "PER_PERSON" | "FREE";
export type ConciergeLocation = "IN_ROOM" | "ON_PROPERTY" | "OFF_PROPERTY";
/** How the guest is reached about a request. Never the room phone: private requests promise that. */
export type ContactPreference = "WHATSAPP" | "SMS" | "EMAIL" | "IN_APP";
export type RequestStatus = "NEW" | "QUOTED" | "AWAITING_GUEST" | "CONFIRMED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "DECLINED" | "CANCELLED";

export interface ServiceAvailability {
  /** ISO weekdays the service runs (1 = Monday ... 7 = Sunday); empty means every day. */
  days: number[];
  /** "09:00" to "21:00" in Lagos; null means any time. */
  from: string | null;
  to: string | null;
}

export interface ServiceVariant {
  id: string;
  name: string;
  priceKobo: number;
  durationMinutes: number | null;
}

export interface ConciergeService {
  id: string;
  name: string;
  description: string;
  category: ConciergeCategory;
  categoryLabel: string;
  /** The API's own price words ("From ₦40,000"), else ours. */
  priceLabel: string | null;
  variants: ServiceVariant[];
  imageUrl: string | null;
  pricing: ConciergePricing;
  priceKobo: number | null;
  durationMinutes: number | null;
  leadTimeHours: number;
  availability: ServiceAvailability;
  requiresSlot: boolean;
  location: ConciergeLocation;
  discreetEligible: boolean;
  /** Can be asked for while booking, before arrival (channel BOOKING_FLOW). */
  preArrival: boolean;
  /** Can be asked for from the trip page (channel TRIP_PAGE). */
  duringStay: boolean;
  /** Priced at once and confirmed when the time is free (not a "from" price). */
  instantConfirm: boolean;
  /** Party size bounds when the service asks for one. */
  minParty: number | null;
  maxParty: number | null;
  questions: FormField[];
  taxable: boolean;
}

export interface ConciergeCatalogue {
  services: ConciergeService[];
  /** "Ask for something else" is taken. */
  freeForm: boolean;
  contactChannels: ContactPreference[];
  /** True when the hotel has the concierge switched off, suspended or not on its plan. */
  unavailable: boolean;
  /** The hotel's welcome line. */
  intro: string | null;
  privacyNote: string;
  payments: { online: boolean; folio: boolean };
}

export interface TaxLine {
  code: string;
  label: string;
  rateBps: number;
  inclusive: boolean;
  amountKobo: number;
}

export interface RequestQuote {
  netKobo: number;
  taxKobo: number;
  totalKobo: number;
  taxes: TaxLine[];
  validUntil: string | null;
  note: string | null;
  token: string | null;
  url: string | null;
  expired: boolean;
}

export interface QuotedPrice {
  netKobo: number;
  taxKobo: number;
  totalKobo: number;
  taxes: TaxLine[];
  description: string;
}

export type PaymentMethod = "ONLINE" | "FOLIO" | "NONE";
export type PaymentStatus = "NONE" | "PENDING" | "PAID" | "POSTED" | "REFUNDED";

export interface TimelineEntry {
  at: string;
  status: RequestStatus | null;
  label: string;
}

export interface ConciergeRequestView {
  id: string;
  number: string;
  serviceId: string | null;
  /** The service's name, or "Something else" for a free-form ask. */
  title: string;
  category: ConciergeCategory | null;
  status: RequestStatus;
  /** Guest-facing words for the status from the API, when it gives them (e.g. under review). */
  statusLabel: string | null;
  variant: string | null;
  hours: number | null;
  requestText: string | null;
  preferredAt: string | null;
  preferredWindow: { from: string; to: string } | null;
  partySize: number | null;
  notes: string | null;
  discreet: boolean;
  contactPreference: ContactPreference | null;
  /** The auto price (fixed, per hour, per person, free). */
  price: QuotedPrice | null;
  quote: RequestQuote | null;
  payment: { method: PaymentMethod | null; status: PaymentStatus; authorizationUrl: string | null };
  canCancel: boolean;
  rating: { score: number; comment: string | null } | null;
  canRate: boolean;
  timeline: TimelineEntry[];
  createdAt: string;
  answers: { label: string; display: string }[];
  privacyNote: string | null;
}

/** A quote as its signed link shows it. */
export interface QuoteView {
  request: ConciergeRequestView;
  hotel: { slug: string; name: string; phone: string | null; logoUrl: string | null; accentColor: string | null };
  paymentOptions: { online: boolean; folio: boolean; folioLabel: string | null };
  state: "OPEN" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "REPLACED";
}

/** What the trip page's concierge call answers (API-M8 6.10). */
export interface TripConciergeView {
  catalogue: ConciergeCatalogue;
  requests: ConciergeRequestView[];
  stay: { status: string; arrivalAt: string; departureAt: string; roomNumber: string | null; folioOpen: boolean };
  contactDefaults: { phone: string | null; email: string | null; whatsapp: boolean };
}

/* ------------------------------------------------------------------ normalising */

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);

const DAY_NAMES: Record<string, number> = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 7 };
export const PRIVACY_NOTE = "Only the concierge team sees this.";

function category(v: unknown): ConciergeCategory {
  const s = typeof v === "string" ? v.toUpperCase() : "";
  return (CONCIERGE_CATEGORIES as readonly string[]).includes(s) ? (s as ConciergeCategory) : "OTHER";
}

/** The API counts days 0 = Sunday .. 6; the web uses ISO weekdays (Sunday = 7). Null means any time. */
function availabilityOf(raw: unknown): ServiceAvailability {
  const o = obj(raw);
  const days = arr(o.days ?? o.weekdays)
    .map((d) => (typeof d === "number" ? (d === 0 ? 7 : d) : DAY_NAMES[String(d).slice(0, 3).toUpperCase()]))
    .filter((d): d is number => typeof d === "number" && d >= 1 && d <= 7);
  const from = str(o.from);
  const to = str(o.to);
  return { days: days.length === 7 ? [] : days, from: from?.slice(0, 5) ?? null, to: to?.slice(0, 5) ?? null };
}

function taxes(v: unknown): TaxLine[] {
  return arr(v)
    .map(obj)
    .map((t) => ({ code: String(t.code ?? ""), label: String(t.label ?? t.code ?? "Tax"), rateBps: num(t.rateBps) ?? 0, inclusive: t.inclusive === true, amountKobo: num(t.amountKobo) ?? 0 }));
}

export function normalisePrice(raw: unknown): QuotedPrice | null {
  if (!raw || typeof raw !== "object") return null;
  const o = obj(raw);
  const total = num(o.totalKobo);
  if (total === null) return null;
  return { netKobo: num(o.netKobo) ?? total, taxKobo: num(o.taxKobo) ?? 0, totalKobo: total, taxes: taxes(o.taxes), description: String(o.description ?? "") };
}

export function normaliseService(raw: unknown): ConciergeService | null {
  const o = obj(raw);
  const id = str(o.id);
  const name = str(o.name);
  if (!id || !name) return null;
  const pricing = (["FIXED", "FROM", "PER_HOUR", "PER_PERSON", "FREE"].includes(String(o.pricing)) ? o.pricing : "FROM") as ConciergePricing;
  const qs = o.questions;
  const questions = Array.isArray(qs) ? normaliseForm({ fields: qs }, "BOOKING_SITE").fields : [];
  const channels = arr(o.channels).map(String);
  const cat = category(o.category);
  return {
    id,
    name,
    description: str(o.description) ?? "",
    category: cat,
    categoryLabel: str(o.categoryLabel) ?? CATEGORY_NAME[cat],
    priceLabel: str(o.priceLabel),
    variants: arr(o.variants)
      .map(obj)
      .filter((v) => str(v.id) && str(v.name))
      .map((v) => ({ id: String(v.id), name: String(v.name), priceKobo: num(v.priceKobo) ?? 0, durationMinutes: num(v.durationMinutes) })),
    imageUrl: str(o.imageUrl),
    pricing,
    priceKobo: num(o.priceKobo),
    durationMinutes: num(o.durationMinutes),
    leadTimeHours: num(o.leadTimeHours) ?? 0,
    availability: availabilityOf(o.availability),
    requiresSlot: o.requiresSlot === true,
    location: (["IN_ROOM", "ON_PROPERTY", "OFF_PROPERTY"].includes(String(o.location)) ? o.location : "ON_PROPERTY") as ConciergeLocation,
    discreetEligible: o.discreetEligible === true,
    preArrival: o.preArrival === true || channels.includes("BOOKING_FLOW"),
    duringStay: o.duringStay !== false || channels.includes("TRIP_PAGE"),
    instantConfirm: typeof o.instantConfirm === "boolean" ? o.instantConfirm : pricing !== "FROM",
    minParty: null,
    maxParty: pricing === "PER_PERSON" ? 50 : null,
    questions: questions.filter((q) => q.type !== "EXTRA" && q.type !== "PICKUP" && q.type !== "FILE"),
    taxable: o.taxable === true,
  };
}

/** `PublicCatalogue` (API-M8 4.6). Contact channels come from the trip (WhatsApp only when the hotel answers there). */
export function normaliseCatalogue(raw: unknown, opts: { whatsapp?: boolean; email?: boolean } = {}): ConciergeCatalogue {
  const o = obj(raw);
  const list = Array.isArray(raw) ? raw : arr(o.services);
  const pay = obj(o.payments);
  const channels: ContactPreference[] = [
    ...(opts.whatsapp !== false ? (["WHATSAPP"] as const) : []),
    "SMS",
    ...(opts.email !== false ? (["EMAIL"] as const) : []),
    "IN_APP",
  ];
  return {
    services: list.map(normaliseService).filter((s): s is ConciergeService => !!s),
    freeForm: o.freeFormEnabled !== false,
    contactChannels: channels,
    unavailable: o.enabled === false,
    intro: str(o.intro),
    privacyNote: str(o.privacyNote) ?? PRIVACY_NOTE,
    payments: { online: pay.online !== false, folio: pay.folio !== false },
  };
}

const STATUSES: RequestStatus[] = ["NEW", "QUOTED", "AWAITING_GUEST", "CONFIRMED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "DECLINED", "CANCELLED"];

/** `GuestRequestView` (API-M8 6.7). */
export function normaliseRequest(raw: unknown): ConciergeRequestView | null {
  const o = obj(raw);
  const id = str(o.id);
  if (!id) return null;
  const service = o.service ? obj(o.service) : null;
  const q = o.quote ? obj(o.quote) : null;
  const pay = obj(o.payment);
  const rating = o.rating ? obj(o.rating) : null;
  const status = (STATUSES.includes(o.status as RequestStatus) ? o.status : "NEW") as RequestStatus;
  const start = str(o.preferredStart);
  const end = str(o.preferredEnd);
  const payStatus = (["NONE", "PENDING", "PAID", "POSTED", "REFUNDED"].includes(String(pay.status)) ? pay.status : "NONE") as PaymentStatus;
  return {
    id,
    number: str(o.number) ?? "",
    serviceId: service ? str(service.id) : null,
    title: str(o.title) ?? (service ? str(service.name) : null) ?? "Something else",
    category: service?.category ? category(service.category) : null,
    status,
    statusLabel: str(o.statusLabel),
    variant: o.variant ? str(obj(o.variant).name) : null,
    hours: num(o.hours),
    requestText: str(o.requestText),
    preferredAt: start && !end ? start : null,
    preferredWindow: start && end ? { from: start, to: end } : null,
    partySize: num(o.partySize),
    notes: str(o.notes),
    discreet: o.discreet === true,
    contactPreference: (str(o.contactPreference) as ContactPreference) ?? null,
    price: normalisePrice(o.price),
    quote: q
      ? {
          netKobo: num(q.netKobo) ?? 0,
          taxKobo: num(q.taxKobo) ?? 0,
          totalKobo: num(q.totalKobo) ?? 0,
          taxes: taxes(q.taxes),
          validUntil: str(q.validUntil),
          note: str(q.note),
          token: str(q.token),
          url: str(q.url),
          expired: q.expired === true,
        }
      : null,
    payment: { method: (str(pay.method) as PaymentMethod) ?? null, status: payStatus, authorizationUrl: str(pay.authorizationUrl) },
    canCancel: o.canCancel === true,
    rating: rating && num(rating.rating) !== null ? { score: num(rating.rating)!, comment: str(rating.comment) } : null,
    canRate: o.canRate === true,
    timeline: arr(o.timeline)
      .map(obj)
      .map((t) => ({ at: String(t.at ?? ""), status: (STATUSES.includes(t.status as RequestStatus) ? t.status : null) as RequestStatus | null, label: str(t.text) ?? "" }))
      .filter((t) => t.at && t.label),
    createdAt: String(o.createdAt ?? ""),
    answers: arr(o.answers)
      .map(obj)
      .map((a) => ({ label: String(a.label ?? a.key ?? ""), display: String(a.display ?? "") }))
      .filter((a) => a.label && a.display),
    privacyNote: str(o.privacyNote),
  };
}

export function normaliseRequests(raw: unknown): ConciergeRequestView[] {
  const list = Array.isArray(raw) ? raw : arr(obj(raw).requests ?? obj(raw).items);
  return list.map(normaliseRequest).filter((r): r is ConciergeRequestView => !!r);
}

export function normaliseTrip(raw: unknown): TripConciergeView {
  const o = obj(raw);
  const stay = obj(o.stay);
  const contact = obj(o.contactDefaults);
  return {
    catalogue: normaliseCatalogue(o.catalogue, { whatsapp: contact.whatsapp !== false, email: true }),
    requests: normaliseRequests(o.requests),
    stay: {
      status: String(stay.status ?? ""),
      arrivalAt: String(stay.arrivalAt ?? ""),
      departureAt: String(stay.departureAt ?? ""),
      roomNumber: str(stay.roomNumber),
      folioOpen: stay.folioOpen === true,
    },
    contactDefaults: { phone: str(contact.phone), email: str(contact.email), whatsapp: contact.whatsapp !== false },
  };
}

export function normaliseQuote(raw: unknown): QuoteView | null {
  const o = obj(raw);
  const request = normaliseRequest(o.request);
  if (!request) return null;
  const h = obj(o.hotel);
  const p = obj(o.paymentOptions);
  const state = String(o.state ?? "OPEN");
  return {
    request,
    hotel: { slug: String(h.slug ?? ""), name: String(h.name ?? ""), phone: str(h.phone), logoUrl: str(h.logoUrl), accentColor: str(h.accentColor) },
    paymentOptions: { online: p.online === true, folio: p.folio === true, folioLabel: str(p.folioLabel) },
    state: (["OPEN", "ACCEPTED", "DECLINED", "EXPIRED", "REPLACED"].includes(state) ? state : "OPEN") as QuoteView["state"],
  };
}

/* ------------------------------------------------------------------ words */

type Priced = Pick<ConciergeService, "pricing" | "priceKobo"> & { variants?: ServiceVariant[]; priceLabel?: string | null };

/** "₦45,000", "From ₦60,000", "₦15,000 an hour", "₦8,000 a person", "Complimentary". Variants read "From" their cheapest. */
export function priceLine(s: Priced): string {
  const cheapest = s.variants?.length ? Math.min(...s.variants.map((v) => v.priceKobo)) : null;
  const p = cheapest ?? s.priceKobo;
  const from = s.variants && s.variants.length > 1 ? "From " : "";
  switch (s.pricing) {
    case "FREE":
      return "Complimentary";
    case "FROM":
      return p ? `From ${formatNaira(p)}` : "Priced for you";
    case "PER_HOUR":
      return p ? `${from}${formatNaira(p)} an hour` : "Priced by the hour";
    case "PER_PERSON":
      return p ? `${from}${formatNaira(p)} a person` : "Priced per person";
    default:
      return p ? `${from}${formatNaira(p)}` : "Priced for you";
  }
}

/** Whether a request for this service is priced by the concierge first (a quote) or priced now. */
export const needsQuote = (s: Priced | null) => !s || s.pricing === "FROM";

/** An estimate before the request is sent (tax, if any, comes from the hotel's price). */
export function estimateKobo(s: ConciergeService, party: number, hours: number, variantId?: string | null): number | null {
  if (needsQuote(s)) return null;
  const v = s.variants.find((x) => x.id === variantId);
  const p = v?.priceKobo ?? s.priceKobo ?? 0;
  switch (s.pricing) {
    case "FREE":
      return 0;
    case "PER_PERSON":
      return p * Math.max(1, party);
    case "PER_HOUR":
      return p * Math.max(1, hours);
    default:
      return p;
  }
}

export function durationLine(min: number | null): string | null {
  if (!min) return null;
  if (min < 60) return `${min} minutes`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : h === 1 ? "1 hour" : `${h} hours`;
}

export const LOCATION_LINE: Record<ConciergeLocation, string> = {
  IN_ROOM: "In your room",
  ON_PROPERTY: "At the hotel",
  OFF_PROPERTY: "Out and about",
};

export const CONTACT_LABEL: Record<ContactPreference, string> = {
  WHATSAPP: "WhatsApp",
  SMS: "Text message",
  EMAIL: "Email",
  IN_APP: "Here, on this page",
};

const CHIP: Record<RequestStatus, [string, "neutral" | "brass" | "palm" | "muted" | "adire"]> = {
  NEW: ["Received", "neutral"],
  QUOTED: ["Price ready", "brass"],
  AWAITING_GUEST: ["Waiting for you", "brass"],
  CONFIRMED: ["Confirmed", "palm"],
  SCHEDULED: ["Booked in", "palm"],
  IN_PROGRESS: ["Happening now", "adire"],
  COMPLETED: ["Done", "muted"],
  DECLINED: ["Not arranged", "muted"],
  CANCELLED: ["Cancelled", "muted"],
};

const LINE: Record<RequestStatus, string> = {
  NEW: "We\u2019ll get back to you shortly.",
  QUOTED: "Your price is ready. Accept it to confirm.",
  AWAITING_GUEST: "Waiting for you.",
  CONFIRMED: "All arranged.",
  SCHEDULED: "Booked in for the time below.",
  IN_PROGRESS: "Happening now.",
  COMPLETED: "We hope you enjoyed it.",
  DECLINED: "We couldn\u2019t arrange this. Nothing has been charged.",
  CANCELLED: "Cancelled. Nothing more will be charged.",
};

/**
 * The guest's view of a status: a short chip and a calm line. The API's own words (API-M8 7.4, e.g.
 * "Received - we'll get back to you shortly") are split at the dash: the first part is the chip's
 * idea, the rest the line. A request held for review reads exactly like any other received one.
 */
export function statusWords(r: Pick<ConciergeRequestView, "status" | "statusLabel" | "payment">): { label: string; tone: "neutral" | "brass" | "palm" | "muted" | "adire"; line: string } {
  const [label, tone] = CHIP[r.status];
  let line = LINE[r.status];
  const api = r.statusLabel?.trim();
  if (api) {
    const m = /^(.+?)\s+[-\u2013\u2014]\s+(.+)$/.exec(api);
    const rest = m ? m[2] : r.status === "NEW" || r.status === "COMPLETED" ? null : api;
    if (rest) line = `${rest.charAt(0).toUpperCase()}${rest.slice(1)}${/[.!?]$/.test(rest) ? "" : "."}`;
  }
  if (r.status === "AWAITING_GUEST" && r.payment.status === "PENDING") line = "Pay to confirm; the link is below.";
  return { label, tone, line };
}

export const OPEN_STATUSES = new Set<RequestStatus>(["NEW", "QUOTED", "AWAITING_GUEST", "CONFIRMED", "SCHEDULED", "IN_PROGRESS"]);

/* ------------------------------------------------------------------ time slots */

/** Minutes since midnight of "HH:MM". */
const minutesOf = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
const clockOf = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** ISO weekday (1..7) of a Lagos date string. */
export const isoWeekday = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
};

/**
 * The times a guest may pick on a day: every half hour inside the service's hours, at least the
 * lead time from now, and early enough to finish before closing. `nowMs` is the server's clock.
 */
export function slotsFor(s: ConciergeService, date: string, nowMs: number, stepMin = 30): string[] {
  if (s.availability.days.length && !s.availability.days.includes(isoWeekday(date))) return [];
  const open = s.availability.from ? minutesOf(s.availability.from) : 7 * 60;
  let close = s.availability.to ? minutesOf(s.availability.to) : 22 * 60;
  if (close <= open) close += 24 * 60; // runs past midnight
  const last = Math.max(open, close - (s.durationMinutes && s.durationMinutes < close - open ? s.durationMinutes : 0));
  const earliest = nowMs + s.leadTimeHours * 3600_000;
  const out: string[] = [];
  for (let m = Math.ceil(open / stepMin) * stepMin; m <= last && m < 24 * 60; m += stepMin) {
    const at = Date.parse(`${date}T${clockOf(m)}:00+01:00`);
    if (at >= earliest) out.push(clockOf(m));
  }
  return out;
}

/** "Tomorrow, 7:30 pm" style words for a preferred time. */
export function preferredWords(iso: string | null, window: { from: string; to: string } | null): string | null {
  if (iso) {
    const d = new Date(Date.parse(iso) + 3600_000);
    if (Number.isNaN(d.getTime())) return null;
    const day = d.toISOString().slice(0, 10);
    const hm = d.toISOString().slice(11, 16);
    return `${dayWords(day)}, ${clock12(hm)}`;
  }
  if (window) return `${preferredWords(window.from, null)} to ${clock12(new Date(Date.parse(window.to) + 3600_000).toISOString().slice(11, 16))}`;
  return null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function dayWords(date: string, today?: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const base = `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  if (!today) return base;
  const diff = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400_000);
  return diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : base;
}

export function clock12(hm: string): string {
  const [h, m] = hm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Categories in catalogue order with their services, only those that have any. */
export function byCategory(services: ConciergeService[]): { category: ConciergeCategory; services: ConciergeService[] }[] {
  return CONCIERGE_CATEGORIES.map((c) => ({ category: c, services: services.filter((s) => s.category === c) })).filter((g) => g.services.length);
}
