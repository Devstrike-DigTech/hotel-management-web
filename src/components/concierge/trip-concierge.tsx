"use client";

import { BellSimpleRinging, ChatCircleDots, Plus } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BookingView } from "@/lib/booking-types";
import { call, ClientApiError } from "@/lib/client-api";
import { normaliseTrip, OPEN_STATUSES, type TripConciergeView } from "@/lib/concierge";
import { todayInLagos } from "@/lib/dates";
import { rememberTrip } from "./arrange-panel";
import { RequestCard } from "./request-card";
import { ConciergeSheet } from "./sheet";

const POLL_MS = 15_000;

/**
 * "Arranged for your stay" on the trip page: the guest's requests with their live status, and the
 * concierge to ask for more. Works from the manage link (no account needed). Hidden when the hotel
 * has no concierge, the booking is cancelled, or the stay ended with nothing arranged.
 */
export function TripConcierge({ booking, token, base, arrange = null }: { booking: BookingView; token: string; base: string; arrange?: string | null }) {
  const [view, setView] = useState<TripConciergeView | null>(null);
  const [gone, setGone] = useState(false);
  const [trouble, setTrouble] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sheet, setSheet] = useState<{ start: string | null } | null>(arrange ? { start: arrange } : null);
  const alive = useRef(true);
  const code = booking.code;
  const requests = view?.requests ?? null;
  const catalogue = view && !view.catalogue.unavailable ? view.catalogue : null;

  const loadRequests = useCallback(async () => {
    try {
      const raw = await call<unknown>(`public/trips/${encodeURIComponent(code)}/concierge`, { query: { t: token }, retries: 1 });
      if (!alive.current) return;
      setTrouble(false);
      setView(normaliseTrip(raw));
      rememberTrip(booking.hotel.slug, { code, token, arrivalDate: booking.arrivalDate, departureDate: booking.departureDate });
    } catch (e) {
      // No concierge here (plan, switched off, suspended) or an older API: the section stays away.
      if (e instanceof ClientApiError && [402, 403, 404, 409].includes(e.status)) {
        if (alive.current) setGone(true);
      } else if (alive.current) {
        // Offline or the service is busy: say so quietly and try again shortly.
        setTrouble(true);
        retry.current = setTimeout(() => alive.current && setAttempt((n) => n + 1), 6000);
      }
    }
  }, [code, token, booking.hotel.slug, booking.arrivalDate, booking.departureDate]);

  useEffect(() => {
    alive.current = true;
    const t = setTimeout(loadRequests, 0);
    return () => {
      alive.current = false;
      clearTimeout(t);
      if (retry.current) clearTimeout(retry.current);
    };
  }, [loadRequests, attempt]);

  // Live status: poll while anything is still moving, and when the page comes back into view.
  const moving = !!requests?.some((r) => OPEN_STATUSES.has(r.status) && r.status !== "CONFIRMED" && r.status !== "SCHEDULED");
  useEffect(() => {
    if (!moving) return;
    const i = setInterval(() => document.visibilityState === "visible" && loadRequests(), POLL_MS);
    return () => clearInterval(i);
  }, [moving, loadRequests]);
  useEffect(() => {
    const onShow = () => document.visibilityState === "visible" && loadRequests();
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [loadRequests]);

  const today = todayInLagos();
  const stayOver = booking.departureDate < today || booking.displayStatus === "COMPLETED";
  const canAsk = !!catalogue && !!catalogue.services.length || !!catalogue?.freeForm;
  const open = canAsk && booking.status !== "CANCELLED" && booking.displayStatus !== "EXPIRED" && booking.displayStatus !== "NO_SHOW" && !stayOver;
  const list = requests ?? [];
  if (gone || (view && !open && !list.length) || (!view && booking.concierge && !booking.concierge.enabled)) return null;

  const ctx = {
    kind: "trip" as const,
    code,
    token,
    arrivalDate: booking.arrivalDate,
    departureDate: booking.departureDate,
    party: booking.adults + booking.children,
    hotelSlug: booking.hotel.slug,
    today,
    folioOpen: !!view?.stay.folioOpen,
    payments: catalogue?.payments ?? { online: true, folio: true },
    hasEmail: !!(view?.contactDefaults.email ?? booking.guest.email),
  };
  const inHouse = booking.displayStatus === "CHECKED_IN";

  return (
    <section className="mt-10 rounded-md border border-line-strong bg-surface" aria-labelledby="concierge-title" data-testid="trip-concierge">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <p className="kicker flex items-center gap-2">
            <BellSimpleRinging size={14} aria-hidden className="text-laterite" /> The concierge
          </p>
          <h2 id="concierge-title" className="display-sm mt-1.5 text-2xl">
            {list.length ? "Arranged for your stay" : inHouse ? "Anything we can arrange?" : "Anything we can arrange for your stay?"}
          </h2>
        </div>
        {open ? (
          <button type="button" className="btn btn-primary !min-h-10 text-sm" onClick={() => setSheet({ start: null })} data-testid="concierge-open">
            <Plus size={15} aria-hidden /> Arrange something
          </button>
        ) : null}
      </header>
      {requests === null ? (
        <div className="px-5 py-5 sm:px-6" aria-busy="true">
          {trouble ? <p className="mb-3 text-sm text-ink-muted">The concierge is not answering just now. Trying again.</p> : null}
          <div className="skeleton h-4 w-2/3 rounded-xs" />
          <div className="skeleton mt-3 h-4 w-1/2 rounded-xs" />
        </div>
      ) : list.length ? (
        <ul className="divide-y divide-line px-5 sm:px-6" aria-live="polite" data-testid="concierge-requests">
          {list.map((r) => (
            <RequestCard key={r.id} request={r} code={code} token={token} base={base} onChanged={loadRequests} />
          ))}
        </ul>
      ) : (
        <div className="px-5 py-5 text-[0.9375rem] leading-relaxed text-ink-muted sm:px-6">
          <p>
            A massage after the flight, a table for tonight, a car for the day, flowers in the room.{" "}
            {catalogue && catalogue.services.length ? `${catalogue.services.length} things are on the list, ` : ""}and if it is not there, ask.
          </p>
          {catalogue?.freeForm ? (
            <button type="button" className="link-static mt-3 inline-flex items-center gap-1.5 text-ink" onClick={() => setSheet({ start: "free" })}>
              <ChatCircleDots size={16} aria-hidden /> Ask for something else
            </button>
          ) : null}
        </div>
      )}

      {sheet && catalogue && (sheet.start === null || sheet.start === "free" || catalogue.services.some((s) => s.id === sheet.start)) ? (
        <ConciergeSheet
          services={catalogue.services}
          freeForm={catalogue.freeForm}
          contactChannels={catalogue.contactChannels}
          neutralLabel={null}
          ctx={ctx}
          start={sheet.start}
          onClose={() => {
            setSheet(null);
            loadRequests();
          }}
          onSent={(r) => setView((cur) => (cur ? { ...cur, requests: [r, ...cur.requests.filter((x) => x.id !== r.id)] } : cur))}
        />
      ) : null}
    </section>
  );
}
