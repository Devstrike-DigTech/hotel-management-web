"use client";

import { ArrowRight, Coffee, LockSimple, ShieldCheck, UsersThree } from "@phosphor-icons/react";
import Link from "next/link";
import { diffDays } from "@/lib/dates";
import { formatNaira } from "@/lib/format";
import { isNonRefundable, planTitle, plansFor, type PlanOffer } from "@/lib/rates";
import type { RoomTypePublic } from "@/lib/types";
import { useStay } from "../hotel/stay-context";

/**
 * Every room and every rate in one ledger, live for the chosen dates: the Business template's
 * "rates first" table, also available to other templates as the rates-calendar section.
 */
export function RatesTable({ rooms, look = "business" }: { rooms: RoomTypePublic[]; look?: "business" | "editorial" }) {
  const { range, availability, roomFor, bookHref, retryAvailability } = useStay();
  const dated = !!(range.checkIn && range.checkOut);
  const nights = dated ? diffDays(range.checkIn!, range.checkOut!) : 0;
  const loading = dated && (availability.status === "loading" || availability.status === "idle");
  const sorted = [...rooms].sort((a, b) => a.basePriceKobo - b.basePriceKobo);
  const rows = sorted.flatMap((room) => {
    const live = roomFor(room.id);
    const plans = plansFor(room, live);
    const list: (PlanOffer | null)[] = plans.length ? plans : [null];
    return list.map((plan, i) => ({ room, plan, live, first: i === 0, span: list.length }));
  });
  const tight = look === "business";

  return (
    <div className="rates-table" data-testid="rates-table">
      <div className="flex flex-wrap items-baseline justify-between gap-3 pb-3 text-[13px] text-ink-muted" aria-live="polite">
        <p>
          {dated ? (
            <>
              Totals for <span className="num text-ink">{nights}</span> {nights === 1 ? "night" : "nights"}, taxes included.
            </>
          ) : (
            "Nightly rates before tax. Choose dates for the stay's total."
          )}
        </p>
        {availability.status === "error" ? (
          <button type="button" className="link-static text-ochre" onClick={retryAvailability}>
            Live prices did not load. Try again
          </button>
        ) : loading ? (
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-brass" /> Checking live availability
          </span>
        ) : dated ? (
          <span className="text-palm">Live from the front desk</span>
        ) : null}
      </div>
      {/* Phones: one line per rate, the price and the way in on the right. */}
      <ul className="divide-y divide-line border-y border-ink sm:hidden">
        {rows.map(({ room, plan, live, first }) => {
          const out = dated && live && !live.bookable;
          const blocked = out || (dated && plan?.quote && !plan.bookable);
          const total = plan?.quote?.totalKobo ?? (!plan ? live?.quote?.totalKobo : undefined) ?? null;
          const nightly = plan?.fromKobo ?? room.fromKobo ?? room.basePriceKobo;
          return (
            <li key={`m-${room.id}-${plan?.id ?? "base"}`} className="flex items-center justify-between gap-3 py-3" data-testid="rate-row-mobile">
              <div className="min-w-0">
                {first ? <p className="font-medium">{room.name}</p> : null}
                <p className="text-[13px] text-ink-muted">
                  {plan ? planTitle(plan) : "Room only"}
                  {plan && isNonRefundable(plan) ? ", non-refundable" : plan ? ", free cancellation" : ""}
                  {plan?.includesBreakfast ? ", breakfast" : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <p className="num text-right text-sm">
                  {loading ? <span className="skeleton block h-4 w-16 rounded-xs" /> : dated && total !== null && !blocked ? formatNaira(total) : <span className={blocked ? "text-ink-muted line-through" : ""}>{formatNaira(nightly)}</span>}
                </p>
                {blocked ? null : (
                  <Link href={bookHref(room.id, plan?.id)} className="btn btn-primary !min-h-9 !px-3 text-[13px]" aria-label={`Book the ${room.name}${plan ? `, ${planTitle(plan)} rate` : ""}`}>
                    Book
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="relative hidden overflow-x-auto sm:block">
        <table className={`w-full min-w-[34rem] border-collapse text-left ${tight ? "text-[13.5px]" : "text-sm"}`}>
          <thead>
            <tr className="border-y border-ink text-[11px] uppercase tracking-[0.12em] text-ink-muted">
              <th scope="col" className="py-2 pr-4 font-medium">Room</th>
              <th scope="col" className="py-2 pr-4 font-medium">Rate</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">{dated ? "Stay" : "Night"}</th>
              <th scope="col" className="py-2">
                <span className="sr-only">Book</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ room, plan, live, first, span }) => {
              const out = dated && live && !live.bookable;
              const blocked = out || (dated && plan?.quote && !plan.bookable);
              const total = plan?.quote?.totalKobo ?? (first && !plan ? live?.quote?.totalKobo : undefined) ?? null;
              const nightly = plan?.fromKobo ?? room.fromKobo ?? room.basePriceKobo;
              return (
                <tr key={`${room.id}-${plan?.id ?? "base"}`} className={`${first ? "border-t border-line-strong" : "border-t border-line"} align-top`} data-testid="rate-row">
                  {first ? (
                    <th scope="rowgroup" rowSpan={span} className={`pr-4 font-normal ${tight ? "py-3" : "py-4"}`}>
                      <span className="block font-medium text-ink">{room.name}</span>
                      <span className="num mt-1 inline-flex items-center gap-1 text-[12px] text-ink-muted">
                        <UsersThree size={13} aria-hidden /> {room.capacity}
                        {room.bedType ? <span> &middot; {room.bedType}</span> : null}
                        {room.sizeSqm ? <span> &middot; {room.sizeSqm} m&sup2;</span> : null}
                      </span>
                      {dated && live ? (
                        <span className={`kicker mt-1.5 block !text-[10px] ${out ? "!text-ochre" : live.lowAvailability ? "!text-laterite" : "!text-palm"}`}>
                          {out ? (live.unavailableReason === "CAPACITY" ? "Too small for your group" : "Full on your dates") : live.lowAvailability ? `Only ${live.available} left` : "Free"}
                        </span>
                      ) : null}
                    </th>
                  ) : null}
                  <td className={`pr-4 ${tight ? "py-3" : "py-4"}`}>
                    <span className="block">{plan ? planTitle(plan) : "Room only"}</span>
                    {plan ? (
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-muted">
                        {isNonRefundable(plan) ? (
                          <span className="inline-flex items-center gap-1">
                            <LockSimple size={12} aria-hidden /> Non-refundable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-palm">
                            <ShieldCheck size={12} aria-hidden /> Free cancellation
                          </span>
                        )}
                        {plan.includesBreakfast ? (
                          <span className="inline-flex items-center gap-1">
                            <Coffee size={12} aria-hidden /> Breakfast
                          </span>
                        ) : null}
                        {plan.adjustmentLabel ? <span className="text-brass">{plan.adjustmentLabel}</span> : null}
                        {plan.minNights && plan.minNights > 1 ? <span>{plan.minNights}+ nights</span> : null}
                      </span>
                    ) : null}
                    {dated && plan && plan.quote && !plan.bookable && plan.reason ? <span className="mt-1 block text-[12px] text-ochre">{plan.reason}</span> : null}
                  </td>
                  <td className={`num pr-4 text-right ${tight ? "py-3" : "py-4"}`}>
                    {loading ? (
                      <span className="skeleton ml-auto block h-5 w-24 rounded-xs" />
                    ) : dated && total !== null && !blocked ? (
                      <span className="text-[1.05em] font-medium">{formatNaira(total)}</span>
                    ) : dated && blocked ? (
                      <span className="text-ink-muted line-through decoration-1">{formatNaira(nightly)}</span>
                    ) : (
                      <span>
                        <span className="font-medium">{formatNaira(nightly)}</span>
                        <span className="block text-[11px] text-ink-muted">a night</span>
                      </span>
                    )}
                  </td>
                  <td className={`text-right ${tight ? "py-2.5" : "py-3.5"}`}>
                    {blocked ? (
                      <span className="text-[12px] text-ink-muted">Not available</span>
                    ) : (
                      <Link href={bookHref(room.id, plan?.id)} className="btn btn-primary group !min-h-9 !px-3 text-[13px]" aria-label={`Book the ${room.name}${plan ? `, ${planTitle(plan)} rate` : ""}`}>
                        Book <ArrowRight size={14} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
