"use client";

import type { PriceBreakdown, Quote } from "@/lib/booking-types";
import { formatLong, formatShort } from "@/lib/dates";
import { formatNaira, plural } from "@/lib/format";
import type { RoomTypePublic } from "@/lib/types";
import type { Range } from "../search/range-calendar";
import { Plate } from "../ui/plate";
import type { BookingHotel, DayUse, StayKind } from "./booking-flow";
import { estimateExtra, type ExtraSelection, type PublicExtra, type TransferSelection } from "@/lib/booking-form";
import { transferPrice } from "@/lib/pickup";
import type { PickupPoint } from "@/lib/theme/types";

/** M7: extras and transfers chosen so far, for the running total before the quote prices them. */
export interface SummaryAddOns {
  extras: ExtraSelection[];
  extrasList: PublicExtra[];
  transfers: TransferSelection[];
  points: PickupPoint[];
  persons: number;
  nights: number;
}

/** The booking summary in the side column: hotel, stay, and the price as it firms up. */
export function BookingSummary({
  hotel,
  room,
  kind,
  range,
  nights,
  dayUse,
  adults,
  kids,
  estimate,
  quote,
  loading,
  planName,
  addOns,
}: {
  hotel: BookingHotel;
  room?: RoomTypePublic;
  kind: StayKind;
  range: Range;
  nights: number;
  dayUse: DayUse;
  adults: number;
  kids: number;
  estimate: PriceBreakdown | null;
  quote: Quote | null;
  loading: boolean;
  planName?: string | null;
  addOns?: SummaryAddOns;
}) {
  const price = quote?.breakdown ?? estimate;
  // Before the quote: the add-ons at their entered prices (tax comes with the quote).
  const pending = !quote && addOns
    ? [
        ...addOns.extras.flatMap((s) => {
          const e = addOns.extrasList.find((x) => x.id === s.extraId);
          return e ? [{ key: `e-${e.id}`, label: e.name, amount: e.price && !s.quantity ? e.price.amountKobo : estimateExtra(e, s.quantity ?? 0, addOns.nights, addOns.persons) }] : [];
        }),
        ...addOns.transfers.flatMap((t) => {
          const p = addOns.points.find((x) => x.id === t.pickupPointId);
          const v = p?.vehicleOptions.find((o) => o.id === t.vehicleOptionId) ?? null;
          return p ? [{ key: `t-${t.direction}`, label: t.direction === "ARRIVAL" ? `Pickup, ${p.shortName ?? p.name}` : `Drop-off, ${p.shortName ?? p.name}`, amount: transferPrice(p, t.direction, v) }] : [];
        }),
      ]
    : [];
  const pendingTotal = pending.reduce((n, x) => n + x.amount, 0);
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
        <Row k="Guests">
          {plural(adults, "adult")}
          {kids ? `, ${plural(kids, "child", "children")}` : ""}
        </Row>
        {kind === "overnight" && nights ? <Row k="Nights">{nights}</Row> : null}
        {planName ? <Row k="Rate">{planName}</Row> : null}
      </dl>
      <div className="border-t border-ink bg-paper p-4" aria-live="polite">
        {price ? (
          <dl className={`num space-y-2 text-[13px] transition-opacity ${loading && !quote ? "opacity-50" : ""}`}>
            <div className="flex justify-between gap-4">
              <dt className="font-sans text-ink-muted [font-variant-numeric:normal]">
                {price.units} {price.unit === "HOUR" ? (price.units === 1 ? "hour" : "hours") : price.units === 1 ? "night" : "nights"}
              </dt>
              <dd>{formatNaira(price.lines.reduce((n, l) => n + l.amountKobo, 0))}</dd>
            </div>
            {price.discountKobo > 0 ? (
              <div className="flex justify-between gap-4 text-palm" data-testid="summary-discount">
                <dt className="font-sans [font-variant-numeric:normal]">
                  {quote?.promo && quote.loyalty?.pointsRedeemed ? `Promo ${quote.promo.code} and points` : quote?.promo ? `Promo ${quote.promo.code}` : quote?.loyalty?.pointsRedeemed ? `${quote.loyalty.programme} points` : "Discount"}
                </dt>
                <dd>&minus;{formatNaira(price.discountKobo)}</dd>
              </div>
            ) : null}
            {(quote?.breakdown.addOns ?? []).map((x) => (
              <div key={`${x.kind}-${x.refId}`} className="flex justify-between gap-4" data-testid="summary-addon">
                <dt className="min-w-0 truncate font-sans text-ink-muted [font-variant-numeric:normal]">{x.description}</dt>
                <dd>{formatNaira(x.netKobo)}</dd>
              </div>
            ))}
            {pending.map((x) => (
              <div key={x.key} className="flex justify-between gap-4" data-testid="summary-addon">
                <dt className="min-w-0 truncate font-sans text-ink-muted [font-variant-numeric:normal]">{x.label}</dt>
                <dd>{formatNaira(x.amount)}</dd>
              </div>
            ))}
            {price.taxes.filter((t) => !t.inclusive).map((t) => (
              <div key={t.code} className="flex justify-between gap-4">
                <dt className="font-sans text-ink-muted [font-variant-numeric:normal]">{t.label}</dt>
                <dd>{formatNaira(t.amountKobo)}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
              <dt className="font-sans text-sm font-medium">{quote ? "Total" : pending.length ? "Total, estimated before tax on extras" : "Total, estimated"}</dt>
              <dd className="text-2xl font-medium" data-testid="summary-total">{formatNaira(price.totalKobo + pendingTotal)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-ink-muted">{loading ? "Checking prices for your dates" : "Choose a room and dates to see the full price, taxes included."}</p>
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
