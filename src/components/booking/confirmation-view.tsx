"use client";

import { ArrowRight, BellRinging, ChatCircleText, EnvelopeSimple, PencilSimpleLine } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSiteLinks } from "../site/site-links";
import type { BookingView, PaymentInit, PaymentStatusView } from "@/lib/booking-types";
import { call, ClientApiError, getClockSkew, humanError, newKey } from "@/lib/client-api";
import { formatFullDay } from "@/lib/dates";
import { formatNaira } from "@/lib/format";
import { formatPoints } from "@/lib/loyalty";
import { WhatsAppChat } from "../chat/whatsapp-chat";
import { useHotelChat } from "../chat/use-hotel-chat";
import { PointsToEarn } from "../loyalty/redeem-points";
import { formatLagosDateTime, formatLagosShort, policyTail } from "@/lib/time";
import { useOnline } from "@/lib/use-online";
import { Notice } from "../ui/field";
import { ConfirmationCard, type ConfirmationData } from "./confirmation-card";
import { HoldCountdown, useRemaining } from "./hold-countdown";
import { PaymentState, type PaymentPhase } from "./payment-state";

const CHANNEL: Record<string, string> = { card: "card", bank_transfer: "bank transfer", ussd: "USSD", bank: "bank account" };

/** BookingView (API) to the printed card's view model. */
export function toConfirmation(b: BookingView, manageHref: string | null): ConfirmationData {
  const unit = b.breakdown.unit === "HOUR" ? "hour" : "night";
  const room = b.breakdown.lines.reduce((n, l) => n + l.amountKobo, 0);
  // M5: the part of the discount paid with loyalty points gets its own line.
  const pointsKobo = Math.min(b.breakdown.discountKobo, b.breakdown.loyaltyDiscountKobo ?? b.loyalty?.redeemValueKobo ?? 0);
  const otherDiscount = b.breakdown.discountKobo - pointsKobo;
  const paidLabel = b.payment?.paidAt
    ? `Paid by ${CHANNEL[b.payment.channel ?? ""] ?? "Paystack"}, ${formatLagosShort(b.payment.paidAt).replace(/,.*$/, "")}`
    : "Paid online";
  return {
    code: b.code,
    status: b.status,
    hotel: {
      name: b.hotel.name,
      area: b.hotel.area,
      city: b.hotel.city,
      address: b.hotel.address,
      phone: b.hotel.phone,
      checkInTime: b.hotel.checkInTime,
      checkOutTime: b.hotel.checkOutTime,
      logoUrl: b.hotel.branding?.logoUrl,
    },
    roomTypeName: b.roomType.name,
    stayType: b.stayType,
    checkIn: b.arrivalDate,
    checkOut: b.departureDate,
    nights: b.nights ?? 0,
    startTime: b.stayType === "DAY_USE" ? formatLagosClockRaw(b.arrivalAt) : null,
    hours: b.hours,
    guests: b.adults + b.children,
    guestName: b.guest.fullName,
    lines: [
      {
        label: `${b.roomType.name}, ${b.breakdown.units} ${b.breakdown.units === 1 ? unit : `${unit}s`}${b.breakdown.lines.length > 1 && new Set(b.breakdown.lines.map((l) => l.amountKobo)).size === 1 ? ` at ${formatNaira(b.breakdown.rateKobo)}` : ""}`,
        amountKobo: room,
      },
      ...(b.ratePlan && !/^(bar|best available( rate)?|flexible)$/i.test(b.ratePlan.name)
        ? [{ label: `${b.ratePlan.name} rate${b.ratePlan.includesBreakfast ? ", breakfast included" : ""}`, amountKobo: 0, kind: "note" as const }]
        : []),
      ...(otherDiscount > 0
        ? [{ label: b.promo?.code || b.breakdown.promo?.code ? `Promo ${b.promo?.code ?? b.breakdown.promo?.code}` : "Discount", amountKobo: -otherDiscount, kind: "discount" as const }]
        : []),
      ...(pointsKobo > 0
        ? [{ label: `${b.loyalty?.programme ?? "Loyalty"}, ${formatPoints(b.loyalty?.pointsRedeemed ?? 0)} points`, amountKobo: -pointsKobo, kind: "discount" as const }]
        : []),
      ...b.breakdown.taxes.map((t) => ({ label: `${t.label} ${t.rateBps / 100}%${t.inclusive ? ", included" : ""}`, amountKobo: t.amountKobo, kind: "tax" as const })),
    ],
    totalKobo: b.totalKobo,
    paidKobo: b.paidKobo,
    balanceKobo: b.outstandingKobo,
    refundedKobo: b.refundedKobo || undefined,
    payAtHotel: b.paymentMode === "PAY_AT_HOTEL",
    paidAt: b.payment?.paidAt ?? null,
    paymentLabel: paidLabel,
    manageHref,
    icsHref: b.calendarUrl,
    cancellationNote: b.status === "CANCELLED"
      ? null
      : b.cancellationPolicy.nonRefundable || b.ratePlan?.refundable === false
        ? "Non-refundable: the full amount is kept if the booking is cancelled or the guest does not arrive."
        : b.freeCancellationUntil ? `Free cancellation until ${formatLagosDateTime(b.freeCancellationUntil)}. ${policyTail(b.cancellationPolicy.summary)}` : b.cancellationPolicy.summary,
  };
}

