"use client";

import { ArrowRight, CaretDown, Check, ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CancellationPolicy, PriceBreakdown } from "@/lib/booking-types";
import { call, humanError } from "@/lib/client-api";
import { diffDays, formatShort, formatWeekday, type ISODate } from "@/lib/dates";
import { formatNaira } from "@/lib/format";
import { plansFor, planTitle, type PlanOffer, type RawPlan } from "@/lib/rates";
import { normaliseRoomDetail, type RoomStay } from "@/lib/rooms";
import type { TemplateId } from "@/lib/theme/types";
import { formatLagosShort } from "@/lib/time";
import { PlanBadges, planPolicyText, savingAgainst } from "../booking/rate-plans";
import { usePriceCalendar } from "../booking/use-price-calendar";
import { DateRangeField } from "../search/date-range-field";
import { GuestsStepper } from "../search/guests-stepper";
import type { Range } from "../search/range-calendar";

type Look = Exclude<TemplateId, "essentials"> | "marketplace";

interface Live {
  status: "idle" | "loading" | "ready" | "error";
  stay: RoomStay | null;
  message?: string;
}

interface RoomStayState {
  range: Range;
  setRange: (r: Range) => void;
  guests: number;
  setGuests: (n: number) => void;
  today: ISODate;
  live: Live;
  retry: () => void;
  plans: PlanOffer[];
  plan: PlanOffer | null;
  setPlanId: (id: string) => void;
  nights: number;
  bookHref: string;
  roomName: string;
  fromKobo: number;
  capacity: number;
  policy: CancellationPolicy | null;
  calendar: ReturnType<typeof usePriceCalendar>;
  onlineBooking: boolean;
}

const Ctx = createContext<RoomStayState | null>(null);
const useRoomStay = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRoomStay outside RoomStayProvider");
  return v;
};

/**
 * The room page's dates, guests and live prices. The server renders the first answer (when the
 * address carries dates) so the prices are there without JavaScript; changing the dates asks the
 * room endpoint again (debounced, cancellable, the last answer kept on screen) and writes the dates
 * back into the address, so the share link and a reload keep them.
 */
