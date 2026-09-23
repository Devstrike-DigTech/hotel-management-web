"use client";

/**
 * The browser's API client. Calls go to this app's own `/api/v1` gateway (same origin, cookies
 * carry the guest session). Built for patchy mobile data: every call has a timeout, reads are
 * retried with backoff, and writes are retried only when they carry an Idempotency-Key, so a
 * retried "book this room" can never create two bookings.
 */

export class ClientApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;
  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
  /** No answer at all (offline, timeout, gateway down): worth trying again. */
  get isNetwork() {
    return this.status === 0 || this.status === 502 || this.status === 503 || this.status === 504;
  }
  /** Field errors from a 400 VALIDATION_ERROR. */
  get fields(): Record<string, string[]> {
    const f = (this.details as { fields?: Record<string, string[]> } | undefined)?.fields;
    return f ?? {};
  }
}

interface CallOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  idempotencyKey?: string;
  timeoutMs?: number;
  /** Extra attempts after the first. Defaults to 2 for reads and keyed writes, 0 otherwise. */
  retries?: number;
  signal?: AbortSignal;
}

/** A signal that aborts after `ms` or when `outer` does; avoids AbortSignal.any for older phones. */
function withTimeout(ms: number, outer?: AbortSignal) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(new DOMException("Timed out", "TimeoutError")), ms);
  outer?.addEventListener("abort", () => c.abort(outer.reason), { once: true });
  c.signal.addEventListener("abort", () => clearTimeout(t), { once: true });
  return c.signal;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Difference between the server's clock and this device's (server minus client), from the last response. */
let clockSkewMs = 0;
export const getClockSkew = () => clockSkewMs;

export async function call<T>(path: string, opts: CallOptions = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const retries = opts.retries ?? (method === "GET" || opts.idempotencyKey ? 2 : 0);
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  const url = `/api/v1/${path.replace(/^\//, "")}${qs.size ? `?${qs}` : ""}`;

  let lastErr: ClientApiError | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt) await sleep(attempt === 1 ? 700 : 1800);
    if (opts.signal?.aborted) throw new ClientApiError(0, "ABORTED", "Cancelled");
    const signal = withTimeout(opts.timeoutMs ?? 15_000, opts.signal);
    try {
      const sentAt = Date.now();
      const res = await fetch(url, {
        method,
        headers: {
          accept: "application/json",
          ...(opts.body !== undefined ? { "content-type": "application/json" } : {}),
          ...(opts.idempotencyKey ? { "idempotency-key": opts.idempotencyKey } : {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal,
        cache: "no-store",
        credentials: "same-origin",
      });
      const date = res.headers.get("date");
      if (date) {
        const server = Date.parse(date);
        if (!Number.isNaN(server)) clockSkewMs = server - (sentAt + Date.now()) / 2;
      }
      if (res.ok) {
        if (res.status === 204) return undefined as T;
        const text = await res.text();
        return (text ? JSON.parse(text) : undefined) as T;
      }
      let body: { code?: string; message?: string | string[]; details?: Record<string, unknown> } = {};
      try {
        body = await res.json();
      } catch {
        /* not JSON */
      }
      const message = Array.isArray(body.message) ? body.message.join(" ") : body.message;
      const err = new ClientApiError(res.status, body.code ?? `HTTP_${res.status}`, message ?? res.statusText, body.details);
      // Retry only what can succeed on a second try: gateway trouble, rate limits for reads.
      if ((err.isNetwork || (res.status === 429 && method === "GET")) && attempt < retries) {
        lastErr = err;
        continue;
      }
      throw err;
    } catch (e) {
      if (e instanceof ClientApiError) throw e;
      const name = (e as Error).name === "AbortError" && !opts.signal?.aborted ? "TimeoutError" : (e as Error).name;
      if (opts.signal?.aborted) throw new ClientApiError(0, "ABORTED", "Cancelled");
      lastErr = new ClientApiError(
        0,
        name === "TimeoutError" ? "TIMEOUT" : "NETWORK_ERROR",
        name === "TimeoutError" ? "The connection is slow and the request timed out." : "You seem to be offline.",
      );
      if (attempt >= retries) throw lastErr;
    }
  }
  throw lastErr ?? new ClientApiError(0, "NETWORK_ERROR", "You seem to be offline.");
}

/** A random key for Idempotency-Key headers (and for dedupe of client actions). */
export function newKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Plain-language message for an error, for toasts and inline notices. */
export function humanError(e: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!(e instanceof ClientApiError)) return fallback;
  if (e.code === "TIMEOUT" || e.status === 504) return "The connection is slow and the request timed out. It is safe to try again.";
  if (e.code === "NETWORK_ERROR" || e.status === 0) return "You seem to be offline. Check your connection and try again; nothing has been lost.";
  if (e.status === 502 || e.status === 503) return "The booking service is not answering right now. Try again in a moment.";
  if (e.status === 429) return "Too many attempts in a short time. Wait a minute, then try again.";
  return e.message || fallback;
}

/** sessionStorage, guarded: private modes and full disks must never break the page. */
export const draft = {
  get<T>(key: string): T | null {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
  remove(key: string) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
