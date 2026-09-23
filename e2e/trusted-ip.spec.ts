import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { clientIpFrom, gatewayHeaders, normaliseIp, trustedProxyHeaders } from "../src/lib/server/client-ip";

/**
 * Trusted client IP forwarding (M4 section 0). The unit tests run in Node against the same module
 * the gateway, the server-side API client and the host proxy use; the last test checks that the
 * secret never reaches a browser bundle.
 */

const env = { TRUSTED_PROXY_SECRET: "s3cret" } as unknown as NodeJS.ProcessEnv;
const hdrs = (o: Record<string, string>) => new Headers(o);

test.describe("client address", () => {
  test("uses the last X-Forwarded-For hop, never one the client chose", () => {
    expect(clientIpFrom(hdrs({ "x-forwarded-for": "1.2.3.4, 198.51.100.9" }), {} as NodeJS.ProcessEnv)).toBe("198.51.100.9");
    expect(clientIpFrom(hdrs({ "x-forwarded-for": "203.0.113.5" }), {} as NodeJS.ProcessEnv)).toBe("203.0.113.5");
  });

  test("falls back to X-Real-IP, and prefers a configured platform header", () => {
    expect(clientIpFrom(hdrs({ "x-real-ip": "203.0.113.7" }), {} as NodeJS.ProcessEnv)).toBe("203.0.113.7");
    const platform = { CLIENT_IP_HEADER: "cf-connecting-ip" } as unknown as NodeJS.ProcessEnv;
    expect(clientIpFrom(hdrs({ "cf-connecting-ip": "102.89.1.1", "x-forwarded-for": "10.0.0.1" }), platform)).toBe("102.89.1.1");
    expect(clientIpFrom(hdrs({ "x-forwarded-for": "10.0.0.1" }), platform)).toBe("10.0.0.1");
  });

  test("normalises ports, brackets and mapped IPv6, and rejects junk", () => {
    expect(normaliseIp("::ffff:102.89.3.4")).toBe("102.89.3.4");
    expect(normaliseIp("102.89.3.4:5123")).toBe("102.89.3.4");
    expect(normaliseIp("[2001:DB8::1]:443")).toBe("2001:db8::1");
    expect(normaliseIp("unknown")).toBeNull();
    expect(normaliseIp("300.1.1.1")).toBeNull();
    expect(normaliseIp("<script>")).toBeNull();
  });
});

test.describe("headers sent to the backend", () => {
  test("the gateway sends X-Client-IP and X-Proxy-Auth, and drops the client's own copies", () => {
    const incoming = hdrs({
      "x-forwarded-for": "6.6.6.6, 102.89.40.2",
      "x-client-ip": "6.6.6.6",
      "x-proxy-auth": "guessed",
      "content-type": "application/json",
      "idempotency-key": "k1",
      cookie: "guest_at=secret",
    });
    const out = gatewayHeaders(incoming, "tok", env);
    expect(out.get("x-client-ip")).toBe("102.89.40.2");
    expect(out.get("x-proxy-auth")).toBe("s3cret");
    expect(out.get("x-forwarded-for")).toBe("102.89.40.2");
    expect(out.get("authorization")).toBe("Bearer tok");
    expect(out.get("idempotency-key")).toBe("k1");
    expect(out.get("cookie")).toBeNull();
  });

  test("without a secret, no trusted headers are sent at all", () => {
    const out = gatewayHeaders(hdrs({ "x-forwarded-for": "102.89.40.2", "x-client-ip": "6.6.6.6" }), null, {} as NodeJS.ProcessEnv);
    expect(out.get("x-client-ip")).toBeNull();
    expect(out.get("x-proxy-auth")).toBeNull();
    expect(trustedProxyHeaders("1.1.1.1", {} as NodeJS.ProcessEnv)).toEqual({});
  });

  test("a shared, cached call carries the credential but no one visitor's address", () => {
    expect(trustedProxyHeaders(null, env)).toEqual({ "x-proxy-auth": "s3cret" });
  });
});

test("the proxy secret never reaches the browser", async ({ page, request }) => {
  let secret = process.env.TRUSTED_PROXY_SECRET;
  try {
    secret ??= /^TRUSTED_PROXY_SECRET=(.+)$/m.exec(readFileSync(".env.local", "utf8"))?.[1]?.trim();
  } catch {
    /* no local env file */
  }
  test.skip(!secret, "TRUSTED_PROXY_SECRET is not configured");
  const scripts: string[] = [];
  page.on("response", (r) => {
    if (r.request().resourceType() === "script") scripts.push(r.url());
  });
  await page.goto("/stays/palmwine-house");
  const html = await page.content();
  expect(html).not.toContain(secret!);
  expect(scripts.length).toBeGreaterThan(0);
  for (const src of scripts) expect((await (await request.get(src)).text()).includes(secret!), src).toBe(false);
});
