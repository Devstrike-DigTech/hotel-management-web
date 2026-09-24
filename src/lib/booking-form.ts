/**
 * M7: the hotel's configurable booking form on the guest side (API-M7 sections 2, 3.6, 4 and 8).
 * The server validates everything again from the published version; the checks here only give the
 * guest the same answer sooner.
 */
import type { BookingChannel, PaymentMode, TaxLine } from "./booking-types";
import type { PickupKind, PickupPoint } from "./theme/types";
import { pickupPoints as normalisePickupPoints } from "./theme/normalise";
import { toE164Digits } from "./format";

export type FieldType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "DATE"
  | "TIME"
  | "SELECT"
  | "MULTI_SELECT"
  | "YES_NO"
  | "CHECKBOX"
  | "PHONE"
  | "EMAIL"
  | "FILE"
  | "EXTRA"
  | "PICKUP";
export type RequiredMode = "REQUIRED" | "OPTIONAL" | "HIDDEN";
export type ConditionOperator = "EQUALS" | "NOT_EQUALS" | "IN" | "IS_TRUE" | "IS_FALSE" | "NOT_EMPTY";
export type ExtraCategory = "TRANSPORT" | "FOOD" | "EARLY_LATE" | "CELEBRATION" | "WELLNESS" | "OTHER";
export type ExtraPricing = "PER_STAY" | "PER_NIGHT" | "PER_PERSON" | "PER_PERSON_PER_NIGHT" | "PER_UNIT";

export interface FormField {
  key: string;
  source: "SYSTEM" | "LIBRARY" | "CUSTOM";
  type: FieldType;
  label: string;
  helpText: string | null;
  placeholder: string | null;
  required: RequiredMode;
  options: { value: string; label: string }[];
  validation: { min?: number; max?: number; pattern?: string; maxLength?: number; maxFileMB?: number; accept?: string[] };
  section: string;
  order: number;
  condition: { fieldKey: string; operator: ConditionOperator; value?: string | number | boolean | string[] } | null;
  guestPurpose: string | null;
  sensitive: boolean;
  boundTo: "QUOTE" | "GUEST" | "CONSENT" | null;
  extra?: { categories: ExtraCategory[] | null } | null;
  pickup?: { directions: ("ARRIVAL" | "DEPARTURE")[]; pickupPointIds: string[] | null } | null;
}

export interface QuotedExtra {
  extraId: string;
  name: string;
  category: ExtraCategory;
  pricing: ExtraPricing;
  quantity: number;
  persons: number | null;
  nights: number | null;
  unitPriceKobo: number;
  amountKobo: number;
  netKobo: number;
  taxKobo: number;
  totalKobo: number;
  taxes: TaxLine[];
  description: string;
}

export interface PublicExtra {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  category: ExtraCategory;
  kind: "STANDARD" | "EARLY_CHECK_IN" | "LATE_CHECK_OUT";
  pricing: ExtraPricing;
  priceKobo: number;
  maxUnits: number | null;
  taxable: boolean;
  availability: { earlyFrom: string | null; lateUntil: string | null; minNights: number | null } & Record<string, unknown>;
  available: boolean | null;
  unavailableReason: string | null;
  price: QuotedExtra | null;
}

export interface TransportCompany {
  id: string;
  name: string;
  shortName: string | null;
  source: "PLATFORM" | "HOTEL";
}
export interface TrainRoute {
  id: string;
  name: string;
  operator: string;
  stations: string[];
  services: string[];
}

export interface PublicBookingForm {
  formVersionId: string | null;
  version: number | null;
  preview: boolean;
  channel: BookingChannel;
  sections: { name: string; order: number; fieldKeys: string[] }[];
  fields: FormField[];
  rules: { emailRequiredFor: PaymentMode[]; consentRequired: boolean };
  extras: PublicExtra[];
  pickup: { points: PickupPoint[]; transportCompanies: TransportCompany[]; trainRoutes: TrainRoute[] } | null;
  uploads: { enabled: boolean; maxFileMB: number };
  /** True when the API has no M7 form yet and this is the built-in one. */
  builtIn: boolean;
}

