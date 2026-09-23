"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  compare,
  diffDays,
  formatFullDay,
  formatMonth,
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
}

/**
 * A two-month range calendar with full keyboard support: arrows move a day/week,
 * PageUp/PageDown move a month, Home/End jump within the week, Enter/Space select.
 */
export function RangeCalendar({ value, onChange, today, months = 2, max = addDays(today, 365), onComplete }: Props) {
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

  function pick(d: ISODate) {
    if (disabled(d)) return;
    if (!value.checkIn || value.checkOut || compare(d, value.checkIn) <= 0) {
      onChange({ checkIn: d, checkOut: null });
    } else {
      onChange({ checkIn: value.checkIn, checkOut: d });
      onComplete?.();
    }
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
                        const off = disabled(d);
                        const isToday = d === today;
                        return (
                          <td key={di} role="gridcell" aria-selected={isStart || isEnd} className="p-0 text-center">
                            <div
                              className={`relative ${inRange ? "bg-laterite/12" : ""} ${
                                isStart && rangeEnd ? "bg-linear-to-r from-transparent from-50% to-laterite/12 to-50%" : ""
                              } ${isEnd && value.checkIn ? "bg-linear-to-l from-transparent from-50% to-laterite/12 to-50%" : ""}`}
                            >
                              <button
                                type="button"
                                data-date={d}
                                tabIndex={d === tabbable ? 0 : -1}
                                disabled={off}
                                onClick={() => pick(d)}
                                onMouseEnter={() => setHover(d)}
                                onFocus={() => setFocus(d)}
                                aria-label={`${formatFullDay(d)}${isStart ? ", check-in" : ""}${isEnd ? ", check-out" : ""}${off ? ", unavailable" : ""}`}
                                className={`num relative mx-auto grid aspect-square w-full max-w-10 place-items-center rounded-sm text-[13px] transition-colors ${
                                  isStart || isEnd
                                    ? "bg-laterite font-medium text-laterite-ink"
                                    : off
                                      ? "cursor-default text-ink-muted/35"
                                      : "hover:bg-surface-2"
                                }`}
                              >
                                {Number(d.slice(8))}
                                {isToday && !isStart && !isEnd ? (
                                  <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-laterite" />
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
    </div>
  );
}

export function nightsLabel(r: Range) {
  if (!r.checkIn || !r.checkOut) return null;
  const n = diffDays(r.checkIn, r.checkOut);
  return `${n} ${n === 1 ? "night" : "nights"}`;
}
