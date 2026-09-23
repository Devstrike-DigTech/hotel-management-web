"use client";

import { SlidersHorizontal, X } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { formatNaira } from "@/lib/format";
import { AmenityIcon } from "../ui/amenity";

interface Props {
  priceBounds: [number, number]; // kobo
  amenities: { label: string; count: number }[];
}

const STEP = 500000; // ₦5,000 in kobo

export function StaysFilters({ priceBounds, amenities }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, start] = useTransition();
  const [lo, hi] = priceBounds;
  const min = clamp(Number(params.get("min")) || lo, lo, hi);
  const max = clamp(Number(params.get("max")) || hi, lo, hi);
  const [range, setRange] = useState<[number, number]>([min, max]);
  const [lastSync, setLastSync] = useState(`${min}-${max}`);
  if (lastSync !== `${min}-${max}`) {
    setLastSync(`${min}-${max}`);
    setRange([min, max]);
  }
  const selected = new Set((params.get("amenities") ?? "").split(",").filter(Boolean));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  function push(mut: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(params.toString());
    mut(p);
    start(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
  }

  function commitPrice(next: [number, number]) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      push((p) => {
        if (next[0] > lo) p.set("min", String(next[0]));
        else p.delete("min");
        if (next[1] < hi) p.set("max", String(next[1]));
        else p.delete("max");
      });
    }, 350);
  }

  function toggleAmenity(a: string) {
    const next = new Set(selected);
    if (next.has(a)) next.delete(a);
    else next.add(a);
    push((p) => {
      if (next.size) p.set("amenities", [...next].join(","));
      else p.delete("amenities");
    });
  }

  const active = (range[0] > lo || range[1] < hi ? 1 : 0) + selected.size;
  const span = Math.max(hi - lo, 1);

  const body = (
    <div className="space-y-9">
      <fieldset>
        <legend className="kicker mb-4 flex w-full items-center justify-between">
          <span>Price per night</span>
        </legend>
        <p className="num mb-4 text-sm">
          {formatNaira(range[0])} <span className="text-ink-muted">to</span> {formatNaira(range[1])}
          {range[1] >= hi ? "+" : ""}
        </p>
        <div className="relative h-6">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line-strong" />
          <div
            className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-laterite"
            style={{ left: `${((range[0] - lo) / span) * 100}%`, right: `${100 - ((range[1] - lo) / span) * 100}%` }}
          />
          <input
            type="range"
            aria-label="Minimum price per night"
            aria-valuetext={formatNaira(range[0])}
            min={lo}
            max={hi}
            step={STEP}
            value={range[0]}
            onChange={(e) => {
              const v = Math.min(Number(e.target.value), range[1] - STEP);
              const next: [number, number] = [Math.max(lo, v), range[1]];
              setRange(next);
              commitPrice(next);
            }}
            className="range-thumb absolute inset-0 w-full"
          />
          <input
            type="range"
            aria-label="Maximum price per night"
            aria-valuetext={formatNaira(range[1])}
            min={lo}
            max={hi}
            step={STEP}
            value={range[1]}
            onChange={(e) => {
              const v = Math.max(Number(e.target.value), range[0] + STEP);
              const next: [number, number] = [range[0], Math.min(hi, v)];
              setRange(next);
              commitPrice(next);
            }}
            className="range-thumb absolute inset-0 w-full"
          />
        </div>
        <div className="num mt-2 flex justify-between text-[11px] text-ink-muted">
          <span>{formatNaira(lo)}</span>
          <span>{formatNaira(hi)}</span>
        </div>
      </fieldset>

      {amenities.length ? (
        <fieldset>
          <legend className="kicker mb-3">Amenities</legend>
          <ul className="space-y-0.5">
            {amenities.map(({ label, count }) => {
              const on = selected.has(label);
              return (
                <li key={label}>
                  <label className="group flex cursor-pointer items-center gap-3 rounded-sm py-1.5 text-[0.9375rem]">
                    <input type="checkbox" checked={on} onChange={() => toggleAmenity(label)} className="peer sr-only" />
                    <span
                      aria-hidden
                      className={`grid size-[18px] shrink-0 place-items-center rounded-xs border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-laterite ${
                        on ? "border-laterite bg-laterite text-laterite-ink" : "border-line-strong group-hover:border-ink"
                      }`}
                    >
                      {on ? (
                        <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M2.5 6.2l2.3 2.3 4.7-5" />
                        </svg>
                      ) : null}
                    </span>
                    <AmenityIcon label={label} size={17} className="shrink-0 text-ink-muted" />
                    <span className="flex-1">{label}</span>
                    <span className="num text-xs text-ink-muted">{count}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}

      {active ? (
        <button
          type="button"
          className="link-static inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
          onClick={() =>
            push((p) => {
              p.delete("min");
              p.delete("max");
              p.delete("amenities");
            })
          }
        >
          <X size={14} aria-hidden /> Clear filters
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      <details className="group rounded-sm border border-line-strong bg-surface lg:hidden">
        <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
          <span className="flex items-center gap-2.5 text-[0.9375rem]">
            <SlidersHorizontal size={18} aria-hidden /> Filters
            {active ? <span className="num rounded-full bg-laterite px-1.5 text-[11px] text-laterite-ink">{active}</span> : null}
          </span>
          <span className="kicker group-open:hidden">Show</span>
          <span className="kicker hidden group-open:inline">Hide</span>
        </summary>
        <div className="border-t border-line px-4 py-6">{body}</div>
      </details>
      <div className="hidden lg:block">{body}</div>
    </>
  );
}

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="kicker">Sort</span>
      <span className="relative">
        <select
          value={value}
          onChange={(e) => {
            const p = new URLSearchParams(params.toString());
            if (e.target.value === "recommended") p.delete("sort");
            else p.set("sort", e.target.value);
            router.replace(`${pathname}?${p.toString()}`, { scroll: false });
          }}
          className="appearance-none rounded-sm border border-line-strong bg-surface py-2 pl-3 pr-9 text-[0.9375rem] hover:border-ink focus:border-laterite focus:outline-none"
        >
          <option value="recommended">Recommended</option>
          <option value="price-asc">Price, low to high</option>
          <option value="price-desc">Price, high to low</option>
          <option value="rating">Best reviewed</option>
        </select>
        <svg aria-hidden viewBox="0 0 12 12" className="pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </span>
    </label>
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
