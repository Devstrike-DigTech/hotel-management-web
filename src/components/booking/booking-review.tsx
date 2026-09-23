"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bank,
  CaretDown,
  CreditCard,
  DeviceMobile,
  LockSimple,
  PencilSimple,
  ShieldCheck,
  Storefront,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BookingCreated, BookingView, PaymentInit, PaymentMode, PaymentStatusView, Quote } from "@/lib/booking-types";
import { call, ClientApiError, getClockSkew, humanError, newKey } from "@/lib/client-api";
import { APP_NAME, SITE_URL } from "@/lib/env";
import { formatNaira, formatPhone, toE164Digits } from "@/lib/format";
import { formatLagosClock, formatLagosDateTime, policyTail } from "@/lib/time";
import { Notice } from "../ui/field";
import { StepTitle, composeRequests, type BookingHotel, type BookingSite, type GuestForm } from "./booking-flow";
import { HoldCountdown, useRemaining } from "./hold-countdown";

export interface Held {
  code: string;
  manageToken: string;
  reference: string;
  authorizationUrl: string;
  amountKobo: number;
  holdExpiresAt: string;
  provider: "paystack" | "mock";
  /** True when this hold was restored from the device (the guest came back from Paystack). */
  restored?: boolean;
}

type QuoteRequest = Record<string, unknown> & { hotelSlug: string; roomTypeId: string };

/** Where Paystack sends the guest back: this site's confirmation page, or the path fallback for local subdomains. */
function callbackUrl(site: BookingSite, slug: string) {
  const { origin, hostname } = window.location;
  if (hostname.endsWith(".localhost")) return `${SITE_URL}/h/${slug}/booking/confirmation`;
  return `${origin}${site.confirmPath}`;
}