export interface ExtraSelection {
  extraId: string;
  quantity?: number;
}
export interface TransferSelection {
  direction: "ARRIVAL" | "DEPARTURE";
  pickupPointId: string;
  vehicleOptionId?: string | null;
  passengers: number;
  scheduledAt: string;
}
export interface QuotedTransfer {
  direction: "ARRIVAL" | "DEPARTURE";
  pickupPointId: string;
  pickupPointName: string;
  kind: PickupKind;
  vehicleOptionId: string | null;
  vehicleName: string;
  passengers: number;
  scheduledAt: string;
  amountKobo: number;
  netKobo: number;
  taxKobo: number;
  totalKobo: number;
  description: string;
}

export interface AirportDetails {
  airline: string;
  flightNumber: string;
  terminal?: string | null;
}
export interface MotorParkDetails {
  transportCompanyId: string | null;
  transportCompanyOther: string | null;
  departureCity: string;
  ticketReference?: string | null;
  vehicleDescription?: string | null;
}
export interface TrainDetails {
  trainRouteId: string | null;
  routeOther?: string | null;
  trainService?: string | null;
}
export interface OtherDetails {
  details: string;
}

export interface PickupAnswer {
  wanted: boolean;
  pickupPointId?: string;
  vehicleOptionId?: string | null;
  passengers?: number;
  luggage?: number | null;
  contactPhone?: string | null;
  scheduledAt?: string;
  details?: Partial<AirportDetails & MotorParkDetails & TrainDetails & OtherDetails>;
  departure?: { wanted: boolean; sameAsArrival: boolean; pickupPointId?: string; vehicleOptionId?: string | null; scheduledAt?: string } | null;
}

export type AnswerValue = string | number | boolean | string[] | PickupAnswer | { uploadId: string; token: string; name?: string } | null;
export type Answers = Record<string, AnswerValue>;

export interface ValidationIssue {
  path: string;
  fieldKey: string | null;
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}

/** An answer as the trip view and review show it. */
export interface AnswerView {
  key: string;
  label: string;
  type: FieldType;
  section: string;
  display: string;
}

/* ------------------------------------------------------------------ normalising the API's form */

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** The form the web uses when the API has none (before M7): the M3 fields, email only for online payment. */
export function builtInForm(channel: BookingChannel): PublicBookingForm {
  const f = (key: string, type: FieldType, label: string, section: string, order: number, extra: Partial<FormField> = {}): FormField => ({
    key,
    source: "SYSTEM",
    type,
    label,
    helpText: null,
    placeholder: null,
    required: "REQUIRED",
    options: [],
    validation: {},
    section,
    order,
    condition: null,
    guestPurpose: null,
    sensitive: false,
    boundTo: "GUEST",
    ...extra,
  });
  return {
    formVersionId: null,
    version: null,
    preview: false,
    channel,
    sections: [{ name: "About you", order: 0, fieldKeys: ["fullName", "phone", "email", "estimatedArrivalTime", "specialRequests"] }],
    fields: [
      f("fullName", "SHORT_TEXT", "Full name", "About you", 0),
      f("phone", "PHONE", "Mobile number", "About you", 1),
      f("email", "EMAIL", "Email", "About you", 2, { required: "OPTIONAL" }),
      f("estimatedArrivalTime", "TIME", "Arriving around", "About you", 3, { source: "LIBRARY", required: "OPTIONAL", boundTo: null, helpText: "Helps the desk have your room ready" }),
      f("specialRequests", "LONG_TEXT", "Requests for the hotel", "About you", 4, { source: "LIBRARY", required: "OPTIONAL", boundTo: null, validation: { maxLength: 440 }, helpText: "A quiet floor, a cot, an early breakfast" }),
    ],
    rules: { emailRequiredFor: ["ONLINE"], consentRequired: true },
    extras: [],
    pickup: null,
    uploads: { enabled: false, maxFileMB: 5 },
    builtIn: true,
  };
}

