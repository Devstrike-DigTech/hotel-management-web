"use client";

import { Check, Minus, Plus } from "@phosphor-icons/react";
import { CATEGORY_LABEL, estimateExtra, PRICING_UNIT, type ExtraCategory, type ExtraSelection, type PublicExtra } from "@/lib/booking-form";
import { formatNaira } from "@/lib/format";

/**
 * The paid extras the hotel sells with a stay, grouped by kind. Each shows what it costs for this
 * stay (nights and party counted in), with a quantity where the pricing needs one. The quote prices
 * them exactly, taxes included; this is the running figure while choosing.
 */
export function ExtrasPicker({
  extras,
  value,
  onChange,
  persons,
  nights,
  errors,
  loading,
}: {
  extras: PublicExtra[];
  value: ExtraSelection[];
  onChange: (v: ExtraSelection[]) => void;
  persons: number;
  nights: number;
  errors?: Record<string, string>;
  loading?: boolean;
}) {
  const chosen = new Map(value.map((s) => [s.extraId, s]));
  const order: ExtraCategory[] = ["FOOD", "EARLY_LATE", "CELEBRATION", "WELLNESS", "TRANSPORT", "OTHER"];
  const groups = order.map((c) => [c, extras.filter((e) => e.category === c)] as const).filter(([, l]) => l.length);
  const total = value.reduce((n, s) => {
    const e = extras.find((x) => x.id === s.extraId);
    return e ? n + estimateExtra(e, s.quantity ?? 0, nights, persons) : n;
  }, 0);

  const set = (e: PublicExtra, on: boolean, quantity?: number) => {
    const rest = value.filter((s) => s.extraId !== e.id);
    if (!on) return onChange(rest);
    const q = quantity ?? (e.pricing === "PER_UNIT" ? 1 : e.pricing === "PER_PERSON" || e.pricing === "PER_PERSON_PER_NIGHT" ? persons : undefined);
    onChange([...rest, { extraId: e.id, ...(q !== undefined ? { quantity: q } : {}) }]);
  };

  if (!extras.length) return null;
  return (
    <div data-testid="extras-picker">
      <div className="space-y-8">
        {groups.map(([cat, list]) => (
          <fieldset key={cat}>
            <legend className="kicker mb-3">{CATEGORY_LABEL[cat]}</legend>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {list.map((e) => {
                const sel = chosen.get(e.id);
                const on = !!sel;
                const off = e.available === false;
                const qty = sel?.quantity ?? (e.pricing === "PER_UNIT" ? 1 : persons);
                const counted = e.pricing === "PER_UNIT" || e.pricing === "PER_PERSON" || e.pricing === "PER_PERSON_PER_NIGHT";
                const max = e.pricing === "PER_UNIT" ? (e.maxUnits ?? 10) : persons;
                const amount = estimateExtra(e, qty, nights, persons);
                const err = errors?.[e.id];
                return (
                  <li
                    key={e.id}
                    className={`relative flex flex-col rounded-sm border p-4 transition-colors ${on ? "border-laterite bg-laterite/[0.05]" : "border-line-strong"} ${off ? "opacity-60" : ""} ${err ? "!border-danger" : ""}`}
                    data-testid="extra-option"
                    data-extra={e.name}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">{e.name}</p>
                        {e.description ? <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{e.description}</p> : null}
                        {e.kind === "EARLY_CHECK_IN" && e.availability.earlyFrom ? (
                          <p className="num mt-1 text-[12px] text-ink-muted">Room ready from {e.availability.earlyFrom}</p>
                        ) : e.kind === "LATE_CHECK_OUT" && e.availability.lateUntil ? (
                          <p className="num mt-1 text-[12px] text-ink-muted">Leave by {e.availability.lateUntil}</p>
                        ) : null}
                      </div>
                      <p className="num shrink-0 text-right text-sm">
                        <span className="block font-medium">{formatNaira(e.priceKobo)}</span>
                        <span className="block text-[11px] text-ink-muted">{PRICING_UNIT[e.pricing]}</span>
                      </p>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                      {off ? (
                        <p className="text-[12.5px] text-ochre">{e.unavailableReason ?? "Not available for these dates"}</p>
                      ) : on && counted ? (
                        <div className="flex items-center gap-2.5" role="group" aria-label={`${e.pricing === "PER_UNIT" ? "How many" : "For how many people"}: ${e.name}`}>
                          <button type="button" className="inline-grid size-8 place-items-center rounded-full border border-line-strong hover:border-ink disabled:opacity-35" disabled={qty <= 1} onClick={() => set(e, true, qty - 1)} aria-label="One fewer">
                            <Minus size={12} weight="bold" />
                          </button>
                          <output className="num min-w-[2ch] text-center" aria-live="polite">
                            {qty}
                          </output>
                          <button type="button" className="inline-grid size-8 place-items-center rounded-full border border-line-strong hover:border-ink disabled:opacity-35" disabled={qty >= max} onClick={() => set(e, true, qty + 1)} aria-label="One more">
                            <Plus size={12} weight="bold" />
                          </button>
                          <span className="text-[12px] text-ink-muted">{e.pricing === "PER_UNIT" ? "" : qty === 1 ? "person" : "people"}</span>
                        </div>
                      ) : (
                        <span className="num text-[12.5px] text-ink-muted">{on || nights ? `${formatNaira(amount)} for your stay` : ""}</span>
                      )}
                      <button
                        type="button"
                        aria-pressed={on}
                        disabled={off}
                        onClick={() => set(e, !on)}
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-sm px-3.5 text-sm font-medium transition-colors ${on ? "bg-laterite text-laterite-ink" : "border border-line-strong hover:border-ink"}`}
                        data-testid="extra-toggle"
                      >
                        {on ? (
                          <>
                            <Check size={14} weight="bold" aria-hidden /> Added
                          </>
                        ) : (
                          <>
                            <Plus size={14} aria-hidden /> Add
                          </>
                        )}
                        <span className="sr-only"> {e.name}</span>
                      </button>
                    </div>
                    {on && counted ? <p className="num mt-2 text-right text-[12px] text-ink-muted">{formatNaira(amount)} for your stay</p> : null}
                    {err ? (
                      <p className="mt-2 text-[12.5px] text-danger" role="alert">
                        {err}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>
      <p className={`mt-5 flex items-baseline justify-between gap-4 border-t border-line pt-4 text-sm ${loading ? "opacity-60" : ""}`} aria-live="polite" data-testid="extras-total">
        <span className="text-ink-muted">
          {value.length ? `${value.length} ${value.length === 1 ? "extra" : "extras"} chosen` : "No extras chosen"}
          {value.length ? ", before any tax" : ""}
        </span>
        <span className="num font-medium">{formatNaira(total)}</span>
      </p>
    </div>
  );
}
