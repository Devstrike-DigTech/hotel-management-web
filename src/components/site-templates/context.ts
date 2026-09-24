import type { ReviewPage } from "@/lib/booking-types";
import type { ISODate } from "@/lib/dates";
import type { SectionItem, SiteTheme, ThemeSection } from "@/lib/theme/types";
import type { HotelDetail, ImageRef } from "@/lib/types";

/** Everything a template's sections draw on: one data model for all six layouts. */
export interface SiteCtx {
  hotel: HotelDetail;
  theme: SiteTheme;
  reviews: ReviewPage | null;
  today: ISODate;
  initial: { checkIn: ISODate | null; checkOut: ISODate | null; guests: number };
  /** Link prefix inside the microsite ("" on the hotel's host, "/h/{slug}" on the path fallback). */
  base: string;
  bookBase: string;
  /** Cheapest nightly price to show before dates. */
  from: number | null;
  images: ImageRef[];
  mapsUrl: string;
  /** WhatsApp number for "Chat with the hotel", when the hotel answers there (M5). */
  chat: string | null;
  paragraphs: string[];
  /** The hero's line under the name: the hotel's own headline for the site, else its tagline. */
  tagline: string;
  /** Preview mode keeps links inside the draft. */
  preview: boolean;
}

export interface SectionProps {
  ctx: SiteCtx;
  section: ThemeSection;
  /** 1-based position among the visible sections (templates that number their sections use it). */
  n: number;
}

export type { SectionItem };
