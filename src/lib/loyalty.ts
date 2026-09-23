/**
 * M5 loyalty view models. A hotel group (the tenant) runs one programme across all of its
 * properties, so a guest holds one balance and one tier per group. Adapters from the API's
 * shapes live next to the types so components never read raw responses.
 */

export interface LoyaltyTierView {
  code: string;
  name: string;
  /** Nights in a calendar year needed to reach this tier (0 for the entry tier). */
  minNights: number;
  perks: string[];
  bonusPct: number;
}

export interface LoyaltyMembershipView {
  group: { slug: string | null; name: string; logoUrl: string | null; accentColor: string | null };
  programmeName: string;
  memberNumber: string | null;
  points: number;
  /** What the balance is worth off a stay, in kobo. */
  pointsValueKobo: number;
  /** Kobo one point is worth when redeemed. */
  pointValueKobo: number;
  /** Points earned per ₦1,000 spent on rooms and outlets (before any tier bonus). */
  earnPerThousand: number;
  tier: LoyaltyTierView;
  tiers: LoyaltyTierView[];
  nightsThisYear: number;
  next: { tier: LoyaltyTierView; nightsToGo: number } | null;
  expiring: { points: number; on: string } | null;
  memberSince: string | null;
  /** Properties in the group where the points can be earned and spent. */
  properties: { slug: string; name: string; area: string; city: string }[];
}

export type StatementKind = "EARN" | "REDEEM" | "ADJUST" | "EXPIRE" | "BONUS" | "REVERSAL";

export interface StatementEntryView {
  id: string;
  at: string;
  kind: StatementKind;
  /** Signed: positive for points in, negative for points out. */
  points: number;
  description: string;
  code: string | null;
  propertyName: string | null;
  balanceAfter: number | null;
}

/** "Use N points" at booking: what the guest may redeem on this quote. */
export interface RedeemOffer {
  programmeName: string;
  groupName: string;
  balance: number;
  /** The most the stay can take (policy caps, the total, the balance). */
  maxPoints: number;
  minPoints: number;
  /** Points are redeemed in steps (e.g. 100). */
  step: number;
  pointValueKobo: number;
  /** Why the guest cannot redeem, when they cannot. */
  reason: string | null;
}

export const pointsToKobo = (points: number, pointValueKobo: number) => Math.round(points * pointValueKobo);

export function formatPoints(n: number) {
  const s = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return n < 0 ? `−${s}` : s;
}

/** Rounds a wish down to the offer's step and into its range. */
export function clampPoints(want: number, offer: Pick<RedeemOffer, "maxPoints" | "minPoints" | "step">) {
  const step = Math.max(1, offer.step);
  const max = Math.floor(offer.maxPoints / step) * step;
  if (max < offer.minPoints) return 0;
  const n = Math.floor(Math.max(0, want) / step) * step;
  return Math.min(max, Math.max(offer.minPoints, n));
}

/** Tier progress as a fraction between the current tier's threshold and the next. */
export function tierProgress(m: Pick<LoyaltyMembershipView, "nightsThisYear" | "tier" | "next">) {
  if (!m.next) return 1;
  const span = m.next.tier.minNights - m.tier.minNights;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (m.nightsThisYear - m.tier.minNights) / span));
}

/** Earned points for a spend, as the programme states it (per ₦1,000, bonus by tier). */
export function estimateEarn(spendKobo: number, earnPerThousand: number, bonusPct = 0) {
  const base = Math.floor(spendKobo / 100_000) * earnPerThousand;
  return Math.floor(base * (1 + bonusPct / 100));
}

/** A tier's rank among the programme's tiers (0 = entry), used for the badge's weight. */
export function tierRank(tier: LoyaltyTierView, tiers: LoyaltyTierView[]) {
  const sorted = [...tiers].sort((a, b) => a.minNights - b.minNights);
  const i = sorted.findIndex((t) => t.code === tier.code);
  return i < 0 ? 0 : i;
}
