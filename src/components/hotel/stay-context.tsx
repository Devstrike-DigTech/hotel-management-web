"use client";

import { ArrowRight, Clock, ShieldCheck } from "@phosphor-icons/react";
import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import type { HotelAvailability, RoomTypeAvailability } from "@/lib/booking-types";
import { humanError } from "@/lib/client-api";
import { fetchAvailability } from "../booking/use-availability";
import { diffDays, type ISODate } from "@/lib/dates";
import { formatNaira } from "@/lib/format";
import { formatLagosShort } from "@/lib/time";
import type { RoomTypePublic } from "@/lib/types";
import { plansFor, type PlanOffer } from "@/lib/rates";
import { PlanLedger } from "../booking/rate-plans";
import { usePriceCalendar } from "../booking/use-price-calendar";
import { DateRangeField } from "../search/date-range-field";
import { GuestsStepper } from "../search/guests-stepper";
import type { Range } from "../search/range-calendar";

type AvailabilityState =
  | { status: "idle" }
  | { status: "loading"; key: string; previous: HotelAvailability | null }
  | { status: "ready"; key: string; data: HotelAvailability }
  | { status: "error"; key: string; message: string };

interface StayState {
  availability: AvailabilityState;
  /** Live figures for one room type for the chosen dates, or null without dates. */
  roomFor: (roomTypeId: string) => RoomTypeAvailability | null;
  retryAvailability: () => void;
  range: Range;
  setRange: (r: Range) => void;
  guests: number;
  setGuests: (n: number) => void;
  today: ISODate;
  bookHref: (roomId?: string, planId?: string) => string;
  calendar: ReturnType<typeof usePriceCalendar>;
  cancellationPolicy: HotelAvailability["cancellationPolicy"] | null;
}

const Ctx = createContext<StayState | null>(null);

