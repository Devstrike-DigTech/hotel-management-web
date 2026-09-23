"use client";

import { Check, Minus } from "@phosphor-icons/react";
import { Fragment, useState } from "react";
import type { Feature, Plan } from "@/lib/types";

const CATEGORY_ORDER = ["Operations", "Revenue", "Guests", "Growth", "Platform"];

function limitText(n: number | undefined) {
  if (n === undefined) return "—";
  return n === -1 ? "Unlimited" : String(n);
}

/**
 * Full comparison, grouped by feature category. The plan header sticks under the site
 * header. On narrow screens one plan is compared at a time, chosen with the tabs.
 */
export function CompareTable({ plans, features }: { plans: Plan[]; features: Feature[] }) {
  const [focus, setFocus] = useState(plans.find((p) => p.highlighted)?.code ?? plans[0]?.code);
  const groups = [...new Set([...CATEGORY_ORDER, ...features.map((f) => f.category)])]
    .map((c) => ({ category: c, items: features.filter((f) => f.category === c) }))
    .filter((g) => g.items.length);

  const cell = (code: string) => (code === focus ? "table-cell" : "hidden md:table-cell");

  return (
    <div>
      <div role="tablist" aria-label="Compare plan" className="mb-6 flex gap-1 overflow-x-auto md:hidden">
        {plans.map((p) => (
          <button
            key={p.code}
            role="tab"
            aria-selected={p.code === focus}
            onClick={() => setFocus(p.code)}
            className={`rounded-full border px-4 py-1.5 text-sm ${p.code === focus ? "border-ink bg-ink text-paper" : "border-line-strong text-ink-muted"}`}
          >
            {p.name}
          </button>
        ))}
      </div>
      <table className="w-full border-separate border-spacing-0 text-left text-[0.9375rem]">
        <caption className="sr-only">Every feature, by plan</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky top-16 z-10 border-b border-ink bg-paper py-4 pr-4 align-bottom">
              <span className="kicker">Feature</span>
            </th>
            {plans.map((p) => (
              <th
                key={p.code}
                scope="col"
                className={`sticky top-16 z-10 w-[9rem] border-b border-ink bg-paper px-3 py-4 text-center align-bottom lg:w-[11rem] ${cell(p.code)}`}
              >
                <span className={`display-sm block text-xl ${p.highlighted ? "text-laterite" : ""}`}>{p.name}</span>
                {p.highlighted ? <span className="kicker mt-1 block !text-[9.5px] !text-brass">Most chosen</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <GroupHead label="Limits" span={plans.length + 1} />
          {(
            [
              ["Rooms", "max_rooms"],
              ["Staff logins", "max_staff"],
              ["Properties", "max_properties"],
            ] as const
          ).map(([label, key]) => (
            <tr key={key} className="group">
              <th scope="row" className="border-b border-line py-3 pr-4 font-normal group-hover:bg-surface">
                {label}
              </th>
              {plans.map((p) => (
                <td key={p.code} className={`num border-b border-line px-3 py-3 text-center text-sm group-hover:bg-surface ${cell(p.code)} ${p.highlighted ? "bg-surface/60" : ""}`}>
                  {limitText(p.limits[key])}
                </td>
              ))}
            </tr>
          ))}
          <tr className="group">
            <th scope="row" className="border-b border-line py-3 pr-4 font-normal group-hover:bg-surface">
              Marketplace commission
            </th>
            {plans.map((p) => (
              <td key={p.code} className={`num border-b border-line px-3 py-3 text-center text-sm group-hover:bg-surface ${cell(p.code)} ${p.highlighted ? "bg-surface/60" : ""}`}>
                {p.commissionBps === null ? "Negotiated" : `${p.commissionBps / 100}%`}
              </td>
            ))}
          </tr>
          {groups.map((g) => (
            <Fragment key={g.category}>
              <GroupHead label={g.category} span={plans.length + 1} />
              {g.items.map((f) => (
                <tr key={f.code} className="group">
                  <th scope="row" className="border-b border-line py-3 pr-4 font-normal group-hover:bg-surface">
                    <span className="block">{f.name}</span>
                    <span className="block text-xs leading-snug text-ink-muted">{f.description}</span>
                  </th>
                  {plans.map((p) => {
                    const has = p.features.includes(f.code);
                    return (
                      <td key={p.code} className={`border-b border-line px-3 py-3 text-center group-hover:bg-surface ${cell(p.code)} ${p.highlighted ? "bg-surface/60" : ""}`}>
                        {has ? (
                          <Check size={18} weight="bold" className="inline text-laterite" aria-label="Included" />
                        ) : (
                          <Minus size={16} className="inline text-line-strong" aria-label="Not included" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupHead({ label, span }: { label: string; span: number }) {
  return (
    <tr>
      <th colSpan={span} scope="colgroup" className="pb-3 pt-10 text-left">
        <span className="display-sm text-2xl italic">{label}</span>
      </th>
    </tr>
  );
}
