import "server-only";
import { headers } from "next/headers";
import { API_URL } from "./env";
import { clientIpFrom, trustedProxyHeaders } from "./server/client-ip";
import type { BookingConfig, ReviewPage } from "./booking-types";
import type {
  ApiErrorBody,
  AppInfo,
  City,
  Feature,
  HotelCard,
  HotelDetail,
  HotelGroup,
  HotelLoyalty,
  HotelQuery,
  Paginated,
  Plan,
  ResolvedHost,
} from "./types";

/** Typed client for the public API. Server-only: pages fetch on the server for SEO. */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(status: number, body: Partial<ApiErrorBody> | null, fallback: string) {
    super(body?.message || fallback);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code || (status === 0 ? "NETWORK_ERROR" : `HTTP_${status}`);
    this.details = body?.details;
  }
}

interface RequestOptions {
  /** Seconds to cache the response in the Next data cache. `false` disables caching. */
  revalidate?: number | false;
  tags?: string[];
  timeoutMs?: number;
}

/**
 * The visitor's address, for uncached calls made while rendering their request. Cached responses
 * are shared by every visitor (and the Next data cache keys on request headers), so those carry
 * only the proxy credential, never one visitor's address.
 */
async function visitorIp(): Promise<string | null> {
  try {
    return clientIpFrom(await headers());
  } catch {
    return null; // outside a request (build, background revalidation)
  }
}

async function request<T>(path: string, { revalidate = 60, tags, timeoutMs = 8000 }: RequestOptions = {}): Promise<T> {
  const url = `${API_URL}/api/v1${path}`;
  const trusted = trustedProxyHeaders(revalidate === false ? await visitorIp() : null);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "application/json", ...trusted },
      signal: AbortSignal.timeout(timeoutMs),
      ...(revalidate === false ? { cache: "no-store" as const } : { next: { revalidate, tags } }),
    });
  } catch (err) {
    throw new ApiError(0, null, `Could not reach the API at ${url}: ${(err as Error).message}`);
  }
  if (!res.ok) {
    let body: Partial<ApiErrorBody> | null = null;
    try {
      body = await res.json();
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(res.status, body, `${res.status} ${res.statusText} for ${path}`);
  }
  return (await res.json()) as T;
}

function qs(params: Record<string, string | number | undefined | null>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  }
  const out = s.toString();
  return out ? `?${out}` : "";
}

