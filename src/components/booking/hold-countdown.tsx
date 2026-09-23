"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { pad2 } from "@/lib/format";
import { formatLagosClock } from "@/lib/time";

/**
 * A room hold, shown calmly: a hairline ring that empties like a slow clock, the time the
 * hold runs until, and the minutes left in plain figures. It never flashes and never turns
 * red; in the last few minutes the ring turns ochre and the copy says what happens next.
 *
 * `skewMs` is server time minus client time, so a phone with a wrong clock still counts
 * down from the server's twenty minutes.
 */
export function HoldCountdown({
  expiresAt,
  totalMs = 20 * 60_000,
  skewMs = 0,
  onExpire,
  variant = "panel",
}: {
  expiresAt: string;
  totalMs?: number;
  skewMs?: number;
  onExpire?: () => void;
  variant?: "panel" | "inline";
}) {
  const left = useRemaining(expiresAt, skewMs);
  const expired = left !== null && left <= 0;
  const fired = useRef(false);

  useEffect(() => {
    if (expired && !fired.current) {
      fired.current = true;
      onExpire?.();
    }
  }, [expired, onExpire]);

  const ms = left ?? totalMs;
  const frac = Math.max(0, Math.min(1, ms / totalMs));
  const late = ms <= 3 * 60_000;
  const mins = Math.floor(Math.max(0, ms) / 60_000);
  const secs = Math.floor((Math.max(0, ms) % 60_000) / 1000);
  const until = formatLagosClock(expiresAt);

  if (variant === "inline") {
    return (
      <span className={`num inline-flex items-center gap-2 text-[13px] ${late ? "text-ochre" : "text-ink-muted"}`}>
        <Ring frac={frac} late={late} size={16} stroke={2} />
        {expired ? "Hold ended" : `${pad2(mins)}:${pad2(secs)} left`}
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-5 rounded-md border px-5 py-4 transition-colors duration-700 ${
        expired ? "border-line-strong bg-surface-2" : late ? "border-ochre/50 bg-ochre/[0.06]" : "border-line-strong bg-surface"
      }`}
      data-testid="hold-countdown"
    >
      <div className="relative grid size-16 shrink-0 place-items-center">
        <Ring frac={expired ? 0 : frac} late={late} size={64} stroke={2.5} />
        <span className="num absolute text-[15px] font-medium tracking-tight" aria-hidden>
          {expired ? "0:00" : `${mins}:${pad2(secs)}`}
        </span>
      </div>
      <div className="min-w-0">
        <p className={`kicker ${late && !expired ? "!text-ochre" : ""}`}>{expired ? "Hold ended" : "Your room is held"}</p>
        <p className="mt-1 text-[0.9375rem] leading-snug">
          {expired ? (
            "The twenty minutes are up and the room has been released. Nothing was charged."
          ) : late ? (
            <>
              Still yours until <span className="num">{until}</span>. If it lapses, nothing is charged and you can start again.
            </>
          ) : (
            <>
              Nobody else can book it until <span className="num">{until}</span>. Take your time.
            </>
          )}
        </p>
        <p className="sr-only" aria-live="polite">
          {expired ? "The hold has ended." : `${mins + 1} ${mins + 1 === 1 ? "minute" : "minutes"} or less left on your hold.`}
        </p>
      </div>
    </div>
  );
}

function Ring({ frac, late, size, stroke }: { frac: number; late: boolean; size: number; stroke: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={stroke / 2} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={late ? "var(--ochre)" : "var(--brass)"}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)}
        style={{ transition: "stroke-dashoffset 1s linear, stroke 700ms" }}
      />
    </svg>
  );
}

/* A shared one-second clock, so several countdowns on a page tick together. */
let now = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Milliseconds until `iso` on the server's clock; null before hydration. */
export function useRemaining(iso: string | null | undefined, skewMs = 0) {
  const t = useSyncExternalStore(
    subscribe,
    () => {
      if (!now) now = Date.now();
      return now;
    },
    () => 0,
  );
  if (!iso || !t) return null;
  return new Date(iso).getTime() - (t + skewMs);
}
