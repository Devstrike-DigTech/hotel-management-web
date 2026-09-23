/**
 * M5 loyalty view models (API-M5.md section 6.4). A hotel group runs one programme across all of its
 * properties, so a guest holds one balance and one tier per group. Adapters from the API's shapes
 * live here so components never read raw responses.
 */
import type { GuestLoyaltyTxn, GuestMembership, LoyaltyTxnType, QuoteLoyalty } from "./booking-types";
import type { HotelLoyalty } from "./types";

export type TierColor = "palm" | "brass" | "laterite" | "adire" | "ochre";

export interface LoyaltyTierView {
  name: string;
  color: TierColor | null;
  perks: string[];
}

export interface LoyaltyMembershipView {
  group: { slug: string | null; name: string };
  programmeName: string;
  memberNumber: string | null;
  points: number;
  /** What the balance is worth off a stay, in kobo. */
  pointsValueKobo: number;
  /** Points per ₦1,000 spent, when known (it comes from the hotel's programme, not the membership). */
  earnPerThousand: number | null;
  tier: LoyaltyTierView | null;
  nightsThisYear: number;
  next: { name: string; nightsToGo: number } | null;
  expiring: { points: number; on: string } | null;
}

export interface StatementEntryView {
  id: string;
  at: string;
  kind: LoyaltyTxnType;
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
  /** The most the stay can take (the programme's cap on the total, and the balance). */
  maxPoints: number;
  minPoints: number;
  /** The slider moves in steps (e.g. 100); "use the most" is always exact. */
  step: number;
  pointValueKobo: number;
  /** Why the guest cannot redeem, when they cannot. */
  reason: string | null;
}

const COLORS = new Set<TierColor>(["palm", "brass", "laterite", "adire", "ochre"]);
const asColor = (c: string | null | undefined): TierColor | null => (c && COLORS.has(c as TierColor) ? (c as TierColor) : null);

export const pointsToKobo = (points: number, pointValueKobo: number) => Math.round(points * pointValueKobo);

export function formatPoints(n: number) {
  const s = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return n < 0 ? `−${s}` : s;
}

/** Rounds a wish down to the offer's step and into its range; the maximum itself is always allowed. */
export function clampPoints(want: number, offer: Pick<RedeemOffer, "maxPoints" | "minPoints" | "step">) {
  if (offer.maxPoints < offer.minPoints) return 0;
  if (want >= offer.maxPoints) return offer.maxPoints;
  const step = Math.max(1, offer.step);
  const n = Math.floor(Math.max(0, want) / step) * step;
  return Math.min(offer.maxPoints, Math.max(offer.minPoints, n));
}

export function membershipView(m: GuestMembership, earnPerThousand: number | null = null): LoyaltyMembershipView {
  return {
    group: { slug: m.group.slug, name: m.group.name },
    programmeName: m.programme,
    memberNumber: m.memberNo,
    points: m.points,
    pointsValueKobo: m.valueKobo,
    earnPerThousand,
    tier: m.tier ? { name: m.tier.name, color: asColor(m.tier.color), perks: m.tier.perks ?? [] } : null,
    nightsThisYear: m.nights12m,
    next: m.nextTier ? { name: m.nextTier.name, nightsToGo: m.nextTier.nightsNeeded } : null,
    expiring: m.expiringSoon ? { points: m.expiringSoon.points, on: m.expiringSoon.date } : null,
  };
}

export function statementView(t: GuestLoyaltyTxn): StatementEntryView {
  return {
    id: t.id,
    at: t.createdAt,
    kind: t.type,
    points: t.points,
    description: t.description,
    code: t.reservation?.code ?? null,
    propertyName: t.property?.name ?? null,
    balanceAfter: t.balanceAfter ?? null,
  };
}

/**
 * The review step's redemption offer, from the quote's loyalty block and the hotel's programme.
 * Null when there is nothing to offer (no programme, not a member, or signed out).
 */
export function redeemOffer(q: QuoteLoyalty | null | undefined, programme: HotelLoyalty["programme"] | null, groupName: string): RedeemOffer | null {
  if (!q || !q.member || q.pointsBalance === null) return null;
  const pointValueKobo = programme?.pointValueKobo ?? (q.pointsRedeemed > 0 ? q.redeemValueKobo / q.pointsRedeemed : 100);
  const minPoints = programme?.minRedeemPoints ?? 1;
  // When points are already applied, the cap is for the stay before them.
  const maxPoints = Math.max(0, Math.min(q.pointsBalance, q.maxRedeemablePoints ?? q.pointsBalance));
  const reason =
    q.pointsBalance < minPoints
      ? `You can use them from ${formatPoints(minPoints)} points.`
      : maxPoints < minPoints
        ? `This stay is too small to use points on; the hotel takes them off stays worth at least ${formatPoints(minPoints)} points.`
        : null;
  return { programmeName: q.programme, groupName, balance: q.pointsBalance, maxPoints, minPoints, step: 100, pointValueKobo, reason };
}
