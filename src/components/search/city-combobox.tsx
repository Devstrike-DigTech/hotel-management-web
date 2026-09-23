"use client";

import { MapPin } from "@phosphor-icons/react";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import type { City } from "@/lib/types";
import { useDismiss } from "./use-dismiss";

interface Props {
  cities: City[];
  value: string;
  onChange: (city: string) => void;
}

/** An ARIA 1.2 combobox: type to filter, arrows to move, Enter to choose, Escape to close. */
export function CityCombobox({ cities, value, onChange }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches =
      !q || q === value.toLowerCase()
        ? cities
        : cities.filter((c) => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q));
    return [{ name: "", state: "Anywhere in Nigeria", hotelCount: cities.reduce((s, c) => s + c.hotelCount, 0) }, ...matches];
  }, [cities, query, value]);

  const commit = useCallback(
    (c: City) => {
      onChange(c.name);
      setQuery(c.name);
      setOpen(false);
    },
    [onChange],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery(value);
  }, [value]);
  useDismiss(open, wrapRef, close);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (options[active]) commit(options[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      close();
    }
  }

  return (
    <div ref={wrapRef} className="relative flex min-w-0 flex-1">
      <label
        htmlFor={`${id}-input`}
        className="flex w-full cursor-text flex-col justify-center gap-1 px-5 py-3 transition-colors hover:bg-surface-2/70"
      >
        <span className="kicker">Where to</span>
        <input
          ref={inputRef}
          id={`${id}-input`}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          placeholder="Any city"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(e.target.value ? 1 : 0);
            setOpen(true);
            if (!e.target.value) onChange("");
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full min-w-0 bg-transparent text-[0.975rem] text-ink outline-none placeholder:text-ink-muted"
        />
      </label>
      {open ? (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label="Cities"
          className="absolute left-0 top-[calc(100%+10px)] z-50 max-h-80 w-[min(22rem,calc(100vw-2rem))] overflow-auto rounded-md border border-line-strong bg-surface py-1.5 shadow-[var(--shadow-float)]"
        >
          {options.map((c, i) => (
            <li
              key={c.name || "anywhere"}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => commit(c)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${i === active ? "bg-surface-2" : ""} ${
                i === 0 ? "border-b border-line" : ""
              }`}
            >
              <MapPin size={16} weight={c.name === value && c.name ? "fill" : "light"} className="shrink-0 text-laterite" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.95rem]">{c.name || "Anywhere"}</span>
                <span className="block truncate text-xs text-ink-muted">{c.name ? `${c.state} State` : c.state}</span>
              </span>
              <span className="num text-xs text-ink-muted">{String(c.hotelCount).padStart(2, "0")}</span>
            </li>
          ))}
          {options.length === 1 ? (
            <li className="px-4 py-3 text-sm text-ink-muted" role="presentation">
              No listed hotels in &ldquo;{query}&rdquo; yet.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
