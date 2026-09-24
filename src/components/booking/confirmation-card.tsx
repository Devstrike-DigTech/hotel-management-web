"use client";

import {
  ArrowSquareOut,
  CalendarPlus,
  Check,
  Copy,
  MapTrifold,
  PencilSimpleLine,
  WhatsappLogo,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useId, useState } from "react";
import { formatLong, formatMonth, formatWeekday, type ISODate } from "@/lib/dates";
import { formatClock, formatNaira, formatPhone, plural } from "@/lib/format";
import { downloadIcs, googleCalendarUrl, mapsUrl, type StayEvent } from "@/lib/ics";

export interface ConfirmationLine {
  label: string;
  amountKobo: number;
  kind?: "charge" | "tax" | "discount" | "note";
}

export interface ConfirmationData {
  code: string;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";
  hotel: {
    name: string;
    area: string;
    city: string;
    address: string;
    phone: string | null;
    checkInTime: string | null;
    checkOutTime: string | null;
    logoUrl?: string | null;
  };
  roomTypeName: string;
  stayType: "NIGHTLY" | "DAY_USE";
  checkIn: ISODate;
  checkOut: ISODate;
  nights: number;
  /** Day use only: "12:00" and a length in hours. */
  startTime?: string | null;
  hours?: number | null;
  guests: number;
  guestName: string;
  lines: ConfirmationLine[];
  totalKobo: number;
  paidKobo: number;
  balanceKobo: number;
  refundedKobo?: number;
  payAtHotel: boolean;
  paidAt?: string | null;
  paymentLabel?: string | null;
  /** Absolute or relative link to manage the booking (carries its token when signed out). */
  manageHref?: string | null;
  /** Server .ics URL; falls back to building one in the browser. */
  icsHref?: string | null;
  cancellationNote?: string | null;
}

/**
 * The booking confirmation, set like a hotel's printed card: letterhead, the code in large
 * mono, arrival and departure as big figures, a ledger with dotted leaders, an inked stamp,
 * and a perforated stub with the things you do next.
 */
