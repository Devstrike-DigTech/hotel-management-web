"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bank,
  Bed,
  CalendarBlank,
  Check,
  Clock,
  Copy,
  CreditCard,
  Moon,
  Phone,
  Ruler,
  Storefront,
  Sun,
  UsersThree,
  WhatsappLogo,
  Info,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { addDays, diffDays, formatLong, formatMonthShort, formatShort, formatWeekday, type ISODate } from "@/lib/dates";
import { formatClock, formatNaira, formatPhone, toE164Digits, vatOn } from "@/lib/format";
import type { RoomTypePublic } from "@/lib/types";
import { GuestsStepper } from "../search/guests-stepper";
import { RangeCalendar, type Range } from "../search/range-calendar";
import { useMedia } from "../search/use-dismiss";
import { Plate } from "../ui/plate";

export interface BookingHotel {
  slug: string;
  name: string;
  area: string;
  city: string;
  phone: string | null;
  email: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  coverImageUrl: string | null;
  roomTypes: RoomTypePublic[];
}

type StayKind = "overnight" | "dayuse";
type Payment = "card" | "transfer" | "hotel";

interface Guest {
  fullName: string;
  phone: string;
  email: string;
  arrival: string;
  requests: string;
}

const STEPS = ["Your stay", "Guest details", "Review and pay", "Confirm"] as const;
const PAYMENT: Record<Payment, { title: string; body: string; Icon: typeof CreditCard }> = {
  card: { title: "Card, via Paystack", body: "Visa, Mastercard or Verve. Paystack handles the card; the hotel never sees your number.", Icon: CreditCard },
  transfer: { title: "Bank transfer", body: "Transfer from any Nigerian bank app to a dedicated account for this booking.", Icon: Bank },
  hotel: { title: "Pay at the hotel", body: "Settle at the front desk on arrival, by card, transfer or cash.", Icon: Storefront },
};