export function BookingReview({
  hotel,
  site,
  request,
  guest,
  held,
  setHeld,
  onQuote,
  onBack,
  onDone,
}: {
  hotel: BookingHotel;
  site: BookingSite;
  request: QuoteRequest;
  guest: GuestForm;
  held: Held | null;
  setHeld: (h: Held | null) => void;
  onQuote: (q: Quote | null) => void;
  onBack: (step: number, message?: string) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [mode, setMode] = useState<PaymentMode | null>(null);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [busy, setBusy] = useState<null | "quote" | "book" | "pay" | "release">(null);
  const [error, setError] = useState<string | null>(null);
  const [priceNote, setPriceNote] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const bookKey = useRef<string | null>(null);
  const requestKey = JSON.stringify(request);

  const fetchQuote = useCallback(
    async (prev?: Quote | null) => {
      setBusy("quote");
      setQuoteError(null);
      try {
        const q = await call<Quote>("public/quotes", { method: "POST", body: JSON.parse(requestKey), retries: 2 });
        setQuote(q);
        onQuote(q);
        bookKey.current = null;
        setMode((m) => {
          const ok = (x: PaymentMode | null) => !!x && q.paymentOptions.some((o) => o.mode === x && o.available);
          if (ok(m)) return m;
          return q.paymentOptions.find((o) => o.mode === "ONLINE" && o.available) ? "ONLINE" : (q.paymentOptions.find((o) => o.available)?.mode ?? null);
        });
        if (prev && prev.breakdown.totalKobo !== q.breakdown.totalKobo)
          setPriceNote(`The hotel's price changed while you were away: it is now ${formatNaira(q.breakdown.totalKobo)}, not ${formatNaira(prev.breakdown.totalKobo)}.`);
        return q;
      } catch (e) {
        if (e instanceof ClientApiError && e.code === "ROOM_UNAVAILABLE") onBack(0, "That room type has just been taken for your dates. Here is what is still free.");
        else if (e instanceof ClientApiError && e.code === "CAPACITY_EXCEEDED") onBack(0, "That room is too small for your group. Choose a larger room or fewer guests.");
        else setQuoteError(humanError(e, "We could not price your stay just now."));
        return null;
      } finally {
        setBusy(null);
      }
    },
    [requestKey, onQuote, onBack],
  );

  useEffect(() => {
    if (held) return;
    const t = setTimeout(() => fetchQuote(), 0);
    return () => clearTimeout(t);
    // Only when the stay itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const quoteLeft = useRemaining(quote?.expiresAt, getClockSkew());
  const quoteStale = quoteLeft !== null && quoteLeft <= 0;

  async function book() {
    if (!quote || !mode) return;
    if (!consent) {
      setConsentError(true);
      return;
    }
    setError(null);
    setPriceNote(null);
    let q = quote;
    if (quoteStale) {
      const fresh = await fetchQuote(quote);
      if (!fresh) return;
      if (fresh.breakdown.totalKobo !== quote.breakdown.totalKobo) return; // let the guest see the new price first
      q = fresh;
    }
    setBusy("book");
    bookKey.current ??= newKey();
    try {
      const res = await call<BookingCreated>("public/bookings", {
        method: "POST",
        idempotencyKey: bookKey.current,
        timeoutMs: 30_000,
        body: {
          quoteToken: q.quoteToken,
          paymentMode: mode,
          guest: { fullName: guest.fullName.trim(), phone: `+${toE164Digits(guest.phone)}`, email: guest.email.trim() || undefined },
          specialRequests: composeRequests(guest) || undefined,
          consent: true,
          callbackUrl: mode === "ONLINE" ? callbackUrl(site, hotel.slug) : undefined,
        },
      });
      if (!res.payment) {
        onDone();
        router.push(`${site.confirmPath}?code=${encodeURIComponent(res.booking.code)}&t=${encodeURIComponent(res.manageToken)}&new=1`);
        return;
      }
      setHeld(toHeld(res.booking, res.manageToken, res.payment));
      setBusy(null);
    } catch (e) {
      setBusy(null);
      if (!(e instanceof ClientApiError)) return setError(humanError(e));
      switch (e.code) {
        case "QUOTE_EXPIRED":
        case "QUOTE_INVALID": {
          const fresh = await fetchQuote(q);
          if (fresh && fresh.breakdown.totalKobo === q.breakdown.totalKobo) setError("We refreshed the price (it had timed out). It has not changed; tap the button again.");
          return;
        }
        case "ROOM_UNAVAILABLE":
          return onBack(0, "Someone booked the last one of that room a moment ago. Here is what is still free for your dates.");
        case "ONLINE_PAYMENT_UNAVAILABLE":
        case "PAY_AT_HOTEL_UNAVAILABLE":
        case "ONLINE_BOOKING_DISABLED":
          await fetchQuote(q);
          return setError(e.message || "That way of paying is not available for this hotel right now.");
        case "PAYMENT_PROVIDER_ERROR":
          return setError("Paystack is not answering right now, so the room was not held. Try again in a minute, or choose to pay at the hotel.");
        case "VALIDATION_ERROR": {
          const f = e.fields;
          if (f["guest.phone"] || f["guest.fullName"] || f["guest.email"] || f.guest) return onBack(1, "Please check your details: " + Object.values(f).flat().join(" "));
          return setError(Object.values(f).flat().join(" ") || e.message);
        }
        default:
          return setError(humanError(e));
      }
    }
  }

  async function pay() {
    if (!held) return;
    setError(null);
    setBusy("pay");
    try {
      let url = held.authorizationUrl;
      if (held.restored) {
        // Back from Paystack: find out what happened before sending the guest there again.
        const v = await call<PaymentStatusView>(`public/payments/${encodeURIComponent(held.reference)}/verify`, { timeoutMs: 20_000 });
        if (v.state === "SUCCESS") {
          onDone();
          router.push(`${site.confirmPath}?reference=${encodeURIComponent(held.reference)}`);
          return;
        }
        if (v.state === "EXPIRED") {
          setExpired(true);
          setBusy(null);
          return;
        }
        if (v.state === "FAILED") {
          const p = await call<PaymentInit>(`public/payments/${encodeURIComponent(held.reference)}/retry`, { method: "POST", idempotencyKey: newKey() });
          setHeld({ ...held, reference: p.reference, authorizationUrl: p.authorizationUrl, holdExpiresAt: p.holdExpiresAt, restored: false });
          url = p.authorizationUrl;
        }
      }
      window.location.assign(url);
    } catch (e) {
      setBusy(null);
      if (e instanceof ClientApiError && e.code === "HOLD_EXPIRED") return setExpired(true);
      if (e instanceof ClientApiError && e.code === "PAYMENT_ALREADY_COMPLETED") {
        onDone();
        router.push(`${site.confirmPath}?reference=${encodeURIComponent(held.reference)}`);
        return;
      }
      setError(humanError(e));
    }
  }

  async function release() {
    if (!held) return;
    setBusy("release");
    try {
      await call(`public/trips/${encodeURIComponent(held.code)}/cancel`, {
        method: "POST",
        query: { t: held.manageToken },
        body: { reason: "Released before payment" },
      });
    } catch {
      /* the hold lapses by itself anyway */
    }
    setBusy(null);
    setHeld(null);
    setExpired(false);
    onDone();
    fetchQuote();
  }

  const option = (m: PaymentMode) => quote?.paymentOptions.find((o) => o.mode === m);

  return (
    <div>
      <StepTitle n={2}>
        {held ? (
          <>
            Your room is <em className="accent">held.</em>
          </>
        ) : (
          <>
            Check it over, <em className="accent">then pay.</em>
          </>
        )}
      </StepTitle>

      {held ? (
        <section aria-labelledby="pay-title" className="mb-10 space-y-5" data-testid="held-panel">
          <h3 id="pay-title" className="sr-only">
            Pay
          </h3>
          <HoldCountdown expiresAt={held.holdExpiresAt} skewMs={getClockSkew()} onExpire={() => setExpired(true)} totalMs={(quote?.holdMinutes ?? 20) * 60_000} />
          {expired ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" className="btn btn-primary" onClick={release}>
                Check the room again
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-line-strong bg-surface p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="text-sm text-ink-muted">Due now</p>
                  <p className="num text-3xl font-medium" data-testid="due-now">
                    {formatNaira(held.amountKobo)}
                  </p>
                </div>
                <button type="button" onClick={pay} disabled={busy === "pay"} className="btn btn-primary group mt-5 w-full !min-h-13 text-base" data-testid="pay-now">
                  <LockSimple size={17} aria-hidden />
                  {busy === "pay" ? "Opening Paystack" : `Pay ${formatNaira(held.amountKobo)} securely`}
                  <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
                </button>
                <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-muted" aria-label="Ways to pay">
                  <li className="inline-flex items-center gap-1.5">
                    <CreditCard size={15} aria-hidden /> Card
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <Bank size={15} aria-hidden /> Bank transfer
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <DeviceMobile size={15} aria-hidden /> USSD
                  </li>
                  <li className="text-line-strong" aria-hidden>
                    /
                  </li>
                  <li>by Paystack</li>
                </ul>
              </div>
              {held.provider === "mock" ? (
                <p className="text-xs text-ink-muted">Test mode: payments go to a practice checkout and no money moves.</p>
              ) : null}
              <p className="text-sm text-ink-muted">
                Changed your mind?{" "}
                <button type="button" onClick={release} disabled={busy === "release"} className="link-static text-ink">
                  Release the room
                </button>{" "}
                and nothing is charged. Your code is <span className="num text-ink">{held.code}</span>.
              </p>
            </>
          )}
          {error ? <Notice tone="warn" title={error} /> : null}
        </section>
      ) : null}

      {/* Who */}
      <dl className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-[1fr_1fr_1.3fr_auto]">
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
        {!held ? (
          <button type="button" onClick={() => onBack(1)} className="flex items-center justify-center gap-1.5 bg-paper px-4 py-3 text-sm text-ink-muted hover:text-ink">
            <PencilSimple size={14} aria-hidden /> Edit
          </button>
        ) : (
          <span className="bg-paper" />
        )}
      </dl>

      {priceNote ? (
        <div className="mt-6">
          <Notice tone="warn" title="The price has changed">
            {priceNote}
          </Notice>
        </div>
      ) : null}

      {/* The price */}
      <section aria-labelledby="price-title" className="mt-10">
        <h3 id="price-title" className="kicker mb-4">
          The price, from the hotel
        </h3>
        {quote ? (
          <PriceLedger quote={quote} />
        ) : quoteError ? (
          <Notice
            tone="warn"
            title="We could not price your stay"
            action={
              <button type="button" className="btn btn-outline !min-h-9 text-sm" onClick={() => fetchQuote()}>
                Try again
              </button>
            }
          >
            {quoteError}
          </Notice>
        ) : (
          <div className="space-y-3 rounded-sm border border-line p-5" aria-label="Pricing your stay">
            <div className="skeleton h-4 w-2/3 rounded-xs" />
            <div className="skeleton h-4 w-1/2 rounded-xs" />
            <div className="skeleton h-7 w-1/3 rounded-xs" />
          </div>
        )}
        {quote ? (
          <p className="mt-4 flex items-start gap-2.5 text-sm leading-relaxed">
            <ShieldCheck size={18} weight="fill" className="mt-0.5 shrink-0 text-palm" aria-hidden />
            <span>
              {quote.freeCancellationUntil ? (
                <>
                  Free cancellation until <span className="num font-medium">{formatLagosDateTime(quote.freeCancellationUntil)}</span>.{" "}
                  <span className="text-ink-muted">{policyTail(quote.cancellationPolicy.summary)}</span>
                </>
              ) : (
                <span className="text-ink-muted">{quote.cancellationPolicy.summary} Your stay is inside that window, so the fee would apply.</span>
              )}
            </span>
          </p>
        ) : null}
      </section>

      {!held ? (
        <>
          <fieldset className="mt-10" disabled={!quote}>
            <legend className="kicker mb-4">How would you like to pay?</legend>
            <div className="grid gap-3">
              {(
                [
                  ["ONLINE", "Pay now, securely", "Card, bank transfer or USSD through Paystack. Your room is confirmed the moment it goes through.", CreditCard],
                  ["PAY_AT_HOTEL", "Pay at the hotel", "Nothing to pay today. Settle at the front desk on arrival by card, transfer or cash.", Storefront],
                ] as const
              ).map(([m, title, body, Icon]) => {
                const o = option(m);
                const available = !!o?.available;
                const on = mode === m;
                return (
                  <label
                    key={m}
                    className={`flex items-start gap-4 rounded-sm border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-laterite ${
                      !available ? "cursor-not-allowed border-line opacity-60" : on ? "cursor-pointer border-laterite bg-laterite/[0.05]" : "cursor-pointer border-line-strong hover:border-ink-muted"
                    }`}
                    data-testid={`pay-${m}`}
                  >
                    <input type="radio" name="payment" className="sr-only" checked={on} disabled={!available} onChange={() => setMode(m)} />
                    <span aria-hidden className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${on ? "border-laterite" : "border-line-strong"}`}>
                      <span className={`size-2.5 rounded-full bg-laterite transition-transform ${on ? "scale-100" : "scale-0"}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                        <span className="font-medium">{title}</span>
                        {o && available ? (
                          <span className="num text-sm">
                            {m === "ONLINE" ? `${formatNaira(o.dueNowKobo)} now` : `${formatNaira(o.dueAtHotelKobo)} at check-in`}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{!available && o?.reason ? o.reason : body}</span>
                    </span>
                    <Icon size={26} weight="light" className={`hidden sm:block ${on ? "text-laterite" : "text-ink-muted"}`} aria-hidden />
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className={`mt-8 flex cursor-pointer items-start gap-3 text-sm leading-relaxed ${consentError && !consent ? "text-danger" : "text-ink-muted"}`}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                setConsentError(false);
              }}
              className="mt-0.5 size-[18px] shrink-0 accent-[var(--laterite)]"
              data-testid="consent"
            />
            <span>
              I agree that {hotel.name} and {APP_NAME} may use my details to arrange this stay and contact me about it, as the Nigeria Data Protection Act 2023
              allows.{consentError && !consent ? " Please tick this to continue." : ""}
            </span>
          </label>

          {error ? (
            <div className="mt-6">
              <Notice tone="warn" title={error} />
            </div>
          ) : null}

          <div className="mt-10 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" className="btn btn-outline" onClick={() => onBack(1)}>
              <ArrowLeft size={16} aria-hidden /> Back
            </button>
            <button type="button" className="btn btn-primary group" onClick={book} disabled={!quote || !mode || !!busy} data-testid="book-submit">
              {busy === "book" || busy === "quote"
                ? mode === "ONLINE"
                  ? "Holding your room"
                  : "Confirming"
                : mode === "PAY_AT_HOTEL"
                  ? "Confirm booking"
                  : `Hold the room and pay ${quote ? formatNaira(quote.breakdown.totalKobo) : ""}`}
              <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
          {quote && !quoteStale ? (
            <p className="mt-3 text-right text-xs text-ink-muted">
              {mode === "ONLINE" ? `We keep the room for you for ${quote.holdMinutes} minutes while you pay. ` : ""}This price is held until{" "}
              <span className="num">{formatLagosClock(quote.expiresAt)}</span>.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function PriceLedger({ quote }: { quote: Quote }) {
  const b = quote.breakdown;
  const [open, setOpen] = useState(false);
  const unit = b.unit === "HOUR" ? "hour" : "night";
  const inclusive = b.taxes.some((t) => t.inclusive);
  return (
    <div className="rounded-sm border border-line-strong bg-surface" data-testid="quote">
      <dl className="num space-y-2.5 p-5 text-[13px] sm:text-sm">
        <div className="flex items-baseline gap-3">
          <dt className="font-sans [font-variant-numeric:normal]">
            {quote.roomType.name}, {b.units} {b.units === 1 ? unit : `${unit}s`} at {formatNaira(b.rateKobo)}
          </dt>
          <span aria-hidden className="leader" />
          <dd>{formatNaira(b.lines.reduce((n, l) => n + l.amountKobo, 0))}</dd>
        </div>
        {b.lines.length > 1 ? (
          <div>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1 font-sans text-xs text-ink-muted hover:text-ink">
              <CaretDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden /> {open ? "Hide" : "Show"} each night
            </button>
            {open ? (
              <ul className="mt-2 space-y-1.5 border-l border-line pl-3 text-[12.5px] text-ink-muted">
                {b.lines.map((l) => (
                  <li key={l.date} className="flex justify-between gap-3">
                    <span className="font-sans [font-variant-numeric:normal]">{l.description}</span>
                    <span>{formatNaira(l.amountKobo)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {b.taxes.map((t) => (
          <div key={t.code} className="flex items-baseline gap-3 text-ink-muted">
            <dt className="font-sans [font-variant-numeric:normal]">
              {t.label} {(t.rateBps / 100).toString()}%{t.inclusive ? ", included" : ""}
            </dt>
            <span aria-hidden className="leader" />
            <dd>{formatNaira(t.amountKobo)}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-baseline gap-3 border-t border-ink px-5 py-4">
        <span className="font-sans text-[0.9375rem] font-medium">Total</span>
        <span aria-hidden className="leader" />
        <span className="num text-2xl font-medium" data-testid="quote-total">
          {formatNaira(b.totalKobo)}
        </span>
      </div>
      {inclusive ? <p className="border-t border-line px-5 py-2.5 text-xs text-ink-muted">Some taxes are already inside the room rate, as the hotel sets it.</p> : null}
    </div>
  );
}

export function toHeld(booking: BookingView, manageToken: string, p: PaymentInit): Held {
  return {
    code: booking.code,
    manageToken,
    reference: p.reference,
    authorizationUrl: p.authorizationUrl,
    amountKobo: p.amountKobo,
    holdExpiresAt: p.holdExpiresAt,
    provider: p.provider,
  };
}
