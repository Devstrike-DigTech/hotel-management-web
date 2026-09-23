"use client";

import { Star } from "@phosphor-icons/react";
import { useId } from "react";

/** Five stars, filled to a fraction (4.6 fills four and most of the fifth). */
export function Stars({ value, size = 14, className = "" }: { value: number; size?: number; className?: string }) {
  return (
    <span className={`relative inline-flex ${className}`} role="img" aria-label={`${value.toFixed(1)} out of 5`}>
      <span className="flex text-line-strong" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={size} weight="fill" />
        ))}
      </span>
      <span className="absolute inset-0 flex overflow-hidden text-brass" style={{ width: `${(Math.max(0, Math.min(5, value)) / 5) * 100}%` }} aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={size} weight="fill" className="shrink-0" />
        ))}
      </span>
    </span>
  );
}

const WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/**
 * A row of five stars as a radio group: click or tap a star, or use the arrow keys.
 * The chosen score is also said in words, so it is not carried by colour alone.
 */
export function StarInput({
  label,
  hint,
  value,
  onChange,
  size = 30,
  error,
  name,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  size?: number;
  error?: string;
  name: string;
}) {
  const id = useId();
  return (
    <fieldset className="min-w-0" aria-describedby={`${id}-state`}>
      <legend className="float-left mb-2 w-full">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-[0.9375rem] font-medium">{label}</span>
          <span id={`${id}-state`} className={`kicker !normal-case !tracking-normal ${error && !value ? "!text-danger" : value ? "!text-ink" : ""}`}>
            {value ? WORDS[value] : error && !value ? error : "Tap to rate"}
          </span>
        </span>
        {hint ? <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span> : null}
      </legend>
      <div className="clear-both flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = n <= value;
          return (
            <label
              key={n}
              className={`group relative grid cursor-pointer place-items-center rounded-xs p-0.5 transition-transform duration-150 hover:scale-110 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-laterite ${
                on ? "text-brass" : "text-line-strong hover:text-brass/60"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                className="sr-only"
                aria-label={`${n} ${n === 1 ? "star" : "stars"}, ${WORDS[n]}`}
                data-testid={`${name}-${n}`}
              />
              <Star size={size} weight={on ? "fill" : "regular"} aria-hidden />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
