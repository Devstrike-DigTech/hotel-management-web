"use client";

import { CaretLeft, CaretRight, CloudSlash } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CalendarDay, CalendarDays } from "@/lib/rates";
import { formatNaira, formatNairaCompact } from "@/lib/format";
import {
  addDays,
  addMonths,
  compare,
  diffDays,
  formatFullDay,
  formatMonth,
  formatShort,
  formatWeekday,
  monthGrid,
  startOfMonth,
  type ISODate,
} from "@/lib/dates";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export interface Range {
  checkIn: ISODate | null;
  checkOut: ISODate | null;
}

interface Props {
  value: Range;
  onChange: (r: Range) => void;
  today: ISODate;
  /** Number of months side by side (1 on phones, 2 on wider screens). */
  months?: number;
  /** Latest selectable date. */
  max?: ISODate;
  onComplete?: () => void;
  /**
   * The hotel's price calendar: the cheapest nightly price under each day, closed-to-arrival
   * days greyed, minimum stays enforced. Without it the calendar is a plain date picker.
   */
  prices?: PriceCalendarState;
  /** Called with the visible span whenever it changes, so the parent can fetch those prices. */
  onVisibleChange?: (from: ISODate, to: ISODate) => void;
}

export interface PriceCalendarState {
  days: CalendarDays;
  status: "idle" | "loading" | "ready" | "error" | "unavailable";
}

type DayState = {
  info: CalendarDay | undefined;
  /** Not selectable at all (past, beyond the booking window). */
  off: boolean;
  /** Cannot be picked for the step in progress; the reason is read out and shown. */
  blocked: string | null;
};

/**
 * A two-month range calendar with full keyboard support: arrows move a day/week,
 * PageUp/PageDown move a month, Home/End jump within the week, Enter/Space select.
 */
