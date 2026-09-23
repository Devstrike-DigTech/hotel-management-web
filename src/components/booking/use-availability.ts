"use client";

import { useEffect, useState } from "react";
import type { HotelAvailability } from "@/lib/booking-types";
import { call, ClientApiError, humanError } from "@/lib/client-api";

export type AvailabilityQuery =
  | { stayType: "NIGHTLY"; checkIn: string; checkOut: string; adults: number; children: number; channel?: string }
  | { stayType: "DAY_USE"; date: string; startTime: string; hours: number; adults: number; children: number; channel?: string };

export type Availability =
  | { status: "idle"; data: null }
  | { status: "loading"; data: HotelAvailability | null }
  | { status: "ready"; data: HotelAvailability }
  | { status: "error"; data: HotelAvailability | null; message: string };

/** Set once an API older than M4 refuses the `channel` parameter; later calls leave it out. */
let channelUnsupported = false;

/** GET /public/hotels/:slug/availability, sending the booking channel when the API takes it. */
export async function fetchAvailability(slug: string, query: Record<string, string | number | undefined | null>, signal?: AbortSignal) {
  const path = `public/hotels/${encodeURIComponent(slug)}/availability`;
  const q = channelUnsupported ? { ...query, channel: undefined } : query;
  try {
    return await call<HotelAvailability>(path, { query: q, signal });
  } catch (e) {
    if (q.channel && e instanceof ClientApiError && e.code === "VALIDATION_ERROR" && e.fields.channel) {
      channelUnsupported = true;
      return call<HotelAvailability>(path, { query: { ...query, channel: undefined }, signal });
    }
    throw e;
  }
}

/** Live availability for a hotel, refetched (debounced) whenever the stay changes; keeps the last answer while loading. */
export function useAvailability(slug: string, q: AvailabilityQuery | null) {
  const [state, setState] = useState<Availability>({ status: "idle", data: null });
  const [attempt, setAttempt] = useState(0);
  const key = q ? JSON.stringify(q) : null;

  useEffect(() => {
    if (!key) {
      const t = setTimeout(() => setState({ status: "idle", data: null }), 0);
      return () => clearTimeout(t);
    }
    const query = JSON.parse(key) as AvailabilityQuery;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setState((s) => ({ status: "loading", data: s.data }));
      try {
        const data = await fetchAvailability(slug, query as unknown as Record<string, string | number>, ctl.signal);
        setState({ status: "ready", data });
      } catch (e) {
        if (ctl.signal.aborted) return;
        setState((s) => ({ status: "error", data: s.data, message: humanError(e, "Live availability did not load.") }));
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [key, slug, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}
