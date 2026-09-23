"use client";

import { useMemo, useState } from "react";
import { PlanChoice, PlanLedger } from "@/components/booking/rate-plans";
import { PromoField } from "@/components/booking/promo-field";
import { RangeCalendar, type Range } from "@/components/search/range-calendar";
import type { CancellationPolicy, PriceBreakdown } from "@/lib/booking-types";
import { addDays, formatLong, type ISODate } from "@/lib/dates";
import { promoMessage, type CalendarDays, type PlanOffer } from "@/lib/rates";

const POLICY: CancellationPolicy = {
  freeCancellationHours: 48,
  lateCancellationFeePct: 100,
  noShowFeePct: 100,
  summary: "Free cancellation until 48 hours before check-in. After that, the first night is charged.",
};

/** Sample calendar: weekends up, a closed-to-arrival Sunday, a full night, two-night minimum on Fridays. */
function sampleDays(today: ISODate): CalendarDays {
  const out: CalendarDays = {};
  for (let i = 0; i < 120; i++) {
    const d = addDays(today, i);
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    const weekend = dow === 5 || dow === 6;
    const detty = d.slice(5) >= "12-15" || d.slice(5) <= "01-05";
    let price = 5_500_000;
    if (weekend) price = 6_050_000;
    if (detty) price = Math.round(price * 1.35);
    out[d] = { date: d, fromKobo: i === 9 ? null : price, soldOut: i === 9, closedToArrival: dow === 0, closedToDeparture: false, minNights: dow === 5 ? 2 : null, ruleName: detty ? "Detty December" : weekend ? "Weekend" : null };
  }
  return out;
}

function breakdown(nights: { date: string; amountKobo: number; name: string }[], discountKobo = 0): PriceBreakdown {
  const sub = nights.reduce((n, l) => n + l.amountKobo, 0);
  const net = sub - discountKobo;
  const vat = Math.round(net * 0.075);
  const cons = Math.round(net * 0.05);
  return {
    currency: "NGN",
    unit: "NIGHT",
    rateKobo: nights[0].amountKobo,
    units: nights.length,
    lines: nights.map((n) => ({ date: n.date, description: n.name, amountKobo: n.amountKobo })),
    roomSubtotalKobo: sub,
    discountKobo,
    taxes: [
      { code: "VAT", label: "VAT", rateBps: 750, inclusive: false, amountKobo: vat },
      { code: "CONSUMPTION", label: "Lagos consumption tax", rateBps: 500, inclusive: false, amountKobo: cons },
    ],
    taxTotalKobo: vat + cons,
    totalKobo: net + vat + cons,
    firstNightTotalKobo: nights[0].amountKobo,
  };
}

