import { NextResponse, type NextRequest } from "next/server";
import { clientIpFrom, stripTrustedHeaders, trustedProxyHeaders } from "./lib/server/client-ip";
import { stripScripts } from "./lib/server/lite";

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
 * "/h/{slug}" on the path fallback. On a custom domain (not a subdomain of APP_DOMAIN) the proxy
 * also sets `x-site-host`, which the layout passes to the API so a white-labelled hotel's brand is
 * returned (M6). The developer docs (/developers) exist on the marketplace host only. Client copies of the trusted-proxy headers (X-Client-IP,
 * X-Proxy-Auth) are dropped on every route; only the server adds them, on its way to the backend.
 *
 * M7 on hotel sites:
 *   ?preview=<token>   the draft theme and form (Brand Studio / Form Builder frames): passed on as
 *                      `x-site-preview`, remembered for the visit in an httpOnly cookie, noindex, and
 *                      frameable only by the admin's origin (CSP frame-ancestors). ?preview=off leaves.
 *   every site page    `frame-ancestors 'self' <admin origin>`, so nobody else can frame the booking flow.
 *   Essentials home    served without the framework's scripts (see lib/server/lite.ts).
 *   ?template=<id>     development only: try a template on any hotel.
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
/** The developer docs: marketplace host only. */
const DOCS = /^\/developers(\/|$)/;

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

/** Headers only this proxy may set; a client's own copies are always dropped. */
const SITE_HEADERS = ["x-site-base", "x-site-slug", "x-site-group", "x-site-host", "x-site-preview", "x-site-template"];

/* ------------------------------------------------------------------ M7: preview, framing, Essentials */

const DEV = process.env.NODE_ENV !== "production";
const ADMIN_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001").origin;
  } catch {
    return "http://localhost:3001";
  }
})();
const PREVIEW_COOKIE = "site_preview";
const TOKEN = /^[A-Za-z0-9._~-]{8,2048}$/;
const TEMPLATES = new Set(["editorial", "boutique", "business", "resort", "heritage", "essentials"]);
/** Marks the proxy's own request for the full page, so it is not served "lite" again. Per process. */
const LITE_SECRET = crypto.randomUUID();

interface Preview {
  token: string | null;
  /** Set the cookie to this token (arrived in the query). */
  remember?: string;
  /** Clear the cookie (?preview=off). */
  forget?: boolean;
}

function previewOf(req: NextRequest): Preview {
  const q = req.nextUrl.searchParams.get("preview");
  if (q === "off" || q === "0" || q === "false") return { token: null, forget: true };
  if (q && TOKEN.test(q)) return { token: q, remember: q };
  const c = req.cookies.get(PREVIEW_COOKIE)?.value;
  return { token: c && TOKEN.test(c) ? c : null };
}

function devTemplate(req: NextRequest) {
  const t = DEV ? req.nextUrl.searchParams.get("template") : null;
  return t && TEMPLATES.has(t) ? t : null;
}

/** Framing and indexing rules, and the preview cookie, on a hotel site's response. */
function finish(req: NextRequest, res: NextResponse, preview: Preview) {
  // Drafts only inside the admin's frames; the live site also in the admin (and itself), nowhere else.
  res.headers.set("Content-Security-Policy", `frame-ancestors ${preview.token ? ADMIN_ORIGIN : `'self' ${ADMIN_ORIGIN}`}`);
  if (preview.token) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  const secure = req.nextUrl.protocol === "https:";
  if (preview.remember)
    res.cookies.set(PREVIEW_COOKIE, preview.remember, { httpOnly: true, path: "/", maxAge: 30 * 60, sameSite: secure ? "none" : "lax", secure });
  if (preview.forget) res.cookies.delete(PREVIEW_COOKIE);
  return res;
}

const templates = new Map<string, { template: string | null; expires: number }>();

