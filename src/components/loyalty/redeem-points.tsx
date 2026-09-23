"use client";

import { CheckCircle, Info, SlidersHorizontal, X } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { formatNaira } from "@/lib/format";
import { clampPoints, formatPoints, pointsToKobo, type RedeemOffer } from "@/lib/loyalty";

/**
 * "Use N points (₦X)" in the review step. Like a promo code, points are applied by re-pricing the
 * stay through the quote, so the amount taken off is exactly what the booking charges. The guest
 * can use the most the stay allows in one tap, or choose fewer.
 */
export function RedeemPoints({
  offer,
  applied,
  busy,
  problem,
  onApply,
  onRemove,
  disabled,
}: {
  offer: RedeemOffer;
  /** Points applied on the current quote and what they took off, when any. */
  applied: { points: number; discountKobo: number } | null;
  busy: boolean;
  problem: string | null;
  onApply: (points: number) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const id = useId();
  const max = clampPoints(offer.maxPoints, offer);
  const [choosing, setChoosing] = useState(false);
  const [want, setWant] = useState(max);
  const value = clampPoints(want, offer);

  if (applied && applied.points > 0) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-sm border border-brass/60 bg-brass/[0.07] px-4 py-3" data-testid="points-applied">
        <p className="flex min-w-0 items-start gap-2.5 text-sm">
          <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-brass" aria-hidden />
          <span className="min-w-0">
            <span className="num font-medium">{formatPoints(applied.points)}</span> {offer.programmeName} points used, <span className="num font-medium">&minus;{formatNaira(applied.discountKobo)}</span>
            <span className="mt-0.5 block text-[12.5px] text-ink-muted">
              <span className="num">{formatPoints(offer.balance - applied.points)}</span> left after this booking. They come off your balance when the booking is confirmed.
            </span>
          </span>
        </p>
        <button type="button" onClick={onRemove} disabled={busy} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink" data-testid="points-remove">
          <X size={13} aria-hidden /> Don&rsquo;t use points
        </button>
      </div>
    );
  }

  if (offer.reason || max <= 0) {
    return (
      <p className="flex items-start gap-2.5 text-sm text-ink-muted" data-testid="points-ineligible">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          You have <span className="num text-ink">{formatPoints(offer.balance)}</span> {offer.programmeName} points.{" "}
          {offer.reason ?? `You can use them from ${formatPoints(offer.minPoints)} points.`}
        </span>
      </p>
    );
  }

  return (
    <div className="rounded-sm border border-brass/50 bg-brass/[0.04]" data-testid="points-offer">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3.5">
        <div className="min-w-0 text-sm">
          <p className="kicker !text-[10px] !text-brass">{offer.programmeName}</p>
          <p className="mt-1">
            You have <span className="num font-medium">{formatPoints(offer.balance)}</span> points with {offer.groupName}.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline !min-h-10 border-brass/70 text-sm hover:!border-brass hover:bg-brass/[0.08]"
          onClick={() => onApply(choosing ? value : max)}
          disabled={disabled || busy || (choosing && value <= 0)}
          data-testid="points-use"
        >
          {busy ? (
            "Re-pricing your stay"
          ) : (
            <span>
              Use <span className="num">{formatPoints(choosing ? value : max)}</span> points (<span className="num">{formatNaira(pointsToKobo(choosing ? value : max, offer.pointValueKobo))}</span>)
            </span>
          )}
        </button>
      </div>
      {choosing ? (
        <div className="border-t border-brass/30 px-4 py-3.5">
          <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm">
            <span>How many points</span>
            <span className="num text-ink-muted">
              {formatPoints(value)} of {formatPoints(max)}
            </span>
          </label>
          <input
            id={id}
            type="range"
            min={offer.minPoints}
            max={max}
            step={Math.max(1, offer.step)}
            value={value}
            onChange={(e) => setWant(Number(e.target.value))}
            className="range-thumb mt-3 w-full accent-[var(--brass)]"
            aria-valuetext={`${formatPoints(value)} points, ${formatNaira(pointsToKobo(value, offer.pointValueKobo))}`}
            data-testid="points-range"
          />
          <p className="mt-1 flex justify-between text-xs text-ink-muted">
            <span className="num">{formatPoints(offer.minPoints)}</span>
            <span className="num">{formatPoints(max)}</span>
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brass/30 px-4 py-2.5 text-[12.5px] text-ink-muted">
        <span>
          Each point is worth <span className="num">{formatNaira(offer.pointValueKobo)}</span>. The rest you pay as usual.
        </span>
        {!choosing && max > offer.minPoints ? (
          <button type="button" className="inline-flex items-center gap-1.5 hover:text-ink" onClick={() => setChoosing(true)} data-testid="points-choose">
            <SlidersHorizontal size={13} aria-hidden /> Use fewer
          </button>
        ) : null}
      </div>
      {problem ? (
        <p role="alert" className="flex items-start gap-2 border-t border-brass/30 px-4 py-2.5 text-[13px]" data-testid="points-error">
          <Info size={15} weight="fill" className="mt-0.5 shrink-0 text-danger" aria-hidden /> {problem}
        </p>
      ) : null}
    </div>
  );
}

/** "You will earn about N points" on the confirmation and trip pages. */
export function PointsToEarn({
  points,
  programmeName,
  state = "pending",
  className = "",
}: {
  points: number;
  programmeName: string;
  state?: "pending" | "earned";
  className?: string;
}) {
  if (points <= 0) return null;
  return (
    <p className={`flex items-start gap-3 rounded-sm border border-brass/50 bg-brass/[0.06] px-4 py-3 text-sm ${className}`} data-testid={state === "earned" ? "points-earned" : "points-to-earn"}>
      <svg viewBox="0 0 20 20" className="mt-0.5 size-[18px] shrink-0 text-brass" aria-hidden>
        <path d="M10 1.5 18.5 10 10 18.5 1.5 10Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M10 5.5 14.5 10 10 14.5 5.5 10Z" fill="currentColor" />
      </svg>
      <span>
        {state === "earned" ? (
          <>
            You earned <span className="num font-medium">{formatPoints(points)}</span> {programmeName} points on this stay.
          </>
        ) : (
          <>
            You will earn <span className="num font-medium">{formatPoints(points)}</span> {programmeName} points on this stay.
            <span className="block text-[12.5px] text-ink-muted">They arrive after you check out, on what you spend on the room and at the hotel&rsquo;s bars and restaurant.</span>
          </>
        )}
      </span>
    </p>
  );
}
