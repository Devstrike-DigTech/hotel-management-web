"use client";

import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ISODate } from "@/lib/dates";
import type { City } from "@/lib/types";
import { CityCombobox } from "./city-combobox";
import { DateRangeField } from "./date-range-field";
import { GuestsStepper } from "./guests-stepper";
import type { Range } from "./range-calendar";

interface Props {
  cities: City[];
  today: ISODate;
  initial?: { city?: string; checkIn?: string | null; checkOut?: string | null; guests?: number };
  /** Extra query params to carry through (filters, sort) when re-searching from the results page. */
  keep?: Record<string, string>;
  size?: "lg" | "md";
}

export function SearchBar({ cities, today, initial = {}, keep = {}, size = "lg" }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [city, setCity] = useState(initial.city ?? "");
  const [range, setRange] = useState<Range>({ checkIn: initial.checkIn ?? null, checkOut: initial.checkOut ?? null });
  const [guests, setGuests] = useState(initial.guests ?? 2);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams(keep);
    if (city) p.set("city", city);
    else p.delete("city");
    if (range.checkIn && range.checkOut) {
      p.set("checkIn", range.checkIn);
      p.set("checkOut", range.checkOut);
    } else {
      p.delete("checkIn");
      p.delete("checkOut");
    }
    p.set("guests", String(guests));
    start(() => router.push(`/stays?${p.toString()}`));
  }

  return (
    <form
      role="search"
      aria-label="Find a stay"
      onSubmit={submit}
      className={`relative flex flex-col rounded-md border border-line-strong bg-surface md:flex-row md:items-stretch ${
        size === "lg" ? "md:min-h-[4.75rem]" : "md:min-h-16"
      }`}
    >
      <div className="flex min-w-0 flex-col divide-y divide-line md:flex-1 md:flex-row md:divide-x md:divide-y-0">
        <CityCombobox cities={cities} value={city} onChange={setCity} />
        <DateRangeField value={range} onChange={setRange} today={today} />
        <GuestsStepper value={guests} onChange={setGuests} className="px-5 py-3 md:w-40 md:flex-none" />
      </div>
      <div className="p-2 md:pl-0">
        <button
          type="submit"
          className={`btn btn-primary group h-full w-full md:w-auto ${size === "lg" ? "md:!px-7" : ""}`}
          aria-busy={pending}
        >
          <MagnifyingGlass size={18} weight="regular" aria-hidden className="md:hidden lg:block" />
          <span>{pending ? "Searching" : "Find a room"}</span>
          <ArrowRight size={16} aria-hidden className="hidden transition-transform group-hover:translate-x-0.5 lg:block" />
        </button>
      </div>
    </form>
  );
}
