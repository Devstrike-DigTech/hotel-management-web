"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { createContext, useContext, useState } from "react";
import { diffDays, type ISODate } from "@/lib/dates";
import { formatNaira } from "@/lib/format";
import { DateRangeField } from "../search/date-range-field";
import { GuestsStepper } from "../search/guests-stepper";
import type { Range } from "../search/range-calendar";

interface StayState {
  range: Range;
  setRange: (r: Range) => void;
  guests: number;
  setGuests: (n: number) => void;
  today: ISODate;
  bookHref: (roomId?: string) => string;
}

const Ctx = createContext<StayState | null>(null);

export function StayProvider({
  children,
  initial,
  today,
  bookBase,
}: {
  children: React.ReactNode;
  initial: { checkIn: ISODate | null; checkOut: ISODate | null; guests: number };
  today: ISODate;
  bookBase: string;
}) {
  const [range, setRange] = useState<Range>({ checkIn: initial.checkIn, checkOut: initial.checkOut });
  const [guests, setGuests] = useState(initial.guests);
  const bookHref = (roomId?: string) => {
    const p = new URLSearchParams();
    if (roomId) p.set("room", roomId);
    if (range.checkIn && range.checkOut) {
      p.set("checkIn", range.checkIn);
      p.set("checkOut", range.checkOut);
    }
    p.set("guests", String(guests));
    return `${bookBase}?${p.toString()}`;
  };
  return <Ctx.Provider value={{ range, setRange, guests, setGuests, today, bookHref }}>{children}</Ctx.Provider>;
}

function useStay() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStay outside StayProvider");
  return v;
}

/** The sticky side card: from-price, dates, guests, and the way into the booking flow. */
export function StayCard({ fromKobo, phone }: { fromKobo: number | null; phone: string | null }) {
  const { range, setRange, guests, setGuests, today } = useStay();
  const nights = range.checkIn && range.checkOut ? diffDays(range.checkIn, range.checkOut) : null;
  return (
    <div className="rounded-md border border-line-strong bg-surface p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="kicker">From</p>
        <p className="text-sm text-ink-muted">
          <span className="num text-2xl font-medium text-ink">{formatNaira(fromKobo)}</span> / night
        </p>
      </div>
      <div className="mt-5 space-y-3">
        <DateRangeField value={range} onChange={setRange} today={today} variant="stack" align="right" />
        <div className="rounded-sm border border-line-strong bg-surface px-4 py-3">
          <GuestsStepper value={guests} onChange={setGuests} layout="row" />
        </div>
      </div>
      <a href="#rooms" className="btn btn-primary group mt-5 w-full">
        {nights ? `Choose a room for ${nights} ${nights === 1 ? "night" : "nights"}` : "Choose a room"}
        <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
      </a>
      <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted">
        Prices are per room per night, before 7.5% VAT.
        {phone ? " Questions? The front desk answers the phone." : ""}
      </p>
    </div>
  );
}

export function SelectRoomLink({ roomId, soldOut, name }: { roomId: string; soldOut: boolean; name: string }) {
  const { bookHref } = useStay();
  if (soldOut)
    return (
      <span className="btn btn-outline w-full cursor-not-allowed opacity-50 sm:w-auto" aria-disabled="true">
        Fully booked
      </span>
    );
  return (
    <Link href={bookHref(roomId)} className="btn btn-ink group w-full sm:w-auto" aria-label={`Select ${name}`}>
      Select <ArrowRight size={15} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Phones: a slim bar pinned to the bottom, so booking is always one tap away. */
export function MobileBookBar({ fromKobo }: { fromKobo: number | null }) {
  const { range } = useStay();
  const nights = range.checkIn && range.checkOut ? diffDays(range.checkIn, range.checkOut) : null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line-strong bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-[6px] lg:hidden">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
        <p className="text-sm leading-tight text-ink-muted">
          <span className="kicker block !text-[10px]">From</span>
          <span className="num text-lg font-medium text-ink">{formatNaira(fromKobo)}</span> / night
        </p>
        <a href="#rooms" className="btn btn-primary !min-h-11">
          {nights ? `Rooms for ${nights} ${nights === 1 ? "night" : "nights"}` : "Choose a room"}
        </a>
      </div>
    </div>
  );
}