export function RoomStayProvider({
  children,
  slug,
  room,
  initial,
  today,
  bookBase,
  channel,
  policy,
  onlineBooking,
}: {
  children: React.ReactNode;
  slug: string;
  room: { id: string; slug: string; name: string; basePriceKobo: number; fromKobo: number; capacity: number; ratePlans: RawPlan[] };
  initial: { checkIn: ISODate | null; checkOut: ISODate | null; guests: number; stay: RoomStay | null };
  today: ISODate;
  bookBase: string;
  channel: "MARKETPLACE" | "BOOKING_SITE";
  policy: CancellationPolicy | null;
  onlineBooking: boolean;
}) {
  const [range, setRange] = useState<Range>({ checkIn: initial.checkIn, checkOut: initial.checkOut });
  const [guests, setGuests] = useState(initial.guests);
  const [live, setLive] = useState<Live>(initial.stay ? { status: "ready", stay: initial.stay } : { status: "idle", stay: null });
  const [attempt, setAttempt] = useState(0);
  const [planId, setPlanId] = useState<string | null>(null);
  const first = useRef(true);
  const dated = !!(range.checkIn && range.checkOut);
  const key = dated ? `${range.checkIn}|${range.checkOut}|${guests}|${attempt}` : null;

  useEffect(() => {
    // The server already answered for the dates in the address.
    if (first.current) {
      first.current = false;
      if (initial.stay || !key) return;
    }
    if (!key) {
      const t = setTimeout(() => setLive({ status: "idle", stay: null }), 0);
      return () => clearTimeout(t);
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setLive((l) => ({ status: "loading", stay: l.stay }));
      try {
        const raw = await call<unknown>(`public/hotels/${encodeURIComponent(slug)}/room-types/${encodeURIComponent(room.slug)}`, {
          query: { checkIn: range.checkIn, checkOut: range.checkOut, adults: guests, channel },
          signal: ctl.signal,
        });
        setLive({ status: "ready", stay: normaliseRoomDetail(raw)?.stay ?? null });
      } catch (e) {
        if (ctl.signal.aborted) return;
        setLive((l) => ({ status: "error", stay: l.stay, message: humanError(e, "Live prices did not load.") }));
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` carries the dates, guests and retries
  }, [key]);

  // Keep the dates in the address (for sharing and reloads), without a navigation.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (range.checkIn && range.checkOut) {
        url.searchParams.set("checkIn", range.checkIn);
        url.searchParams.set("checkOut", range.checkOut);
      } else if (!range.checkIn) {
        url.searchParams.delete("checkIn");
        url.searchParams.delete("checkOut");
      } else return;
      if (guests !== 2) url.searchParams.set("guests", String(guests));
      else url.searchParams.delete("guests");
      if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
    } catch {
      /* an unusual address: leave it */
    }
  }, [range.checkIn, range.checkOut, guests]);

  const stay = dated ? live.stay : null;
  const plans = useMemo(
    () => plansFor(room, stay ? { ratePlans: stay.ratePlans, quote: stay.quote, bookable: stay.bookable } : null),
    [room, stay],
  );
  const plan = plans.find((p) => p.id === planId && (p.bookable || !stay)) ?? plans.find((p) => (stay ? p.bookable && p.quote : true)) ?? plans[0] ?? null;
  const nights = dated ? diffDays(range.checkIn!, range.checkOut!) : 0;
  const q = new URLSearchParams();
  q.set("room", room.id);
  if (plan && plans.length > 1) q.set("plan", plan.id);
  if (dated) {
    q.set("checkIn", range.checkIn!);
    q.set("checkOut", range.checkOut!);
  }
  q.set("guests", String(guests));
  const calendar = usePriceCalendar(slug, guests);

  return (
    <Ctx.Provider
      value={{
        range,
        setRange,
        guests,
        setGuests,
        today,
        live,
        retry: () => setAttempt((n) => n + 1),
        plans,
        plan,
        setPlanId,
        nights,
        bookHref: `${bookBase}?${q}`,
        roomName: room.name,
        fromKobo: room.fromKobo,
        capacity: room.capacity,
        policy,
        calendar,
        onlineBooking,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

function statusLine(s: RoomStayState): { tone: "palm" | "laterite" | "ochre"; text: string } | null {
  const stay = s.nights ? s.live.stay : null;
  if (!stay || s.live.status === "loading") return null;
  if (!stay.bookable) {
    const r = stay.unavailableReason;
    const text =
      r === "CAPACITY"
        ? `The ${s.roomName} sleeps ${s.capacity}. Try fewer guests or a larger room.`
        : r === "ONLINE_BOOKING_DISABLED"
          ? "This hotel takes bookings by phone for now."
          : r === "RESTRICTED" || stay.restriction
            ? restrictionText(stay.restriction)
            : "Full on those dates. Try moving a day either side.";
    return { tone: "ochre", text };
  }
  if (stay.lowAvailability) return { tone: "laterite", text: `Only ${stay.available} left for your dates` };
  return { tone: "palm", text: "Free for your dates" };
}

function restrictionText(r: RoomStay["restriction"]) {
  if (!r) return "Not open for those dates.";
  if (r.reason === "MIN_NIGHTS" && r.minNights) return `Stays that include ${formatShort(r.date)} are at least ${r.minNights} nights.`;
  if (r.reason === "CLOSED_TO_ARRIVAL") return `Arrivals are closed on ${formatShort(r.date)}.`;
  if (r.reason === "CLOSED_TO_DEPARTURE") return `Departures are closed on ${formatShort(r.date)}.`;
  return "Not open for those dates.";
}

/** The side panel: dates and guests, every rate with its live total, and the way into booking. */
export function RoomStayPanel({ look, share }: { look: Look; share?: React.ReactNode }) {
  const s = useRoomStay();
  const { range, setRange, guests, setGuests, today, live, plans, plan, nights, calendar } = s;
  const stay = nights ? live.stay : null;
  const loading = !!nights && (live.status === "loading" || (live.status === "idle" && !stay));
  const status = statusLine(s);
  const frame =
    look === "resort"
      ? "rounded-[28px] border border-line bg-surface p-6 shadow-[var(--shadow-card)]"
      : look === "boutique"
        ? "border border-line bg-paper p-6 sm:p-8"
        : look === "business"
          ? "border border-ink bg-surface p-4"
          : look === "heritage"
            ? "heritage-panel bg-paper p-6 text-center"
            : "rounded-md border border-line-strong bg-surface p-5 sm:p-6";

  return (
    <div className={frame} data-testid="room-stay" data-look={look}>
      <div aria-live="polite" className={look === "heritage" ? "" : "min-h-[4.25rem]"}>
        {!nights ? (
          <div className={look === "heritage" ? "" : "flex items-baseline justify-between gap-3"}>
            <p className={look === "heritage" ? "heritage-kicker !text-[10px]" : "kicker"}>From</p>
            <p className="text-sm text-ink-muted">
              <span className="num text-[1.75rem] font-medium leading-none text-ink" data-testid="room-from">
                {formatNaira(s.fromKobo)}
              </span>{" "}
              a night
            </p>
          </div>
        ) : loading && !stay ? (
          <div className="space-y-2">
            <p className="kicker">Checking the {s.roomName} for your dates</p>
            <div className="skeleton h-8 w-40 rounded-xs" />
          </div>
        ) : live.status === "error" && !stay ? (
          <div>
            <p className="kicker !text-ochre">Live prices did not load</p>
            <p className="mt-1 text-sm text-ink-muted">{live.message}</p>
            <button type="button" onClick={s.retry} className="link-static mt-2 text-sm font-medium text-laterite">
              Try again
            </button>
          </div>
        ) : plan?.quote && stay?.bookable ? (
          <div className={loading ? "opacity-50 transition-opacity" : "transition-opacity"}>
            <p className={look === "heritage" ? "heritage-kicker !text-[10px]" : "kicker"}>
              {nights} {nights === 1 ? "night" : "nights"}, taxes included
            </p>
            <p className="num mt-1 text-[2rem] font-medium leading-none" data-testid="room-total">
              {formatNaira(plan.quote.totalKobo)}
            </p>
            <p className="mt-1.5 text-[12.5px] text-ink-muted">{nightlyText(plan.quote)}</p>
          </div>
        ) : (
          <div>
            <p className="kicker !text-ochre">Not for those dates</p>
          </div>
        )}
        {status ? (
          <p
            className={`mt-2.5 inline-flex items-start gap-1.5 text-[12.5px] font-medium ${status.tone === "palm" ? "text-palm" : status.tone === "laterite" ? "text-laterite" : "text-ochre"}`}
            data-testid="room-availability"
          >
            {status.tone === "ochre" ? <WarningCircle size={15} className="mt-px shrink-0" aria-hidden /> : <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-current" />}
            {status.text}
          </p>
        ) : null}
      </div>

      <div className="mt-5 space-y-3 text-left">
        <DateRangeField value={range} onChange={setRange} today={today} variant="stack" align="right" prices={calendar.prices} onVisibleChange={calendar.onVisibleChange} />
        <div className="rounded-sm border border-line-strong bg-surface px-4 py-3">
          <GuestsStepper value={guests} onChange={setGuests} layout="row" max={Math.max(s.capacity, 2) + 2} />
        </div>
      </div>

      {plans.length ? <RatesList look={look} /> : null}

      <BookButton className="mt-5 w-full" look={look} />
      {share ? <div className="mt-4">{share}</div> : null}
      <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted">
        {stay?.freeCancellationUntil && plan && plan.refundable ? (
          <>
            <ShieldCheck size={14} weight="fill" className="-mt-0.5 mr-1 inline text-palm" aria-hidden />
            Free cancellation until <span className="num text-ink">{formatLagosShort(stay.freeCancellationUntil)}</span>
          </>
        ) : s.policy?.summary ? (
          s.policy.summary
        ) : (
          "Prices are per room per night before taxes until you choose dates."
        )}
      </p>
    </div>
  );
}

function nightlyText(q: PriceBreakdown) {
  const amounts = (q.nightly?.length ? q.nightly.map((n) => n.rateKobo - (n.discountKobo || 0)) : q.lines.map((l) => l.amountKobo)).filter((n) => n > 0);
  if (!amounts.length) return `${formatNaira(q.rateKobo)} a night + taxes`;
  const lo = Math.min(...amounts);
  const hi = Math.max(...amounts);
  return lo === hi ? `${formatNaira(lo)} a night + ${formatNaira(q.taxTotalKobo)} taxes` : `${formatNaira(lo)} to ${formatNaira(hi)} a night + taxes`;
}

/** Every rate for the room, chosen like a radio; with dates each shows its total and opens night by night. */
function RatesList({ look }: { look: Look }) {
  const { plans, plan, setPlanId, nights, live, policy, roomName } = useRoomStay();
  const stay = nights ? live.stay : null;
  if (plans.length < 2 && !stay) return null;
  return (
    <fieldset className="mt-5 text-left" data-testid="room-rates">
      <legend className={`mb-2 ${look === "heritage" ? "heritage-kicker !text-[10px]" : "kicker"}`}>{plans.length > 1 ? `${plans.length} rates for the ${roomName}` : "Your rate"}</legend>
      <div className="divide-y divide-line overflow-hidden rounded-sm border border-line-strong">
        {plans.map((p) => {
          const on = p.id === plan?.id;
          const off = !!stay && !p.bookable;
          const save = savingAgainst(p, plans);
          return (
            <div key={p.id} className={`transition-colors ${on ? "bg-laterite/[0.06]" : ""} ${off ? "opacity-60" : ""}`} data-testid="room-rate" data-plan-kind={p.kind}>
              <label className={`flex gap-3 px-3.5 py-3 ${off ? "cursor-not-allowed" : "cursor-pointer"}`}>
                <input type="radio" name="room-rate" className="peer sr-only" checked={on} disabled={off} onChange={() => setPlanId(p.id)} />
                <span
                  aria-hidden
                  className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-laterite ${on ? "border-laterite bg-laterite text-laterite-ink" : "border-line-strong"}`}
                >
                  {on ? <Check size={10} weight="bold" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-[0.9375rem] font-medium">{planTitle(p)}</span>
                    {stay && p.quote && p.bookable ? (
                      <span className="num text-[0.9375rem] font-medium" data-testid="room-rate-total">
                        {formatNaira(p.quote.totalKobo)}
                      </span>
                    ) : p.fromKobo ? (
                      <span className="text-[12px] text-ink-muted">
                        from <span className="num text-[0.9375rem] font-medium text-ink">{formatNaira(p.fromKobo)}</span>
                      </span>
                    ) : null}
                  </span>
                  <PlanBadges plan={p} quiet className="mt-1.5" />
                  <span className="mt-1 block text-[12px] leading-relaxed text-ink-muted">
                    {off && p.reason ? p.reason : planPolicyText(p, policy, stay?.freeCancellationUntil ?? null, true)}
                    {save > 0 ? <span className="font-medium text-palm"> Saves {formatNaira(save)}.</span> : null}
                  </span>
                </span>
              </label>
              {on && stay && p.quote && p.bookable ? <NightByNight quote={p.quote} /> : null}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/** The chosen rate's stay, night by night, with each tax: the same figures the booking will charge. */
function NightByNight({ quote }: { quote: PriceBreakdown }) {
  const nights = quote.nightly?.length ? quote.nightly.map((n) => ({ date: n.date, amount: n.rateKobo - (n.discountKobo || 0), note: n.ruleName })) : quote.lines.map((l) => ({ date: l.date, amount: l.amountKobo, note: null as string | null }));
  return (
    <details className="group border-t border-line/70 px-3.5 pb-3 pl-10" data-testid="night-by-night">
      <summary className="flex cursor-pointer items-center gap-1.5 py-2 text-[12.5px] font-medium text-laterite">
        Night by night <CaretDown size={12} aria-hidden className="transition-transform group-open:rotate-180" />
      </summary>
      <ul className="num space-y-1 text-[12px]">
        {nights.map((n) => (
          <li key={n.date} className="flex items-baseline gap-2">
            <span className="text-ink-muted">
              {formatWeekday(n.date)} {formatShort(n.date)}
            </span>
            {n.note ? <span className="truncate text-[11px] text-brass">{n.note}</span> : null}
            <span aria-hidden className="leader min-w-4 flex-1" />
            <span>{formatNaira(n.amount)}</span>
          </li>
        ))}
        {quote.discountKobo > 0 ? (
          <li className="flex items-baseline gap-2 text-palm">
            <span>Discount</span>
            <span aria-hidden className="leader min-w-4 flex-1" />
            <span>-{formatNaira(quote.discountKobo)}</span>
          </li>
        ) : null}
        {quote.taxes.map((t) => (
          <li key={t.code} className="flex items-baseline gap-2 text-ink-muted">
            <span>{t.label}</span>
            <span aria-hidden className="leader min-w-4 flex-1" />
            <span>{formatNaira(t.amountKobo)}</span>
          </li>
        ))}
        <li className="flex items-baseline gap-2 border-t border-line pt-1 font-medium">
          <span>Total</span>
          <span aria-hidden className="leader min-w-4 flex-1" />
          <span>{formatNaira(quote.totalKobo)}</span>
        </li>
      </ul>
    </details>
  );
}

/** "Book this room": the booking flow with this room, the chosen rate, the dates and the party filled in. */
export function BookButton({ className = "", look, compact = false, testId = "book-this-room" }: { className?: string; look: Look; compact?: boolean; testId?: string }) {
  const { bookHref, live, nights, onlineBooking } = useRoomStay();
  const blocked = !!nights && live.status !== "loading" && !!live.stay && !live.stay.bookable;
  const shape = look === "resort" ? "!rounded-full" : look === "boutique" || look === "heritage" ? "!rounded-none tracking-[0.12em] uppercase text-[13px]" : "";
  if (!onlineBooking)
    return (
      <span className={`btn btn-outline cursor-not-allowed opacity-60 ${shape} ${className}`} aria-disabled="true">
        Book by phone
      </span>
    );
  return (
    <Link
      href={bookHref}
      className={`btn ${blocked ? "btn-outline" : "btn-primary"} group ${compact ? "!min-h-11" : ""} ${shape} ${className}`}
      data-testid={testId}
      aria-describedby={blocked ? `${testId}-note` : undefined}
    >
      {blocked ? "Choose other dates" : "Book this room"}
      <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
      {blocked ? (
        <span id={`${testId}-note`} className="sr-only">
          This room is not free for the dates you chose; the booking page shows what is.
        </span>
      ) : null}
    </Link>
  );
}

/**
 * The sticky "Book this room" bar. On phones it is pinned to the bottom of the screen; on wider
 * screens it rises as a floating strip once the side panel has scrolled out of view (a long page can
 * outrun a sticky panel). Reduced motion keeps it still.
 */
export function RoomBookBar({ look, watch = "room-stay" }: { look: Look; watch?: string }) {
  const s = useRoomStay();
  const [away, setAway] = useState(false);
  useEffect(() => {
    const el = document.querySelector(`[data-testid="${watch}"]`);
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setAway(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [watch]);
  const stay = s.nights ? s.live.stay : null;
  const total = stay?.bookable && s.plan?.quote ? s.plan.quote.totalKobo : null;
  const float =
    look === "resort"
      ? "lg:rounded-full"
      : look === "boutique" || look === "heritage" || look === "business"
        ? "lg:rounded-none"
        : "lg:rounded-md";
  return (
    <div
      data-pinned-bar
      data-testid="room-book-bar"
      data-away={away ? "true" : "false"}
      className={`room-book-bar fixed inset-x-0 bottom-0 z-30 border-t border-line-strong bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-[6px] print:hidden lg:inset-x-auto lg:bottom-5 lg:w-[min(46rem,calc(100vw-5rem))] lg:border lg:px-5 lg:pb-3 lg:shadow-[var(--shadow-float)] ${float} ${look === "resort" ? "max-lg:rounded-t-[22px]" : ""}`}
    >
      <div className="mx-auto flex items-center justify-between gap-4">
        <div className="min-w-0 text-sm leading-tight text-ink-muted">
          <p className="hidden truncate font-display text-lg leading-tight text-ink lg:block">{s.roomName}</p>
          {total !== null ? (
            <p>
              <span className="kicker mr-1.5 !text-[10px]">
                {s.nights} {s.nights === 1 ? "night" : "nights"}, all in
              </span>
              <span className="num text-lg font-medium text-ink">{formatNaira(total)}</span>
            </p>
          ) : (
            <p>
              <span className="kicker mr-1.5 !text-[10px]">From</span>
              <span className="num text-lg font-medium text-ink">{formatNaira(s.fromKobo)}</span> a night
            </p>
          )}
        </div>
        <BookButton look={look} compact className="shrink-0" testId="book-bar-button" />
      </div>
    </div>
  );
}
