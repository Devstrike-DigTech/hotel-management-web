/** Types mirroring the public API contract (see BRIEF: "Public (no auth)"). All money is integer kobo. */
import type { HotelBookingInfo, ReviewSummary, SearchAvailability } from "./booking-types";

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface AppInfo {
  appName: string;
  appDomain: string;
  supportEmail: string;
}

export type LimitCode = "max_rooms" | "max_staff" | "max_properties";

export interface Plan {
  code: string;
  name: string;
  tagline: string;
  priceMonthlyKobo: number | null;
  priceYearlyKobo: number | null;
  limits: Record<string, number>;
  features: string[];
  commissionBps: number | null;
  highlighted: boolean;
  sortOrder: number;
}

export type FeatureCategory = "Operations" | "Revenue" | "Guests" | "Growth" | "Platform";

export interface Feature {
  code: string;
  name: string;
  description: string;
  category: FeatureCategory | string;
}

export interface City {
  name: string;
  state: string;
  hotelCount: number;
}

export interface HotelCard {
  slug: string;
  name: string;
  tagline: string;
  city: string;
  state: string;
  area: string;
  coverImageUrl: string | null;
  startingRateKobo: number | null;
  rating: number | null;
  reviewCount: number;
  amenities: string[];
  featured: boolean;
  /* M3, additive: optional so pages still render against an older API. */
  onlinePayment?: boolean;
  payAtHotel?: boolean;
  onlineBookingEnabled?: boolean;
  freeCancellationHours?: number;
  searchAvailability?: SearchAvailability | null;
  /* M5, additive: the hotel group, when it has two or more properties. */
  group?: GroupRef | null;
}

/** M5: a hotel group (the tenant). `slug` is the tenant slug; `name` the group's name. */
export interface GroupRef {
  slug: string;
  name: string;
  propertyCount: number;
}

/** M5: guest WhatsApp messaging (Pro, `whatsapp_messaging`). */
export interface HotelWhatsApp {
  available: boolean;
  phone: string | null;
  waUrl: string | null;
}

/** M5: `GET /public/groups/:slug`. */
export interface HotelGroup {
  slug: string;
  name: string;
  branding: { accentColor: string | null; logoUrl: string | null };
  propertyCount: number;
  properties: (HotelCard & { canonicalUrl: string })[];
}

/** M5: `GET /public/hotels/:slug/loyalty`. */
export interface HotelLoyalty {
  programme: {
    name: string;
    earnPointsPer1000: number;
    pointValueKobo: number;
    minRedeemPoints: number;
    maxRedeemBps: number;
    tiers: { name: string; minNights: number; perks: string[]; color: string }[];
    enrolOnline: boolean;
  } | null;
  member: { memberNo: string; points: number; valueKobo: number; tier: string | null } | null;
}

/** M5: `GET /public/resolve-host`. `kind` and friends are absent on an older backend. */
export interface ResolvedHost {
  slug: string;
  kind?: "PROPERTY" | "GROUP";
  groupSlug?: string;
  canonicalHost?: string;
  /** M6: true when the host is a verified custom domain of a white-labelled hotel. */
  whiteLabel?: boolean;
}

/** M6: one of the curated Google fonts a white-labelled hotel can choose. */
export interface FontChoice {
  family: string;
  category: "serif" | "sans" | "display";
  weights: number[];
  googleFontsUrl: string;
}

/**
 * M6: `HotelDetail.whiteLabel`, present only when white-label is active and the request came in
 * on the property's verified custom domain (`?host=`). Null everywhere else.
 */
export interface PublicWhiteLabel {
  brandName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  headingFont: FontChoice | null;
  bodyFont: FontChoice | null;
  footerLinks: { label: string; url: string }[];
  hidePoweredBy: boolean;
}

export interface ImageRef {
  url: string;
  alt: string;
}

export interface RoomTypePublic {
  id: string;
  name: string;
  description: string;
  basePriceKobo: number;
  hourlyPriceKobo: number | null;
  capacity: number;
  bedType: string;
  sizeSqm: number | null;
  amenities: string[];
  images: ImageRef[];
  availableCount: number;
  /* M4, additive: rate plans sold online for this room type, and the cheapest coming nightly rate. */
  ratePlans?: import("./rates").RawPlan[];
  fromKobo?: number | null;
}

export interface HotelDetail extends HotelCard {
  description: string;
  address: string;
  phone: string | null;
  email: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  images: ImageRef[];
  roomTypes: RoomTypePublic[];
  policies: string[];
  branding: { accentColor: string | null; logoUrl: string | null };
  /* M3, additive */
  mapUrl?: string;
  booking?: HotelBookingInfo;
  reviewSummary?: ReviewSummary;
  /* M5 */
  canonicalUrl?: string;
  whatsapp?: HotelWhatsApp;
  /* M6 */
  whiteLabel?: PublicWhiteLabel | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HotelQuery {
  city?: string;
  q?: string;
  guests?: number;
  minPriceKobo?: number;
  maxPriceKobo?: number;
  checkIn?: string;
  checkOut?: string;
  sort?: "recommended" | "price_asc" | "price_desc" | "rating";
  page?: number;
  pageSize?: number;
}
