import type { LoyaltyTxnType } from "@/lib/booking-types";
import { formatPoints, type StatementEntryView } from "@/lib/loyalty";
import { formatLagosShort } from "@/lib/time";

const KIND: Record<LoyaltyTxnType, string> = {
  EARN: "Earned",
  REDEEM: "Used",
  ADJUST: "Adjusted",
  EXPIRE: "Expired",
  REVERSAL: "Reversed",
};

/** The points statement as a ledger: date, what happened, points in or out, balance. */
export function PointsStatement({ entries, programmeName }: { entries: StatementEntryView[]; programmeName: string }) {
  if (!entries.length)
    return (
      <p className="rounded-sm border border-dashed border-line-strong px-5 py-6 text-sm text-ink-muted" data-testid="statement-empty">
        Nothing here yet. Points arrive the day after you check out of a stay.
      </p>
    );
  const withBalance = entries.some((e) => e.balanceAfter !== null);
  return (
    <table className="w-full border-collapse text-sm" data-testid="points-statement">
      <caption className="sr-only">{programmeName} statement</caption>
      <thead>
        <tr className="kicker border-b border-ink text-left !text-[10px]">
          <th scope="col" className="py-2 pr-4 font-normal">Date</th>
          <th scope="col" className="py-2 pr-4 font-normal">Entry</th>
          <th scope="col" className="py-2 text-right font-normal">Points</th>
          {withBalance ? (
            <th scope="col" className="hidden py-2 pl-6 text-right font-normal sm:table-cell">
              Balance
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => {
          const tone = e.kind === "EXPIRE" ? "text-ink-muted" : e.points > 0 ? "text-palm" : "text-ink";
          return (
            <tr key={e.id} className="border-b border-line align-top" data-testid="statement-row" data-kind={e.kind}>
              <td className="num whitespace-nowrap py-3 pr-4 text-ink-muted">{formatLagosShort(e.at).replace(/,.*$/, "")}</td>
              <td className="py-3 pr-4">
                <span className="kicker mr-2 !text-[10px]">{KIND[e.kind] ?? e.kind}</span>
                <span>{e.description}</span>
                {e.code || e.propertyName ? (
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    {e.propertyName}
                    {e.code && e.propertyName ? " · " : ""}
                    {e.code ? <span className="num">{e.code}</span> : null}
                  </span>
                ) : null}
              </td>
              <td className={`num whitespace-nowrap py-3 text-right font-medium ${tone}`}>
                {e.points > 0 ? "+" : ""}
                {formatPoints(e.points)}
              </td>
              {withBalance ? (
                <td className="num hidden whitespace-nowrap py-3 pl-6 text-right text-ink-muted sm:table-cell">{e.balanceAfter === null ? "" : formatPoints(e.balanceAfter)}</td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
