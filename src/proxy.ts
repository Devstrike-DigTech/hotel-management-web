import { NextResponse, type NextRequest } from "next/server";

/**
 * Multi-tenant host routing (Next 16 "proxy", formerly middleware; runs on Node.js).
 *
 *   APP_DOMAIN, www.APP_DOMAIN, localhost, IPs  -> marketplace (no rewrite)
 *   {slug}.APP_DOMAIN, {slug}.localhost          -> hotel microsite  (rewrite to /h/{slug}/...)
 *   any other host (verified custom domain)      -> hotel microsite  (slug from GET /public/resolve-host)
 *   /h/{slug}/... on any root host               -> hotel microsite  (path fallback for local dev)
 *
 * The microsite layout reads `x-site-base` to build its own links: "" on a hotel host,
 * "/h/{slug}" on the path fallback.
 */

const APP_DOMAIN = (process.env.NEXT_PUBLIC_APP_DOMAIN || "hotelos.ng").toLowerCase();
const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
/** Extra hosts that should serve the marketplace (e.g. a staging domain), comma-separated. */
const EXTRA_ROOTS = (process.env.MARKETPLACE_HOSTS || "")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);
const RESERVED = new Set(["www", "app", "admin", "api", "docs", "mail", "static", "assets"]);

type Entry = { slug: string | null; expires: number };
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

async function resolveSlug(host: string): Promise<string | null> {
  const hit = cache.get(host);
  if (hit && hit.expires > Date.now()) return hit.slug;

  const sub = subdomainOf(host);
  // Local subdomains are resolved as if they were on the real domain.
  const lookup = sub ? `${sub}.${APP_DOMAIN}` : host;
  try {
    const res = await fetch(`${API_URL}/api/v1/public/resolve-host?host=${encodeURIComponent(lookup)}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const { slug } = (await res.json()) as { slug?: string };
      cache.set(host, { slug: slug ?? null, expires: Date.now() + TTL_HIT });
      return slug ?? null;
    }
    if (res.status === 404) {
      cache.set(host, { slug: null, expires: Date.now() + TTL_MISS });
      return null;
    }
  } catch {
    /* API unreachable: fall through */
  }
  // If the API is unavailable, a subdomain is still a good guess; the page 404s if it is wrong.
  return sub;
}

function rewriteToSite(req: NextRequest, slug: string, base: string, rest: string) {
  const url = req.nextUrl.clone();
  url.pathname = `/h/${slug}${rest === "/" ? "" : rest}`;
  const headers = new Headers(req.headers);
  headers.set("x-site-base", base);
  headers.set("x-site-slug", slug);
  return NextResponse.rewrite(url, { request: { headers } });
}

export async function proxy(req: NextRequest) {
  const host = hostOf(req);
  const { pathname } = req.nextUrl;

  if (isRootHost(host)) {
    // Path fallback: /h/{slug}/... stays as is, but with a trusted base header.
    const m = /^\/h\/([a-z0-9-]+)(\/.*)?$/.exec(pathname);
    if (m) return rewriteToSite(req, m[1], `/h/${m[1]}`, m[2] ?? "/");
    // Never trust an incoming base header on marketplace routes.
    const headers = new Headers(req.headers);
    headers.delete("x-site-base");
    headers.delete("x-site-slug");
    return NextResponse.next({ request: { headers } });
  }

  const slug = await resolveSlug(host);
  if (!slug) {
    const url = req.nextUrl.clone();
    url.pathname = "/h/__unknown-host";
    return NextResponse.rewrite(url, { status: 404 });
  }
  // Everything, including /robots.txt and /sitemap.xml, is served by the hotel's own routes.
  return rewriteToSite(req, slug, "", pathname);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico|icon|apple-icon).*)"],
};