function templateIn(raw: unknown): string | null {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const t = o.templateId ?? (o.template && typeof o.template === "object" ? (o.template as Record<string, unknown>).id : o.template);
  return typeof t === "string" && TEMPLATES.has(t.toLowerCase()) ? t.toLowerCase() : null;
}

/** The hotel's published template, cached for a minute (only Essentials changes how the proxy serves). */
async function publishedTemplate(slug: string, clientIp: string | null): Promise<string | null> {
  const hit = templates.get(slug);
  if (hit && hit.expires > Date.now()) return hit.template;
  let template: string | null = null;
  const theme = await apiGet<unknown>(`/public/hotels/${encodeURIComponent(slug)}/theme`, clientIp);
  if (theme.ok) template = templateIn(theme.data);
  else {
    const detail = await apiGet<{ siteTheme?: unknown }>(`/public/hotels/${encodeURIComponent(slug)}`, clientIp);
    if (detail.ok) template = templateIn(detail.data.siteTheme);
    else if (detail.status === 0) return null; // API down: try again next time
  }
  templates.set(slug, { template, expires: Date.now() + 60_000 });
  return template;
}

/** A page load of a document (not a router fetch, prefetch or asset). */
function isDocument(req: NextRequest) {
  return (
    req.method === "GET" &&
    !req.headers.get("rsc") &&
    !req.headers.get("next-router-prefetch") &&
    !req.headers.get("next-router-state-tree") &&
    (req.headers.get("accept") ?? "").includes("text/html")
  );
}

/** Where this server can reach itself (LITE_ORIGIN when behind something unusual). */
function selfOrigin(req: NextRequest) {
  if (process.env.LITE_ORIGIN) return process.env.LITE_ORIGIN.replace(/\/$/, "");
  return `http://127.0.0.1:${process.env.PORT || req.nextUrl.port || "3000"}`;
}

/** The Essentials home without framework scripts, or null to serve it as usual. */
async function liteHome(req: NextRequest, preview: Preview): Promise<NextResponse | null> {
  const headers = new Headers();
  req.headers.forEach((v, k) => {
    if (!["host", "connection", "accept-encoding", "content-length", "x-lite-inner"].includes(k)) headers.set(k, v);
  });
  headers.set("x-forwarded-host", req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "");
  headers.set("x-lite-inner", LITE_SECRET);
  try {
    const res = await fetch(`${selfOrigin(req)}${req.nextUrl.pathname}${req.nextUrl.search}`, { headers, redirect: "manual", signal: AbortSignal.timeout(15_000) });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) return null;
    const html = stripScripts(await res.text());
    const out = new NextResponse(html, {
      status: res.status,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": res.headers.get("cache-control") ?? "private, no-cache", "x-lite": "1", vary: "Accept, Cookie" },
    });
    return finish(req, out, preview);
  } catch {
    return null;
  }
}

function setSiteHost(headers: Headers, customHost: string | null) {
  if (customHost) headers.set("x-site-host", customHost);
  else headers.delete("x-site-host");
}

async function rewriteToSite(req: NextRequest, slug: string, base: string, rest: string, group?: string, customHost: string | null = null) {
  const preview = previewOf(req);
  // M7: the Essentials home goes out without framework scripts (unless this is that very request).
  if (rest === "/" && isDocument(req) && req.headers.get("x-lite-inner") !== LITE_SECRET) {
    const template = devTemplate(req) ?? (preview.token ? null : await publishedTemplate(slug, clientIpFrom(req.headers)));
    if (template === "essentials") {
      const lite = await liteHome(req, preview);
      if (lite) return lite;
    }
  }
  const url = req.nextUrl.clone();
  url.pathname = `/h/${slug}${rest === "/" ? "" : rest}`;
  const headers = new Headers(req.headers);
  stripTrustedHeaders(headers);
  headers.delete("x-lite-inner");
  setSiteHost(headers, customHost);
  if (preview.token) headers.set("x-site-preview", preview.token);
  else headers.delete("x-site-preview");
  const dev = devTemplate(req);
  if (dev) headers.set("x-site-template", dev);
  else headers.delete("x-site-template");
  headers.set("x-site-base", base);
  headers.set("x-site-slug", slug);
  // The group root this property is being shown under ("" when it has a host of its own).
  if (group !== undefined) headers.set("x-site-group", group);
  else headers.delete("x-site-group");
  return finish(req, NextResponse.rewrite(url, { request: { headers } }), preview);
}