export function StayProvider({
  children,
  initial,
  today,
  bookBase,
  slug,
  cancellationPolicy = null,
  channel,
}: {
  children: React.ReactNode;
  initial: { checkIn: ISODate | null; checkOut: ISODate | null; guests: number };
  today: ISODate;
  bookBase: string;
  slug: string;
  cancellationPolicy?: HotelAvailability["cancellationPolicy"] | null;
  /** The channel this page books with, so plans and prices match what the booking will charge. */
  channel?: "MARKETPLACE" | "BOOKING_SITE";
}) {
  const [range, setRange] = useState<Range>({ checkIn: initial.checkIn, checkOut: initial.checkOut });
  const [guests, setGuests] = useState(initial.guests);
  const [availability, setAvailability] = useState<AvailabilityState>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const key = range.checkIn && range.checkOut ? `${range.checkIn}|${range.checkOut}|${guests}|${attempt}` : null;

  // Live availability for the chosen dates: debounced, cancelled when the dates change again.
  useEffect(() => {
    if (!key || !range.checkIn || !range.checkOut) {
      const t = setTimeout(() => setAvailability({ status: "idle" }), 0);
      return () => clearTimeout(t);
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setAvailability((a) => ({ status: "loading", key, previous: a.status === "ready" ? a.data : a.status === "loading" ? a.previous : null }));
      try {
        const data = await fetchAvailability(slug, { checkIn: range.checkIn, checkOut: range.checkOut, adults: guests, channel }, ctl.signal);
        setAvailability({ status: "ready", key, data });
      } catch (e) {
        if (ctl.signal.aborted) return;
        setAvailability({ status: "error", key, message: humanError(e, "Live prices did not load.") });
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [key, slug, range.checkIn, range.checkOut, guests, channel]);

  const data = availability.status === "ready" ? availability.data : availability.status === "loading" ? availability.previous : null;
  const roomFor = (id: string) => data?.roomTypes.find((r) => r.roomType.id === id) ?? null;
  const retryAvailability = () => setAttempt((n) => n + 1);
  const calendar = usePriceCalendar(slug, guests);
  const bookHref = (roomId?: string, planId?: string) => {
    const p = new URLSearchParams();
    if (roomId) p.set("room", roomId);
    if (planId) p.set("plan", planId);
    if (range.checkIn && range.checkOut) {
      p.set("checkIn", range.checkIn);
      p.set("checkOut", range.checkOut);
    }
    p.set("guests", String(guests));
    return `${bookBase}?${p.toString()}`;
  };
  return (
    <Ctx.Provider value={{ availability, roomFor, retryAvailability, range, setRange, guests, setGuests, today, bookHref, calendar, cancellationPolicy }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStay() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStay outside StayProvider");
  return v;
}

/** The sticky side card: dates and guests, then live prices for the stay, and the way into booking. */
export function StayCard({
  fromKobo,
  phone,
  cancellationSummary,
}: {
  fromKobo: number | null;
  phone: string | null;
  cancellationSummary?: string | null;
}) {
  const { range, setRange, guests, setGuests, today, availability, retryAvailability, calendar } = useStay();
  const nights = range.checkIn && range.checkOut ? diffDays(range.checkIn, range.checkOut) : null;
  const data = availability.status === "ready" ? availability.data : null;
  const bookable = data?.roomTypes.filter((r) => r.bookable && r.quote) ?? [];
  const cheapest = cheapestTotal(data);

  return (
    <div className="rounded-md border border-line-strong bg-surface p-5 sm:p-6" data-testid="stay-card">
      <div aria-live="polite" className="min-h-[4.5rem]">
        {!nights ? (
          <div className="flex items-baseline justify-between gap-3">
            <p className="kicker">From</p>
            <p className="text-sm text-ink-muted">
              <span className="num text-2xl font-medium text-ink">{formatNaira(fromKobo)}</span> / night
            </p>
          </div>
        ) : availability.status === "loading" || availability.status === "idle" ? (
          <div className="space-y-2">
            <p className="kicker">Checking the rooms for your dates</p>
            <div className="skeleton h-8 w-40 rounded-xs" />
          </div>
        ) : availability.status === "error" ? (
          <div>
            <p className="kicker !text-ochre">Live prices did not load</p>
            <p className="mt-1 text-sm text-ink-muted">{availability.message}</p>
            <button type="button" onClick={retryAvailability} className="link-static mt-2 text-sm font-medium text-laterite">
              Try again
            </button>
          </div>
        ) : data && cheapest !== null ? (
          <div>
            <p className="kicker">
              {nights} {nights === 1 ? "night" : "nights"}, taxes included
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              from <span className="num text-[1.75rem] font-medium leading-none text-ink">{formatNaira(cheapest)}</span>
            </p>
            <p className="kicker mt-2 inline-flex items-center gap-1.5 !text-palm">
              <span aria-hidden className="size-1.5 rounded-full bg-palm" />
              {bookable.length} of {data.roomTypes.length} room types free
            </p>
          </div>
        ) : (
          <div>
            <p className="kicker !text-ochre">Full on those dates</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              Every room type is taken for at least one of those nights. Try moving a day either side.
            </p>
          </div>
        )}
      </div>
      <div className="mt-5 space-y-3">
        <DateRangeField value={range} onChange={setRange} today={today} variant="stack" align="right" prices={calendar.prices} onVisibleChange={calendar.onVisibleChange} />
        <div className="rounded-sm border border-line-strong bg-surface px-4 py-3">
          <GuestsStepper value={guests} onChange={setGuests} layout="row" />
        </div>
      </div>
      <a href="#rooms" className="btn btn-primary group mt-5 w-full">
        {nights ? `Choose a room for ${nights} ${nights === 1 ? "night" : "nights"}` : "See the rooms"}
        <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
      </a>
      <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted">
        {data?.freeCancellationUntil ? (
          <>
            <ShieldCheck size={14} weight="fill" className="-mt-0.5 mr-1 inline text-palm" aria-hidden />
            Free cancellation until <span className="num text-ink">{formatLagosShort(data.freeCancellationUntil)}</span>
          </>
        ) : cancellationSummary ? (
          cancellationSummary
        ) : (
          <>
            Prices are per room per night, before taxes.
            {phone ? " Questions? The front desk answers the phone." : ""}
          </>
        )}
      </p>
    </div>
  );
}

/** The price and action column of a room row: the nightly rate without dates, the stay's total with them. */
export function RoomOffer({ room }: { room: RoomTypePublic }) {
  const { id: roomId, name, basePriceKobo, hourlyPriceKobo } = room;
  const { availability, roomFor, range, bookHref } = useStay();
  const live = roomFor(roomId);
  const plans = plansFor(room, live);
  const several = plans.length > 1;
  const quoted = plans.filter((p) => p.bookable && p.quote).map((p) => p.quote!);
  const best = quoted.length ? quoted.reduce((a, b) => (b.totalKobo < a.totalKobo ? b : a)) : (live?.quote ?? null);
  const fromNight = nightlyFrom(room, plans);
  const dated = !!(range.checkIn && range.checkOut);
  const loading = dated && (availability.status === "loading" || availability.status === "idle");
  const nights = dated ? diffDays(range.checkIn!, range.checkOut!) : 0;
  const blocked = dated && live && !live.bookable;

  return (
    <>
      <div className="lg:text-right" aria-live="polite" data-testid="room-offer">
        {dated && live?.quote && live.bookable ? (
          <>
            <p className="kicker">
              {nights} {nights === 1 ? "night" : "nights"}, all in
            </p>
            <p className={`mt-1 transition-opacity ${loading ? "opacity-40" : ""}`}>
              {several ? <span className="mr-1.5 text-[12.5px] text-ink-muted">from</span> : null}
              <span className="num text-2xl font-medium">{formatNaira(best!.totalKobo)}</span>
            </p>
            <p className="mt-1 text-[12.5px] text-ink-muted">{nightlyLine(best!)}</p>
            <p className={`kicker mt-2.5 ${live.lowAvailability ? "!text-laterite" : "!text-palm"}`}>
              {live.lowAvailability ? `Only ${live.available} left` : "Free for your dates"}
            </p>
          </>
        ) : blocked ? (
          <>
            <p className="kicker !text-ochre">
              {live!.unavailableReason === "CAPACITY"
                ? "Too small for your group"
                : live!.unavailableReason === "ONLINE_BOOKING_DISABLED"
                  ? "Book by phone"
                  : "Full on your dates"}
            </p>
            <p className="num mt-1 text-2xl font-medium text-ink-muted line-through decoration-1">{formatNaira(basePriceKobo)}</p>
            <p className="mt-1 text-[12.5px] text-ink-muted">a night</p>
          </>
        ) : loading ? (
          <>
            <p className="kicker">Checking your dates</p>
            <div className="skeleton mt-2 h-7 w-28 rounded-xs lg:ml-auto" />
          </>
        ) : (
          <>
            <p className="kicker">{fromNight < basePriceKobo || several ? "From, per night" : "Per night"}</p>
            <p className="num mt-1 text-2xl font-medium">{formatNaira(fromNight)}</p>
            {hourlyPriceKobo ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-brass">
                <Clock size={14} weight="bold" aria-hidden />
                Day use <span className="num font-medium">{formatNaira(hourlyPriceKobo)}</span> / hr
              </p>
            ) : null}
            {!dated ? <p className="mt-2.5 text-[12.5px] text-ink-muted">Add dates for the stay&rsquo;s total</p> : null}
          </>
        )}
      </div>
      {blocked ? (
        <span className="btn btn-outline w-full cursor-not-allowed opacity-50 sm:w-auto" aria-disabled="true">
          Not available
        </span>
      ) : several ? (
        <a href={`#rates-${roomId}`} className="kicker inline-flex items-center gap-1.5 hover:text-ink" aria-label={`The ${plans.length} rates for the ${name}, below`}>
          {plans.length} rates below <ArrowRight size={12} aria-hidden className="rotate-90" />
        </a>
      ) : (
        <Link href={bookHref(roomId)} className="btn btn-ink group w-full sm:w-auto" aria-label={`Select ${name}`}>
          Select <ArrowRight size={15} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </>
  );
}

/** Phones: a slim bar pinned to the bottom, so booking is always one tap away. */
export function MobileBookBar({ fromKobo }: { fromKobo: number | null }) {
  const { range, availability } = useStay();
  const nights = range.checkIn && range.checkOut ? diffDays(range.checkIn, range.checkOut) : null;
  const data = nights && availability.status === "ready" ? availability.data : null;
  const cheapest = cheapestTotal(data);
  return (
    <div data-pinned-bar className="fixed inset-x-0 bottom-0 z-30 border-t border-line-strong bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-[6px] lg:hidden print:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
        <p className="text-sm leading-tight text-ink-muted">
          {cheapest !== null ? (
            <>
              <span className="kicker block !text-[10px]">
                {nights} {nights === 1 ? "night" : "nights"}, all in, from
              </span>
              <span className="num text-lg font-medium text-ink">{formatNaira(cheapest)}</span>
            </>
          ) : (
            <>
              <span className="kicker block !text-[10px]">From</span>
              <span className="num text-lg font-medium text-ink">{formatNaira(fromKobo)}</span> / night
            </>
          )}
        </p>
        <a href="#rooms" className="btn btn-primary !min-h-11">
          {nights ? `Rooms for ${nights} ${nights === 1 ? "night" : "nights"}` : "Choose a room"}
        </a>
      </div>
    </div>
  );
}

/** Cheapest bookable stay across room types and their rate plans. */
function cheapestTotal(data: HotelAvailability | null): number | null {
  let min: number | null = null;
  for (const r of data?.roomTypes ?? []) {
    if (!r.bookable) continue;
    const totals = [r.quote?.totalKobo, ...(r.ratePlans ?? []).filter((p) => p.bookable !== false && p.quote).map((p) => p.quote!.totalKobo)];
    for (const t of totals) if (typeof t === "number" && (min === null || t < min)) min = t;
  }
  return min;
}

/** The lowest published nightly rate for a room, for "from" prices without dates. */
function nightlyFrom(room: RoomTypePublic, plans: PlanOffer[]) {
  const c = [room.fromKobo, ...plans.map((p) => p.fromKobo)].filter((n): n is number => typeof n === "number" && n > 0);
  return c.length ? Math.min(...c) : room.basePriceKobo;
}

function nightlyLine(b: NonNullable<RoomTypeAvailability["quote"]>) {
  const amounts = b.lines.map((l) => l.amountKobo);
  const lo = amounts.length ? Math.min(...amounts) : b.rateKobo;
  const hi = amounts.length ? Math.max(...amounts) : b.rateKobo;
  return lo === hi ? `${formatNaira(lo)} a night + taxes` : `${formatNaira(lo)} to ${formatNaira(hi)} a night + taxes`;
}

/** The hotel page's rate ledger for one room type, when it sells more than one rate. */
export function RoomPlans({ room }: { room: RoomTypePublic }) {
  const { roomFor, range, bookHref, availability, cancellationPolicy } = useStay();
  const live = roomFor(room.id);
  const plans = plansFor(room, live);
  if (plans.length < 2) return null;
  const dated = !!(range.checkIn && range.checkOut);
  const nights = dated ? diffDays(range.checkIn!, range.checkOut!) : 0;
  const data = availability.status === "ready" ? availability.data : null;
  return (
    <div id={`rates-${room.id}`} className="scroll-mt-28">
      <PlanLedger
        roomName={room.name}
        plans={dated ? plans : plans.map((p) => ({ ...p, quote: null, bookable: true, reason: null }))}
        nights={nights}
        fallbackPolicy={data?.cancellationPolicy ?? cancellationPolicy}
        freeUntil={dated ? (data?.freeCancellationUntil ?? null) : null}
        hrefFor={(planId) => bookHref(room.id, planId)}
        loading={dated && availability.status === "loading"}
      />
    </div>
  );
}
