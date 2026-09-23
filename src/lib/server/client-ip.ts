/**
 * The visitor's real address, passed to the backend from the web server.
 *
 * Every server-side call reaches the backend from this app's own address, so without help the
 * backend's per-IP limits would put every visitor in one bucket. The web server therefore sends:
 *
 *   X-Client-IP:  the visitor's address, as our edge saw it
 *   X-Proxy-Auth: TRUSTED_PROXY_SECRET, which proves the header comes from this server
 *
 * The backend honours X-Client-IP only when X-Proxy-Auth matches (constant-time compare); a
 * browser sending the headers itself is ignored. The secret is a plain server variable (never
 * NEXT_PUBLIC_), so it is not inlined into any browser bundle, and this module refuses to run in one.
 *
 * Kept free of `server-only` and Next imports so the Node-side tests can load it directly.
 */

type HeaderSource = { get(name: string): string | null };

export const CLIENT_IP_HEADER = "x-client-ip";
export const PROXY_AUTH_HEADER = "x-proxy-auth";

function assertServer() {
  if (typeof window !== "undefined") throw new Error("client-ip is server-only");
}

/** Strips ports, brackets and the IPv4-mapped IPv6 prefix; returns null for anything that is not an address. */
export function normaliseIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let ip = raw.trim().replace(/^"|"$/g, "");
  if (!ip || ip.toLowerCase() === "unknown") return null;
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(ip);
  if (bracketed) ip = bracketed[1];
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.replace(/:\d+$/, "");
  ip = ip.replace(/^::ffff:(?=\d{1,3}(\.\d{1,3}){3}$)/i, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip.split(".").every((o) => Number(o) <= 255) ? ip : null;
  if (/^[0-9a-f:.]+$/i.test(ip) && ip.includes(":") && ip.length <= 45) return ip.toLowerCase();
  return null;
}

/**
 * The visitor's address from the incoming request headers.
 *
 * 1. `CLIENT_IP_HEADER` names a header the hosting platform sets and clients cannot forge
 *    (for example `cf-connecting-ip` or `x-vercel-forwarded-for`). When set and present, it wins.
 * 2. Otherwise the LAST `X-Forwarded-For` hop: the one our own edge proxy (or Next itself)
 *    appended. Earlier hops are whatever the client claimed, so they are never used.
 * 3. Otherwise `X-Real-IP`, as nginx-style proxies set it.
 */
export function clientIpFrom(h: HeaderSource, env: NodeJS.ProcessEnv = process.env): string | null {
  const platform = env.CLIENT_IP_HEADER?.trim().toLowerCase();
  if (platform) {
    const v = normaliseIp(h.get(platform)?.split(",")[0]);
    if (v) return v;
  }
  const hops = (h.get("x-forwarded-for") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return normaliseIp(hops.at(-1)) ?? normaliseIp(h.get("x-real-ip"));
}

/**
 * Headers for a server-to-backend call. Without a secret nothing is sent: an unauthenticated
 * X-Client-IP would be ignored by the backend anyway, and must not look meaningful in logs.
 * `ip` may be null (a cached, shared fetch that belongs to no single visitor); the proxy
 * credential still goes, so the backend knows the call is the web server's own.
 */
export function trustedProxyHeaders(ip: string | null, env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  assertServer();
  const secret = env.TRUSTED_PROXY_SECRET?.trim();
  if (!secret) return {};
  const out: Record<string, string> = { [PROXY_AUTH_HEADER]: secret };
  if (ip) out[CLIENT_IP_HEADER] = ip;
  return out;
}

/** Removes any client-supplied copies before a request is forwarded, so only ours can reach the backend. */
export function stripTrustedHeaders(h: Headers) {
  h.delete(CLIENT_IP_HEADER);
  h.delete(PROXY_AUTH_HEADER);
}

/** Request headers the gateway copies from the browser; everything else (including X-Client-IP) is dropped. */
export const PASS_REQUEST = ["content-type", "accept", "idempotency-key", "user-agent", "accept-language"];

/**
 * The headers the /api/v1 gateway sends upstream for one browser request: the allow-listed ones,
 * the bearer (the browser's own Authorization wins over the cookie session), and who the visitor is.
 */
export function gatewayHeaders(incoming: Headers, bearer: string | null, env: NodeJS.ProcessEnv = process.env): Headers {
  const h = new Headers();
  for (const k of PASS_REQUEST) {
    const v = incoming.get(k);
    if (v) h.set(k, v);
  }
  const ip = clientIpFrom(incoming, env);
  for (const [k, v] of Object.entries(visitorHeaders(ip, env))) h.set(k, v);
  const auth = incoming.get("authorization");
  if (auth) h.set("authorization", auth);
  else if (bearer) h.set("authorization", `Bearer ${bearer}`);
  return h;
}

/**
 * X-Client-IP with the proxy secret (honoured only when the secret matches), plus X-Forwarded-For
 * for a backend that still reads the forwarded hop.
 */
export function visitorHeaders(ip: string | null, env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  return { ...(ip ? { "x-forwarded-for": ip } : {}), ...trustedProxyHeaders(ip, env) };
}
