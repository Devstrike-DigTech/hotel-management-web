"use client";

import { Minus, Plus } from "@phosphor-icons/react";
import { useId } from "react";

interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label?: string;
  className?: string;
  layout?: "stack" | "row";
}

export function GuestsStepper({ value, onChange, min = 1, max = 12, label = "Guests", className = "", layout = "stack" }: Props) {
  const id = useId();
  return (
    <div className={`flex ${layout === "row" ? "items-center justify-between" : "flex-col justify-center gap-1"} ${className}`} role="group" aria-labelledby={id}>
      <span id={id} className="kicker">
        {label}
      </span>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="inline-grid size-7 place-items-center rounded-full border border-line-strong transition-colors hover:border-ink disabled:opacity-35"
          aria-label="One guest fewer"
        >
          <Minus size={12} weight="bold" />
        </button>
        <output className="num min-w-[2.5ch] text-center text-[0.975rem]" aria-live="polite">
          {value} <span className="sr-only">{value === 1 ? "guest" : "guests"}</span>
        </output>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="inline-grid size-7 place-items-center rounded-full border border-line-strong transition-colors hover:border-ink disabled:opacity-35"
          aria-label="One more guest"
        >
          <Plus size={12} weight="bold" />
        </button>
      </div>
    </div>
  );
}