export function ConfirmationCard({ data, appName, shareUrl }: { data: ConfirmationData; appName: string | null; shareUrl?: string }) {
  const paidInFull = data.balanceKobo <= 0 && data.paidKobo > 0;
  const cancelled = data.status === "CANCELLED";
  const stampTone = cancelled ? "var(--danger)" : paidInFull ? "var(--palm)" : "var(--brass)";
  const stamp = cancelled
    ? { top: "CANCELLED", bottom: data.code }
    : paidInFull
      ? { top: "CONFIRMED", bottom: "PAID IN FULL" }
      : data.payAtHotel
        ? { top: "CONFIRMED", bottom: "PAY AT HOTEL" }
        : { top: "CONFIRMED", bottom: data.code };

  return (
    <article
      aria-label={`Booking ${data.code} at ${data.hotel.name}`}
      className="confirm-card relative mx-auto w-full max-w-[46rem] overflow-hidden rounded-md border border-line-strong bg-surface shadow-[var(--shadow-card)]"
      data-testid="confirmation-card"
    >
      {/* Letterhead */}
      <header className="relative px-5 pb-6 pt-6 sm:px-10 sm:pt-9">
        <Stamp {...stamp} tone={stampTone} initials={appName ? undefined : initialsOf(data.hotel.name)} className="pointer-events-none absolute right-3 top-4 w-[5.75rem] sm:hidden" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-sm:pr-24">
            <p className="kicker">
              {data.hotel.area}, {data.hotel.city}
            </p>
            <h2 className="display-md mt-2 text-[clamp(1.75rem,4.4vw,2.6rem)]">{data.hotel.name}</h2>
          </div>
          <div className="sm:text-right">
            <p className="kicker">Confirmation</p>
            <p className="num mt-1.5 text-[clamp(1.5rem,4vw,2rem)] font-medium tracking-[0.12em] text-ink" data-testid="booking-code">
              {data.code}
            </p>
          </div>
        </div>
        <span aria-hidden className="adire-rule mt-6 text-line-strong" />
      </header>

      {/* Dates, set large */}
      <section aria-label="Dates" className="px-5 sm:px-10">
        {data.stayType === "DAY_USE" ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            <DateBlock label="Day use" date={data.checkIn} note={`from ${formatClock(data.startTime)}`} />
            <div>
              <p className="kicker">Length</p>
              <p className="display mt-2 text-[3.4rem] leading-none">{data.hours ?? "—"}</p>
              <p className="mt-2 text-sm text-ink-muted">hours</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:gap-6">
            <DateBlock label="Arrive" date={data.checkIn} note={`from ${formatClock(data.hotel.checkInTime)}`} />
            <span aria-hidden className="mt-9 h-px w-6 bg-line-strong sm:mt-11 sm:w-10" />
            <DateBlock label="Depart" date={data.checkOut} note={`by ${formatClock(data.hotel.checkOutTime)}`} />
            <div className="col-span-3 flex items-baseline gap-2 border-t border-line pt-3 sm:col-span-1 sm:block sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              <p className="kicker">Nights</p>
              <p className="num text-2xl sm:mt-2 sm:text-[2.6rem] sm:leading-none">{data.nights}</p>
            </div>
          </div>
        )}
      </section>

      {/* Particulars */}
      <dl className="mx-5 mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line text-sm sm:mx-10 sm:grid-cols-3">
        <Particular k="Room">{data.roomTypeName}</Particular>
        <Particular k="Guests">{plural(data.guests, "guest")}</Particular>
        <Particular k="In the name of" wide>
          {data.guestName}
        </Particular>
      </dl>

      {/* Ledger */}
      <section aria-label="Charges and payments" className="grid gap-8 px-5 pb-8 pt-7 sm:grid-cols-[1fr_8.5rem] sm:items-center sm:px-10">
        <div className="min-w-0">
        <dl className="num space-y-2.5 text-[13px] sm:text-sm">
          {data.lines.map((l, i) => (
            l.kind === "note" ? (
              <div key={i} className="-mt-1 font-sans text-[12px] italic text-ink-muted [font-variant-numeric:normal]">
                <dt className="sr-only">Rate</dt>
                <dd data-testid="card-rate">{l.label}</dd>
              </div>
            ) : (
              <LedgerRow key={i} label={l.label} value={l.kind === "discount" ? `-${formatNaira(Math.abs(l.amountKobo))}` : formatNaira(l.amountKobo)} muted={l.kind === "tax"} tone={l.kind === "discount" ? "text-palm" : ""} testId={l.kind === "discount" ? "card-discount" : undefined} />
            )
          ))}
          <div className="flex items-baseline gap-3 border-t border-ink pt-3">
            <dt className="font-sans text-[0.9375rem] font-medium [font-variant-numeric:normal]">Total</dt>
            <span aria-hidden className="leader" />
            <dd className="text-xl font-medium sm:text-2xl">{formatNaira(data.totalKobo)}</dd>
          </div>
          {data.paidKobo > 0 ? (
            <LedgerRow
              label={data.paymentLabel ?? "Paid online"}
              value={formatNaira(data.paidKobo)}
              tone="text-palm"
              testId="paid-amount"
            />
          ) : null}
          {data.refundedKobo ? <LedgerRow label="Refunded" value={formatNaira(data.refundedKobo)} tone="text-adire" /> : null}
          {!cancelled ? (
            <LedgerRow
              label={data.balanceKobo > 0 ? "To pay at the hotel" : "Balance"}
              value={formatNaira(Math.max(0, data.balanceKobo))}
              tone={data.balanceKobo > 0 ? "text-ink font-medium" : "text-ink-muted"}
              testId="balance-amount"
            />
          ) : null}
        </dl>
        {data.cancellationNote ? <p className="mt-5 max-w-lg text-xs leading-relaxed text-ink-muted">{data.cancellationNote}</p> : null}
        </div>
        <Stamp {...stamp} tone={stampTone} initials={appName ? undefined : initialsOf(data.hotel.name)} className="pointer-events-none hidden w-full sm:block" />
      </section>

      <Perforation />

      <Stub data={data} appName={appName} shareUrl={shareUrl} />
    </article>
  );
}

