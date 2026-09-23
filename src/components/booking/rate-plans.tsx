"use client";

import { ArrowRight, Check, Coffee, LockSimple, ShieldCheck } from "@phosphor-icons/react";
import Link from "next/link";
import type { CancellationPolicy } from "@/lib/booking-types";
import { formatNaira } from "@/lib/format";
import { isNonRefundable, nightlyRange, nightlyVaries, planTitle, type PlanOffer } from "@/lib/rates";
import { formatLagosDateTime, formatLagosShort, policyTail } from "@/lib/time";

/** Small marks that sit beside a plan's name. */
export function PlanBadges({ plan, className = "" }: { plan: PlanOffer; className?: string }) {
  const locked = isNonRefundable(plan);
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {plan.includesBreakfast ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-brass/60 bg-brass/[0.08] px-2 py-0.5 text-[11px] font-medium text-ink" data-testid="badge-breakfast">
          <Coffee size={12} weight="bold" className="text-brass" aria-hidden /> Breakfast included
        </span>
      ) : null}
      {locked ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2 py-0.5 text-[11px] text-ink-muted">
          <LockSimple size={11} weight="bold" aria-hidden /> Non-refundable
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full border border-palm/40 px-2 py-0.5 text-[11px] text-palm">
          <ShieldCheck size={12} weight="fill" aria-hidden /> Free cancellation
        </span>
      )}
      {plan.minNights && plan.minNights > 1 ? (
        <span className="inline-flex items-center rounded-full border border-line-strong px-2 py-0.5 text-[11px] text-ink-muted">{plan.minNights}+ nights</span>
      ) : null}
      {plan.adjustmentLabel ? <span className="num text-[11px] font-medium text-laterite">{plan.adjustmentLabel}</span> : null}
    </span>
  );
}

/**
 * The cancellation difference between plans, in plain words. With dates the flexible plan
 * names the exact deadline; the non-refundable one says what is lost, and when it is paid.
 */
export function planPolicyText(plan: PlanOffer, fallback: CancellationPolicy | null, freeUntil: string | null, short = false): string {
  if (isNonRefundable(plan)) {
    return short
      ? "Paid in full when you book. No refund if you cancel or do not arrive."
      : "You pay the whole stay when you book. If you cancel, change your dates or do not arrive, the hotel keeps the payment.";
  }
  const policy = plan.cancellationPolicy ?? fallback;
  if (freeUntil) {
    const tail = policy ? policyTail(policy.summary) : "";
    return short
      ? `Free cancellation until ${formatLagosShort(freeUntil)}.`
      : `Cancel free of charge until ${formatLagosDateTime(freeUntil)}.${tail ? ` ${tail}` : ""}`;
  }
  if (policy && policy.freeCancellationHours > 0 && (short || !plan.cancellationSummary)) {
    return short ? `Free cancellation up to ${policy.freeCancellationHours} hours before arrival.` : policy.summary;
  }
  return plan.cancellationSummary ?? policy?.summary ?? "The hotel's standard cancellation terms apply.";
}

/** How much a plan saves against the flexible rate for the same dates. */
export function savingAgainst(plan: PlanOffer, plans: PlanOffer[]): number {
  const flexible = plans.find((p) => p.kind === "BAR") ?? plans.find((p) => !isNonRefundable(p));
  if (!flexible || flexible.id === plan.id || !flexible.quote || !plan.quote) return 0;
  return Math.max(0, flexible.quote.totalKobo - plan.quote.totalKobo);
}

/**
 * Booking step one: the rates for the chosen room type, as radio cards. Each card names the
 * rate, its marks, the stay's price and the cancellation terms in one sentence.
 */