export function normaliseForm(raw: unknown, channel: BookingChannel): PublicBookingForm {
  const o = obj(raw);
  if (!Array.isArray(o.fields)) return builtInForm(channel);
  const rules = obj(o.rules);
  const pickup = o.pickup ? obj(o.pickup) : null;
  const uploads = obj(o.uploads);
  const fields = arr(o.fields)
    .map(obj)
    .map(
      (x, i): FormField => ({
        key: String(x.key ?? ""),
        source: (x.source as FormField["source"]) ?? "CUSTOM",
        type: (x.type as FieldType) ?? "SHORT_TEXT",
        label: String(x.label ?? x.key ?? ""),
        helpText: (x.helpText as string) ?? null,
        placeholder: (x.placeholder as string) ?? null,
        required: (x.required as RequiredMode) ?? "OPTIONAL",
        options: arr(x.options).map(obj).map((op) => ({ value: String(op.value ?? ""), label: String(op.label ?? op.value ?? "") })),
        validation: obj(x.validation) as FormField["validation"],
        section: String(x.section ?? "About you"),
        order: typeof x.order === "number" ? x.order : i,
        condition: x.condition ? (obj(x.condition) as FormField["condition"]) : null,
        guestPurpose: (x.guestPurpose as string) ?? null,
        sensitive: x.sensitive === true,
        boundTo: (x.boundTo as FormField["boundTo"]) ?? null,
        extra: x.extra ? (obj(x.extra) as FormField["extra"]) : null,
        pickup: x.pickup ? (obj(x.pickup) as FormField["pickup"]) : null,
      }),
    )
    .filter((x) => x.key && x.required !== "HIDDEN")
    .sort((a, b) => a.order - b.order);
  return {
    formVersionId: (o.formVersionId as string) ?? null,
    version: (o.version as number) ?? null,
    preview: o.preview === true,
    channel,
    sections: arr(o.sections).map(obj).map((s) => ({ name: String(s.name), order: Number(s.order ?? 0), fieldKeys: arr(s.fieldKeys).map(String) })),
    fields,
    rules: {
      emailRequiredFor: (arr(rules.emailRequiredFor).length ? arr(rules.emailRequiredFor) : ["ONLINE"]) as PaymentMode[],
      consentRequired: rules.consentRequired !== false,
    },
    extras: arr(o.extras) as PublicExtra[],
    pickup: pickup
      ? {
          points: normalisePickupPoints(pickup.points),
          transportCompanies: arr(pickup.transportCompanies) as TransportCompany[],
          trainRoutes: arr(pickup.trainRoutes) as TrainRoute[],
        }
      : null,
    uploads: { enabled: uploads.enabled === true, maxFileMB: Number(uploads.maxFileMB ?? 5) },
    builtIn: false,
  };
}

/* ------------------------------------------------------------------ conditions */

export const isEmpty = (v: unknown) =>
  v === null || v === undefined || v === "" || v === false || v === 0 || (Array.isArray(v) && v.length === 0) || (typeof v === "object" && !Array.isArray(v) && (v as PickupAnswer).wanted === false);

export interface ConditionContext {
  answers: Answers;
  adults: number;
  children: number;
}

function valueFor(key: string, ctx: ConditionContext): unknown {
  if (key === "adults") return ctx.adults;
  if (key === "children") return ctx.children;
  return ctx.answers[key];
}

/** Whether a field is shown (API-M7 2.1). A condition on a field this form does not show is never met. */
export function isVisible(field: FormField, form: PublicBookingForm, ctx: ConditionContext, seen = new Set<string>()): boolean {
  const c = field.condition;
  if (!c) return true;
  if (seen.has(field.key)) return false;
  seen.add(field.key);
  const quoteKey = c.fieldKey === "adults" || c.fieldKey === "children";
  const target = form.fields.find((f) => f.key === c.fieldKey);
  if (!quoteKey && !target) return false;
  if (target && !isVisible(target, form, ctx, seen)) return false;
  const v = valueFor(c.fieldKey, ctx);
  const s = v === null || v === undefined ? "" : String(v);
  switch (c.operator) {
    case "EQUALS":
      return s === String(c.value ?? "");
    case "NOT_EQUALS":
      return s !== String(c.value ?? "");
    case "IN":
      return Array.isArray(c.value) && c.value.map(String).includes(s);
    case "IS_TRUE":
      return v === true;
    case "IS_FALSE":
      return v !== true;
    case "NOT_EMPTY":
      return !isEmpty(v);
    default:
      return true;
  }
}

/* ------------------------------------------------------------------ steps */

export const GUEST_KEYS = new Set(["fullName", "phone", "email"]);
const QUOTE_KEYS = new Set(["dates", "adults", "children", "policyConsent"]);
const ADDON_SECTIONS = /^(getting here|extras|add-?ons|transfers?)$/i;

/** Fields the guest fills in (not the quote's dates and party, not consent). */
export function answerFields(form: PublicBookingForm) {
  return form.fields.filter((f) => !QUOTE_KEYS.has(f.key) && f.boundTo !== "QUOTE" && f.boundTo !== "CONSENT");
}

