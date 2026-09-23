import { HourglassMedium } from "@phosphor-icons/react/ssr";
import { formatLong } from "@/lib/dates";
import { formatNaira } from "@/lib/format";
import { formatPoints, type LoyaltyMembershipView } from "@/lib/loyalty";
import { TierBadge } from "./tier-badge";

/**
 * One hotel group's membership, set like a printed members' card: the programme as letterhead,
 * the balance in large figures with what it is worth, the tier, and the year's nights as tally
 * marks up to the next tier's threshold.
 */
export function PointsCard({ m, compact = false }: { m: LoyaltyMembershipView; compact?: boolean }) {
  return (
    <article
      className="relative overflow-hidden rounded-md border border-line-strong bg-surface shadow-[var(--shadow-card)]"
      aria-label={`${m.programmeName}, ${m.group.name}`}
      data-testid="points-card"
      data-group={m.group.slug ?? undefined}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-brass" />
      <span aria-hidden className="adire-field pointer-events-none absolute -right-10 -top-10 size-56 text-brass opacity-[0.12]" />
      <div className={`relative ${compact ? "p-5" : "p-5 sm:p-7"}`}>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="kicker flex items-center gap-2 !text-ink"><span aria-hidden className="size-1.5 rotate-45 bg-brass" />{m.programmeName}</p>
            <h3 className="display-sm mt-1.5 text-[1.45rem] leading-tight">{m.group.name}</h3>
          </div>
          {m.tier ? <TierBadge name={m.tier.name} color={m.tier.color} size="md" /> : null}
        </header>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <p className="leading-none">
            <span className="num block text-[clamp(2.6rem,6vw,3.4rem)] font-medium tracking-tight" data-testid="points-balance">
              {formatPoints(m.points)}
            </span>
            <span className="mt-2 block text-sm text-ink-muted">points</span>
          </p>
          <p className="text-sm text-ink-muted sm:text-right">
            worth <span className="num text-base text-ink">{formatNaira(m.pointsValueKobo)}</span>
            <span className="block text-xs">off a stay at any of the group&rsquo;s hotels</span>
          </p>
        </div>

        <Tally m={m} />

        {!compact && m.tier?.perks.length ? (
          <div className="mt-6 border-t border-line pt-4">
            <p className="kicker !text-[10px]">{m.tier.name} perks</p>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
              {m.tier.perks.map((p) => (
                <li key={p} className="flex items-baseline gap-2">
                  <span aria-hidden className="size-1 translate-y-[-2px] rotate-45 bg-brass" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {m.expiring && m.expiring.points > 0 ? (
          <p className="mt-4 flex items-center gap-2 text-[13px] text-ochre">
            <HourglassMedium size={15} aria-hidden />
            <span>
              <span className="num">{formatPoints(m.expiring.points)}</span> points expire on {formatLong(m.expiring.on.slice(0, 10))}
            </span>
          </p>
        ) : null}

        {!compact ? (
          <footer className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-t border-dashed border-line-strong pt-3 text-xs text-ink-muted">
            <span>
              {m.earnPerThousand ? (
                <>
                  Earn <span className="num text-ink">{m.earnPerThousand}</span> {m.earnPerThousand === 1 ? "point" : "points"} for every <span className="num">₦1,000</span> on rooms, food and drink.
                </>
              ) : (
                <>Points come from rooms, food and drink at any of the group&rsquo;s hotels, after check-out.</>
              )}
            </span>
            {m.memberNumber ? <span className="num">No. {m.memberNumber}</span> : null}
          </footer>
        ) : null}
      </div>
    </article>
  );
}

/** The year's nights as tally marks in fives, with the next tier's threshold at the end. */
function Tally({ m }: { m: LoyaltyMembershipView }) {
  const nights = m.nightsThisYear;
  const target = m.next ? nights + m.next.nightsToGo : nights;
  const n = (k: number) => `${k} ${k === 1 ? "night" : "nights"}`;
  const label = m.next
    ? `${n(nights)} in the last 12 months; ${m.next.nightsToGo} more to ${m.next.name}`
    : `${n(nights)} in the last 12 months${m.tier ? `; ${m.tier.name} is the top tier` : ""}`;
  // Tally marks read well up to about 30; beyond that a ruled bar says the same thing.
  const marks = target > 0 && target <= 30;
  if (!target) return <p className="mt-6 text-[13px] text-ink-muted" data-testid="tier-progress">{label}</p>;
  return (
    <div className="mt-6" data-testid="tier-progress">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="text-ink-muted">{label}</span>
        {m.next ? <span className="kicker !text-[10px]">{m.next.name}</span> : null}
      </div>
      {marks ? (
        <div className="mt-2.5 flex flex-wrap gap-x-2.5 gap-y-2" role="img" aria-label={label}>
          {Array.from({ length: Math.ceil(target / 5) }, (_, g) => {
            const inGroup = Math.min(5, target - g * 5);
            const filled = Math.max(0, Math.min(inGroup, nights - g * 5));
            const struck = inGroup === 5 && filled === 5;
            return (
              <span key={g} className="relative flex h-5 items-stretch gap-[3px]">
                {Array.from({ length: struck ? 4 : inGroup }, (_, i) => (
                  <span key={i} className={`w-[2px] rounded-full ${i < filled ? "bg-ink" : "bg-line-strong"}`} />
                ))}
                {struck ? (
                  <span aria-hidden className="absolute -inset-x-[3px] top-1/2 h-[2px] -translate-y-1/2 -rotate-[24deg] rounded-full bg-brass" />
                ) : null}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line" role="img" aria-label={label}>
          <div className="h-full bg-brass" style={{ width: `${Math.round(Math.min(1, target ? nights / target : 1) * 100)}%` }} />
        </div>
      )}
    </div>
  );
}
