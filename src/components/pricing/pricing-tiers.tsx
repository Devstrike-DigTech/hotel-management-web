"use client";

import { ArrowRight, Check } from "@phosphor-icons/react";
import { useState } from "react";
import { formatNaira } from "@/lib/format";
import type { Feature, Plan } from "@/lib/types";

type Interval = "monthly" | "yearly";

function limit(n: number | undefined, one: string, many: string) {
  if (n === undefined) return null;
  return n === -1 ? `Unlimited ${many}` : `Up to ${n} ${n === 1 ? one : many}`;
}

export function PricingTiers({
  plans,
  features,
  adminUrl,
  supportEmail,
  appName,
}: {
  plans: Plan[];
  features: Feature[];
  adminUrl: string;
  supportEmail: string;
  appName: string;
}) {
  const [interval, setInterval] = useState<Interval>("monthly");
  const names = new Map(features.map((f) => [f.code, f.name]));
  const priced = plans.filter((p) => p.priceMonthlyKobo && p.priceYearlyKobo);
  const monthsFree = Math.max(
    0,
    ...priced.map((p) => Math.round((p.priceMonthlyKobo! * 12 - p.priceYearlyKobo!) / p.priceMonthlyKobo!)),
  );

  return (
    <div>
      <div className="flex flex-col items-center gap-3">
        <div role="radiogroup" aria-label="Billing interval" className="inline-grid grid-cols-2 rounded-full border border-line-strong bg-surface p-1">
          {(["monthly", "yearly"] as Interval[]).map((i) => (
            <label
              key={i}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-laterite ${
                interval === i ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
              }`}
            >
              <input type="radio" name="interval" value={i} checked={interval === i} onChange={() => setInterval(i)} className="sr-only" />
              {i === "monthly" ? "Monthly" : "Yearly"}
            </label>
          ))}
        </div>
        <p className="kicker" aria-live="polite">
          {monthsFree > 0 ? (
            <span className={interval === "yearly" ? "!text-palm" : ""}>
              Pay yearly, get {monthsFree} {monthsFree === 1 ? "month" : "months"} free
            </span>
          ) : (
            "Prices exclude 7.5% VAT"
          )}
        </p>
      </div>

      <ol className="mt-12 grid overflow-hidden rounded-md border border-line-strong bg-line-strong sm:grid-cols-2 sm:gap-px xl:grid-cols-4">
        {plans.map((p, idx) => {
          const prev = plans[idx - 1];
          const added = prev ? p.features.filter((f) => !prev.features.includes(f)) : p.features;
          const monthly = p.priceMonthlyKobo;
          const yearly = p.priceYearlyKobo;
          const custom = monthly === null;
          const saving = monthly && yearly ? monthly * 12 - yearly : 0;
          return (
            <li
              key={p.code}
              className={`relative flex flex-col border-b border-line-strong p-6 last:border-b-0 sm:border-b-0 lg:p-7 ${
                p.highlighted ? "bg-surface" : "bg-paper"
              }`}
            >
              {p.highlighted ? <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-brass" /> : null}
              <div className="flex items-center justify-between gap-3">
                <h3 className="display-sm text-[1.9rem]">{p.name}</h3>
                {p.highlighted ? (
                  <span className="kicker rounded-full border border-brass/50 px-2.5 py-1 !text-[10px] !text-brass">Most chosen</span>
                ) : null}
              </div>
              <p className="mt-2 min-h-[3em] font-display italic leading-snug text-ink-muted">{p.tagline}</p>

              <div className="mt-6 min-h-[5.5rem]">
                {custom ? (
                  <>
                    <p className="display-md text-[2.4rem] italic">Talk to us</p>
                    <p className="mt-1 text-sm text-ink-muted">Priced for your group and your rooms.</p>
                  </>
                ) : interval === "monthly" ? (
                  <>
                    <p>
                      <span className="num text-[2.3rem] font-medium tracking-tight">{formatNaira(monthly)}</span>
                      <span className="text-sm text-ink-muted"> / month</span>
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">Billed monthly, plus VAT.</p>
                  </>
                ) : (
                  <>
                    <p>
                      <span className="num text-[2.3rem] font-medium tracking-tight">{formatNaira(yearly)}</span>
                      <span className="text-sm text-ink-muted"> / year</span>
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      <span className="num">{formatNaira(Math.round((yearly ?? 0) / 12))}</span> a month.{" "}
                      {saving > 0 ? (
                        <span className="text-palm">
                          Save <span className="num">{formatNaira(saving)}</span>.
                        </span>
                      ) : null}
                    </p>
                  </>
                )}
              </div>

              {custom ? (
                <a
                  href={`mailto:${supportEmail}?subject=${encodeURIComponent(`${appName} Enterprise`)}`}
                  className="btn btn-outline mt-6"
                >
                  Talk to us <ArrowRight size={16} aria-hidden />
                </a>
              ) : (
                <a
                  href={`${adminUrl}/signup?plan=${encodeURIComponent(p.code)}${interval === "yearly" ? "&interval=yearly" : ""}`}
                  className={`btn mt-6 ${p.highlighted ? "btn-primary" : "btn-ink"}`}
                >
                  Start with {p.name} <ArrowRight size={16} aria-hidden />
                </a>
              )}

              <ul className="num mt-7 space-y-1.5 border-y border-line py-4 text-[12.5px]">
                {[limit(p.limits.max_rooms, "room", "rooms"), limit(p.limits.max_staff, "staff login", "staff logins"), limit(p.limits.max_properties, "property", "properties")]
                  .filter(Boolean)
                  .map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                <li className="text-ink-muted">
                  {p.commissionBps === null ? "Negotiated commission" : `${p.commissionBps / 100}% on marketplace bookings`}
                </li>
              </ul>

              <p className="mt-5 text-sm font-medium">{prev ? `Everything in ${prev.name}, plus` : "Includes"}</p>
              <ul className="mt-3 space-y-2">
                {added.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[0.9rem] leading-snug">
                    <Check size={15} weight="bold" className="mt-0.5 shrink-0 text-laterite" aria-hidden />
                    {names.get(f) ?? f}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