export const api = {
  app: () => request<AppInfo>("/public/app", { revalidate: 3600 }),
  plans: () => request<Plan[]>("/public/plans", { revalidate: 300, tags: ["plans"] }),
  features: () => request<Feature[]>("/public/features", { revalidate: 300, tags: ["features"] }),
  cities: () => request<City[]>("/public/cities", { revalidate: 300, tags: ["cities"] }),
  hotels: (q: HotelQuery = {}) =>
    request<Paginated<HotelCard>>(`/public/hotels${qs({ ...q })}`, { revalidate: 60, tags: ["hotels"] }),
  /** Returns null when the hotel does not exist (404). */
  /**
   * `host` (M6) is the custom domain the page is being served on; the API answers with the hotel's
   * white-label brand only when that host is the property's verified domain.
   */
  hotel: async (slug: string, host?: string | null): Promise<HotelDetail | null> => {
    try {
      return await request<HotelDetail>(`/public/hotels/${encodeURIComponent(slug)}${qs({ host })}`, {
        revalidate: 60,
        tags: ["hotels", `hotel:${slug}`],
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },
  bookingConfig: () => request<BookingConfig>("/public/booking-config", { revalidate: 300 }),
  reviews: (slug: string, q: { travellerType?: string; sort?: string; page?: number; pageSize?: number } = {}) =>
    request<ReviewPage>(`/public/hotels/${encodeURIComponent(slug)}/reviews${qs({ ...q })}`, {
      revalidate: 60,
      tags: ["reviews", `reviews:${slug}`],
    }),
  /** M5: a hotel group and its properties; null when unknown (404, or an API from before M5). */
  group: async (slug: string): Promise<HotelGroup | null> => {
    try {
      return await request<HotelGroup>(`/public/groups/${encodeURIComponent(slug)}`, { revalidate: 60, tags: ["hotels", `group:${slug}`] });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },
  /** M5: a hotel's loyalty programme (public view, no member); null without one or before M5. */
  loyalty: async (slug: string): Promise<HotelLoyalty["programme"]> => {
    try {
      const r = await request<HotelLoyalty>(`/public/hotels/${encodeURIComponent(slug)}/loyalty`, { revalidate: 120, tags: [`loyalty:${slug}`] });
      return r.programme;
    } catch {
      return null;
    }
  },
  /**
   * M7: a hotel's site theme (API-M7 1.9): the published one, or the draft behind a preview token
   * (never cached: drafts change by the second). Null when unknown, expired or before M7.
   */
  siteTheme: async (slug: string, opts: { preview?: string | null; host?: string | null } = {}): Promise<Record<string, unknown> | null> => {
    try {
      return await request<Record<string, unknown>>(
        `/public/hotels/${encodeURIComponent(slug)}/theme${qs({ preview: opts.preview, host: opts.host })}`,
        opts.preview ? { revalidate: false } : { revalidate: 60, tags: [`theme:${slug}`] },
      );
    } catch (err) {
      if (err instanceof ApiError && [400, 401, 403, 404, 410].includes(err.status)) return null;
      throw err;
    }
  },
  /** M7: a hotel group root's theme (the primary property's when the group has none). */
  groupTheme: async (slug: string, opts: { preview?: string | null; host?: string | null } = {}): Promise<Record<string, unknown> | null> => {
    try {
      return await request<Record<string, unknown>>(
        `/public/groups/${encodeURIComponent(slug)}/theme${qs({ preview: opts.preview, host: opts.host })}`,
        opts.preview ? { revalidate: false } : { revalidate: 60, tags: [`group-theme:${slug}`] },
      );
    } catch (err) {
      if (err instanceof ApiError && [400, 401, 403, 404, 410].includes(err.status)) return null;
      throw err;
    }
  },
  /**
   * M7: the published booking form for a channel (API-M7 2.9), or the draft behind a preview token.
   * Null before M7 (the web then uses its built-in form).
   */
  bookingForm: async (slug: string, channel: string, preview?: string | null): Promise<unknown | null> => {
    try {
      return await request<unknown>(`/public/hotels/${encodeURIComponent(slug)}/booking-form${qs({ channel, preview })}`, preview ? { revalidate: false } : { revalidate: 30, tags: [`form:${slug}`] });
    } catch (err) {
      if (err instanceof ApiError && [400, 401, 403, 404, 410].includes(err.status)) return null;
      throw err;
    }
  },
  /** M7: a hotel's pickup points (arrival and departure transfers). */
  pickupPoints: async (slug: string): Promise<unknown[]> => {
    try {
      const r = await request<unknown>(`/public/hotels/${encodeURIComponent(slug)}/pickup-points`, { revalidate: 60, tags: [`pickups:${slug}`] });
      return Array.isArray(r) ? r : Array.isArray((r as { items?: unknown[] })?.items) ? (r as { items: unknown[] }).items : [];
    } catch {
      return [];
    }
  },
  resolveHost: async (host: string): Promise<ResolvedHost | null> => {
    try {
      return await request<ResolvedHost>(`/public/resolve-host${qs({ host })}`, { revalidate: false, timeoutMs: 3000 });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },
};

/** Settles a request into a result instead of throwing, so a page can degrade gracefully when the API is down. */
export async function settle<T>(p: Promise<T>): Promise<{ data: T; error: null } | { data: null; error: ApiError }> {
  try {
    return { data: await p, error: null };
  } catch (err) {
    const e = err instanceof ApiError ? err : new ApiError(0, null, (err as Error).message);
    if (process.env.NODE_ENV !== "production" || e.status >= 500 || e.status === 0) {
      console.error(`[api] ${e.code}: ${e.message}`);
    }
    return { data: null, error: e };
  }
}

/** Fetches every listed hotel (the marketplace is small in M1). Falls back to paging if the API caps pageSize. */
export async function allHotels(q: Omit<HotelQuery, "page" | "pageSize"> = {}): Promise<HotelCard[]> {
  const pageSize = 48; // the API caps pageSize at 48
  const first = await api.hotels({ ...q, page: 1, pageSize });
  const items = [...first.items];
  const size = first.pageSize || pageSize;
  const pages = Math.min(Math.ceil(first.total / size), 10);
  for (let page = 2; page <= pages; page++) {
    const next = await api.hotels({ ...q, page, pageSize });
    items.push(...next.items);
  }
  return items;
}
