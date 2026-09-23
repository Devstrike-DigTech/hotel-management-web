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
