import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { api } from "./api";
import { SITE_URL } from "./env";

/** Hotel lookups are shared between a microsite layout, its page and its metadata. */
export const getHotel = cache((slug: string) => api.hotel(slug));

/**
 * The prefix for links inside a microsite: "" when served on the hotel's own host,
 * "/h/{slug}" on the path fallback. Set by src/proxy.ts; defaults to the fallback.
 */
export async function siteBase(slug: string) {
  const h = await headers();
  const base = h.get("x-site-base");
  return base === null ? `/h/${slug}` : base;
}

/** Absolute origin of the current microsite, for canonical URLs and sitemaps. */
export async function siteOrigin(slug: string) {
  const h = await headers();
  const base = await siteBase(slug);
  if (base) return `${SITE_URL}${base}`;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : SITE_URL;
}
