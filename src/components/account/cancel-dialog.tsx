"use client";

import { CheckCircle, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { BookingView, CancellationPreview, RefundStatus } from "@/lib/booking-types";
import { call, humanError, newKey } from "@/lib/client-api";
import { formatNaira } from "@/lib/format";
import { formatLagosDateTime } from "@/lib/time";

const REASONS = ["My plans changed", "I found somewhere else", "The trip is off", "I booked by mistake", "Something else"];

/**
 * Cancelling, with the money laid out first: what was paid, what the policy keeps, what comes
 * back. "Keep my booking" is the primary action; cancelling is deliberate.
 */
export function CancelDialog({ booking, token, onClose }: { booking: BookingView; token: string; onClose: (changed: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<(CancellationPreview & { refundStatus: RefundStatus | null }) | null>(null);
  const key = useRef(newKey());

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    const ctl = new AbortController();
    call<CancellationPreview>(`public/trips/${encodeURIComponent(booking.code)}/cancel-preview`, { query: { t: token }, signal: ctl.signal })
      .then(setPreview)
      .catch((e) => !ctl.signal.aborted && setError(humanError(e, "We could not work out the refund just now.")));
    return () => ctl.abort();
  }, [booking.code, token]);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await call<{ booking: BookingView; cancellation: CancellationPreview & { refundStatus: RefundStatus | null } }>(
        `public/trips/${encodeURIComponent(booking.code)}/cancel`,
        { method: "POST", query: { t: token }, body: reason ? { reason } : {}, idempotencyKey: key.current, timeoutMs: 30_000 },
      );
      setDone(res.cancellation);
    } catch (e) {
      setError(humanError(e));
    } finally {
      setBusy(false);
    }
  }

  const close = () => {
    ref.current?.close();
    onClose(!!done);
  };
  const paidOnline = (preview?.paidKobo ?? 0) > 0;

  return (
    <dialog
      ref={ref}
      onClose={() => onClose(!!done)}
      aria-labelledby="cancel-title"
      className="m-auto w-[min(100%-2rem,32rem)] rounded-md border border-line-strong bg-surface p-0 text-ink shadow-[var(--shadow-float)] backdrop:bg-ink/45 backdrop:backdrop-blur-[2px]"
      data-testid="cancel-dialog"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div>
          <p className="kicker">Booking {booking.code}</p>
          <h2 id="cancel-title" className="display-sm mt-1 text-2xl">
            {done ? "Cancelled" : "Cancel this booking?"}
          </h2>
        </div>
        <button type="button" onClick={close} className="-mr-2 inline-grid size-9 place-items-center rounded-sm text-ink-muted hover:bg-surface-2 hover:text-ink" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="px-6 py-6">
        {done ? (
          <div role="status" data-testid="cancel-done">
            <CheckCircle size={34} weight="light" className="text-palm" aria-hidden />
            <p className="mt-3 text-[0.9375rem] leading-relaxed">
              Your stay at {booking.hotel.name} is cancelled and the room has gone back to the hotel.
              {done.refundKobo > 0 ? (
                <>
                  {" "}
                  <span className="num font-medium text-palm" data-testid="refund-amount">
                    {formatNaira(done.refundKobo)}
                  </span>{" "}
                  {done.refundStatus === "PROCESSED" ? "has been sent back" : "is on its way back"} to the card or account you paid with; banks usually take 3 to
                  10 working days to show it.
                </>
              ) : null}
            </p>
            <p className="mt-3 text-sm text-ink-muted">We have sent the details by SMS and email.</p>
            <button type="button" onClick={close} className="btn btn-ink mt-6 w-full">
              Done
            </button>
          </div>
        ) : !preview ? (
          error ? (
            <p role="alert" className="text-sm text-ochre">
              {error}
            </p>
          ) : (
            <div className="space-y-3" aria-label="Working out your refund">
              <div className="skeleton h-4 w-2/3 rounded-xs" />
              <div className="skeleton h-4 w-1/2 rounded-xs" />
              <div className="skeleton h-8 w-1/3 rounded-xs" />
            </div>
          )
        ) : !preview.canCancel ? (
          <p className="text-sm leading-relaxed text-ink-muted">{preview.reason ?? "This booking can no longer be cancelled online. Please call the hotel."}</p>
        ) : (
          <>
            <p className="text-[0.9375rem] leading-relaxed" data-testid="cancel-headline">
              {preview.free
                ? paidOnline
                  ? "Cancelling now is free. Everything you paid comes back to you."
                  : "Cancelling now is free."
                : paidOnline
                  ? "You are inside the hotel's cancellation window, so part of the payment is kept."
                  : "Nothing was paid, so there is nothing to refund."}
            </p>
            {paidOnline ? (
              <dl className="num mt-5 space-y-2.5 rounded-sm border border-line bg-paper p-4 text-sm" data-testid="cancel-preview">
                <div className="flex items-baseline gap-3">
                  <dt className="font-sans text-ink-muted">You paid</dt>
                  <span aria-hidden className="leader" />
                  <dd>{formatNaira(preview.paidKobo)}</dd>
                </div>
                <div className="flex items-baseline gap-3">
                  <dt className="font-sans text-ink-muted">Cancellation fee</dt>
                  <span aria-hidden className="leader" />
                  <dd data-testid="cancel-fee">{preview.feeKobo ? `-${formatNaira(preview.feeKobo)}` : formatNaira(0)}</dd>
                </div>
                <div className="flex items-baseline gap-3 border-t border-ink pt-3">
                  <dt className="font-sans font-medium">Refund to you</dt>
                  <span aria-hidden className="leader" />
                  <dd className="text-xl font-medium text-palm" data-testid="cancel-refund">
                    {formatNaira(preview.refundKobo)}
                  </dd>
                </div>
              </dl>
            ) : null}
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              {preview.policy.summary}
              {preview.freeCancellationUntil && preview.free ? ` Free until ${formatLagosDateTime(preview.freeCancellationUntil)}.` : ""}
            </p>
            <label className="mt-6 block">
              <span className="mb-2 flex justify-between text-sm font-medium">
                Why are you cancelling? <span className="text-xs font-normal text-ink-muted">Optional</span>
              </span>
              <select className="field appearance-none" value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">Prefer not to say</option>
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            {error ? (
              <p role="alert" className="mt-4 text-sm text-ochre">
                {error}
              </p>
            ) : null}
            <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={cancel} disabled={busy} className="btn border border-danger/45 text-danger hover:bg-danger/[0.06]" data-testid="cancel-confirm">
                {busy ? "Cancelling" : preview.refundKobo > 0 ? `Cancel and refund ${formatNaira(preview.refundKobo)}` : "Cancel booking"}
              </button>
              <button type="button" onClick={close} className="btn btn-ink" autoFocus>
                Keep my booking
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
