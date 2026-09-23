import { NextResponse, type NextRequest } from "next/server";
import { clientIpFrom, stripTrustedHeaders, trustedProxyHeaders } from "./lib/server/client-ip";

/**
 * Multi-tenant host routing (Next 16 "proxy", formerly middleware; runs on Node.js).
 *
 *   APP_DOMAIN, www.APP_DOMAIN, localhost, IPs  -> marketplace (no rewrite)
 *   {slug}.APP_DOMAIN, {slug}.localhost          -> hotel microsite  (rewrite to /h/{slug}/...)
 *   any other host (verified custom domain)      -> hotel microsite  (slug from GET /public/resolve-host)
 *   {group}.APP_DOMAIN of a hotel group (M5)     -> group site: "/" lists the group's hotels (/g/{group}),
 *                                                   "/{property slug}/..." is that hotel's microsite
 *   /h/{slug}/... on any root host               -> hotel microsite  (path fallback for local dev)
 *   /g/{group}/... on any root host              -> group site       (path fallback for local dev)
 *   /api/*, /pay/mock, /dev/* on any host         -> served as is (API gateway and dev tools)
 *
 * The microsite layout reads `x-site-base` to build its own links: "" on a hotel host,
 * "/h/{slug}" on the path fallback. Client copies of the trusted-proxy headers (X-Client-IP,
 * X-Proxy-Auth) are dropped on every route; only the server adds them, on its way to the backend.
 */

const APP_DOMAIN = (process.env.NEXT_PUBLIC_APP_DOMAIN || "hotelos.ng").toLowerCase();
const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
/** Extra hosts that should serve the marketplace (e.g. a staging domain), comma-separated. */
const EXTRA_ROOTS = (process.env.MARKETPLACE_HOSTS || "")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);
const RESERVED = new Set(["www", "app", "admin", "api", "docs", "mail", "static", "assets"]);

/** Routes every host serves as is: the API gateway, and the dev-only mock checkout and mailbox. */
const SHARED = /^\/(api\/|pay\/mock(\/|$)|dev\/)/;

/** What a host serves: one property, or (M5) a hotel group's root with its properties' slugs. */
type Site = { kind: "PROPERTY"; slug: string } | { kind: "GROUP"; slug: string; groupSlug: string; properties: string[] };
type Entry = { site: Site | null; expires: number };
const cache = new Map<string, Entry>();
const TTL_HIT = 5 * 60_000;
const TTL_MISS = 60_000;