export function RangeCalendar({ value, onChange, today, months = 2, max = addDays(today, 365), onComplete, prices, onVisibleChange }: Props) {
  const [view, setView] = useState<ISODate>(startOfMonth(value.checkIn ?? today));
  const [focus, setFocus] = useState<ISODate>(value.checkIn ?? today);
  const [hover, setHover] = useState<ISODate | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(false);

  const selectingEnd = !!value.checkIn && !value.checkOut;
  const previewEnd = selectingEnd && hover && compare(hover, value.checkIn!) > 0 ? hover : null;
  const rangeEnd = value.checkOut ?? previewEnd;

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focus}"]`)?.focus();
  }, [focus, view]);

  const disabled = (d: ISODate) => compare(d, today) < 0 || compare(d, max) > 0;
  const days = prices?.status === "ready" || prices?.status === "loading" ? prices.days : undefined;

  const visibleFrom = view;
  const visibleTo = addDays(addMonths(view, months), -1);
  useEffect(() => {
    onVisibleChange?.(visibleFrom, visibleTo);
  }, [visibleFrom, visibleTo, onVisibleChange]);

  /* While choosing check-out: the earliest allowed (minimum stay) and the last before a full night. */
  const endBounds = useMemo(() => {
    if (!selectingEnd || !days) return null;
    const start = value.checkIn!;
    const min = Math.max(1, days[start]?.minNights ?? 1);
    let limit: ISODate | null = null;
    for (let d = start; compare(d, addDays(start, 60)) < 0; d = addDays(d, 1)) {
      const info = days[d];
      if (!info) break; // unknown beyond here: let the quote decide
      if (d !== start && info.soldOut) {
        limit = d; // checking out on the full night's morning is fine; staying through it is not
        break;
      }
    }
    return { earliest: addDays(start, min), min, latest: limit };
  }, [selectingEnd, days, value.checkIn]);

  function dayState(d: ISODate): DayState {
    const info = days?.[d];
    const off = disabled(d);
    if (off) return { info, off, blocked: null };
    if (selectingEnd && endBounds && compare(d, value.checkIn!) > 0) {
      if (compare(d, endBounds.earliest) < 0) return { info, off, blocked: `stays from ${formatShort(value.checkIn!)} are at least ${endBounds.min} nights` };
      if (endBounds.latest && compare(d, endBounds.latest) > 0) return { info, off, blocked: `the night of ${formatShort(endBounds.latest)} is full` };
      if (info?.closedToDeparture) return { info, off, blocked: "no departures on this day" };
      return { info, off, blocked: null };
    }
    if (info?.soldOut) return { info, off, blocked: "full" };
    if (info?.closedToArrival) return { info, off, blocked: "no arrivals on this day" };
    return { info, off, blocked: null };
  }

  const [note, setNote] = useState<string | null>(null);

  function pick(d: ISODate) {
    if (disabled(d)) return;
    const endStep = !!value.checkIn && !value.checkOut && compare(d, value.checkIn) > 0;
    const st = dayState(d);
    if (endStep) {
      if (st.blocked) return setNote(`${formatWeekday(d)} ${formatShort(d)} cannot be your check-out: ${st.blocked}.`);
      setNote(null);
      onChange({ checkIn: value.checkIn, checkOut: d });
      onComplete?.();
      return;
    }
    const info = days?.[d];
    if (info?.soldOut || info?.closedToArrival) {
      return setNote(
        info.soldOut
          ? `${formatWeekday(d)} ${formatShort(d)} is full. Try a day either side.`
          : `The hotel takes no arrivals on ${formatWeekday(d)} ${formatShort(d)}. You can stay that night if you arrive earlier.`,
      );
    }
    setNote(null);
    onChange({ checkIn: d, checkOut: null });
  }

  function moveFocus(d: ISODate) {
    if (compare(d, today) < 0) d = today;
    if (compare(d, max) > 0) d = max;
    const lastVisible = addMonths(view, months - 1);
    if (compare(d, view) < 0) setView(startOfMonth(d));
    else if (compare(startOfMonth(d), lastVisible) > 0) setView(addMonths(startOfMonth(d), -(months - 1)));
    shouldFocus.current = true;
    setFocus(d);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const dow = (new Date(`${focus}T00:00:00Z`).getUTCDay() + 6) % 7;
    const map: Record<string, () => ISODate> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      Home: () => addDays(focus, -dow),
      End: () => addDays(focus, 6 - dow),
      PageUp: () => addDays(focus, -30),
      PageDown: () => addDays(focus, 30),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      moveFocus(fn());
    }
  }

  // Keep exactly one day tabbable, even when the focused day has scrolled out of view.
  const lastDay = addDays(addMonths(view, months), -1);
  const tabbable =
    compare(focus, view) >= 0 && compare(focus, lastDay) <= 0
      ? focus
      : compare(today, view) >= 0 && compare(today, lastDay) <= 0
        ? today
        : view;

  const canPrev = compare(view, startOfMonth(today)) > 0;
  const canNext = compare(addMonths(view, months - 1), startOfMonth(max)) < 0;

  return (
    <div className="select-none" ref={gridRef}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView(addMonths(view, -1))}
          disabled={!canPrev}
          className="inline-grid size-9 place-items-center rounded-sm hover:bg-surface-2 disabled:opacity-30"
          aria-label="Previous month"
        >
          <CaretLeft size={16} />
        </button>
        <p className="sr-only" aria-live="polite">
          {Array.from({ length: months }, (_, i) => formatMonth(addMonths(view, i))).join("  /  ")}
        </p>
        <button
          type="button"
          onClick={() => setView(addMonths(view, 1))}
          disabled={!canNext}
          className="inline-grid size-9 place-items-center rounded-sm hover:bg-surface-2 disabled:opacity-30"
          aria-label="Next month"
        >
          <CaretRight size={16} />
        </button>
      </div>
      <div className={`mt-3 grid gap-8 ${months > 1 ? "sm:grid-cols-2" : ""}`} onMouseLeave={() => setHover(null)}>
        {Array.from({ length: months }, (_, i) => {
          const month = addMonths(view, i);
          const low = lowestIn(days, month);
          return (
            <div key={month}>
              <p className="display-sm mb-2 text-center text-lg">
                <em className="not-italic">{formatMonth(month).split(" ")[0]}</em>{" "}
                <span className="num text-sm text-ink-muted">{month.slice(0, 4)}</span>
              </p>
              <table role="grid" className="w-full border-collapse" aria-label={formatMonth(month)} onKeyDown={onKeyDown}>
                <thead>
                  <tr>
                    {WEEKDAYS.map((w) => (
                      <th key={w} scope="col" className="num pb-1.5 text-center text-[10px] font-normal uppercase tracking-wider text-ink-muted">
                        {w}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthGrid(month).map((week, wi) => (
                    <tr key={wi}>
                      {week.map((d, di) => {
                        if (!d) return <td key={di} />;
                        const isStart = d === value.checkIn;
                        const isEnd = d === rangeEnd;
                        const inRange =
                          !!value.checkIn && !!rangeEnd && compare(d, value.checkIn) > 0 && compare(d, rangeEnd) < 0;
                        const { info, off, blocked } = dayState(d);
                        const isToday = d === today;
                        const selected = isStart || isEnd;
                        const priced = !!prices && prices.status !== "unavailable" && prices.status !== "error";
                        const cheapest = !!info?.fromKobo && info.fromKobo === low && !blocked;
                        const label = [
                          formatFullDay(d),
                          isStart ? "check-in" : isEnd ? "check-out" : null,
                          info?.fromKobo && !info.soldOut ? `from ${formatNaira(info.fromKobo)} a night${info.ruleName ? ` (${info.ruleName})` : ""}` : null,
                          cheapest ? "lowest price this month" : null,
                          off ? "unavailable" : blocked,
                          !blocked && !selectingEnd && info?.minNights && info.minNights > 1 ? `minimum ${info.minNights} nights` : null,
                        ]
                          .filter(Boolean)
                          .join(", ");
                        return (
                          <td key={di} role="gridcell" aria-selected={selected} className="p-0 text-center">
                            <div
                              className={`relative ${inRange ? "bg-laterite/12" : ""} ${
                                isStart && rangeEnd ? "bg-linear-to-r from-transparent from-50% to-laterite/12 to-50%" : ""
                              } ${isEnd && value.checkIn ? "bg-linear-to-l from-transparent from-50% to-laterite/12 to-50%" : ""}`}
                            >
                              <button
                                type="button"
                                data-date={d}
                                data-price={info?.fromKobo ?? undefined}
                                data-blocked={blocked ? "true" : undefined}
                                tabIndex={d === tabbable ? 0 : -1}
                                disabled={off}
                                aria-disabled={blocked ? true : undefined}
                                onClick={() => pick(d)}
                                onMouseEnter={() => setHover(d)}
                                onFocus={() => setFocus(d)}
                                aria-label={label}
                                className={`num relative mx-auto grid w-full place-items-center rounded-sm transition-colors ${
                                  priced ? "h-12 max-w-12 content-center gap-0.5 sm:h-[3.25rem]" : "aspect-square max-w-10"
                                } ${
                                  selected
                                    ? "bg-laterite font-medium text-laterite-ink"
                                    : off
                                      ? "cursor-default text-ink-muted/35"
                                      : blocked
                                        ? "cursor-not-allowed text-ink-muted/45 day-hatch"
                                        : "hover:bg-surface-2"
                                }`}
                              >
                                <span className={`text-[13px] leading-none ${blocked && info?.soldOut && !selected ? "line-through decoration-1" : ""}`}>{Number(d.slice(8))}</span>
                                {priced && !off ? (
                                  prices!.status === "loading" && !info ? (
                                    <span aria-hidden className="skeleton h-[5px] w-6 rounded-[2px]" />
                                  ) : info ? (
                                    <span
                                      aria-hidden
                                      className={`text-[10px] leading-none tracking-tight ${
                                        selected ? "text-laterite-ink/85" : info.soldOut ? "text-ink-muted/60" : cheapest ? "font-medium text-palm" : blocked ? "text-ink-muted/55" : "text-ink-muted"
                                      }`}
                                    >
                                      {info.soldOut ? "full" : info.fromKobo ? formatNairaCompact(info.fromKobo) : "\u2013"}
                                    </span>
                                  ) : (
                                    <span aria-hidden className="h-[9.5px]" />
                                  )
                                ) : null}
                                {isToday && !selected ? (
                                  <span aria-hidden className={`absolute size-1 rounded-full bg-laterite ${priced ? "left-1/2 top-1 -translate-x-1/2" : "bottom-1"}`} />
                                ) : null}
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
      {prices ? <CalendarFoot prices={prices} note={note} minNote={minNote(days, value, selectingEnd, hover)} /> : null}
    </div>
  );
}

/** Lowest price among the month's bookable days, to mark them in palm. */
function lowestIn(days: CalendarDays | undefined, month: ISODate): number | null {
  if (!days) return null;
  let low: number | null = null;
  const prefix = month.slice(0, 7);
  for (const [d, info] of Object.entries(days)) {
    if (!d.startsWith(prefix) || info.soldOut || info.closedToArrival || !info.fromKobo) continue;
    if (low === null || info.fromKobo < low) low = info.fromKobo;
  }
  return low;
}

/** The minimum-stay hint for the day in play: the chosen check-in, else the day being looked at. */
function minNote(days: CalendarDays | undefined, value: Range, selectingEnd: boolean, hover: ISODate | null) {
  if (!days) return null;
  const d = selectingEnd ? value.checkIn : !value.checkIn || value.checkOut ? hover : null;
  const n = d ? days[d]?.minNights : null;
  if (!d || !n || n < 2) return null;
  return selectingEnd
    ? `Stays from ${formatWeekday(d)} ${formatShort(d)} are at least ${n} nights.`
    : `Arriving ${formatWeekday(d)} ${formatShort(d)}: at least ${n} nights.`;
}

function CalendarFoot({ prices, note, minNote }: { prices: PriceCalendarState; note: string | null; minNote: string | null }) {
  const message = note ?? minNote;
  return (
    <div className="mt-4 space-y-2 border-t border-line pt-3 text-[12px] leading-snug text-ink-muted">
      <p aria-live="polite" className={`min-h-[1.1rem] ${note ? "text-ochre" : minNote ? "text-ink" : ""}`} data-testid="calendar-note">
        {message ??
          (prices.status === "error" ? (
            <span className="inline-flex items-center gap-1.5">
              <CloudSlash size={14} aria-hidden /> Prices by day did not load. You can still choose dates; the room list prices them.
            </span>
          ) : prices.status === "loading" && !Object.keys(prices.days).length ? (
            "Finding the price of each night"
          ) : prices.status === "unavailable" ? (
            ""
          ) : (
            "Lowest nightly price for each day, before taxes."
          ))}
      </p>
      {prices.status !== "error" && prices.status !== "unavailable" ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-hidden>
          <li className="inline-flex items-center gap-1.5">
            <span className="num text-[10px] font-medium text-palm">&#8358;</span> Lowest this month
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="day-hatch inline-block size-3 rounded-[2px] border border-line" /> No arrivals
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="num text-[10px] line-through">12</span> Full
          </li>
        </ul>
      ) : null}
    </div>
  );
}

export function nightsLabel(r: Range) {
  if (!r.checkIn || !r.checkOut) return null;
  const n = diffDays(r.checkIn, r.checkOut);
  return `${n} ${n === 1 ? "night" : "nights"}`;
}