/** "Your details" holds everything except the pickup, the extras and their sections, which get a step of their own. */
export function isAddOnField(f: FormField) {
  return f.type === "EXTRA" || f.type === "PICKUP" || ADDON_SECTIONS.test(f.section.trim());
}

/** Fields of one step grouped by section, in form order. */
export function groupBySection(fields: FormField[]): { name: string; fields: FormField[] }[] {
  const out: { name: string; fields: FormField[] }[] = [];
  for (const f of fields) {
    const g = out.find((x) => x.name === f.section);
    if (g) g.fields.push(f);
    else out.push({ name: f.section, fields: [f] });
  }
  return out;
}

/* ------------------------------------------------------------------ client checks (the server has the final word) */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validNigerianMobile = (phone: string) => /^234[789][01]\d{8}$/.test(toE164Digits(phone));

export function checkField(f: FormField, v: AnswerValue | undefined, opts: { emailRequired?: boolean } = {}): string | null {
  const required = f.key === "email" ? !!opts.emailRequired || f.required === "REQUIRED" : f.required === "REQUIRED";
  if (f.type === "PICKUP" || f.type === "EXTRA" || f.type === "FILE") return null; // their own components check them
  const empty = isEmpty(v) && !(f.type === "NUMBER" && v === 0) && !(f.type === "YES_NO" && v === false);
  if (required && empty) {
    if (f.key === "fullName") return "Enter your first and last name, as on your ID.";
    if (f.key === "phone") return "Enter a Nigerian mobile number, for example 0803 123 4567.";
    if (f.key === "email") return "Paying online needs an email address for the receipt.";
    if (f.type === "CHECKBOX") return `Please tick "${f.label}".`;
    if (f.type === "SELECT" || f.type === "YES_NO") return `Choose an answer for "${f.label}".`;
    return `Please fill in "${f.label}".`;
  }
  if (empty) return null;
  const s = typeof v === "string" ? v.trim() : "";
  switch (f.type) {
    case "SHORT_TEXT":
    case "LONG_TEXT": {
      if (f.key === "fullName" && s.split(/\s+/).length < 2) return "Enter your first and last name, as on your ID.";
      const max = f.validation.maxLength ?? (f.type === "SHORT_TEXT" ? 120 : 500);
      if (s.length > max) return `Keep it to ${max} characters.`;
      if (f.validation.pattern) {
        try {
          if (!new RegExp(f.validation.pattern).test(s)) return `Check the format of "${f.label}".`;
        } catch {
          /* the server checks it */
        }
      }
      return null;
    }
    case "EMAIL":
      return EMAIL.test(s) ? null : "Enter an email address like you@example.com.";
    case "PHONE":
      return validNigerianMobile(s) ? null : "Enter a Nigerian mobile number, for example 0803 123 4567.";
    case "NUMBER": {
      const n = Number(v);
      if (!Number.isFinite(n)) return "Enter a number.";
      if (f.validation.min !== undefined && n < f.validation.min) return `The smallest is ${f.validation.min}.`;
      if (f.validation.max !== undefined && n > f.validation.max) return `The largest is ${f.validation.max}.`;
      return null;
    }
    case "MULTI_SELECT": {
      const n = Array.isArray(v) ? v.length : 0;
      if (f.validation.min !== undefined && n < f.validation.min) return `Choose at least ${f.validation.min}.`;
      if (f.validation.max !== undefined && n > f.validation.max) return `Choose at most ${f.validation.max}.`;
      return null;
    }
    case "DATE":
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? null : "Enter a date.";
    case "TIME":
      return /^\d{2}:\d{2}$/.test(s) ? null : "Enter a time, for example 14:30.";
    default:
      return null;
  }
}

/** The answers the booking sends: visible, non-SYSTEM fields with a value. */
export function answersToSend(form: PublicBookingForm, answers: Answers, ctx: ConditionContext): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of answerFields(form)) {
    if (f.source === "SYSTEM" || GUEST_KEYS.has(f.key) || f.type === "EXTRA") continue;
    if (!isVisible(f, form, ctx)) continue;
    const v = answers[f.key];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) continue;
    if (f.type === "PICKUP" && !(v as PickupAnswer).wanted) {
      out[f.key] = { wanted: false };
      continue;
    }
    out[f.key] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