function hostOf(req: NextRequest) {
  const raw = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  return raw.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

function isRootHost(host: string) {
  return (
    !host ||
    host === APP_DOMAIN ||
    host === `www.${APP_DOMAIN}` ||
    host === "localhost" ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
    host.startsWith("[") ||
    EXTRA_ROOTS.includes(host)
  );
}

/** "grandview" for grandview.hotelos.ng or grandview.localhost; null for anything else. */
function subdomainOf(host: string) {
  for (const root of [APP_DOMAIN, "localhost"]) {
    if (host.endsWith(`.${root}`)) {
      const sub = host.slice(0, -(root.length + 1));
      return sub && !sub.includes(".") && !RESERVED.has(sub) ? sub : null;
    }
  }
  return null;
}

async function apiGet<T>(path: string, clientIp: string | null): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  try {
    const res = await fetch(`${API_URL}/api/v1${path}`, {
      headers: { accept: "application/json", ...trustedProxyHeaders(clientIp) },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) return { ok: true, data: (await res.json()) as T };
    return { ok: false, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function resolveSite(host: string, clientIp: string | null): Promise<Site | null> {
  const hit = cache.get(host);
  if (hit && hit.expires > Date.now()) return hit.site;

  const sub = subdomainOf(host);
  // Local subdomains are resolved as if they were on the real domain.
  const lookup = sub ? `${sub}.${APP_DOMAIN}` : host;
  const r = await apiGet<{ slug?: string; kind?: string; groupSlug?: string }>(`/public/resolve-host?host=${encodeURIComponent(lookup)}`, clientIp);
  if (r.ok && r.data.slug) {
    let site: Site = { kind: "PROPERTY", slug: r.data.slug };
    if (r.data.kind === "GROUP" && r.data.groupSlug) {
      const g = await apiGet<{ properties?: { slug: string }[] }>(`/public/groups/${encodeURIComponent(r.data.groupSlug)}`, clientIp);
      // Without the group's list the host still works as its primary property's site.
      if (g.ok) site = { kind: "GROUP", slug: r.data.slug, groupSlug: r.data.groupSlug, properties: (g.data.properties ?? []).map((p) => p.slug) };
      else if (g.status !== 404) return site; // try again on the next request
    }
    cache.set(host, { site, expires: Date.now() + TTL_HIT });
    return site;
  }
  if (!r.ok && r.status === 404) {
    cache.set(host, { site: null, expires: Date.now() + TTL_MISS });
    return null;
  }
  // If the API is unavailable, a subdomain is still a good guess; the page 404s if it is wrong.
  return sub ? { kind: "PROPERTY", slug: sub } : null;
}

function rewriteToSite(req: NextRequest, slug: string, base: string, rest: string, group?: string) {
  const url = req.nextUrl.clone();
  url.pathname = `/h/${slug}${rest === "/" ? "" : rest}`;
  const headers = new Headers(req.headers);
  stripTrustedHeaders(headers);
  headers.set("x-site-base", base);
  headers.set("x-site-slug", slug);
  // The group root this property is being shown under ("" when it has a host of its own).
  if (group !== undefined) headers.set("x-site-group", group);
  else headers.delete("x-site-group");
  return NextResponse.rewrite(url, { request: { headers } });
}

/** A hotel group's root (the list of its hotels), its sitemap, robots and card. */
function rewriteToGroup(req: NextRequest, group: string, base: string, rest: string) {
  const url = req.nextUrl.clone();
  url.pathname = `/g/${group}${rest === "/" ? "" : rest}`;
  const headers = new Headers(req.headers);
  stripTrustedHeaders(headers);
  headers.set("x-site-base", base);
  headers.delete("x-site-slug");
  headers.delete("x-site-group");
  return NextResponse.rewrite(url, { request: { headers } });
}

/** "/foo/bar" -> ["foo", "/bar"]; "/foo" -> ["foo", "/"]. */
function firstSegment(path: string): [string, string] {
  const m = /^\/([^/]+)(\/.*)?$/.exec(path);
  return m ? [m[1], m[2] ?? "/"] : ["", "/"];
}

export async function proxy(req: NextRequest) {
  const host = hostOf(req);
  const { pathname } = req.nextUrl;

  if (isRootHost(host)) {
    // Path fallback: /h/{slug}/... stays as is, but with a trusted base header.
    const m = /^\/h\/([a-z0-9-]+)(\/.*)?$/.exec(pathname);
    if (m) return rewriteToSite(req, m[1], `/h/${m[1]}`, m[2] ?? "/");
    const g = /^\/g\/([a-z0-9-]+)(\/.*)?$/.exec(pathname);
    if (g) return rewriteToGroup(req, g[1], `/g/${g[1]}`, g[2] ?? "/");
    // Never trust an incoming base header on marketplace routes.
    const headers = new Headers(req.headers);
    headers.delete("x-site-base");
    headers.delete("x-site-slug");
    headers.delete("x-site-group");
    stripTrustedHeaders(headers);
    return NextResponse.next({ request: { headers } });
  }

  // Shared, host-agnostic routes: the same-origin API gateway and the dev-only payment and mail tools.
  if (SHARED.test(pathname)) {
    const headers = new Headers(req.headers);
    stripTrustedHeaders(headers);
    return NextResponse.next({ request: { headers } });
  }

  const site = await resolveSite(host, clientIpFrom(req.headers));
  if (!site) {
    const url = req.nextUrl.clone();
    url.pathname = "/h/__unknown-host";
    return NextResponse.rewrite(url, { status: 404 });
  }

  if (site.kind === "GROUP") {
    const { groupSlug } = site;
    // The group's own files, including its card at the path Next's metadata gives it.
    const own = pathname.startsWith(`/g/${groupSlug}/`) ? pathname.slice(`/g/${groupSlug}`.length) : pathname;
    if (own === "/" || own === "/robots.txt" || own === "/sitemap.xml" || own.startsWith("/opengraph-image")) return rewriteToGroup(req, groupSlug, "", own);
    // A hotel's own card, linked from its metadata by its fallback path.
    const card = /^\/h\/([a-z0-9-]+)(\/opengraph-image.*)$/.exec(pathname);
    if (card && site.properties.includes(card[1])) return rewriteToSite(req, card[1], `/${card[1]}`, card[2], "");
    // "/{property slug}/..." is that hotel's microsite, under the group's host.
    const [first, rest] = firstSegment(pathname);
    if (site.properties.includes(first)) return rewriteToSite(req, first, `/${first}`, rest, "");
    // Anything else is an older link to the group's first hotel ("/book", a Paystack return): send it there.
    const url = req.nextUrl.clone();
    url.pathname = `/${site.slug}${pathname}`;
    return NextResponse.redirect(url, 308);
  }

  // Everything, including /robots.txt and /sitemap.xml, is served by the hotel's own routes. Its own
  // fallback path (/h/{slug}/..., which metadata uses for the card) means the same thing here.
  const rest = pathname === `/h/${site.slug}` ? "/" : pathname.startsWith(`/h/${site.slug}/`) ? pathname.slice(`/h/${site.slug}`.length) : pathname;
  return rewriteToSite(req, site.slug, "", rest);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico|icon|apple-icon).*)"],
};
