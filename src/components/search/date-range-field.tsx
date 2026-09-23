"use client";

import { CalendarBlank } from "@phosphor-icons/react";
import { useCallback, useRef, useState } from "react";
import { formatShort, type ISODate } from "@/lib/dates";
import { nightsLabel, RangeCalendar, type Range } from "./range-calendar";
import { useDismiss, useMedia } from "./use-dismiss";

interface Props {
  value: Range;
  onChange: (r: Range) => void;
  today: ISODate;
  /** "bar" renders two segments for the search ledger; "stack" renders a boxed pair for side panels. */
  variant?: "bar" | "stack";
  align?: "left" | "right";
}

export function DateRangeField({ value, onChange, today, variant = "bar", align = "left" }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wide = useMedia("(min-width: 48rem)", true);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, wrapRef, close, triggerRef);

  const nights = nightsLabel(value);
  const seg =
    variant === "bar"
      ? "flex min-w-0 flex-1 flex-col items-start justify-center gap-1 px-5 py-3 text-left transition-colors hover:bg-surface-2/70"
      : "flex min-w-0 flex-1 flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-surface-2/70";

  return (
    <div ref={wrapRef} className={`relative ${variant === "bar" ? "flex min-w-0 flex-[1.6] items-stretch" : ""}`}>
      <div
        className={
          variant === "bar"
            ? "flex w-full items-stretch divide-x divide-line"
            : "flex items-stretch divide-x divide-line-strong rounded-sm border border-line-strong bg-surface"
        }
      >
        <button
          ref={triggerRef}
          type="button"
          className={seg}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="kicker">Check in</span>
          <span className={`truncate text-[0.975rem] ${value.checkIn ? "text-ink" : "text-ink-muted"}`}>
            {value.checkIn ? formatShort(value.checkIn) : "Add date"}
          </span>
        </button>
        <button
          type="button"
          className={seg}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="kicker">Check out</span>
          <span className={`truncate text-[0.975rem] ${value.checkOut ? "text-ink" : "text-ink-muted"}`}>
            {value.checkOut ? formatShort(value.checkOut) : "Add date"}
          </span>
        </button>
      </div>
      {open ? (
        <div
          role="dialog"
          aria-label="Choose your dates"
          className={`absolute top-[calc(100%+10px)] z-50 w-[min(44rem,calc(100vw-2rem))] rounded-md border border-line-strong bg-surface p-5 shadow-[var(--shadow-float)] fade-up [--d:0ms] ${
            align === "right" ? "right-0" : "left-0"
          } ${!wide ? "!w-[calc(100vw-2rem)] max-w-sm" : ""}`}
          style={{ animationDuration: "220ms" }}
        >
          <RangeCalendar value={value} onChange={onChange} today={today} months={wide ? 2 : 1} />
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
            <p className="flex items-center gap-2 text-sm text-ink-muted" aria-live="polite">
              <CalendarBlank size={16} aria-hidden />
              {nights ? (
                <>
                  <span className="num text-ink">{nights}</span>
                  <span className="hidden sm:inline">
                    {formatShort(value.checkIn!)} to {formatShort(value.checkOut!)}
                  </span>
                </>
              ) : value.checkIn ? (
                "Now choose your check-out day"
              ) : (
                "Choose your check-in day"
              )}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn !min-h-9 !px-3 text-sm text-ink-muted hover:text-ink"
                onClick={() => onChange({ checkIn: null, checkOut: null })}
              >
                Clear
              </button>
              <button
                type="button"
                className="btn btn-ink !min-h-9 !px-4 text-sm"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
