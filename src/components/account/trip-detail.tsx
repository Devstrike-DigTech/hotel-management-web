"use client";

import {
  ArrowLeft,
  ArrowRight,
  FileText,
  MapTrifold,
  Phone,
  Receipt,
  Star,
  XCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { BookingView, PaymentInit } from "@/lib/booking-types";
import { call, ClientApiError, getClockSkew, humanError, newKey } from "@/lib/client-api";
import { formatLong } from "@/lib/dates";
import { formatNaira, formatPhone, toE164Digits } from "@/lib/format";
import { formatLagosDateTime } from "@/lib/time";
import { ConfirmationCard } from "../booking/confirmation-card";
import { toConfirmation } from "../booking/confirmation-view";
import { HoldCountdown } from "../booking/hold-countdown";
import { Notice } from "../ui/field";
import { useGuestHint } from "./account-link";
import { useSiteLinks } from "../site/site-links";
import { CancelDialog } from "./cancel-dialog";
import { StatusChip } from "./status-chip";
import { WhatsAppChat } from "../chat/whatsapp-chat";
import { useHotelChat } from "../chat/use-hotel-chat";
import { PointsToEarn } from "../loyalty/redeem-points";
import { JoinProgramme } from "../loyalty/join-programme";
import { TripConcierge } from "../concierge/trip-concierge";

export function TripDetail({ code, appName }: { code: string; appName: string | null }) {
  const params = useSearchParams();
  const token = params.get("t");
  // M8: "Arrange this" on a hotel's service page lands here with ?arrange=<service id>.
  const arrange = params.get("arrange");
  const site = useSiteLinks();
  // Guest accounts live on the marketplace; a white-labelled hotel's own domain only has link access.
  const hint = useGuestHint();
  const signedIn = !!hint && !site.whiteLabel;
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [error, setError] = useState<{ message: string; gone?: boolean } | null>(token ? null : { message: "This page needs the link from your confirmation.", gone: true });
  const [cancelOpen, setCancelOpen] = useState(false);
  const chat = useHotelChat(booking?.hotel.slug);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const b = await call<BookingView>(`public/trips/${encodeURIComponent(code)}`, { query: { t: token } });
      setBooking(b);
      setError(null);
    } catch (e) {
      if (e instanceof ClientApiError && e.status === 410) setError({ message: "This booking link has expired.", gone: true });
      else if (e instanceof ClientApiError && e.status === 404) setError({ message: "We could not find that booking.", gone: true });
      else setError({ message: humanError(e) });
    }
  }, [code, token]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  if (error)
    return (
      <div className="container-page max-w-xl py-20 text-center">
        <p className="kicker">Booking {code}</p>
        <h1 className="display-md mt-3 text-4xl">{error.message}</h1>
        <p className="mt-4 text-ink-muted">
          {error.gone
            ? site.whiteLabel
              ? "Use the link in your confirmation message, or contact the hotel."
              : "Sign in with the number you booked with to see all your trips."
            : "Check your connection and try again."}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          {error.gone && site.whiteLabel ? (
            <Link href={site.home} className="btn btn-primary">
              Back to the hotel
            </Link>
          ) : error.gone ? (
            <Link href={`/account/sign-in?next=/trips`} className="btn btn-primary">
              Sign in
            </Link>
          ) : (
            <button type="button" onClick={load} className="btn btn-primary">
              Try again
            </button>
          )}
        </div>
      </div>
    );

  if (!booking)
    return (
      <div className="container-page pb-10 pt-10" aria-busy="true">
        <div className="skeleton h-4 w-32 rounded-xs" />
        <div className="skeleton mt-5 h-14 w-2/3 rounded-xs" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div className="skeleton h-[32rem] rounded-md" />
          <div className="skeleton h-72 rounded-md" />
        </div>
      </div>
    );

  const b = booking;
  const phone = b.hotel.phone ? toE164Digits(b.hotel.phone) : null;

  return (
    <div className="container-page pb-10 pt-8 lg:pt-12">
      <nav aria-label="Breadcrumb" className="kicker flex items-center gap-2">
        {signedIn ? (
          <Link href="/trips" className="inline-flex items-center gap-1.5 hover:text-ink">
            <ArrowLeft size={12} aria-hidden /> Trips
          </Link>
        ) : (
          <span>Your booking</span>
        )}
        <span aria-hidden>/</span>
        <span className="num text-ink">{b.code}</span>
      </nav>
      <header className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <StatusChip status={b.displayStatus} />
          <h1 className="display-md mt-3 text-[clamp(2.2rem,5vw,3.8rem)]">{b.hotel.name}</h1>
          <p className="num mt-2 text-sm text-ink-muted">
            {b.stayType === "DAY_USE" ? `${formatLong(b.arrivalDate)}, ${b.hours} hours` : `${formatLong(b.arrivalDate)} to ${formatLong(b.departureDate)}`}
          </p>
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-12">
        <div className="min-w-0">
          <ConfirmationCard data={toConfirmation(b, null)} appName={appName} />
          <TripConcierge booking={b} token={token!} base={site.base} arrange={arrange} />
        </div>

        <aside className="space-y-5" aria-label="Manage this booking">
          {b.displayStatus === "AWAITING_PAYMENT" && b.hold && b.payment ? <PayPanel booking={b} onChanged={load} /> : null}

          {b.cancellation ? (
            <section className="rounded-md border border-line-strong bg-surface p-5" data-testid="cancellation-summary">
              <h2 className="kicker">Cancelled</h2>
              <p className="mt-2 text-sm text-ink-muted">
                {b.cancellation.cancelledBy === "GUEST" ? "You cancelled" : b.cancellation.cancelledBy === "HOTEL" ? "The hotel cancelled" : "Cancelled automatically"} on{" "}
                {formatLagosDateTime(b.cancellation.cancelledAt)}.
              </p>
              <dl className="num mt-4 space-y-2 text-sm">
                {b.cancellation.feeKobo ? (
                  <div className="flex justify-between">
                    <dt className="font-sans text-ink-muted">Cancellation fee</dt>
                    <dd>{formatNaira(b.cancellation.feeKobo)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="font-sans text-ink-muted">Refund</dt>
                  <dd className="text-palm">{formatNaira(b.cancellation.refundKobo)}</dd>
                </div>
              </dl>
              {b.cancellation.refundKobo > 0 ? (
                <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                  {b.cancellation.refundStatus === "PROCESSED"
                    ? "Sent back to the card or account you paid with. Banks usually show it within 3 to 10 working days."
                    : b.cancellation.refundStatus === "FAILED"
                      ? "The refund needs another try; our team has been alerted and will sort it out."
                      : "On its way back to the card or account you paid with."}
                </p>
              ) : null}
            </section>
          ) : null}

          {b.loyalty && b.status !== "CANCELLED" && (b.loyalty.pointsEarned !== null || b.loyalty.pointsToEarn > 0) ? (
            <PointsToEarn
              points={b.loyalty.pointsEarned ?? b.loyalty.pointsToEarn}
              programmeName={b.loyalty.programme}
              state={b.loyalty.pointsEarned !== null ? "earned" : "pending"}
            />
          ) : null}

          {signedIn && b.status !== "CANCELLED" ? <JoinProgramme hotelSlug={b.hotel.slug} hotelName={b.hotel.name} showMember={!b.loyalty} /> : null}

          {b.review.eligible && b.review.token && !b.review.submitted ? (
            <section className="rounded-md border border-brass/50 bg-brass/[0.06] p-5">
              <Star size={22} weight="fill" className="text-brass" aria-hidden />
              <h2 className="display-sm mt-2 text-xl">How was {b.hotel.name}?</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Your review helps the next guest and the hotel.{b.review.deadline ? ` Open until ${formatLong(b.review.deadline.slice(0, 10))}.` : ""}
              </p>
              <Link href={`${site.base}/review?t=${encodeURIComponent(b.review.token)}`} className="btn btn-ink mt-4 w-full" data-testid="review-cta">
                Write a review <ArrowRight size={15} aria-hidden />
              </Link>
            </section>
          ) : b.review.submitted ? (
            <p className="rounded-md border border-line bg-surface p-4 text-sm text-ink-muted">Thank you for reviewing this stay.</p>
          ) : null}

          <Documents booking={b} token={token!} onIssued={load} />

          <section className="rounded-md border border-line-strong bg-surface">
            <h2 className="kicker border-b border-line px-5 py-3">The hotel</h2>
            <ul className="divide-y divide-line text-sm">
              {phone ? (
                <>
                  <li>
                    <a href={`tel:+${phone}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                      <Phone size={18} weight="light" className="text-laterite" aria-hidden /> <span className="num">{formatPhone(b.hotel.phone)}</span>
                    </a>
                  </li>
                  {chat ? (
                    <li>
                      <WhatsAppChat number={chat} hotelName={b.hotel.name} code={b.code} variant="row" />
                    </li>
                  ) : null}
                </>
              ) : null}
              <li>
                <a href={b.hotel.mapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                  <MapTrifold size={18} weight="light" className="text-laterite" aria-hidden /> Directions
                </a>
              </li>
            </ul>
          </section>

          {b.canCancel ? (
            <button type="button" onClick={() => setCancelOpen(true)} className="btn w-full border border-danger/40 text-danger hover:border-danger hover:bg-danger/[0.06]" data-testid="cancel-open">
              <XCircle size={17} aria-hidden /> Cancel this booking
            </button>
          ) : null}
          {b.canCancel && b.freeCancellationUntil ? (
            <p className="-mt-2 text-center text-xs text-ink-muted">Free until {formatLagosDateTime(b.freeCancellationUntil)}</p>
          ) : null}
        </aside>
      </div>

      {cancelOpen ? (
        <CancelDialog
          booking={b}
          token={token!}
          onClose={(changed) => {
            setCancelOpen(false);
            if (changed) load();
          }}
        />
      ) : null}
    </div>
  );
}

function PayPanel({ booking, onChanged }: { booking: BookingView; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const v = await call<{ state: string; paymentStatus: string }>(`public/payments/${encodeURIComponent(booking.payment!.reference)}/verify`);
      if (v.state === "SUCCESS") return onChanged();
      const p = await call<PaymentInit>(`public/payments/${encodeURIComponent(booking.payment!.reference)}/retry`, { method: "POST", idempotencyKey: newKey() });
      window.location.assign(p.authorizationUrl);
    } catch (e) {
      setBusy(false);
      if (e instanceof ClientApiError && (e.code === "HOLD_EXPIRED" || e.code === "PAYMENT_ALREADY_COMPLETED")) return onChanged();
      setError(humanError(e));
    }
  }
  return (
    <section className="space-y-3">
      <HoldCountdown expiresAt={booking.hold!.expiresAt} skewMs={getClockSkew()} onExpire={onChanged} />
      <button type="button" className="btn btn-primary w-full" onClick={pay} disabled={busy}>
        {busy ? "Opening Paystack" : `Pay ${formatNaira(booking.totalKobo)} now`}
      </button>
      {error ? <Notice tone="warn" title={error} /> : null}
    </section>
  );
}

function Documents({ booking, token, onIssued }: { booking: BookingView; token: string; onIssued: () => void }) {
  const site = useSiteLinks();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const q = `?t=${encodeURIComponent(token)}`;
  const base = `${site.base}/trips/${encodeURIComponent(booking.code)}/documents`;
  const { invoices, receipts } = booking.documents;
  const cancelled = booking.status === "CANCELLED";
  if (cancelled && !invoices.length && !receipts.length) return null;
  return (
    <section className="rounded-md border border-line-strong bg-surface" data-testid="documents">
      <h2 className="kicker border-b border-line px-5 py-3">Invoice and receipts</h2>
      <ul className="divide-y divide-line text-sm">
        {invoices.map((d) => (
          <li key={d.id}>
            <Link href={`${base}/invoice/${d.id}${q}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2">
              <span className="flex items-center gap-3">
                <FileText size={18} weight="light" className="text-laterite" aria-hidden />
                <span>
                  {d.kind === "PROFORMA" ? "Pro-forma invoice" : "Invoice"} <span className="num block text-xs text-ink-muted">{d.number}</span>
                </span>
              </span>
              <span className="num">{formatNaira(d.totalKobo)}</span>
            </Link>
          </li>
        ))}
        {receipts.map((d) => (
          <li key={d.id}>
            <Link href={`${base}/receipt/${d.id}${q}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2" data-testid="receipt-link">
              <span className="flex items-center gap-3">
                <Receipt size={18} weight="light" className="text-laterite" aria-hidden />
                <span>
                  Receipt <span className="num block text-xs text-ink-muted">{d.number}</span>
                </span>
              </span>
              <span className="num">{formatNaira(d.amountKobo)}</span>
            </Link>
          </li>
        ))}
        {!invoices.length && !cancelled ? (
          <li className="px-5 py-3">
            <button
              type="button"
              disabled={busy}
              className="link-static text-sm text-ink"
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await call(`public/trips/${encodeURIComponent(booking.code)}/invoice`, { method: "POST", query: { t: token } });
                  onIssued();
                } catch (e) {
                  setError(humanError(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Preparing" : "Get a pro-forma invoice for your company"}
            </button>
            {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
          </li>
        ) : null}
      </ul>
    </section>
  );
}
