"use client";

import { useEffect, useState } from "react";
import { call } from "@/lib/client-api";
import type { HotelDetail } from "@/lib/types";

/**
 * The hotel's WhatsApp number when it answers guests there (M5 `whatsapp_messaging`), for pages that
 * only have a booking's hotel summary (trips, confirmation). Null while loading, when the hotel does
 * not offer it, or when the API is from before M5.
 */
export function useHotelChat(slug: string | null | undefined) {
  const [phone, setPhone] = useState<string | null>(null);
  useEffect(() => {
    if (!slug) return;
    const ctl = new AbortController();
    call<HotelDetail>(`public/hotels/${encodeURIComponent(slug)}`, { signal: ctl.signal, retries: 1 })
      .then((h) => {
        const w = h.whatsapp;
        setPhone(w?.available ? (w.phone ?? w.waUrl?.replace(/^.*wa\.me\//, "") ?? null) : null);
      })
      .catch(() => setPhone(null));
    return () => ctl.abort();
  }, [slug]);
  return phone;
}
