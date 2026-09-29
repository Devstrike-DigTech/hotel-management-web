/**
 * Room details: the view models behind a room type's own page (API-ROOMS section 5), and the helpers the
 * room cards use to link to it. Shared by server pages and the client islands, so nothing here is
 * server-only. Every field is read tolerantly: an API from before room details still gives a page built
 * from the hotel's `roomTypes[]` entry.
 */
import type { PriceBreakdown } from "./booking-types";
import { CATEGORY_LABEL } from "./booking-form";
import type { RawPlan } from "./rates";
import type { RoomTypePublic } from "./types";

export type RoomTag = "BEDROOM" | "BATHROOM" | "VIEW" | "WORKSPACE" | "AMENITY" | "EXTERIOR" | "OTHER";
export const TAG_ORDER: RoomTag[] = ["BEDROOM", "BATHROOM", "VIEW", "WORKSPACE", "AMENITY", "EXTERIOR", "OTHER"];
export const TAG_LABEL: Record<RoomTag, string> = {
  BEDROOM: "Bedroom",
  BATHROOM: "Bathroom",
  VIEW: "View",
  WORKSPACE: "Workspace",
  AMENITY: "Amenities",
  EXTERIOR: "Outside",
  OTHER: "Other",
};

export interface RoomImage {
  url: string;
  alt: string;
  caption: string | null;
  tag: RoomTag | null;
  isCover: boolean;
  width: number | null;
  height: number | null;
  /** Position in the hotel's gallery order (the cover is shown first; a filtered view keeps this order). */
  order: number;
}

export interface AmenityItem {
  label: string;
  icon: string;
  custom: boolean;
}
export interface AmenityGroup {
  group: string;
  label: string;
  icon: string;
  items: AmenityItem[];
}

export interface RoomFact {
  key: string;
  label: string;
  value: string;
  icon: string;
}

export interface IncludedItem {
  code: string;
  label: string;
  detail: string | null;
  icon: string;
  allRates: boolean;
}

export interface RoomExtra {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  priceKobo: number | null;
  /** "per stay", "per night", "per person"... */
  unit: string | null;
  /** The price for the chosen stay, when dates were given. */
  stayPriceKobo: number | null;
  available: boolean | null;
  reason: string | null;
  imageUrl: string | null;
}

export interface RoomPickup {
  id: string;
  name: string;
  kind: string;
  city: string | null;
  priceKobo: number | null;
}

export interface RoomConciergeService {
  id: string;
  name: string;
  description: string;
  categoryLabel: string;
  priceLabel: string;
  priceKobo: number | null;
  pricing: string;
  imageUrl: string | null;
}

export interface SimilarRoom {
  id: string;
  slug: string;
  name: string;
  cover: RoomImage | null;
  galleryCount: number;
  highlights: string[];
  fromKobo: number;
  capacity: number;
  bedType: string;
  sizeSqm: number | null;
}

export interface RoomStay {
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  available: number;
  bookable: boolean;
  unavailableReason: string | null;
  lowAvailability: boolean;
  quote: PriceBreakdown | null;
  ratePlans: { ratePlan: RawPlan; bookable: boolean; unavailableReason: string | null; quote: PriceBreakdown | null }[];
  restriction: { reason: string; date: string; minNights?: number } | null;
  freeCancellationUntil: string | null;
}

export interface RoomPolicies {
  cancellation: { freeCancellationHours: number; lateCancellationFeePct: number; noShowFeePct: number; summary: string } | null;
  hotelPolicies: string[];
  houseRules: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  taxes: { label: string; rateBps: number; inclusive: boolean }[];
}

export interface RoomDetail {
  preview: boolean;
  hotel: {
    slug: string;
    name: string;
    city: string;
    state: string;
    area: string;
    address: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    canonicalUrl: string | null;
    onlineBookingEnabled: boolean;
    payOnlineAvailable: boolean;
    payAtHotelAvailable: boolean;
    rating: number | null;
    reviewCount: number;
  };
  room: {
    id: string;
    slug: string;
    name: string;
    description: string;
    longDescription: string;
    highlights: string[];
    basePriceKobo: number;
    hourlyPriceKobo: number | null;
    fromKobo: number;
    capacity: number;
    maxAdults: number | null;
    maxChildren: number | null;
    bedType: string;
    bedCount: number;
    sizeSqm: number | null;
    viewLabel: string | null;
    floorRange: string | null;
    smoking: boolean;
    accessible: boolean;
    accessibilityNotes: string | null;
    connectingAvailable: boolean;
    extraBed: { available: boolean; priceKobo: number | null };
    cover: RoomImage | null;
    gallery: RoomImage[];
    amenityGroups: AmenityGroup[];
    ratePlans: RawPlan[];
    facts: RoomFact[];
  };
  services: {
    included: IncludedItem[];
    extras: RoomExtra[];
    pickups: RoomPickup[];
    concierge: RoomConciergeService[];
  };
  stay: RoomStay | null;
  policies: RoomPolicies;
  similar: SimilarRoom[];
  seo: { title: string; description: string; image: string | null; canonicalUrl: string | null };
}

