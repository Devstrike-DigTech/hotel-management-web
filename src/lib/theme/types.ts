/**
 * M7: booking-site themes. These are the web's normalised view models; `normalise.ts` adapts the
 * API's payload (API-M7.md) into them, and fills in the template's defaults when a hotel has no
 * published theme yet, so every page renders against an older API too.
 */
import type { FontChoice } from "../types";

export const TEMPLATE_IDS = ["editorial", "boutique", "business", "resort", "heritage", "essentials"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const SECTION_KEYS = [
  "hero",
  "highlights",
  "rooms",
  /** M8: "Arrange something for your stay", the hotel's concierge services. */
  "concierge",
  "rates-calendar",
  "amenities",
  "gallery",
  "experiences",
  "dining",
  "meetings",
  "reviews",
  "location-map",
  "policies",
  "faq",
  "getting-here",
  "contact",
  "custom-text",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export type ColourMode = "LIGHT" | "DARK" | "SYSTEM";

/** A short item a hotel writes for a section (a highlight, an experience, a meeting room, a dish). */
export interface SectionItem {
  title: string;
  body: string | null;
  imageUrl: string | null;
  /** A small figure or fact: "Up to 40 guests", "07:00 to 10:30", "From ₦15,000". */
  meta: string | null;
}

export interface SectionOptions {
  title: string | null;
  subtitle: string | null;
  body: string | null;
  items: SectionItem[];
  imageUrl: string | null;
  /** Layout hints a template may honour ("split", "centred", "wide"). */
  layout: string | null;
  /** Anything else the Brand Studio stores for a section, passed through untouched. */
  raw: Record<string, unknown>;
}

export interface ThemeSection {
  key: SectionKey;
  /** Unique within the page ("custom-text-2" for the second custom block). */
  id: string;
  enabled: boolean;
  order: number;
  options: SectionOptions;
}

export interface FontPairing {
  id: string;
  name: string;
  heading: FontChoice;
  body: FontChoice;
  /** True for the house pair already loaded by next/font, or the system stack: nothing to fetch. */
  builtIn?: "house" | "system";
  /** One stylesheet for both families, when the API gives it. */
  googleFontsUrl?: string | null;
}

/** Colours after the contrast guard, per mode: what the page actually paints. */
export interface AppliedColours {
  /** Fills (buttons): at least 3:1 on surface and paper. */
  primary: string;
  /** Text on a primary fill: at least 4.5:1. */
  onPrimary: string;
  /** The primary as text and links: at least 4.5:1 on surface and paper. */
  primaryText: string;
  secondary: string | null;
  secondaryText: string | null;
}

export interface ThemeColours {
  primary: string | null;
  secondary: string | null;
  applied: { light: AppliedColours; dark: AppliedColours } | null;
}

export interface FaqItem {
  q: string;
  a: string;
}

export type PickupKind = "AIRPORT" | "MOTOR_PARK" | "TRAIN_STATION" | "JETTY" | "OTHER";

export interface VehicleOption {
  id: string;
  name: string;
  maxPassengers: number;
  /** One-way price for this vehicle, or null to use the pickup point's price. */
  priceKobo: number | null;
}

export interface PickupPoint {
  id: string;
  name: string;
  shortName: string | null;
  kind: PickupKind;
  city: string;
  address: string | null;
  priceKobo: number;
  dropOffPriceKobo: number | null;
  vehicleOptions: VehicleOption[];
  leadTimeHours: number;
  operatingHours: { open: string; close: string } | null;
  notes: string | null;
}

export interface SiteTheme {
  templateId: TemplateId;
  colourMode: ColourMode;
  logoUrl: string | null;
  faviconUrl: string | null;
  colours: ThemeColours;
  font: FontPairing;
  sections: ThemeSection[];
  faq: FaqItem[];
  pickupPoints: PickupPoint[];
  /** True when this is an unpublished draft shown through a preview token. */
  draft: boolean;
  /** With a preview token but no draft: why (expired, not for this hotel or without a theme, API unreachable). */
  previewProblem?: "EXPIRED" | "NOT_FOUND" | "UNAVAILABLE" | null;
  /** True when the hotel has never published a theme and these are the template's defaults. */
  fallback: boolean;
  publishedAt: string | null;
}
