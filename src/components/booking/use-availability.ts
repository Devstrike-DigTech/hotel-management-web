"use client";

import { useEffect, useState } from "react";
import type { HotelAvailability } from "@/lib/booking-types";
import { call, humanError } from "@/lib/client-api";

export type AvailabilityQuery =
  | { stayType: "NIGHTLY"; checkIn: string; checkOut: string; adults: number; children: number }
  | { stayType: "DAY_USE"; date: string; startTime: string; hours: number; adults: number; children: number };

export type Availability =
  | { status: "idle"; data: null }
  | { status: "loading"; data: HotelAvailability | null }
  | { status: "ready"; data: HotelAvailability }
  | { status: "error"; data: HotelAvailability | null; message: string };

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
        const data = await call<HotelAvailability>(`public/hotels/${encodeURIComponent(slug)}/availability`, {
          query: query as unknown as Record<string, string | number>,
          signal: ctl.signal,
        });
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