/** Where a server issue belongs: a form field key, "guest.<x>", "extras" or "transfers". */
export function issueTarget(path: string): { kind: "answer"; key: string; sub: string | null } | { kind: "guest"; key: string } | { kind: "extras"; index: number } | { kind: "transfers"; index: number; sub: string | null } | null {
  let m = /^answers\.([^.[\]]+)(?:\.(.+))?$/.exec(path);
  if (m) return { kind: "answer", key: m[1], sub: m[2] ?? null };
  m = /^guest\.(\w+)/.exec(path);
  if (m) return { kind: "guest", key: m[1] };
  m = /^extras\[(\d+)\]/.exec(path);
  if (m) return { kind: "extras", index: Number(m[1]) };
  m = /^transfers\[(\d+)\](?:\.(.+))?/.exec(path);
  if (m) return { kind: "transfers", index: Number(m[1]), sub: m[2] ?? null };
  return null;
}

/** Issues from a VALIDATION_ERROR's details (the M7 `issues`, or the M1 `fields` map). */
export function issuesFrom(details: unknown): ValidationIssue[] {
  const d = obj(details);
  const issues = arr(d.issues).map(obj);
  if (issues.length)
    return issues.map((i) => ({ path: String(i.path ?? ""), fieldKey: (i.fieldKey as string) ?? null, code: String(i.code ?? ""), message: String(i.message ?? ""), meta: obj(i.meta) }));
  return Object.entries(obj(d.fields)).map(([path, msgs]) => ({ path, fieldKey: null, code: "", message: arr(msgs).map(String).join(" ") }));
}

/* ------------------------------------------------------------------ extras */

export const CATEGORY_LABEL: Record<ExtraCategory, string> = {
  FOOD: "Food and drink",
  EARLY_LATE: "Arrive early, leave late",
  CELEBRATION: "Celebrations",
  WELLNESS: "Wellness",
  TRANSPORT: "Getting around",
  OTHER: "Also available",
};

export const PRICING_UNIT: Record<ExtraPricing, string> = {
  PER_STAY: "per stay",
  PER_NIGHT: "a night",
  PER_PERSON: "a person",
  PER_PERSON_PER_NIGHT: "a person, a night",
  PER_UNIT: "each",
};

/** Before the quote: the entered amount (tax comes from the quote). */
export function estimateExtra(e: PublicExtra, quantity: number, nights: number, persons: number): number {
  const n = Math.max(nights, 1);
  switch (e.pricing) {
    case "PER_STAY":
      return e.priceKobo;
    case "PER_NIGHT":
      return e.priceKobo * n;
    case "PER_PERSON":
      return e.priceKobo * (quantity || persons);
    case "PER_PERSON_PER_NIGHT":
      return e.priceKobo * (quantity || persons) * n;
    case "PER_UNIT":
      return e.priceKobo * Math.max(1, quantity);
  }
}

/* ------------------------------------------------------------------ pickups */

/** "2026-11-12" + "14:30" in Lagos (UTC+1, no daylight saving) as an ISO instant. */
export const lagosISO = (date: string, time: string) => new Date(`${date}T${time}:00+01:00`).toISOString();

/** Lagos date and clock of an ISO instant. */
export function lagosParts(iso: string | undefined | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(new Date(iso).getTime() + 3600_000);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
}

/** The transfers the quote must carry for a PICKUP answer (API-M7 4.3 and 4.5). */
export function transfersFor(a: PickupAnswer | undefined | null): TransferSelection[] {
  if (!a?.wanted || !a.pickupPointId || !a.scheduledAt) return [];
  const out: TransferSelection[] = [
    { direction: "ARRIVAL", pickupPointId: a.pickupPointId, vehicleOptionId: a.vehicleOptionId ?? null, passengers: a.passengers ?? 1, scheduledAt: a.scheduledAt },
  ];
  const d = a.departure;
  if (d?.wanted && d.scheduledAt) {
    out.push({
      direction: "DEPARTURE",
      pickupPointId: d.sameAsArrival ? a.pickupPointId : (d.pickupPointId ?? a.pickupPointId),
      vehicleOptionId: d.sameAsArrival ? (a.vehicleOptionId ?? null) : (d.vehicleOptionId ?? null),
      passengers: a.passengers ?? 1,
      scheduledAt: d.scheduledAt,
    });
  }
  return out;
}
