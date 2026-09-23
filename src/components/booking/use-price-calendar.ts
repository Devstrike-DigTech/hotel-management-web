"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { call, ClientApiError } from "@/lib/client-api";
import { addDays, compare, todayInLagos, type ISODate } from "@/lib/dates";
import { adaptCalendar, type RawCalendar } from "@/lib/rates";
import type { PriceCalendarState } from "../search/range-calendar";

/**
 * The hotel's price calendar for the months on screen. Spans are fetched once per hotel and
 * party size and kept for the page's life, so paging back and forth costs nothing. An API
 * without the endpoint (404) quietly turns the prices off; a network failure says so under the
 * calendar and the dates still work.
 */
const memory = new Map<string, PriceCalendarState["days"]>();

/** The API serves at most 62 days per call, starting today at the earliest. */
const MAX_SPAN = 62;

export function usePriceCalendar(slug: string, adults: number, children = 0, enabled = true) {
  const [state, setState] = useState<PriceCalendarState>({ days: {}, status: "idle" });
  const [span, setSpan] = useState<{ from: ISODate; to: ISODate } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loaded = useRef(new Set<string>());
  const key = `${slug}|${adults}|${children}`;

  useEffect(() => {
    if (!enabled || !span) return;
    const monthKeys: string[] = [];
    for (let d = span.from; compare(d, span.to) <= 0; d = addDays(d, 28)) monthKeys.push(`${key}|${d.slice(0, 7)}`);
    monthKeys.push(`${key}|${span.to.slice(0, 7)}`);
    const known = memory.get(key) ?? {};
    if (monthKeys.every((m) => loaded.current.has(m))) {
      const t = setTimeout(() => setState({ days: known, status: "ready" }), 0);
      return () => clearTimeout(t);
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setState({ days: known, status: "loading" });
      try {
        const today = todayInLagos();
        const from = compare(span.from, today) < 0 ? today : span.from;
        const last = addDays(from, MAX_SPAN - 1);
        const to = compare(span.to, last) > 0 ? last : span.to;
        if (compare(to, from) < 0) return setState({ days: known, status: "ready" });
        const raw = await call<RawCalendar>(`public/hotels/${encodeURIComponent(slug)}/price-calendar`, {
          query: { from, to, adults, children: children || undefined },
          signal: ctl.signal,
          timeoutMs: 10_000,
          retries: 1,
        });
        const days = { ...(memory.get(key) ?? {}), ...adaptCalendar(raw) };
        memory.set(key, days);
        monthKeys.forEach((m) => loaded.current.add(m));
        setState({ days, status: "ready" });
      } catch (e) {
        if (ctl.signal.aborted) return;
        const gone = e instanceof ClientApiError && (e.status === 404 || e.status === 405);
        setState({ days: known, status: gone ? "unavailable" : "error" });
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [enabled, span, key, slug, adults, children, attempt]);

  const onVisibleChange = useCallback((from: ISODate, to: ISODate) => {
    setSpan((s) => (s && s.from === from && s.to === to ? s : { from, to }));
  }, []);

  // Coming back online retries a failed load.
  useEffect(() => {
    const on = () => setAttempt((n) => n + 1);
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
  }, []);

  return { prices: enabled ? state : undefined, onVisibleChange };
}