/* ------------------------------------------------------------------ reading the API tolerantly */

type O = Record<string, unknown>;
const obj = (v: unknown): O => (v && typeof v === "object" && !Array.isArray(v) ? (v as O) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const strOr = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bool = (v: unknown, d = false): boolean => (typeof v === "boolean" ? v : d);

const isTag = (t: unknown): t is RoomTag => typeof t === "string" && (TAG_ORDER as string[]).includes(t);

export function readImage(raw: unknown, fallbackAlt = ""): RoomImage | null {
  const o = obj(raw);
  const url = str(o.url);
  if (!url) return null;
  return {
    url,
    alt: str(o.alt).trim() || fallbackAlt,
    caption: strOr(o.caption),
    tag: isTag(o.tag) ? o.tag : null,
    isCover: bool(o.isCover),
    width: num(o.width),
    height: num(o.height),
    order: num(o.sortOrder) ?? 0,
  };
}

function readPlan(raw: unknown): RawPlan | null {
  const o = obj(raw);
  return typeof o.id === "string" ? (o as unknown as RawPlan) : null;
}

const VIEW_LABEL: Record<string, string> = {
  CITY: "City view",
  LAGOON: "Lagoon view",
  OCEAN: "Ocean view",
  GARDEN: "Garden view",
  POOL: "Pool view",
  COURTYARD: "Courtyard view",
};

/** "1 king bed", "2 twin beds": the bed type in words with its count. */
export function bedLine(bedType: string, bedCount = 1) {
  const t = bedType.trim();
  if (!t) return bedCount > 1 ? `${bedCount} beds` : "";
  const lower = t.toLowerCase();
  const noun = /\bbeds?\b/.test(lower) ? lower.replace(/\bbed\b/, bedCount > 1 ? "beds" : "bed") : `${lower} ${bedCount > 1 ? "beds" : "bed"}`;
  return `${bedCount} ${noun}`;
}

/** "Sleeps 2 adults + 1 child" / "Sleeps 3". */
export function sleepsLine(capacity: number, maxAdults: number | null, maxChildren: number | null) {
  if (maxAdults && maxChildren) return `Sleeps ${maxAdults} ${maxAdults === 1 ? "adult" : "adults"} + ${maxChildren} ${maxChildren === 1 ? "child" : "children"}`;
  if (maxAdults) return `Sleeps ${maxAdults} ${maxAdults === 1 ? "adult" : "adults"}`;
  return `Sleeps ${capacity}`;
}

function derivedFacts(r: RoomDetail["room"]): RoomFact[] {
  const out: RoomFact[] = [];
  if (r.sizeSqm) out.push({ key: "SIZE", label: "Size", value: `${r.sizeSqm} m²`, icon: "Ruler" });
  if (r.bedType) out.push({ key: "BED", label: "Bed", value: bedLine(r.bedType, r.bedCount), icon: "Bed" });
  out.push({ key: "SLEEPS", label: "Sleeps", value: sleepsLine(r.capacity, r.maxAdults, r.maxChildren), icon: "UsersThree" });
  if (r.viewLabel) out.push({ key: "VIEW", label: "View", value: r.viewLabel, icon: "Mountains" });
  if (r.floorRange) out.push({ key: "FLOOR", label: "Floor", value: r.floorRange, icon: "Stairs" });
  if (r.smoking) out.push({ key: "SMOKING", label: "Smoking", value: "Smoking allowed", icon: "Cigarette" });
  if (r.accessible) out.push({ key: "ACCESSIBLE", label: "Access", value: "Accessible room", icon: "Wheelchair" });
  return out;
}

function readExtra(raw: unknown): RoomExtra | null {
  const o = obj(raw);
  const id = str(o.id);
  const name = str(o.name) || str(o.label);
  if (!id || !name) return null;
  const price = obj(o.price);
  const pricing = str(o.pricing) || str(o.priceUnit) || str(o.unit);
  return {
    id,
    name,
    description: strOr(o.description),
    category: strOr(o.categoryLabel) ?? (CATEGORY_LABEL as Record<string, string>)[str(o.category)] ?? null,
    priceKobo: num(o.priceKobo) ?? num(o.unitPriceKobo) ?? num(o.amountKobo),
    unit: pricing ? unitWords(pricing) : null,
    stayPriceKobo: num(price.totalKobo) ?? num(price.amountKobo) ?? num(o.stayPriceKobo) ?? null,
    available: typeof o.available === "boolean" ? o.available : null,
    reason: strOr(o.unavailableReason) ?? strOr(o.reason),
    imageUrl: strOr(o.imageUrl),
  };
}

export function unitWords(pricing: string) {
  switch (pricing.toUpperCase()) {
    case "PER_STAY":
      return "per stay";
    case "PER_NIGHT":
      return "a night";
    case "PER_PERSON":
      return "a person";
    case "PER_PERSON_PER_NIGHT":
      return "a person, a night";
    case "PER_UNIT":
      return "each";
    case "PER_HOUR":
      return "an hour";
    default:
      return pricing.toLowerCase().replace(/_/g, " ");
  }
}

function readPickup(raw: unknown): RoomPickup | null {
  const o = obj(raw);
  const id = str(o.id);
  if (!id) return null;
  const vehicles = arr(o.vehicles).map(obj);
  const prices = [num(o.priceKobo), num(o.fromKobo), ...vehicles.map((v) => num(v.priceKobo))].filter((n): n is number => n !== null);
  return { id, name: str(o.name), kind: str(o.kind, "OTHER"), city: strOr(o.city), priceKobo: prices.length ? Math.min(...prices) : null };
}

/** `GET /public/hotels/:slug/room-types/:roomTypeSlug` as the room page's view model. */
export function normaliseRoomDetail(raw: unknown): RoomDetail | null {
  const top = obj(raw);
  const rt = obj(top.roomType);
  const id = str(rt.id);
  if (!id) return null;
  const name = str(rt.name);
  const gallery = arr(rt.gallery)
    .map((g, i) => readImage(g, `The ${name}, photo ${i + 1}`))
    .filter((g): g is RoomImage => !!g)
    .map((g, i) => ({ ...g, order: i }));
  const legacy = gallery.length ? [] : arr(rt.images).map((g, i) => readImage(g, `The ${name}, photo ${i + 1}`)).filter((g): g is RoomImage => !!g).map((g, i) => ({ ...g, order: i }));
  const images = gallery.length ? gallery : legacy;
  const cover = readImage(rt.coverImage, name) ?? images.find((i) => i.isCover) ?? images[0] ?? null;
  const h = obj(top.hotel);
  const svc = obj(top.services);
  const pol = obj(top.policies);
  const canc = obj(pol.cancellation);
  const stayRaw = top.stay ? obj(top.stay) : null;
  const extraBed = obj(rt.extraBed);
  const room: RoomDetail["room"] = {
    id,
    slug: str(rt.slug) || id,
    name,
    description: str(rt.description),
    longDescription: str(rt.longDescription),
    highlights: arr(rt.highlights).filter((x): x is string => typeof x === "string" && !!x.trim()).slice(0, 4),
    basePriceKobo: num(rt.basePriceKobo) ?? 0,
    hourlyPriceKobo: num(rt.hourlyPriceKobo),
    fromKobo: num(rt.fromRateKobo) ?? num(rt.fromKobo) ?? num(rt.basePriceKobo) ?? 0,
    capacity: num(rt.capacity) ?? 2,
    maxAdults: num(rt.maxAdults),
    maxChildren: num(rt.maxChildren),
    bedType: str(rt.bedType),
    bedCount: num(rt.bedCount) ?? 1,
    sizeSqm: num(rt.sizeSqm),
    viewLabel: strOr(rt.viewLabel) ?? (typeof rt.view === "string" ? (VIEW_LABEL[rt.view] ?? null) : null),
    floorRange: strOr(rt.floorRange),
    smoking: rt.smoking === "YES",
    accessible: bool(rt.accessible),
    accessibilityNotes: strOr(rt.accessibilityNotes),
    connectingAvailable: bool(rt.connectingAvailable),
    extraBed: { available: bool(extraBed.available, bool(rt.extraBedAvailable)), priceKobo: num(extraBed.priceKobo) ?? num(rt.extraBedPriceKobo) },
    cover,
    // The cover leads (the hero and the lightbox's first picture), then the rest in the hotel's order.
    gallery: cover ? [images.find((i) => i.isCover) ?? images.find((i) => i.url === cover.url) ?? cover, ...images.filter((i) => !(i.isCover || i.url === cover.url))] : images,
    amenityGroups: arr(rt.amenityGroups)
      .map(obj)
      .map((g) => ({
        group: str(g.group),
        label: str(g.label),
        icon: str(g.icon, "Check"),
        items: arr(g.items)
          .map(obj)
          .map((it) => ({ label: str(it.label), icon: str(it.icon) || str(g.icon, "Check"), custom: bool(it.custom) }))
          .filter((it) => it.label),
      }))
      .filter((g) => g.label && g.items.length),
    ratePlans: arr(rt.ratePlans).map(readPlan).filter((p): p is RawPlan => !!p),
    facts: [],
  };
  if (!room.amenityGroups.length) {
    const flat = arr(rt.amenities).filter((x): x is string => typeof x === "string");
    if (flat.length) room.amenityGroups = [{ group: "BEDROOM_COMFORT", label: "In the room", icon: "Bed", items: flat.map((label) => ({ label, icon: "", custom: true })) }];
  }
  const facts = arr(rt.facts)
    .map(obj)
    .map((f) => ({ key: str(f.key), label: str(f.label), value: str(f.value), icon: str(f.icon, "Check") }))
    .filter((f) => f.value);
  room.facts = facts.length ? facts : derivedFacts(room);

  const concierge = obj(svc.concierge);
  const pickups = obj(svc.pickups);
  return {
    preview: bool(top.preview),
    hotel: {
      slug: str(h.slug),
      name: str(h.name),
      city: str(h.city),
      state: str(h.state),
      area: str(h.area),
      address: str(h.address),
      checkInTime: strOr(h.checkInTime),
      checkOutTime: strOr(h.checkOutTime),
      canonicalUrl: strOr(h.canonicalUrl),
      onlineBookingEnabled: bool(h.onlineBookingEnabled, true),
      payOnlineAvailable: bool(h.payOnlineAvailable),
      payAtHotelAvailable: bool(h.payAtHotelAvailable),
      rating: num(h.rating),
      reviewCount: num(h.reviewCount) ?? 0,
    },
    room,
    services: {
      included: arr(svc.included)
        .map(obj)
        .map((i) => ({ code: str(i.code), label: str(i.label), detail: strOr(i.detail), icon: str(i.icon, "Check"), allRates: bool(i.allRates) }))
        .filter((i) => i.label),
      extras: arr(svc.extras).map(readExtra).filter((e): e is RoomExtra => !!e),
      pickups: pickups.available === false ? [] : arr(pickups.points).map(readPickup).filter((p): p is RoomPickup => !!p),
      concierge:
        concierge.available === false
          ? []
          : arr(concierge.services)
              .map(obj)
              .map((s) => ({
                id: str(s.id),
                name: str(s.name),
                description: str(s.description),
                categoryLabel: str(s.categoryLabel),
                priceLabel: str(s.priceLabel),
                priceKobo: num(s.priceKobo),
                pricing: str(s.pricing),
                imageUrl: strOr(s.imageUrl),
              }))
              .filter((s) => s.id && s.name),
    },
    stay: stayRaw
      ? {
          checkIn: str(stayRaw.checkIn),
          checkOut: str(stayRaw.checkOut),
          nights: num(stayRaw.nights) ?? 0,
          adults: num(stayRaw.adults) ?? 1,
          children: num(stayRaw.children) ?? 0,
          available: num(stayRaw.available) ?? 0,
          bookable: bool(stayRaw.bookable),
          unavailableReason: strOr(stayRaw.unavailableReason),
          lowAvailability: bool(stayRaw.lowAvailability),
          quote: (stayRaw.quote as PriceBreakdown | null) ?? null,
          ratePlans: arr(stayRaw.ratePlans)
            .map(obj)
            .map((p) => ({
              ratePlan: obj(p.ratePlan) as unknown as RawPlan,
              bookable: bool(p.bookable),
              unavailableReason: strOr(p.unavailableReason),
              quote: (p.quote as PriceBreakdown | null) ?? null,
            }))
            .filter((p) => typeof p.ratePlan.id === "string"),
          restriction: stayRaw.restriction ? (obj(stayRaw.restriction) as unknown as RoomStay["restriction"]) : null,
          freeCancellationUntil: strOr(stayRaw.freeCancellationUntil),
        }
      : null,
    policies: {
      cancellation: typeof canc.summary === "string" ? (canc as unknown as NonNullable<RoomPolicies["cancellation"]>) : null,
      hotelPolicies: arr(pol.hotelPolicies).filter((x): x is string => typeof x === "string"),
      houseRules: strOr(pol.houseRules) ?? strOr(rt.houseRules),
      checkInTime: strOr(pol.checkInTime) ?? strOr(h.checkInTime),
      checkOutTime: strOr(pol.checkOutTime) ?? strOr(h.checkOutTime),
      taxes: arr(pol.taxes)
        .map(obj)
        .map((t) => ({ label: str(t.label), rateBps: num(t.rateBps) ?? 0, inclusive: bool(t.inclusive) }))
        .filter((t) => t.label),
    },
    similar: arr(top.similarRooms)
      .map(obj)
      .map((s) => ({
        id: str(s.id),
        slug: str(s.slug) || str(s.id),
        name: str(s.name),
        cover: readImage(s.coverImage, str(s.name)),
        galleryCount: num(s.galleryCount) ?? 0,
        highlights: arr(s.highlights).filter((x): x is string => typeof x === "string"),
        fromKobo: num(s.fromRateKobo) ?? num(s.basePriceKobo) ?? 0,
        capacity: num(s.capacity) ?? 2,
        bedType: str(s.bedType),
        sizeSqm: num(s.sizeSqm),
      }))
      .filter((s) => s.id && s.name),
    seo: {
      title: str(obj(top.seo).title) || `${name} at ${str(h.name)}`,
      description: str(obj(top.seo).description) || str(rt.description),
      image: strOr(obj(top.seo).image) ?? cover?.url ?? null,
      canonicalUrl: strOr(obj(top.seo).canonicalUrl),
    },
  };
}

/* ------------------------------------------------------------------ links from room cards */

/** The room type's stable slug, falling back to its id (the API accepts either). */
export const roomKey = (r: Pick<RoomTypePublic, "id"> & { slug?: string | null }) => r.slug || r.id;

/** Where a room card's "View details" goes: `{rooms base}/{slug}`, keeping the guest's dates. */
export function roomHref(roomsBase: string, r: Pick<RoomTypePublic, "id"> & { slug?: string | null }, stay?: { checkIn?: string | null; checkOut?: string | null; guests?: number | null }) {
  const q = new URLSearchParams();
  if (stay?.checkIn && stay?.checkOut) {
    q.set("checkIn", stay.checkIn);
    q.set("checkOut", stay.checkOut);
  }
  if (stay?.guests && stay.guests !== 2) q.set("guests", String(stay.guests));
  return `${roomsBase}/${encodeURIComponent(roomKey(r))}${q.size ? `?${q}` : ""}`;
}

/** The cover photograph of a room card: the published cover, else its first image. */
export function coverOf(r: RoomTypePublic): { url: string; alt: string } | null {
  const c = (r as RoomTypePublic & { coverImage?: { url?: string; alt?: string } | null }).coverImage;
  if (c?.url) return { url: c.url, alt: c.alt || r.name };
  return r.images[0] ? { url: r.images[0].url, alt: r.images[0].alt || r.name } : null;
}

/** "9 photos" on a card, when the room has more than its cover. */
export function photoCount(r: RoomTypePublic): number {
  return (r as RoomTypePublic & { galleryCount?: number }).galleryCount ?? r.images.length;
}

/* ------------------------------------------------------------------ markdown-lite */

export type Block = { kind: "p"; parts: Inline[] } | { kind: "ul"; items: Inline[][] };
export type Inline = { text: string; strong?: boolean; em?: boolean };

/** The API's markdown-lite (paragraphs, `- ` bullets, `**bold**`, `*italic*`) as blocks. No HTML, no links. */
export function parseMarkdownLite(src: string): Block[] {
  const out: Block[] = [];
  for (const chunk of src.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
    if (!lines.length) continue;
    let para: string[] = [];
    let list: string[] = [];
    const flushPara = () => {
      if (para.length) out.push({ kind: "p", parts: inline(para.join(" ")) });
      para = [];
    };
    const flushList = () => {
      if (list.length) out.push({ kind: "ul", items: list.map(inline) });
      list = [];
    };
    for (const l of lines) {
      const m = /^\s*[-*]\s+(.*)$/.exec(l);
      if (m) {
        flushPara();
        list.push(m[1]);
      } else {
        flushList();
        para.push(l.trim());
      }
    }
    flushPara();
    flushList();
  }
  return out;
}

function inline(s: string): Inline[] {
  const parts: Inline[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  for (const m of s.matchAll(re)) {
    if (m.index! > last) parts.push({ text: s.slice(last, m.index) });
    parts.push(m[1] ? { text: m[1], strong: true } : { text: m[2], em: true });
    last = m.index! + m[0].length;
  }
  if (last < s.length) parts.push({ text: s.slice(last) });
  return parts;
}