export function PreviewRates({ today }: { today: ISODate }) {
  const days = useMemo(() => sampleDays(today), [today]);
  const [range, setRange] = useState<Range>({ checkIn: null, checkOut: null });
  const [loadingRange, setLoadingRange] = useState<Range>({ checkIn: null, checkOut: null });
  const [plan, setPlan] = useState<string>("bar");
  const nights = [
    { date: "2026-12-11", amountKobo: 8_500_000, name: "Deluxe King, Fri 11 Dec, Weekend" },
    { date: "2026-12-12", amountKobo: 9_350_000, name: "Deluxe King, Sat 12 Dec, Weekend" },
    { date: "2026-12-13", amountKobo: 8_500_000, name: "Deluxe King, Sun 13 Dec" },
  ];
  const flexQ = breakdown(nights);
  const nrQ = breakdown(nights.map((n) => ({ ...n, amountKobo: Math.round(n.amountKobo * 0.9) })));
  const freeUntil = "2026-12-09T13:00:00.000Z";
  const plans: PlanOffer[] = [
    { id: "bar", code: "BAR", name: "Best Available Rate", kind: "BAR", description: null, includesBreakfast: false, refundable: true, adjustmentLabel: null, cancellationPolicy: null, cancellationSummary: null, minNights: null, maxNights: null, fromKobo: 8_500_000, quote: flexQ, bookable: true, reason: null },
    { id: "nr", code: "NR", name: "Non-refundable", kind: "NON_REFUNDABLE", description: null, includesBreakfast: true, refundable: false, adjustmentLabel: "10% off", cancellationPolicy: null, cancellationSummary: null, minNights: null, maxNights: null, fromKobo: 7_650_000, quote: nrQ, bookable: true, reason: null },
  ];
  const undated = plans.map((p) => ({ ...p, quote: null }));
  const problems = (
    [
      ["LAGOSLONG", { code: "PROMO_INVALID", details: { reason: "MIN_NIGHTS", minNights: 4 } }],
      ["EASTER15", { code: "PROMO_INVALID", details: { reason: "EXPIRED", validTo: "2026-04-06" } }],
      ["DETTY", { code: "PROMO_INVALID", message: "DETTY is valid for stays from 15 Dec 2026 to 5 Jan 2027", details: { reason: "STAY_DATES" } }],
      ["SAVE1O", { code: "PROMO_INVALID", details: { reason: "NOT_FOUND" } }],
    ] as const
  ).map(([code, err]) => ({ code, ...promoMessage(code, err as { code: string }, { nights: 2, roomName: "Deluxe King" }) }));

  return (
    <div className="space-y-16">
      <section className="grid gap-10 lg:grid-cols-2">
        <div className="rounded-sm border border-line-strong bg-surface p-4 sm:p-6" data-testid="preview-calendar">
          <p className="kicker mb-4">Price calendar, ready</p>
          <RangeCalendar value={range} onChange={setRange} today={today} months={1} prices={{ days, status: "ready" }} />
        </div>
        <div className="space-y-10">
          <div className="rounded-sm border border-line-strong bg-surface p-4 sm:p-6">
            <p className="kicker mb-4">Loading</p>
            <RangeCalendar value={loadingRange} onChange={setLoadingRange} today={today} months={1} prices={{ days: {}, status: "loading" }} />
          </div>
        </div>
      </section>
      <section className="rounded-sm border border-line-strong bg-surface p-4 sm:max-w-md sm:p-6">
        <p className="kicker mb-4">Offline</p>
        <RangeCalendar value={{ checkIn: null, checkOut: null }} onChange={() => undefined} today={today} months={1} prices={{ days: {}, status: "error" }} />
      </section>
      <section className="max-w-3xl space-y-6">
        <p className="kicker">Rate plans, booking step one ({formatLong("2026-12-11")}, 3 nights)</p>
        <PlanChoice plans={plans} value={plan} onChange={setPlan} nights={3} fallbackPolicy={POLICY} freeUntil={freeUntil} />
        <PlanChoice plans={undated} value={plan} onChange={setPlan} nights={0} fallbackPolicy={POLICY} freeUntil={null} />
      </section>
      <section className="max-w-3xl space-y-6">
        <p className="kicker">Rate plans, hotel page</p>
        <PlanLedger roomName="Deluxe King" plans={plans} nights={3} fallbackPolicy={POLICY} freeUntil={freeUntil} hrefFor={() => "#"} />
        <PlanLedger roomName="Deluxe King" plans={undated} nights={0} fallbackPolicy={POLICY} freeUntil={null} hrefFor={() => "#"} />
      </section>
      <section className="max-w-2xl space-y-8">
        <p className="kicker">Promo code</p>
        <PromoField applied={null} busy={false} problem={null} onApply={() => undefined} onRemove={() => undefined} />
        <PromoField applied={null} busy={false} problem={null} onApply={() => undefined} onRemove={() => undefined} initialOpen />
        {problems.map((p) => (
          <PromoField key={p.code} applied={null} busy={false} problem={{ code: p.code, message: p.message, hint: p.hint }} onApply={() => undefined} onRemove={() => undefined} />
        ))}
        <PromoField applied={{ code: "WELCOME10", description: "10% off your first stay with us", discountKobo: 2_635_000 }} busy={false} problem={null} onApply={() => undefined} onRemove={() => undefined} />
      </section>
    </div>
  );
}
