"use client";

import { ArrowRight, ShieldCheck } from "@phosphor-icons/react";
import { diffDays } from "@/lib/dates";
import { formatNaira } from "@/lib/format";
import { formatLagosShort } from "@/lib/time";
import { useStay } from "../hotel/stay-context";
import { DateRangeField } from "../search/date-range-field";
import { GuestsStepper } from "../search/guests-stepper";

/**
 * Dates, guests and the way to the rooms in one horizontal bar, for templates that do not keep a
 * stay card beside the page. The live "from" figure updates as the dates change.
 */
export function StayBar({
  fromKobo,
  target = "#rooms",
  cta = "See the rooms",
  className = "",
  tone = "surface",
}: {
  fromKobo: number | null;
  target?: string;
  cta?: string;
  className?: string;
  tone?: "surface" | "paper";
}) {
  const { range, setRange, guests, setGuests, today, availability, calendar } = useStay();
  const nights = range.checkIn && range.checkOut ? diffDays(range.checkIn, range.checkOut) : null;
  const data = availability.status === "ready" ? availability.data : null;
  let cheapest: number | null = null;
  for (const r of data?.roomTypes ?? []) {
    if (!r.bookable) continue;
    for (const t of [r.quote?.totalKobo, ...(r.ratePlans ?? []).filter((p) => p.bookable !== false && p.quote).map((p) => p.quote!.totalKobo)]) {
      if (typeof t === "number" && (cheapest === null || t < cheapest)) cheapest = t;
    }
  }
  return (
    <div className={`stay-bar ${className}`} data-testid="stay-bar">
      <div className={`flex flex-col border border-line-strong md:flex-row md:items-stretch ${tone === "paper" ? "bg-paper" : "bg-surface"} stay-bar-frame`}>
        <div className="flex min-w-0 flex-col divide-y divide-line md:flex-1 md:flex-row md:divide-x md:divide-y-0">
          <DateRangeField value={range} onChange={setRange} today={today} prices={calendar.prices} onVisibleChange={calendar.onVisibleChange} />
          <GuestsStepper value={guests} onChange={setGuests} className="px-5 py-3 md:w-40 md:flex-none" />
          <div className="flex min-w-0 flex-col justify-center px-5 py-3 md:w-52 md:flex-none" aria-live="polite">
            <span className="kicker">{nights ? `${nights} ${nights === 1 ? "night" : "nights"}, all in` : "From, a night"}</span>
            <span className="num mt-0.5 text-lg font-medium">
              {nights && availability.status === "loading" ? (
                <span className="skeleton inline-block h-5 w-24 rounded-xs align-middle" />
              ) : nights && data ? (
                cheapest !== null ? (
                  formatNaira(cheapest)
                ) : (
                  <span className="text-sm font-normal text-ochre">Full on those dates</span>
                )
              ) : (
                formatNaira(fromKobo)
              )}
            </span>
          </div>
        </div>
        <div className="p-2 md:pl-0">
          <a href={target} className="btn btn-primary group h-full w-full md:w-auto md:!px-6">
            {nights ? `${cta} for ${nights} ${nights === 1 ? "night" : "nights"}` : cta}
            <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
      {data?.freeCancellationUntil ? (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-muted">
          <ShieldCheck size={14} weight="fill" className="text-palm" aria-hidden /> Free cancellation until{" "}
          <span className="num text-ink">{formatLagosShort(data.freeCancellationUntil)}</span>
        </p>
      ) : null}
    </div>
  );
}
