import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { api } from "./api";
import { APP_DOMAIN, SITE_URL } from "./env";
import type { HotelDetail, HotelGroup } from "./types";

/**
 * The custom domain this microsite is being served on (set by src/proxy.ts), or null on the
 * platform's own hosts and the path fallback. Only the proxy can set it.
 */
export async function siteHost(): Promise<string | null> {
  const h = await headers();
  return h.get("x-site-host") || null;
}

/**
 * Hotel lookups are shared between a microsite layout, its page and its metadata. On a custom
 * domain the host goes to the API, which then includes the hotel's white-label brand (M6).
 */
export const getHotel = cache(async (slug: string) => api.hotel(slug, await siteHost()));
export const getGroup = cache((slug: string) => api.group(slug));

/**
 * The prefix for links inside a microsite: "" when served on the hotel's own host,
 * "/h/{slug}" on the path fallback, "/{slug}" under its group's host. Set by src/proxy.ts;
 * defaults to the fallback.
 */
export async function siteBase(slug: string) {
  const h = await headers();
  const base = h.get("x-site-base");
  return base === null ? `/h/${slug}` : base;
}

/**
 * A group root's white-label brand (M6). The API attaches it to property detail when the request
 * host is a verified domain, so a group root served on a custom domain asks its properties with
 * that host and uses the first brand it gets. Null on platform hosts.
 */
export const getGroupWhiteLabel = cache(async (group: HotelGroup) => {
  const host = await siteHost();
  if (!host) return null;
  for (const p of group.properties) {
    const detail = await api.hotel(p.slug, host).catch(() => null);
    if (detail?.whiteLabel) return detail.whiteLabel;
  }
  return null;
});

/** The same for a group's root: "" on the group's host, "/g/{group}" on the path fallback. */
export async function groupBase(group: string) {
  const h = await headers();
  const base = h.get("x-site-base");
  return base === null ? `/g/${group}` : base;
}

const isFallback = (base: string) => base.startsWith("/h/") || base.startsWith("/g/");

/** The origin this request came in on ("https://palmwine-house.hotelos.ng"). */
async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0].trim() ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : SITE_URL;
}

/** Absolute origin of the current microsite (with its base), for links that must be absolute. */
export async function siteOrigin(slug: string) {
  const base = await siteBase(slug);
  if (isFallback(base)) return `${SITE_URL}${base}`;
  return `${await requestOrigin()}${base}`;
}

/**
 * The canonical address of a hotel's site: the API's `canonicalUrl` (its verified custom domain,
 * else its subdomain), whichever host or path this copy was reached on. Falls back to this request's
 * own origin against an API from before M5.
 */
export async function canonicalSite(hotel: Pick<HotelDetail, "slug" | "canonicalUrl">) {
  if (hotel.canonicalUrl) return hotel.canonicalUrl.replace(/\/$/, "");
  return siteOrigin(hotel.slug);
}

/** The canonical address of a group's root: `https://{group}.APP_DOMAIN`. */
export function canonicalGroup(group: string) {
  return `https://${group}.${APP_DOMAIN}`;
}

/**
 * Where the group's list of hotels is, seen from one of its hotels' pages: "/" under the group's host,
 * the path fallback beside a path-fallback microsite, else the group's own host.
 */
export async function groupRootHref(slug: string, group: string) {
  const h = await headers();
  const underGroup = h.get("x-site-group");
  if (underGroup !== null) return underGroup || "/";
  const base = await siteBase(slug);
  if (isFallback(base)) return `/g/${group}`;
  const origin = await requestOrigin();
  const local = /^(https?:\/\/)[^/]+\.localhost(:\d+)?$/.exec(origin);
  return local ? `${local[1]}${group}.localhost${local[2] ?? ""}/` : `${canonicalGroup(group)}/`;
}

/**
 * A group root's link to one of its hotels: the hotel's own site. On the path fallback that is
 * /h/{slug}; on a real host its canonical address when that is another host, else /{slug} here.
 */
export async function propertyHref(group: string, p: { slug: string; canonicalUrl?: string }) {
  const base = await groupBase(group);
  if (isFallback(base)) return `/h/${p.slug}`;
  const origin = await requestOrigin();
  if (!p.canonicalUrl || /\.localhost(:\d+)?$/.test(origin)) return `${base}/${p.slug}`;
  try {
    const target = new URL(p.canonicalUrl);
    return target.host === new URL(origin).host ? `${base}/${p.slug}` : target.origin;
  } catch {
    return `${base}/${p.slug}`;
  }
}