export function BookingFlow({
  hotel,
  today,
  initial,
  hotelHref,
}: {
  hotel: BookingHotel;
  today: ISODate;
  initial: { room: string | null; checkIn: ISODate | null; checkOut: ISODate | null; guests: number };
  hotelHref: string;
}) {
  const rooms = useMemo(() => [...hotel.roomTypes].sort((a, b) => a.basePriceKobo - b.basePriceKobo), [hotel.roomTypes]);
  const firstAvailable = rooms.find((r) => r.availableCount > 0) ?? rooms[0];
  const [step, setStep] = useState(0);
  const [roomId, setRoomId] = useState<string | undefined>(
    rooms.some((r) => r.id === initial.room) ? initial.room! : firstAvailable?.id,
  );
  const [kind, setKind] = useState<StayKind>("overnight");
  const [range, setRange] = useState<Range>({ checkIn: initial.checkIn, checkOut: initial.checkOut });
  const [dayUse, setDayUse] = useState<{ date: ISODate; from: string; hours: number }>({ date: today, from: "12:00", hours: 3 });
  const [guests, setGuests] = useState(initial.guests);
  const [guest, setGuest] = useState<Guest>({ fullName: "", phone: "", email: "", arrival: "", requests: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof Guest | "dates" | "room", string>>>({});
  const [payment, setPayment] = useState<Payment>("card");
  const topRef = useRef<HTMLDivElement>(null);
  const wide = useMedia("(min-width: 40rem)", true);

  const room = rooms.find((r) => r.id === roomId);
  const canDayUse = !!room?.hourlyPriceKobo;
  const effectiveKind: StayKind = canDayUse ? kind : "overnight";
  const nights = range.checkIn && range.checkOut ? diffDays(range.checkIn, range.checkOut) : 0;

  const lines = useMemo(() => {
    if (!room) return null;
    if (effectiveKind === "dayuse" && room.hourlyPriceKobo) {
      const subtotal = room.hourlyPriceKobo * dayUse.hours;
      return {
        label: `${formatNaira(room.hourlyPriceKobo)} x ${dayUse.hours} ${dayUse.hours === 1 ? "hour" : "hours"}`,
        subtotal,
        vat: vatOn(subtotal),
        total: subtotal + vatOn(subtotal),
      };
    }
    if (!nights) return null;
    const subtotal = room.basePriceKobo * nights;
    return {
      label: `${formatNaira(room.basePriceKobo)} x ${nights} ${nights === 1 ? "night" : "nights"}`,
      subtotal,
      vat: vatOn(subtotal),
      total: subtotal + vatOn(subtotal),
    };
  }, [room, effectiveKind, dayUse.hours, nights]);

  const shownStep = useRef(step);
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    topRef.current?.focus({ preventScroll: true });
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  function next() {
    const e: typeof errors = {};
    if (step === 0) {
      if (!room) e.room = "Choose a room type.";
      else if (room.availableCount <= 0) e.room = "That room type is fully booked. Choose another.";
      if (effectiveKind === "overnight" && !nights) e.dates = "Choose your check-in and check-out days.";
    }
    if (step === 1) {
      if (guest.fullName.trim().split(/\s+/).length < 2) e.fullName = "Enter your first and last name, as on your ID.";
      const digits = toE164Digits(guest.phone);
      if (!/^234[789]\d{9}$/.test(digits)) e.phone = "Enter a Nigerian mobile number, for example 0803 123 4567.";
      if (!/^\S+@\S+\.\S+$/.test(guest.email)) e.email = "Enter an email address for your confirmation.";
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep((s) => Math.min(s + 1, 3));
  }

  const summaryText = useMemo(() => {
    if (!room) return "";
    const when =
      effectiveKind === "dayuse"
        ? `Day use on ${formatLong(dayUse.date)}, from ${formatClock(dayUse.from)} for ${dayUse.hours} hours`
        : range.checkIn && range.checkOut
          ? `${formatLong(range.checkIn)} to ${formatLong(range.checkOut)} (${nights} ${nights === 1 ? "night" : "nights"})`
          : "";
    return [
      `Hello ${hotel.name}, I would like to book:`,
      `Room: ${room.name}`,
      `Dates: ${when}`,
      `Guests: ${guests}`,
      lines ? `Quoted total: ${formatNaira(lines.total)} including 7.5% VAT` : "",
      `Payment: ${PAYMENT[payment].title}`,
      `Name: ${guest.fullName}`,
      `Phone: ${guest.phone}`,
      guest.email ? `Email: ${guest.email}` : "",
      guest.arrival ? `Arriving around: ${guest.arrival}` : "",
      guest.requests ? `Requests: ${guest.requests}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }, [room, effectiveKind, dayUse, range, nights, guests, lines, payment, guest, hotel.name]);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
      <div className="min-w-0">
        <Stepper step={step} onStep={(i) => i < step && setStep(i)} />
        <div ref={topRef} tabIndex={-1} className="scroll-mt-28 pt-10 outline-none" aria-live="polite">
          {step === 0 ? (
            <StepStay
              rooms={rooms}
              roomId={roomId}
              setRoomId={setRoomId}
              kind={effectiveKind}
              setKind={setKind}
              canDayUse={canDayUse}
              range={range}
              setRange={setRange}
              dayUse={dayUse}
              setDayUse={setDayUse}
              guests={guests}
              setGuests={setGuests}
              today={today}
              errors={errors}
              wide={wide}
              hotel={hotel}
            />
          ) : null}
          {step === 1 ? <StepGuest guest={guest} setGuest={setGuest} errors={errors} /> : null}
          {step === 2 ? <StepReview payment={payment} setPayment={setPayment} guest={guest} /> : null}
          {step === 3 ? <StepConfirm hotel={hotel} summaryText={summaryText} hotelHref={hotelHref} /> : null}

          {step < 3 && lines ? (
            <p className="mt-10 flex items-baseline justify-between border-t border-line pt-4 text-sm lg:hidden">
              <span className="text-ink-muted">Total, with 7.5% VAT</span>
              <span className="num text-lg font-medium">{formatNaira(lines.total)}</span>
            </p>
          ) : null}
          {step < 3 ? (
            <div className="mt-10 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              {step > 0 ? (
                <button type="button" className="btn btn-outline" onClick={() => setStep((s) => s - 1)}>
                  <ArrowLeft size={16} aria-hidden /> Back
                </button>
              ) : (
                <Link href={hotelHref} className="btn btn-outline">
                  <ArrowLeft size={16} aria-hidden /> Back to the hotel
                </Link>
              )}
              <button type="button" className="btn btn-primary group" onClick={next}>
                {step === 2 ? "Confirm booking" : `Continue to ${STEPS[step + 1].toLowerCase()}`}
                <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <aside aria-label="Booking summary" className="lg:pt-2">
        <div className="lg:sticky lg:top-24">
          <Summary
            hotel={hotel}
            room={room}
            kind={effectiveKind}
            range={range}
            nights={nights}
            dayUse={dayUse}
            guests={guests}
            lines={lines}
            payment={step >= 2 ? payment : null}
          />
        </div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ Stepper */

function Stepper({ step, onStep }: { step: number; onStep: (i: number) => void }) {
  return (
    <ol className="grid grid-cols-4 border-b border-line" aria-label="Booking steps">
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={label} className="relative">
            <button
              type="button"
              onClick={() => onStep(i)}
              disabled={!done}
              aria-current={current ? "step" : undefined}
              className={`flex w-full flex-col items-start gap-1 pb-3 text-left ${done ? "cursor-pointer hover:text-laterite" : "cursor-default"}`}
            >
              <span className={`font-display text-lg italic ${current || done ? "text-laterite" : "text-ink-muted"}`}>
                {["i", "ii", "iii", "iv"][i]}.
              </span>
              <span className={`hidden text-sm sm:block ${current ? "text-ink" : "text-ink-muted"}`}>{label}</span>
            </button>
            <span
              aria-hidden
              className={`absolute -bottom-px left-0 h-[2px] transition-all duration-500 ${i <= step ? "w-full bg-laterite" : "w-0"}`}
            />
          </li>
        );
      })}
    </ol>
  );
}

function StepTitle({ kicker, children }: { kicker: string; children: React.ReactNode }) {
  return (
    <header className="mb-8">
      <p className="kicker">{kicker}</p>
      <h2 className="display-md mt-3 text-[clamp(2rem,4vw,3rem)]">{children}</h2>
    </header>
  );
}

/* ------------------------------------------------------------------ Step 1 */

function StepStay(props: {
  rooms: RoomTypePublic[];
  roomId?: string;
  setRoomId: (id: string) => void;
  kind: StayKind;
  setKind: (k: StayKind) => void;
  canDayUse: boolean;
  range: Range;
  setRange: (r: Range) => void;
  dayUse: { date: ISODate; from: string; hours: number };
  setDayUse: (d: { date: ISODate; from: string; hours: number }) => void;
  guests: number;
  setGuests: (n: number) => void;
  today: ISODate;
  errors: Record<string, string | undefined>;
  wide: boolean;
  hotel: BookingHotel;
}) {
  const { rooms, roomId, setRoomId, kind, setKind, canDayUse, range, setRange, dayUse, setDayUse, guests, setGuests, today, errors, wide } = props;
  const room = rooms.find((r) => r.id === roomId);
  const overCapacity = room && guests > room.capacity;
  return (
    <div className="space-y-12">
      <StepTitle kicker="Step one of four">
        Choose your <em className="accent">room</em>
      </StepTitle>

      <fieldset>
        <legend className="kicker mb-4">Room type</legend>
        <div className="grid gap-3" role="radiogroup">
          {rooms.map((r) => {
            const on = r.id === roomId;
            const out = r.availableCount <= 0;
            return (
              <label
                key={r.id}
                className={`relative grid cursor-pointer grid-cols-[4.5rem_1fr_auto] items-center gap-4 rounded-sm border p-3 pr-4 transition-colors sm:grid-cols-[6rem_1fr_auto] ${
                  on ? "border-laterite bg-laterite/[0.05]" : "border-line-strong hover:border-ink-muted"
                } ${out ? "cursor-not-allowed opacity-55" : ""}`}
              >
                <input type="radio" name="room" value={r.id} checked={on} disabled={out} onChange={() => setRoomId(r.id)} className="peer sr-only" />
                <Plate src={r.images[0]?.url} alt={r.images[0]?.alt ?? r.name} sizes="96px" caption={false} className="aspect-[4/3] rounded-xs" />
                <span className="min-w-0">
                  <span className="display-sm block text-lg">{r.name}</span>
                  <span className="num mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <UsersThree size={13} aria-hidden /> {r.capacity}
                    </span>
                    {r.bedType ? (
                      <span className="inline-flex items-center gap-1">
                        <Bed size={13} aria-hidden /> {r.bedType}
                      </span>
                    ) : null}
                    {r.sizeSqm ? (
                      <span className="hidden items-center gap-1 sm:inline-flex">
                        <Ruler size={13} aria-hidden /> {r.sizeSqm} m&sup2;
                      </span>
                    ) : null}
                  </span>
                  <span className={`kicker mt-1.5 block !text-[10px] ${out ? "" : r.availableCount <= 3 ? "!text-laterite" : "!text-palm"}`}>
                    {out ? "Fully booked" : r.availableCount <= 3 ? `Only ${r.availableCount} left` : `${r.availableCount} available`}
                  </span>
                </span>
                <span className="text-right">
                  <span className="num block font-medium">{formatNaira(r.basePriceKobo)}</span>
                  <span className="text-xs text-ink-muted">a night</span>
                </span>
                <span
                  aria-hidden
                  className={`absolute -left-px -top-px grid size-5 place-items-center rounded-br-sm rounded-tl-sm transition-opacity ${on ? "bg-laterite text-laterite-ink opacity-100" : "opacity-0"}`}
                >
                  <Check size={12} weight="bold" />
                </span>
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-laterite" />
              </label>
            );
          })}
        </div>
        {errors.room ? <FieldError>{errors.room}</FieldError> : null}
      </fieldset>

      {canDayUse ? (
        <fieldset>
          <legend className="kicker mb-4">How long</legend>
          <div className="inline-grid grid-cols-2 rounded-sm border border-line-strong p-1" role="radiogroup">
            {(
              [
                ["overnight", "Overnight", Moon],
                ["dayuse", "Day use", Sun],
              ] as const
            ).map(([k, label, Icon]) => (
              <label
                key={k}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xs px-4 py-2.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laterite ${
                  kind === k ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
                }`}
              >
                <input type="radio" name="kind" className="sr-only" checked={kind === k} onChange={() => setKind(k)} />
                <Icon size={16} aria-hidden /> {label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {kind === "overnight" ? (
        <fieldset>
          <legend className="kicker mb-4 flex items-center gap-2">
            <CalendarBlank size={15} aria-hidden /> Dates
          </legend>
          <div className="rounded-sm border border-line-strong bg-surface p-4 sm:p-6">
            <RangeCalendar value={range} onChange={setRange} today={today} months={wide ? 2 : 1} />
          </div>
          <p className="mt-3 text-sm text-ink-muted" aria-live="polite">
            {range.checkIn && range.checkOut ? (
              <>
                <span className="num text-ink">{formatShort(range.checkIn)}</span> from {formatClock(props.hotel.checkInTime)} to{" "}
                <span className="num text-ink">{formatShort(range.checkOut)}</span> by {formatClock(props.hotel.checkOutTime)}
              </>
            ) : range.checkIn ? (
              "Now choose the day you check out."
            ) : (
              "Choose the day you arrive."
            )}
          </p>
          {errors.dates ? <FieldError>{errors.dates}</FieldError> : null}
        </fieldset>
      ) : (
        <DayUsePicker today={today} value={dayUse} onChange={setDayUse} />
      )}

      <fieldset>
        <legend className="kicker mb-4">Guests</legend>
        <div className="flex max-w-sm items-center justify-between rounded-sm border border-line-strong bg-surface px-4 py-3">
          <span className="text-[0.9375rem]">Adults and children</span>
          <GuestsStepper value={guests} onChange={setGuests} label="" layout="row" />
        </div>
        {overCapacity ? (
          <p className="mt-3 flex max-w-md items-start gap-2 text-sm text-ochre">
            <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
            The {room!.name} sleeps {room!.capacity}. Choose a larger room, or ask the hotel about an extra bed.
          </p>
        ) : null}
      </fieldset>
    </div>
  );
}

function DayUsePicker({
  today,
  value,
  onChange,
}: {
  today: ISODate;
  value: { date: ISODate; from: string; hours: number };
  onChange: (v: { date: ISODate; from: string; hours: number }) => void;
}) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const times = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);
  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="kicker mb-3">Day</legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {days.map((d) => {
            const on = d === value.date;
            return (
              <label
                key={d}
                className={`flex w-16 shrink-0 cursor-pointer flex-col items-center rounded-sm border py-2.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laterite ${
                  on ? "border-laterite bg-laterite text-laterite-ink" : "border-line-strong hover:border-ink-muted"
                }`}
              >
                <input type="radio" name="dayuse-date" className="sr-only" checked={on} onChange={() => onChange({ ...value, date: d })} />
                <span className="kicker !text-[9.5px] !text-current opacity-80">
                  {formatWeekday(d)}
                </span>
                <span className="num text-lg">{Number(d.slice(8))}</span>
                <span className="text-[10.5px] opacity-75">{formatMonthShort(d)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-8 sm:grid-cols-[1fr_auto]">
        <fieldset>
          <legend className="kicker mb-3 flex items-center gap-2">
            <Clock size={14} aria-hidden /> Arriving at
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {times.map((t) => (
              <label
                key={t}
                className={`num cursor-pointer rounded-xs border px-2.5 py-1.5 text-[13px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laterite ${
                  t === value.from ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink-muted"
                }`}
              >
                <input type="radio" name="dayuse-from" className="sr-only" checked={t === value.from} onChange={() => onChange({ ...value, from: t })} />
                {t}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="kicker mb-3">For</legend>
          <div className="rounded-sm border border-line-strong bg-surface px-4 py-2.5">
            <GuestsStepper value={value.hours} onChange={(h) => onChange({ ...value, hours: h })} min={2} max={12} label="Hours" layout="row" className="gap-5" />
          </div>
        </fieldset>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Step 2 */

function StepGuest({ guest, setGuest, errors }: { guest: Guest; setGuest: (g: Guest) => void; errors: Record<string, string | undefined> }) {
  const set = (k: keyof Guest) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setGuest({ ...guest, [k]: e.target.value });
  return (
    <div>
      <StepTitle kicker="Step two of four">
        Who is <em className="accent">checking in?</em>
      </StepTitle>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Full name" hint="As it appears on your ID" error={errors.fullName} className="sm:col-span-2">
          {(id, describedBy) => (
            <input id={id} aria-describedby={describedBy} aria-invalid={!!errors.fullName} className="field" autoComplete="name" value={guest.fullName} onChange={set("fullName")} placeholder="Adaeze Okonkwo" />
          )}
        </Field>
        <Field label="Mobile number" hint="The hotel will call or WhatsApp this number" error={errors.phone}>
          {(id, describedBy) => (
            <div className="flex">
              <span className="num inline-flex items-center rounded-l-sm border border-r-0 border-line-strong bg-surface-2 px-3 text-sm text-ink-muted">+234</span>
              <input id={id} aria-describedby={describedBy} aria-invalid={!!errors.phone} className="field !rounded-l-none" type="tel" inputMode="tel" autoComplete="tel-national" value={guest.phone} onChange={set("phone")} placeholder="0803 123 4567" />
            </div>
          )}
        </Field>
        <Field label="Email" hint="For your confirmation and receipt" error={errors.email}>
          {(id, describedBy) => (
            <input id={id} aria-describedby={describedBy} aria-invalid={!!errors.email} className="field" type="email" autoComplete="email" value={guest.email} onChange={set("email")} placeholder="you@example.com" />
          )}
        </Field>
        <Field label="Arriving around" hint="Optional, helps the desk have your room ready">
          {(id, describedBy) => (
            <select id={id} aria-describedby={describedBy} className="field appearance-none" value={guest.arrival} onChange={set("arrival")}>
              <option value="">I am not sure yet</option>
              {["Before noon", "12:00 to 15:00", "15:00 to 18:00", "18:00 to 21:00", "After 21:00"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Requests for the hotel" hint="Optional: airport pickup, a quiet floor, a cot" className="sm:col-span-2">
          {(id, describedBy) => (
            <textarea id={id} aria-describedby={describedBy} className="field min-h-28 resize-y" value={guest.requests} onChange={set("requests")} maxLength={500} />
          )}
        </Field>
      </div>
      <p className="mt-6 max-w-xl text-xs leading-relaxed text-ink-muted">
        Your details go only to this hotel, to register your stay. We handle personal data under the Nigeria Data Protection Act 2023.
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: (id: string, describedBy: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      {children(id, `${id}-hint`)}
      <p id={`${id}-hint`} className={`mt-1.5 text-xs ${error ? "text-danger" : "text-ink-muted"}`}>
        {error ?? hint}
      </p>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-danger">
      <Info size={16} aria-hidden /> {children}
    </p>
  );
}

/* ------------------------------------------------------------------ Step 3 */

function StepReview({ payment, setPayment, guest }: { payment: Payment; setPayment: (p: Payment) => void; guest: Guest }) {
  return (
    <div>
      <StepTitle kicker="Step three of four">
        Check it over, <em className="accent">then pay.</em>
      </StepTitle>
      <dl className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3">
        {[
          ["Guest", guest.fullName],
          ["Mobile", guest.phone ? formatPhone(guest.phone) : ""],
          ["Email", guest.email],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0 bg-paper px-4 py-3">
            <dt className="kicker !text-[10px]">{k}</dt>
            <dd className="mt-1 truncate text-[0.9375rem]">{v}</dd>
          </div>
        ))}
      </dl>
      <fieldset className="mt-10">
        <legend className="kicker mb-4">How would you like to pay?</legend>
        <div className="grid gap-3">
          {(Object.keys(PAYMENT) as Payment[]).map((k) => {
            const { title, body, Icon } = PAYMENT[k];
            const on = k === payment;
            return (
              <label
                key={k}
                className={`flex cursor-pointer items-start gap-4 rounded-sm border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-laterite ${
                  on ? "border-laterite bg-laterite/[0.05]" : "border-line-strong hover:border-ink-muted"
                }`}
              >
                <input type="radio" name="payment" className="sr-only" checked={on} onChange={() => setPayment(k)} />
                <span aria-hidden className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${on ? "border-laterite" : "border-line-strong"}`}>
                  <span className={`size-2.5 rounded-full bg-laterite transition-transform ${on ? "scale-100" : "scale-0"}`} />
                </span>
                <span className="flex-1">
                  <span className="block font-medium">{title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{body}</span>
                </span>
                <Icon size={26} weight="light" className={on ? "text-laterite" : "text-ink-muted"} aria-hidden />
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

/* ------------------------------------------------------------------ Step 4 */

function StepConfirm({ hotel, summaryText, hotelHref }: { hotel: BookingHotel; summaryText: string; hotelHref: string }) {
  const [copied, setCopied] = useState(false);
  const phone = hotel.phone ? toE164Digits(hotel.phone) : null;
  return (
    <div>
      <StepTitle kicker="Step four of four">
        Almost there. <em className="accent">One honest note.</em>
      </StepTitle>
      <div className="relative overflow-hidden rounded-md border border-line-strong bg-surface">
        <div className="flex items-start gap-4 p-6 sm:p-8">
          <span className="grid size-11 shrink-0 place-items-center rounded-full border border-brass/60 text-brass">
            <Clock size={22} weight="light" aria-hidden />
          </span>
          <div>
            <p className="kicker !text-brass">Online booking opens soon</p>
            <p className="display-sm mt-2 text-2xl">We have not sent this booking, and nothing has been charged.</p>
            <p className="mt-3 max-w-xl leading-relaxed text-ink-muted">
              Paying and confirming online is being switched on hotel by hotel. Until it reaches {hotel.name}, the front
              desk takes bookings directly. We have written your request out below, so it takes one message.
            </p>
          </div>
        </div>
        {/* perforation, like a tear-off stub */}
        <div aria-hidden className="relative h-5">
          <span className="absolute -left-2.5 top-0 size-5 rounded-full border border-line-strong bg-paper" />
          <span className="absolute -right-2.5 top-0 size-5 rounded-full border border-line-strong bg-paper" />
          <span className="absolute inset-x-4 top-1/2 border-t border-dashed border-line-strong" />
        </div>
        <div className="p-6 sm:p-8">
          <pre className="num max-h-72 overflow-auto whitespace-pre-wrap rounded-sm bg-surface-2 p-4 text-[12.5px] leading-relaxed text-ink/90">{summaryText}</pre>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {phone ? (
              <>
                <a
                  href={`https://wa.me/${phone}?text=${encodeURIComponent(summaryText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <WhatsappLogo size={18} aria-hidden /> WhatsApp the hotel
                </a>
                <a href={`tel:+${phone}`} className="btn btn-ink">
                  <Phone size={18} aria-hidden /> Call <span className="num">{formatPhone(hotel.phone!)}</span>
                </a>
              </>
            ) : hotel.email ? (
              <a href={`mailto:${hotel.email}?subject=${encodeURIComponent(`Booking request, ${hotel.name}`)}&body=${encodeURIComponent(summaryText)}`} className="btn btn-primary">
                Email the hotel
              </a>
            ) : null}
            <button
              type="button"
              className="btn btn-outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(summaryText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {}
              }}
            >
              {copied ? <Check size={17} aria-hidden /> : <Copy size={17} aria-hidden />}
              <span aria-live="polite">{copied ? "Copied" : "Copy details"}</span>
            </button>
          </div>
          <p className="mt-6 text-sm text-ink-muted">
            No room is held until the hotel confirms with you.{" "}
            <Link href={hotelHref} className="link-static text-ink">
              Back to {hotel.name}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Summary */

function Summary({
  hotel,
  room,
  kind,
  range,
  nights,
  dayUse,
  guests,
  lines,
  payment,
}: {
  hotel: BookingHotel;
  room?: RoomTypePublic;
  kind: StayKind;
  range: Range;
  nights: number;
  dayUse: { date: ISODate; from: string; hours: number };
  guests: number;
  lines: { label: string; subtotal: number; vat: number; total: number } | null;
  payment: Payment | null;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-line-strong bg-surface">
      <div className="flex gap-4 border-b border-line p-4">
        <Plate src={hotel.coverImageUrl} alt={hotel.name} caption={false} sizes="80px" className="size-20 shrink-0 rounded-xs" />
        <div className="min-w-0">
          <p className="kicker !text-[10px]">
            {hotel.area}, {hotel.city}
          </p>
          <p className="display-sm mt-1 text-xl">{hotel.name}</p>
          <p className="mt-0.5 truncate text-sm text-ink-muted">{room?.name ?? "Choose a room"}</p>
        </div>
      </div>
      <dl className="divide-y divide-line text-sm">
        <Row k={kind === "dayuse" ? "Day use" : "Check in"}>
          {kind === "dayuse" ? `${formatShort(dayUse.date)}, ${dayUse.from}` : range.checkIn ? formatLong(range.checkIn) : "—"}
        </Row>
        <Row k={kind === "dayuse" ? "Length" : "Check out"}>
          {kind === "dayuse" ? `${dayUse.hours} hours` : range.checkOut ? formatLong(range.checkOut) : "—"}
        </Row>
        <Row k="Guests">{guests}</Row>
        {kind === "overnight" && nights ? <Row k="Nights">{nights}</Row> : null}
        {payment ? <Row k="Payment">{PAYMENT[payment].title}</Row> : null}
      </dl>
      <div className="border-t border-ink bg-paper p-4">
        {lines ? (
          <dl className="num space-y-2 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{lines.label}</dt>
              <dd>{formatNaira(lines.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">VAT at 7.5%</dt>
              <dd>{formatNaira(lines.vat)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
              <dt className="font-sans text-sm font-medium">Total</dt>
              <dd className="text-2xl font-medium">{formatNaira(lines.total)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-ink-muted">Choose your dates to see the full price, VAT included.</p>
        )}
      </div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-2.5">
      <dt className="text-ink-muted">{k}</dt>
      <dd className="num text-right text-[13px]">{children}</dd>
    </div>
  );
}