function DateBlock({ label, date, note }: { label: string; date: ISODate; note: string }) {
  return (
    <div className="min-w-0">
      <p className="kicker">{label}</p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="display text-[clamp(3rem,9vw,4.2rem)] leading-none">{Number(date.slice(8))}</span>
        <span className="text-sm leading-tight text-ink-muted">
          <span className="block font-medium text-ink">{formatWeekday(date)}</span>
          <span className="hidden sm:inline">{formatMonth(date)}</span>
          <span className="sm:hidden">{formatMonth(date).replace(/^(\w{3})\w*/, "$1")}</span>
        </span>
      </p>
      <p className="num mt-2 text-[12.5px] text-ink-muted">{note}</p>
    </div>
  );
}

function Particular({ k, children, wide }: { k: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`min-w-0 bg-surface px-4 py-3 ${wide ? "col-span-2 sm:col-span-1" : ""}`}>
      <dt className="kicker !text-[10px]">{k}</dt>
      <dd className="mt-1 truncate text-[0.9375rem]">{children}</dd>
    </div>
  );
}

function LedgerRow({ label, value, tone = "", muted, testId }: { label: string; value: string; tone?: string; muted?: boolean; testId?: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className={`min-w-0 truncate font-sans [font-variant-numeric:normal] ${muted ? "text-ink-muted" : "text-ink/90"}`}>{label}</dt>
      <span aria-hidden className="leader" />
      <dd className={tone || (muted ? "text-ink-muted" : "")} data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

/**
 * An inked rubber stamp: two lines set on the ring, the key fob in the middle, pressed on at an angle.
 * A white-labelled hotel's stamp carries its own initials in place of the platform's fob.
 */
export function Stamp({ top, bottom, tone, className = "", initials }: { top: string; bottom: string; tone: string; className?: string; initials?: string }) {
  const id = `stamp${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <div className={`stamp ${className}`} style={{ color: tone }} aria-hidden>
      <svg viewBox="0 0 140 140" className="w-full -rotate-[10deg]">
        <defs>
          <filter id={`${id}-ink`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.45" result="m" />
            <feComposite in="SourceGraphic" in2="m" operator="in" />
          </filter>
          {/* Top arc runs left to right over the top; bottom arc left to right under it, so both read upright. */}
          <path id={`${id}-t`} d="M22 70 a48 48 0 0 1 96 0" />
          <path id={`${id}-b`} d="M14 70 a56 56 0 0 0 112 0" />
        </defs>
        <g filter={`url(#${id}-ink)`}>
          <circle cx="70" cy="70" r="67" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <circle cx="70" cy="70" r="62.5" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="70" cy="70" r="33" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <text fill="currentColor" textAnchor="middle" style={{ font: "600 11.5px var(--font-plex-mono), monospace", letterSpacing: "0.2em" }}>
            <textPath href={`#${id}-t`} startOffset="50%">
              {top}
            </textPath>
          </text>
          <text fill="currentColor" textAnchor="middle" dominantBaseline="hanging" style={{ font: "600 10px var(--font-plex-mono), monospace", letterSpacing: "0.18em" }}>
            <textPath href={`#${id}-b`} startOffset="50%">
              {bottom}
            </textPath>
          </text>
          <circle cx="24" cy="70" r="1.8" fill="currentColor" />
          <circle cx="116" cy="70" r="1.8" fill="currentColor" />
          {initials ? (
            <text x="70" y="71" fill="currentColor" textAnchor="middle" dominantBaseline="central" style={{ font: "italic 400 27px var(--font-display), Georgia, serif" }}>
              {initials}
            </text>
          ) : (
            <>
              <path d="M70 47 83 57v26L70 93 57 83V57z" fill="currentColor" />
              <circle cx="70" cy="56" r="3.2" fill="var(--surface)" />
              <path d="M62.5 67h15M62.5 73h15M62.5 79h9" stroke="var(--surface)" strokeWidth="1.3" opacity=".75" />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}

const initialsOf = (name: string) =>
  name
    .replace(/^the\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

function Perforation() {
  return (
    <div aria-hidden className="relative h-6">
      <span className="absolute -left-3 top-0 size-6 rounded-full border border-line-strong bg-paper" />
      <span className="absolute -right-3 top-0 size-6 rounded-full border border-line-strong bg-paper" />
      <span className="absolute inset-x-6 top-1/2 border-t-[1.5px] border-dashed border-line-strong" />
    </div>
  );
}

function Stub({ data, appName, shareUrl }: { data: ConfirmationData; appName: string | null; shareUrl?: string }) {
  const [copied, setCopied] = useState(false);
  const address = data.hotel.address || `${data.hotel.area}, ${data.hotel.city}`;
  const directions = mapsUrl(data.hotel.name, address);
  const event: StayEvent = {
    uid: `${data.code}@${(appName ?? data.hotel.name).toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
    title: `${data.hotel.name}: ${data.roomTypeName}`,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    checkInTime: data.stayType === "DAY_USE" ? data.startTime : data.hotel.checkInTime,
    checkOutTime: data.hotel.checkOutTime,
    location: `${data.hotel.name}, ${address}`,
    description: `Confirmation ${data.code}. ${data.hotel.phone ? `Front desk ${formatPhone(data.hotel.phone)}.` : ""}`,
    url: shareUrl,
  };
  const when =
    data.stayType === "DAY_USE"
      ? `${formatLong(data.checkIn)} from ${formatClock(data.startTime)}`
      : `${formatLong(data.checkIn)} to ${formatLong(data.checkOut)}`;
  const share = [`My stay at ${data.hotel.name}, ${data.hotel.area}`, when, `Confirmation ${data.code}`, `Directions: ${directions}`].join("\n");

  const action = "flex h-full min-h-14 w-full items-center gap-3 bg-surface px-4 py-3 text-left text-[0.9375rem] transition-colors hover:bg-surface-2 sm:flex-col sm:items-start sm:gap-2 sm:px-5 sm:py-4";

  return (
    <footer>
      <div className="grid grid-cols-2 gap-px border-y border-line bg-line sm:grid-cols-4">
        <a href={directions} target="_blank" rel="noopener noreferrer" className={action}>
          <MapTrifold size={22} weight="light" className="shrink-0 text-laterite" aria-hidden />
          <span>
            Directions <ArrowSquareOut size={12} className="inline align-baseline opacity-60" aria-hidden />
          </span>
        </a>
        <CalendarAction event={event} icsHref={data.icsHref} className={action} code={data.code} />
        <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer" className={action}>
          <WhatsappLogo size={22} weight="light" className="shrink-0 text-laterite" aria-hidden />
          <span>Share on WhatsApp</span>
        </a>
        {data.manageHref ? (
          <Link href={data.manageHref} className={action} data-testid="manage-link">
            <PencilSimpleLine size={22} weight="light" className="shrink-0 text-laterite" aria-hidden />
            <span>Manage booking</span>
          </Link>
        ) : (
          <button
            type="button"
            className={action}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(data.code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {}
            }}
          >
            {copied ? <Check size={22} className="shrink-0 text-palm" aria-hidden /> : <Copy size={22} weight="light" className="shrink-0 text-laterite" aria-hidden />}
            <span aria-live="polite">{copied ? "Copied" : "Copy code"}</span>
          </button>
        )}
      </div>
      <p className="bg-surface px-5 py-4 text-xs leading-relaxed text-ink-muted sm:px-10">
        Show this code at the front desk{data.hotel.phone ? (
          <>
            {" "}
            or call <a className="num link-static text-ink" href={`tel:${data.hotel.phone.replace(/\s/g, "")}`}>{formatPhone(data.hotel.phone)}</a>
          </>
        ) : null}
        .{appName ? ` Booked through ${appName}.` : ""}
      </p>
    </footer>
  );
}

function CalendarAction({ event, icsHref, className, code }: { event: StayEvent; icsHref?: string | null; className: string; code: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" className={className} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <CalendarPlus size={22} weight="light" className="shrink-0 text-laterite" aria-hidden />
        <span>Add to calendar</span>
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded-sm border border-line-strong bg-surface text-sm shadow-[var(--shadow-float)]">
          {icsHref ? (
            <a href={icsHref} className="block px-4 py-3 hover:bg-surface-2" onClick={() => setOpen(false)}>
              Apple or Outlook (.ics)
            </a>
          ) : (
            <button
              type="button"
              className="block w-full px-4 py-3 text-left hover:bg-surface-2"
              onClick={() => {
                downloadIcs(event, `${code}.ics`);
                setOpen(false);
              }}
            >
              Apple or Outlook (.ics)
            </button>
          )}
          <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="block border-t border-line px-4 py-3 hover:bg-surface-2" onClick={() => setOpen(false)}>
            Google Calendar
          </a>
        </div>
      ) : null}
    </div>
  );
}