/** A hotel group's root (the list of its hotels), its sitemap, robots and card. */
function rewriteToGroup(req: NextRequest, group: string, base: string, rest: string, customHost: string | null = null) {
  const preview = previewOf(req);
  const url = req.nextUrl.clone();
  url.pathname = `/g/${group}${rest === "/" ? "" : rest}`;
  const headers = new Headers(req.headers);
  stripTrustedHeaders(headers);
  setSiteHost(headers, customHost);
  headers.set("x-site-base", base);
  headers.delete("x-site-slug");
  headers.delete("x-site-group");
  headers.delete("x-site-template");
  if (preview.token) headers.set("x-site-preview", preview.token);
  else headers.delete("x-site-preview");
  const dev = devTemplate(req);
  if (dev) headers.set("x-site-template", dev);
  return finish(req, NextResponse.rewrite(url, { request: { headers } }), preview);
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
    // Never trust an incoming site header on marketplace routes.
    const headers = new Headers(req.headers);
    for (const h of SITE_HEADERS) headers.delete(h);
    stripTrustedHeaders(headers);
    return NextResponse.next({ request: { headers } });
  }

  // Shared, host-agnostic routes: the same-origin API gateway and the dev-only payment and mail tools.
  if (SHARED.test(pathname)) {
    const headers = new Headers(req.headers);
    for (const h of SITE_HEADERS) headers.delete(h);
    stripTrustedHeaders(headers);
    return NextResponse.next({ request: { headers } });
  }

  // The developer docs are the platform's, never a hotel's (and never on a white-labelled domain).
  if (DOCS.test(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/h/__unknown-host";
    return NextResponse.rewrite(url, { status: 404 });
  }

  const site = await resolveSite(host, clientIpFrom(req.headers));
  // A custom domain (not {slug}.APP_DOMAIN or {slug}.localhost): the API decides whether it is white-labelled.
  const customHost = site && !subdomainOf(host) ? host : null;
  if (!site) {
    const url = req.nextUrl.clone();
    url.pathname = "/h/__unknown-host";
    return NextResponse.rewrite(url, { status: 404 });
  }

  if (site.kind === "GROUP") {
    const { groupSlug } = site;
    // The group's own files, including its card at the path Next's metadata gives it.
    const own = pathname.startsWith(`/g/${groupSlug}/`) ? pathname.slice(`/g/${groupSlug}`.length) : pathname;
    if (own === "/" || own === "/robots.txt" || own === "/sitemap.xml" || own === "/og.png") return rewriteToGroup(req, groupSlug, "", own, customHost);
    // "/{property slug}/..." is that hotel's microsite, under the group's host.
    const [first, rest] = firstSegment(pathname);
    if (site.properties.includes(first)) return rewriteToSite(req, first, `/${first}`, rest, "", customHost);
    // Anything else is an older link to the group's first hotel ("/book", a Paystack return): send it there.
    const url = req.nextUrl.clone();
    url.pathname = `/${site.slug}${pathname}`;
    return NextResponse.redirect(url, 308);
  }

  // Everything, including /robots.txt, /sitemap.xml and /og.png, is served by the hotel's own routes.
  // Its own fallback path (/h/{slug}/...) means the same thing here.
  const rest = pathname === `/h/${site.slug}` ? "/" : pathname.startsWith(`/h/${site.slug}/`) ? pathname.slice(`/h/${site.slug}`.length) : pathname;
  return rewriteToSite(req, site.slug, "", rest, undefined, customHost);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico|icon|apple-icon).*)"],
};