/** "14:00" from an ISO instant, in Lagos (UTC+1). */
function formatLagosClockRaw(iso: string) {
  const d = new Date(new Date(iso).getTime() + 3600_000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Relative manage link on this site when the API's link points at the same app. */
function localManage(url: string) {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

type View =
  | { kind: "loading" }
  | { kind: "payment"; phase: PaymentPhase; status: PaymentStatusView | null }
  | { kind: "booking"; booking: BookingView; manageToken: string; manageUrl: string }
  | { kind: "error"; message: string; notFound?: boolean };

/**
 * The page Paystack returns to, and where pay-at-hotel bookings land. With `?reference=` it polls
 * the verify endpoint (every 2.5 s for a minute, then more slowly, pausing while offline); with
 * `?code=&t=` it shows the booking. Either way it ends on the printed confirmation card.
 */
export function ConfirmationView({
  appName,
  hotelHref,
  marketplace = "",
}: {
  appName: string | null;
  hotelHref?: string;
  /** Origin of the marketplace for trips links; "" when this page is itself on the marketplace. */
  marketplace?: string;
}) {
  const params = useSearchParams();
  const site = useSiteLinks();
  const router = useRouter();
  const online = useOnline();
  const reference = params.get("reference") ?? params.get("trxref");
  const code = params.get("code");
  const token = params.get("t");
  const [view, setView] = useState<View>({ kind: "loading" });
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const started = useRef(0);
  const onlineRef = useRef(online);
  useEffect(() => {
    onlineRef.current = online;
  }, [online]);

  const showBooking = useCallback(
    (booking: BookingView, manageToken: string, manageUrl: string) => {
      setView({ kind: "booking", booking, manageToken, manageUrl });
      // A durable address: reloading or sharing this page no longer depends on the payment reference.
      const q = new URLSearchParams({ code: booking.code, t: manageToken });
      router.replace(`?${q}`, { scroll: false });
    },
    [router],
  );

  // Payment return: poll until the payment settles.
  useEffect(() => {
    if (!reference) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    if (!started.current) started.current = Date.now();
    const tick = async () => {
      if (stop) return;
      const elapsed = Date.now() - started.current;
      if (!onlineRef.current) {
        setView((v) => ({ kind: "payment", phase: "offline", status: v.kind === "payment" ? v.status : null }));
        timer = setTimeout(tick, 2000);
        return;
      }
      try {
        const s = await call<PaymentStatusView>(`public/payments/${encodeURIComponent(reference)}/verify`, { timeoutMs: 20_000, retries: 1 });
        if (stop) return;
        if (s.state === "SUCCESS") {
          setView({ kind: "payment", phase: "success", status: s });
          timer = setTimeout(() => !stop && showBooking(s.booking, s.manageToken, s.manageUrl), 900);
          return;
        }
        if (s.state === "FAILED") return setView({ kind: "payment", phase: "failed", status: s });
        if (s.state === "EXPIRED") return setView({ kind: "payment", phase: "expired", status: s });
        if (s.state === "ORPHANED" || s.state === "REFUNDED") return setView({ kind: "payment", phase: "refunding", status: s });
        setView({ kind: "payment", phase: elapsed > 15_000 ? "slow" : "verifying", status: s });
      } catch (e) {
        if (stop) return;
        if (e instanceof ClientApiError && e.status === 404) {
          setView({ kind: "error", message: "We could not find a payment with that reference.", notFound: true });
          return;
        }
        setView((v) => ({ kind: "payment", phase: elapsed > 15_000 ? "slow" : "verifying", status: v.kind === "payment" ? v.status : null }));
      }
      timer = setTimeout(tick, elapsed < 60_000 ? 2500 : 8000);
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [reference, showBooking]);

  // Direct link (pay at hotel, or a reload after payment).
  useEffect(() => {
    if (reference || !code || !token) return;
    const ctl = new AbortController();
    call<BookingView>(`public/trips/${encodeURIComponent(code)}`, { query: { t: token }, signal: ctl.signal })
      .then((b) => setView({ kind: "booking", booking: b, manageToken: token, manageUrl: `/trips/${encodeURIComponent(b.code)}?t=${encodeURIComponent(token)}` }))
      .catch((e) => {
        if (ctl.signal.aborted) return;
        if (e instanceof ClientApiError && (e.status === 404 || e.status === 410))
          setView({ kind: "error", message: e.status === 410 ? "This booking link has expired." : "We could not find that booking.", notFound: true });
        else setView({ kind: "error", message: humanError(e) });
      });
    return () => ctl.abort();
  }, [reference, code, token]);

  const holdLeft = useRemaining(view.kind === "payment" ? view.status?.booking.hold?.expiresAt : null, getClockSkew());
  const chat = useHotelChat(view.kind === "booking" ? view.booking.hotel.slug : null);

  async function retryPayment(s: PaymentStatusView) {
    setRetrying(true);
    setRetryError(null);
    try {
      const p = await call<PaymentInit>(`public/payments/${encodeURIComponent(s.reference)}/retry`, { method: "POST", idempotencyKey: newKey() });
      window.location.assign(p.authorizationUrl);
    } catch (e) {
      setRetrying(false);
      if (e instanceof ClientApiError && e.code === "HOLD_EXPIRED") setView({ kind: "payment", phase: "expired", status: s });
      else if (e instanceof ClientApiError && e.code === "PAYMENT_ALREADY_COMPLETED") showBooking(s.booking, s.manageToken, s.manageUrl);
      else setRetryError(humanError(e));
    }
  }

  if (!reference && !(code && token)) {
    return (
      <PaymentState phase="expired" reference={null}>
        <p className="text-ink-muted">This page needs a payment reference or a booking link. Check the message we sent you.</p>
      </PaymentState>
    );
  }

  if (view.kind === "loading") {
    return reference ? <PaymentState phase="verifying" reference={reference} /> : <CardSkeleton />;
  }

  if (view.kind === "error") {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="kicker">Booking</p>
        <h1 className="display-md mt-3 text-4xl">{view.message}</h1>
        <p className="mt-4 text-ink-muted">If you paid, your money is safe: the confirmation is also on its way by SMS and email.</p>
        {site.whiteLabel ? (
          <Link href={site.home} className="btn btn-outline mt-8">
            Back to the hotel
          </Link>
        ) : (
          <Link href={`${marketplace}/trips`} className="btn btn-outline mt-8">
            Go to your trips
          </Link>
        )}
      </div>
    );
  }

  if (view.kind === "payment") {
    const s = view.status;
    const b = s?.booking;
    const holdAlive = !!b?.hold && holdLeft !== null && holdLeft > 0;
    return (
      <PaymentState phase={view.phase} reference={reference}>
        {view.phase === "failed" && s ? (
          <div className="mx-auto max-w-md space-y-4 text-left">
            {holdAlive ? <HoldCountdown expiresAt={b!.hold!.expiresAt} skewMs={getClockSkew()} onExpire={() => setView({ kind: "payment", phase: "expired", status: s })} /> : null}
            {holdAlive ? (
              <button type="button" className="btn btn-primary w-full" disabled={retrying} onClick={() => retryPayment(s)} data-testid="retry-payment">
                {retrying ? "Opening Paystack" : `Try paying ${formatNaira(s.amountKobo)} again`}
              </button>
            ) : null}
            {retryError ? <Notice tone="warn" title={retryError} /> : null}
            <p className="text-center text-sm text-ink-muted">
              A different card, or a bank transfer, often works when a card is declined.
            </p>
          </div>
        ) : null}
        {view.phase === "expired" || view.phase === "refunding" ? (
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {b ? (
              <Link href={`${hotelHref ?? `/stays/${b.hotel.slug}`}?checkIn=${b.arrivalDate}&checkOut=${b.departureDate}`} className="btn btn-primary">
                Check {b.hotel.name} again
              </Link>
            ) : hotelHref ? (
              <Link href={hotelHref} className="btn btn-primary">
                Back to the hotel
              </Link>
            ) : null}
            {s?.refund ? (
              <p className="num text-sm text-ink-muted">
                Refund of {formatNaira(s.refund.amountKobo)}: {s.refund.status === "PROCESSED" ? "sent" : "on its way"}
              </p>
            ) : null}
          </div>
        ) : null}
        {view.phase === "slow" || view.phase === "offline" ? (
          <p className="text-sm text-ink-muted">
            You can close this page; the confirmation also arrives by SMS and email. {s?.message ? <span className="block">{s.message}</span> : null}
          </p>
        ) : null}
      </PaymentState>
    );
  }

  const b = view.booking;
  // A white-labelled hotel keeps the guest on its own domain; otherwise trips live on the marketplace.
  const manage = site.whiteLabel
    ? `${site.base}${localManage(view.manageUrl)}`
    : marketplace
      ? `${marketplace}${localManage(view.manageUrl)}`
      : localManage(view.manageUrl);
  const data = toConfirmation(b, manage);
  const first = b.guest.fullName.trim().split(/\s+/)[0];
  const awaiting = b.displayStatus === "AWAITING_PAYMENT";
  const cancelled = b.status === "CANCELLED";

  return (
    <div className="py-8 sm:py-12">
      <header className="mx-auto mb-10 max-w-[46rem] text-center sm:mb-14">
        <p className={`kicker ${cancelled ? "!text-danger" : awaiting ? "!text-brass" : "!text-palm"}`}>
          {cancelled ? "Booking cancelled" : awaiting ? "Waiting for payment" : b.paymentMode === "PAY_AT_HOTEL" ? "Booking confirmed, pay at the hotel" : "Booking confirmed and paid"}
        </p>
        <h1 className="display-md mt-4 text-[clamp(2.3rem,6vw,4.2rem)]">
          {cancelled ? (
            <>
              This stay is <em className="accent">cancelled.</em>
            </>
          ) : (
            <>
              See you on <span className="whitespace-nowrap">{formatFullDay(b.arrivalDate).split(",")[0]}</span>,{" "}
              <em className="accent">{first}.</em>
            </>
          )}
        </h1>
        {!cancelled ? (
          <p className="mx-auto mt-4 max-w-lg leading-relaxed text-ink-muted">
            {b.hotel.name} has your room. A copy of this card is on its way to{" "}
            {b.guest.email ? <span className="text-ink">{b.guest.email}</span> : "your phone"} and by SMS.
          </p>
        ) : null}
      </header>

      {awaiting && b.hold ? (
        <div className="mx-auto mb-8 max-w-[46rem]">
          <HoldCountdown expiresAt={b.hold.expiresAt} skewMs={getClockSkew()} />
        </div>
      ) : null}

      <ConfirmationCard data={data} appName={appName} />

      {!cancelled && (chat || (b.loyalty && b.loyalty.pointsToEarn > 0)) ? (
        <div className="mx-auto mt-8 grid max-w-[46rem] gap-4 sm:grid-cols-2">
          {b.loyalty && b.loyalty.pointsToEarn > 0 ? (
            <PointsToEarn points={b.loyalty.pointsEarned ?? b.loyalty.pointsToEarn} programmeName={b.loyalty.programme} state={b.loyalty.pointsEarned !== null ? "earned" : "pending"} className={chat ? "" : "sm:col-span-2"} />
          ) : null}
          {chat ? <WhatsAppChat number={chat} hotelName={b.hotel.name} code={b.code} className={b.loyalty && b.loyalty.pointsToEarn > 0 ? "" : "sm:col-span-2"} /> : null}
        </div>
      ) : null}

      {!cancelled ? (
        <section aria-labelledby="next-title" className="mx-auto mt-14 max-w-[46rem]">
          <h2 id="next-title" className="kicker">
            What happens next
          </h2>
          <ol className="mt-5 grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3">
            {[
              [EnvelopeSimple, "Now", "Your confirmation and receipt go to your email, and a short SMS with the code."],
              [BellRinging, "The day before", `We send directions, the check-in time and the front desk's number for ${b.hotel.name}.`],
              [ChatCircleText, "After you leave", "A short note asking how it went. Only guests who stayed can review."],
            ].map(([Icon, when, body], i) => {
              const I = Icon as typeof EnvelopeSimple;
              return (
                <li key={i} className="bg-paper p-5">
                  <I size={22} weight="light" className="text-laterite" aria-hidden />
                  <p className="kicker mt-3">{when as string}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body as string}</p>
                </li>
              );
            })}
          </ol>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={manage} className="btn btn-ink">
              <PencilSimpleLine size={17} aria-hidden /> Manage or cancel
            </Link>
            {site.whiteLabel ? null : (
              <Link href={`${marketplace}/trips`} className="btn btn-outline">
                All your trips <ArrowRight size={15} aria-hidden />
              </Link>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="mx-auto max-w-[46rem] py-16" aria-label="Loading your booking">
      <div className="skeleton mx-auto h-4 w-40 rounded-xs" />
      <div className="skeleton mx-auto mt-5 h-12 w-3/4 rounded-xs" />
      <div className="skeleton mt-12 h-[28rem] w-full rounded-md" />
    </div>
  );
}
