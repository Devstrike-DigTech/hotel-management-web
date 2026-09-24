import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { api } from "../api";
import type { HotelDetail } from "../types";
import { normaliseTheme, pickupPoints } from "./normalise";
import { isTemplateId } from "./registry";
import type { SiteTheme } from "./types";

/**
 * The preview token for this request (set by src/proxy.ts from `?preview=` or the preview cookie),
 * or null. Only the proxy can set the header; a client's own copy is dropped.
 */
export async function previewToken(): Promise<string | null> {
  const h = await headers();
  const t = h.get("x-site-preview");
  return t && /^[A-Za-z0-9._~-]{8,2048}$/.test(t) ? t : null;
}

/** Development only: `?template=boutique` tries a layout on any hotel (the proxy passes it on). */
async function devTemplate() {
  if (process.env.NODE_ENV === "production") return null;
  const t = (await headers()).get("x-site-template");
  return isTemplateId(t) ? t : null;
}

/**
 * The theme a hotel's site renders with: the draft behind a valid preview token, else the published
 * theme, else the Editorial defaults (a hotel that never opened the Brand Studio looks as before).
 */
export const getSiteTheme = cache(async (hotel: HotelDetail): Promise<SiteTheme> => {
  const theme = await resolveTheme(hotel);
  // Pickup points may come with the theme or on their own.
  if (!theme.pickupPoints.length) theme.pickupPoints = pickupPoints(await api.pickupPoints(hotel.slug));
  return theme;
});

async function resolveTheme(hotel: HotelDetail): Promise<SiteTheme> {
  const token = await previewToken();
  const host = (await headers()).get("x-site-host");
  const ctx = { accentColor: hotel.branding.accentColor, logoUrl: hotel.branding.logoUrl };
  if (token) {
    const draft = await api.siteTheme(hotel.slug, { preview: token, host }).catch(() => null);
    if (draft) return normaliseTheme(draft, ctx);
  }
  const raw = hotel.siteTheme ?? (await api.siteTheme(hotel.slug, { host }).catch(() => null));
  const theme = normaliseTheme(raw, ctx);
  const dev = await devTemplate();
  if (dev && dev !== theme.templateId) return normaliseTheme({ ...(raw ?? {}), templateId: dev, sections: undefined, fontPairing: undefined }, ctx);
  return theme;
}
