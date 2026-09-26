"use client";

import { ArrowRight, CalendarPlus, SuitcaseRolling } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { TripSummary } from "@/lib/booking-types";
import { call } from "@/lib/client-api";
import { formatShort, todayInLagos } from "@/lib/dates";
import { useGuestHint } from "../account/account-link";

interface KnownTrip {
  code: string;
  token: string;
  arrivalDate: string;
  departureDate: string;
}

const KEY = "concierge:trips";

/** Trips opened on this device, per hotel, so a service page can offer "Arrange for PWH-7K3Q9". Guarded storage. */
export function rememberTrip(slug: string, t: KnownTrip) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, KnownTrip[]>;
    const list = (all[slug] ?? []).filter((x) => x.code !== t.code);
    all[slug] = [t, ...list].slice(0, 5);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* private mode or full storage: nothing to remember */
  }
}

function known(slug: string): KnownTrip[] {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, KnownTrip[]>;
    return Array.isArray(all[slug]) ? all[slug] : [];
  } catch {
    return [];
  }
}

/**
 * "Arrange this" on a service page. Requests belong to a stay, so: a stay this guest has opened on
 * this device or has in their account goes straight to its trip page with the service ready; else
 * book a room and add it there (services offered before arrival), or open the confirmation's link.
 */
export function ArrangePanel({
  slug,
  serviceId,
  serviceName,
  base,
  bookHref,
  preArrival,
  duringStay,
  whiteLabel,
}: {
  slug: string;
  serviceId: string;
  serviceName: string;
  base: string;
  bookHref: string;
  preArrival: boolean;
  duringStay: boolean;
  whiteLabel: boolean;
}) {
  const hint = useGuestHint();
  const [trips, setTrips] = useState<KnownTrip[] | null>(null);

  useEffect(() => {
    const today = todayInLagos();
    const local = known(slug).filter((t) => t.departureDate >= today);
    const t = setTimeout(() => setTrips(local), 0);
    if (!hint || whiteLabel) return () => clearTimeout(t);
    const ctl = new AbortController();
    call<{ upcoming: TripSummary[] }>("guest/trips", { signal: ctl.signal })
      .then((r) => {
        const mine = (r.upcoming ?? [])
          .filter((x) => x.hotel.slug === slug && x.status !== "CANCELLED" && x.departureDate >= today)
          .map((x) => ({ code: x.code, token: x.manageToken, arrivalDate: x.arrivalDate, departureDate: x.departureDate }));
        setTrips([...mine, ...local.filter((l) => !mine.some((m) => m.code === l.code))]);
      })
      .catch(() => undefined);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [slug, hint, whiteLabel]);

  const tripHref = (t: KnownTrip) => `${base}/trips/${encodeURIComponent(t.code)}?t=${encodeURIComponent(t.token)}&arrange=${encodeURIComponent(serviceId)}`;

  return (
    <div className="space-y-4" data-testid="arrange-panel">
      {trips === null ? (
        <div className="skeleton h-24 rounded-md" aria-busy="true" />
      ) : trips.length && duringStay ? (
        <div className="rounded-md border border-line-strong bg-surface p-5">
          <p className="kicker flex items-center gap-2">
            <SuitcaseRolling size={14} aria-hidden /> Your stay
          </p>
          <ul className="mt-3 space-y-2">
            {trips.map((t) => (
              <li key={t.code}>
                <Link href={tripHref(t)} className="btn btn-primary w-full justify-between" data-testid="arrange-for-trip">
                  <span>
                    Arrange for <span className="num">{t.code}</span>
                  </span>
                  <span className="num text-sm opacity-80">
                    {formatShort(t.arrivalDate)} to {formatShort(t.departureDate)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preArrival ? (
        <div className="rounded-md border border-line-strong bg-surface p-5">
          <p className="kicker flex items-center gap-2">
            <CalendarPlus size={14} aria-hidden /> Not booked yet
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">Book a room and add {serviceName.toLowerCase()} in the same few steps.</p>
          <Link href={`${bookHref}?arrange=${encodeURIComponent(serviceId)}`} className="btn btn-outline mt-4 w-full" data-testid="arrange-book">
            Book a room and add it <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      ) : null}

      <p className="text-sm leading-relaxed text-ink-muted">
        Already booked? Open the link in your confirmation message
        {whiteLabel ? "" : (
          <>
            , or{" "}
            <Link href={`/account/sign-in?next=${encodeURIComponent("/trips")}`} className="link-static text-ink">
              sign in
            </Link>
          </>
        )}
        , and ask from your booking.
      </p>
    </div>
  );
}
