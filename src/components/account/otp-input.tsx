"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Six boxes for a one-time code. Typing moves forward, Backspace moves back, arrows move freely,
 * and pasting (or the phone's SMS autofill) fills every box at once from any box. The boxes are
 * one logical field for assistive technology: a group with a single label and a live status.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  label = "Verification code",
  autoFocus = true,
}: {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  label?: string;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  // The latest value, ahead of React's re-render: fast typing and autofill move focus mid-event.
  const live = useRef(value);
  useEffect(() => {
    live.current = value;
  }, [value]);
  const [shake, setShake] = useState(0);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[Math.min(value.length, length - 1)]?.focus();
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A wrong code: shake once, clear, and go back to the first box.
  const [lastInvalid, setLastInvalid] = useState(invalid);
  if (invalid !== lastInvalid) {
    setLastInvalid(invalid);
    if (invalid) setShake((n) => n + 1);
  }
  useEffect(() => {
    if (invalid) refs.current[0]?.focus();
  }, [invalid]);

  function commit(next: string, focusIndex: number) {
    const clean = next.replace(/\D/g, "").slice(0, length);
    live.current = clean;
    onChange(clean);
    refs.current[Math.max(0, Math.min(focusIndex, length - 1))]?.focus();
    if (clean.length === length) onComplete?.(clean);
  }

  function onInput(i: number, raw: string) {
    const value = live.current;
    const digits = Array.from({ length }, (_, k) => value[k] ?? "");
    let d = raw.replace(/\D/g, "");
    if (!d) return;
    // A box that already held a digit reports both ("37"): keep the new one.
    if (d.length === 2 && digits[i]) d = d.startsWith(digits[i]) ? d.slice(1) : d.slice(0, 1);
    if (d.length > 1) {
      // SMS autofill or a fast typist: spread the digits from this box on.
      const merged = (value.slice(0, i) + d).slice(0, length);
      commit(merged, merged.length);
      return;
    }
    const merged = i < value.length ? value.slice(0, i) + d + value.slice(i + 1) : (value + d).slice(0, length);
    commit(merged, i + 1);
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    const value = live.current;
    const digits = Array.from({ length }, (_, k) => value[k] ?? "");
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) commit(value.slice(0, i) + value.slice(i + 1), i);
      else if (i > 0) commit(value.slice(0, i - 1) + value.slice(i), i - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      refs.current[Math.max(0, i - 1)]?.focus();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      refs.current[Math.min(length - 1, i + 1, value.length)]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      refs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      refs.current[Math.min(value.length, length - 1)]?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    commit(text.slice(0, length), Math.min(text.length, length - 1));
  }

  return (
    <div role="group" aria-label={label}>
      <div key={shake} className={`flex gap-2 sm:gap-2.5 ${shake ? "animate-[otp-shake_380ms_ease-out]" : ""}`}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            onChange={(e) => onInput(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            onFocus={(e) => {
              // Never leave a gap: focusing past the first empty box jumps back to it.
              if (i > live.current.length) refs.current[live.current.length]?.focus();
              else e.target.select();
            }}
            disabled={disabled}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            pattern="[0-9]*"
            maxLength={i === 0 ? length : 1}
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={invalid || undefined}
            data-testid={`otp-${i}`}
            className={`num h-14 w-full min-w-0 max-w-14 rounded-sm border bg-surface text-center text-2xl caret-laterite transition-[border-color,box-shadow,background-color] duration-150 focus:border-laterite focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--laterite)_18%,transparent)] focus:outline-none disabled:opacity-60 sm:h-16 sm:text-[1.75rem] ${
              invalid ? "border-danger" : d ? "border-ink/60" : "border-line-strong"
            } ${i === 2 ? "mr-2 sm:mr-3" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}

/** "Resend in 0:42", then a button; counts from `startedAt` so re-renders never reset it. */
export function ResendTimer({
  startedAt,
  seconds = 45,
  onResend,
  busy,
  children,
}: {
  startedAt: number;
  seconds?: number;
  onResend: () => void;
  busy?: boolean;
  children?: React.ReactNode;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((startedAt + seconds * 1000 - now) / 1000));
  if (left > 0)
    return (
      <p className="text-sm text-ink-muted" aria-live="off">
        No code yet? You can ask again in{" "}
        <span className="num text-ink">
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
        </span>
      </p>
    );
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <button type="button" onClick={onResend} disabled={busy} className="link-static font-medium text-laterite disabled:opacity-50">
        {busy ? "Sending" : "Send a new code"}
      </button>
      {children}
    </div>
  );
}