export function PlanChoice({
  plans,
  value,
  onChange,
  nights,
  fallbackPolicy,
  freeUntil,
  loading,
}: {
  plans: PlanOffer[];
  value: string | undefined;
  onChange: (id: string) => void;
  nights: number;
  fallbackPolicy: CancellationPolicy | null;
  freeUntil: string | null;
  loading?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Rate" data-testid="plan-choice">
      {plans.map((p) => {
        const on = p.id === value;
        const off = !p.bookable;
        const save = savingAgainst(p, plans);
        return (
          <label
            key={p.id}
            className={`relative flex flex-col rounded-sm border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-laterite ${
              off ? "cursor-not-allowed border-line opacity-55" : on ? "cursor-pointer border-laterite bg-laterite/[0.05]" : "cursor-pointer border-line-strong hover:border-ink-muted"
            }`}
            data-testid="plan-option"
            data-plan-kind={p.kind}
          >
            <input type="radio" name="rate-plan" className="sr-only" value={p.id} checked={on} disabled={off} onChange={() => onChange(p.id)} />
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="display-sm block text-[1.2rem] leading-tight">{planTitle(p)}</span>
                <PlanBadges plan={p} className="mt-2" />
              </span>
              <span aria-hidden className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full border ${on ? "border-laterite bg-laterite text-laterite-ink" : "border-line-strong"}`}>
                {on ? <Check size={11} weight="bold" /> : null}
              </span>
            </span>
            <span className="mt-3 block text-[13px] leading-relaxed text-ink-muted">{off && p.reason ? p.reason : planPolicyText(p, fallbackPolicy, freeUntil)}</span>
            <span className="mt-auto block pt-3.5">
            <span className="flex items-end justify-between gap-3 border-t border-line pt-3">
              {p.quote ? (
                <>
                  <span className="text-[12px] text-ink-muted">
                    {nightlyVaries(p.quote) ? nightlyRange(p.quote) : `${formatNaira(p.quote.rateKobo)} a night`}
                    {save > 0 ? (
                      <span className="mt-0.5 block font-medium text-palm" data-testid="plan-saving">
                        Saves {formatNaira(save)}
                      </span>
                    ) : null}
                  </span>
                  <span className={`text-right transition-opacity ${loading ? "opacity-40" : ""}`}>
                    <span className="num block text-lg font-medium" data-testid="plan-total">
                      {formatNaira(p.quote.totalKobo)}
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      {nights} {nights === 1 ? "night" : "nights"}, all in
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[12px] text-ink-muted">{p.adjustmentLabel ? `${p.adjustmentLabel} the flexible rate` : "Add dates for the total"}</span>
                  <span className="text-right">
                    <span className="text-[11px] text-ink-muted">from </span>
                    <span className="num text-lg font-medium">{formatNaira(p.fromKobo)}</span>
                    <span className="block text-[11px] text-ink-muted">a night</span>
                  </span>
                </>
              )}
            </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

/**
 * The hotel page: a room type's rates as a ruled ledger under the room, each with its own way in.
 * Phones stack each rate into two lines; wider screens set name, terms, price and action in columns.
 */
export function PlanLedger({
  roomName,
  plans,
  nights,
  fallbackPolicy,
  freeUntil,
  hrefFor,
  loading,
}: {
  roomName: string;
  plans: PlanOffer[];
  nights: number;
  fallbackPolicy: CancellationPolicy | null;
  freeUntil: string | null;
  hrefFor: (planId: string) => string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-sm border border-line bg-surface/60" data-testid="plan-ledger">
      <p className="kicker border-b border-line px-4 py-2.5 !text-[10px]">
        Rates for the {roomName}
        {nights ? `, ${nights} ${nights === 1 ? "night" : "nights"}` : ""}
      </p>
      <ul className="divide-y divide-line">
        {plans.map((p) => {
          const save = savingAgainst(p, plans);
          return (
            <li key={p.id} className="grid gap-x-6 gap-y-2 px-4 py-3.5 sm:grid-cols-[1fr_auto_auto] sm:items-center" data-testid="plan-row" data-plan-kind={p.kind}>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="font-medium">{planTitle(p)}</span>
                  <PlanBadges plan={p} />
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{!p.bookable && p.reason ? p.reason : planPolicyText(p, fallbackPolicy, freeUntil, true)}</p>
              </div>
              <div className={`sm:text-right ${loading ? "opacity-40" : ""}`}>
                {p.quote && p.bookable ? (
                  <>
                    <p className="num text-lg font-medium" data-testid="plan-row-total">
                      {formatNaira(p.quote.totalKobo)}
                    </p>
                    <p className="text-[11.5px] text-ink-muted">
                      {save > 0 ? <span className="font-medium text-palm">Saves {formatNaira(save)} &middot; </span> : null}all in
                    </p>
                  </>
                ) : p.fromKobo ? (
                  <p className="text-[12.5px] text-ink-muted">
                    from <span className="num text-lg font-medium text-ink">{formatNaira(p.fromKobo)}</span> a night
                  </p>
                ) : null}
              </div>
              {p.bookable || !p.quote ? (
                <Link href={hrefFor(p.id)} className="btn btn-outline group !min-h-10 w-full !px-4 text-sm sm:w-auto" aria-label={`Book the ${roomName}, ${planTitle(p)} rate`}>
                  Choose <ArrowRight size={14} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <span className="btn btn-outline !min-h-10 w-full cursor-not-allowed !px-4 text-sm opacity-50 sm:w-auto" aria-disabled="true">
                  Not available
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
