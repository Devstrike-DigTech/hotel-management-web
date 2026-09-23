import "server-only";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { API_URL } from "../env";
import { clientIpFrom, gatewayHeaders, visitorHeaders } from "./client-ip";

/**
 * The browser's gateway to the backend (see app/api/v1/[...path]/route.ts).
 * Guest sessions live in two httpOnly cookies; the tokens never reach client JavaScript.
 */

export const GUEST_PATHS = {
  refresh: "public/auth/refresh",
  logout: "public/auth/logout",
};

/** Routes that take the guest's bearer token (required on /guest, optional on quotes and bookings). */
const AUTHED = /^(guest\/|public\/quotes$|public\/bookings$)/;

/** Route prefixes the browser may reach through this gateway. */
const ALLOWED = [/^public\//, /^guest\//];

const AT = "guest_at";
const RT = "guest_rt";
const REFRESH_MAX_AGE = 30 * 24 * 3600;

const secure = process.env.NODE_ENV === "production";
const cookieBase = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Rotating refresh tokens must never be presented twice, or the backend revokes the whole
 * login. Parallel requests that all hit a 401 share one refresh; the result is remembered
 * briefly so a request that arrives with the old cookie a moment later reuses it.
 */
const inflight = new Map<string, { at: number; p: Promise<Tokens | null> }>();

function refreshOnce(refreshToken: string, clientIp: string | null): Promise<Tokens | null> {
  const now = Date.now();
  for (const [k, v] of inflight) if (now - v.at > 60_000) inflight.delete(k);
  const hit = inflight.get(refreshToken);
  if (hit) return hit.p;
  const p = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/${GUEST_PATHS.refresh}`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json", ...visitorHeaders(clientIp) },
        body: JSON.stringify({ refreshToken }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return null;
      const j = (await res.json()) as Partial<Tokens>;
      return j.accessToken && j.refreshToken ? { accessToken: j.accessToken, refreshToken: j.refreshToken } : null;
    } catch {
      return null;
    }
  })();
  inflight.set(refreshToken, { at: now, p });
  return p;
}

/** A readable, non-secret hint for the page chrome ("signed in as Adaeze"); never used for auth. */
const HINT = "guest_hint";

function setTokens(res: NextResponse, t: Tokens, firstName?: string | null) {
  res.cookies.set(AT, t.accessToken, { ...cookieBase, maxAge: REFRESH_MAX_AGE });
  res.cookies.set(RT, t.refreshToken, { ...cookieBase, maxAge: REFRESH_MAX_AGE });
  if (firstName !== undefined)
    res.cookies.set(HINT, encodeURIComponent(firstName || "Guest"), { ...cookieBase, httpOnly: false, maxAge: REFRESH_MAX_AGE });
}

export function clearTokens(res: NextResponse) {
  res.cookies.set(AT, "", { ...cookieBase, maxAge: 0 });
  res.cookies.set(RT, "", { ...cookieBase, maxAge: 0 });
  res.cookies.set(HINT, "", { ...cookieBase, httpOnly: false, maxAge: 0 });
}

function firstNameIn(json: Record<string, unknown>): string | null {
  for (const k of ["guest", "account", "user", "profile"]) {
    const v = json[k] as { fullName?: string } | undefined;
    if (v && typeof v.fullName === "string") return v.fullName.trim().split(/\s+/)[0] ?? null;
  }
  return null;
}

/** The visitor's address (see ./client-ip.ts for which header is believed). */
function clientIpOf(req: NextRequest) {
  return clientIpFrom(req.headers);
}

const PASS_RESPONSE = ["content-type", "content-disposition", "cache-control", "idempotent-replayed", "retry-after", "date", "etag"];

export async function forward(req: NextRequest, segments: string[]) {
  const path = segments.map(encodeURIComponent).join("/");
  if (!ALLOWED.some((re) => re.test(`${path}/`))) {
    return NextResponse.json({ statusCode: 404, code: "NOT_FOUND", message: "Not found" }, { status: 404 });
  }
  const jar = await cookies();
  const authed = AUTHED.test(path);
  let access = authed ? (jar.get(AT)?.value ?? null) : null;
  const refresh = authed ? (jar.get(RT)?.value ?? null) : null;
  const ip = clientIpOf(req);
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  const url = `${API_URL}/api/v1/${path}${req.nextUrl.search}`;

  const send = (token: string | null) =>
    fetch(url, { method: req.method, headers: gatewayHeaders(req.headers, token), body, signal: AbortSignal.timeout(20_000), cache: "no-store" });

  let upstream: Response;
  let rotated: Tokens | null = null;
  let refreshFailed = false;
  try {
    upstream = await send(access);
    if (upstream.status === 401 && refresh && !req.headers.get("authorization") && path !== GUEST_PATHS.refresh) {
      rotated = await refreshOnce(refresh, ip);
      if (rotated) {
        access = rotated.accessToken;
        upstream = await send(access);
      } else refreshFailed = true;
    }
  } catch (err) {
    const timeout = (err as Error).name === "TimeoutError";
    return NextResponse.json(
      {
        statusCode: timeout ? 504 : 502,
        code: timeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNREACHABLE",
        message: timeout ? "The booking service took too long to answer." : "The booking service could not be reached.",
      },
      { status: timeout ? 504 : 502 },
    );
  }

  const headers = new Headers();
  for (const k of PASS_RESPONSE) {
    const v = upstream.headers.get(k);
    if (v) headers.set(k, v);
  }
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");

  // Sign-in and refresh responses carry tokens: move them into cookies and out of the body.
  const type = upstream.headers.get("content-type") ?? "";
  let res: NextResponse;
  if (type.includes("application/json") && upstream.ok) {
    const text = await upstream.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* not JSON after all */
    }
    if (json && typeof json === "object" && "accessToken" in json && "refreshToken" in json) {
      const { accessToken, refreshToken, ...rest } = json as Tokens & Record<string, unknown>;
      res = NextResponse.json({ ...rest, signedIn: true }, { status: upstream.status, headers });
      setTokens(res, { accessToken, refreshToken }, firstNameIn(rest));
      return res;
    }
    res = new NextResponse(text, { status: upstream.status, headers });
  } else {
    res = new NextResponse(upstream.body, { status: upstream.status, headers });
  }
  if (rotated) setTokens(res, rotated);
  else if (refreshFailed) clearTokens(res);
  return res;
}

/** Signs the guest out: revokes the refresh token upstream (best effort) and clears the cookies. */
export async function signOut(req: NextRequest) {
  const jar = await cookies();
  const refresh = jar.get(RT)?.value;
  const access = jar.get(AT)?.value;
  if (refresh) {
    try {
      await fetch(`${API_URL}/api/v1/${GUEST_PATHS.logout}`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(access ? { authorization: `Bearer ${access}` } : {}), ...visitorHeaders(clientIpOf(req)) },
        body: JSON.stringify({ refreshToken: refresh }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      /* the cookies go regardless */
    }
  }
  const res = NextResponse.json({ success: true });
  clearTokens(res);
  return res;
}

/** True when the request carries a guest session cookie (not a guarantee it is still valid). */
export async function hasGuestSession() {
  const jar = await cookies();
  return !!(jar.get(RT)?.value || jar.get(AT)?.value);
}
