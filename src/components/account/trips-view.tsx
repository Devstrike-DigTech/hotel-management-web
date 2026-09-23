"use client";

import { ArrowRight, CaretRight, Star } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { TripSummary } from "@/lib/booking-types";
import { call, getClockSkew, humanError } from "@/lib/client-api";
import { formatMonthShort, formatShort, formatWeekday } from "@/lib/dates";
import { formatNaira } from "@/lib/format";
import { formatPoints } from "@/lib/loyalty";
import { EmptyRack } from "../marketing/illustrations";
import { HoldCountdown } from "../booking/hold-countdown";
import { Notice } from "../ui/field";
import { Plate } from "../ui/plate";
import { AccountNav } from "./account-nav";
import { StatusChip } from "./status-chip";
import { useGuest } from "./use-guest";

type Trips = { upcoming: TripSummary[]; past: TripSummary[] };

/** Relative link to a trip's manage page (the API gives an absolute one). */
export const tripHref = (t: { code: string; manageToken: string }) => `/trips/${encodeURIComponent(t.code)}?t=${encodeURIComponent(t.manageToken)}`;

export function TripsView() {
  const { state } = useGuest({ required: true, next: "/trips" });
  const [trips, setTrips] = useState<Trips | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (state.status !== "signed-in") return;
    const ctl = new AbortController();
    call<Trips>("guest/trips", { signal: ctl.signal })
      .then((t) => {
        setTrips(t);
        setError(null);
      })
      .catch((e) => !ctl.signal.aborted && setError(humanError(e, "Your trips did not load.")));
    return () => ctl.abort();
  }, [state.status, attempt]);

  const name = state.status === "signed-in" ? state.guest.fullName : null;
  const list = trips ? trips[tab] : null;

  return (
    <div className="container-page pb-10 pt-10 lg:pt-14">
      <AccountNav current="trips" name={name} />
      <div className="mt-8 flex items-center gap-6 text-[0.9375rem]" role="tablist" aria-label="Trips">
        {(["upcoming", "past"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`relative pb-2 transition-colors ${tab === k ? "text-ink" : "text-ink-muted hover:text-ink"}`}
          >
            {k === "upcoming" ? "Upcoming" : "Past and cancelled"}{" "}
            <span className="num text-xs text-ink-muted">{trips ? trips[k].length : ""}</span>
            <span aria-hidden className={`absolute inset-x-0 -bottom-px h-[2px] bg-laterite transition-transform ${tab === k ? "scale-x-100" : "scale-x-0"}`} />
          </button>
        ))}
      </div>

      <div className="mt-6" role="tabpanel" aria-live="polite">
        {error ? (
          <Notice tone="warn" title={error} action={<button className="btn btn-outline !min-h-9 text-sm" onClick={() => setAttempt((n) => n + 1)}>Try again</button>} />
        ) : !list ? (
          <ol className="divide-y divide-line border-y border-line">
            {[0, 1, 2].map((i) => (
              <li key={i} className="grid grid-cols-[4.5rem_1fr] gap-5 py-6 sm:grid-cols-[5rem_8rem_1fr]">
                <div className="skeleton h-16 rounded-xs" />
                <div className="skeleton hidden h-20 rounded-xs sm:block" />
                <div className="space-y-2">
                  <div className="skeleton h-5 w-1/2 rounded-xs" />
                  <div className="skeleton h-4 w-1/3 rounded-xs" />
                </div>
              </li>
            ))}
          </ol>
        ) : list.length ? (
          <ol className="divide-y divide-line border-y border-line" data-testid={`trips-${tab}`}>
            {list.map((t) => (
              <TripRow key={t.code} trip={t} />
            ))}
          </ol>
        ) : (
          <div className="grid items-center gap-10 py-14 md:grid-cols-[13rem_1fr]">
            <EmptyRack className="mx-auto w-40 text-ink md:w-full" />
            <div>
              <p className="kicker text-laterite">{tab === "upcoming" ? "Nothing booked yet" : "No past stays"}</p>
              <h2 className="display-md mt-3 text-4xl">{tab === "upcoming" ? "Every hook on the board is empty." : "Your stays will gather here."}</h2>
              <p className="mt-4 max-w-md leading-relaxed text-ink-muted">
                Bookings made with your number appear here on their own, including ones you made before signing in.
              </p>
              <Link href="/stays" className="btn btn-primary mt-6">
                Find a stay <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TripRow({ trip: t }: { trip: TripSummary }) {
  const href = tripHref(t);
  const dim = t.displayStatus === "CANCELLED" || t.displayStatus === "EXPIRED" || t.displayStatus === "NO_SHOW";
  return (
    <li className={`group relative grid grid-cols-[4.5rem_1fr] gap-x-5 gap-y-4 py-6 sm:grid-cols-[5rem_8.5rem_1fr_auto] sm:items-center sm:gap-x-7 ${dim ? "opacity-75" : ""}`} data-testid="trip-row">
      {/* Date block, like a luggage tag stub */}
      <div className="flex flex-col items-center rounded-sm border border-line-strong bg-surface py-2 text-center">
        <span className="kicker !text-[9.5px]">{formatWeekday(t.arrivalDate)}</span>
        <span className="display text-[2.2rem] leading-none">{Number(t.arrivalDate.slice(8))}</span>
        <span className="kicker !text-[9.5px]">{formatMonthShort(t.arrivalDate)} {t.arrivalDate.slice(2, 4)}</span>
      </div>
      <Plate src={t.hotel.coverImageUrl} alt={t.hotel.name} caption={false} sizes="136px" className="hidden aspect-[4/3] rounded-xs sm:block" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={t.displayStatus} />
          <span className="num text-xs tracking-wider text-ink-muted">{t.code}</span>
        </div>
        <h2 className="display-sm mt-1.5 text-[1.45rem] leading-tight">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] group-hover:text-laterite">
            {t.hotel.name}
          </Link>
        </h2>
        <p className="mt-0.5 text-sm text-ink-muted">
          {t.roomTypeName}, {t.hotel.area}, {t.hotel.city}
        </p>
        <p className="num mt-1 text-[12.5px] text-ink-muted">
          {t.stayType === "DAY_USE" ? `${formatShort(t.arrivalDate)}, ${t.hours} hours` : `${formatShort(t.arrivalDate)} to ${formatShort(t.departureDate)}, ${t.nights} ${t.nights === 1 ? "night" : "nights"}`}
        </p>
        {t.hold ? (
          <div className="relative z-10 mt-2">
            <HoldCountdown expiresAt={t.hold.expiresAt} skewMs={getClockSkew()} variant="inline" />
          </div>
        ) : null}
      </div>
      <div className="col-span-2 flex items-center justify-between gap-4 border-t border-line pt-3 sm:col-span-1 sm:block sm:border-0 sm:pt-0 sm:text-right">
        <div>
          <p className="num text-lg font-medium">{formatNaira(t.totalKobo)}</p>
          <p className="text-xs text-ink-muted">
            {dim ? "" : t.outstandingKobo > 0 ? `${formatNaira(t.outstandingKobo)} at the hotel` : t.paidKobo > 0 ? "Paid" : ""}
          </p>
          {t.pointsEarned ? (
            <p className="num mt-0.5 inline-flex items-center gap-1.5 text-xs text-ink" data-testid="trip-points">
              <span aria-hidden className="size-1.5 rotate-45 bg-brass" />
              +{formatPoints(t.pointsEarned)} points
            </p>
          ) : null}
        </div>
        {t.canReview && !t.reviewed ? (
          <span className="relative z-10 mt-2 inline-flex items-center gap-1.5 rounded-full border border-brass/60 px-2.5 py-1 text-xs text-ink">
            <Star size={12} weight="fill" className="text-brass" aria-hidden /> Review your stay
          </span>
        ) : (
          <CaretRight size={18} className="text-ink-muted transition-transform group-hover:translate-x-0.5 sm:ml-auto sm:mt-2" aria-hidden />
        )}
      </div>
    </li>
  );
}
