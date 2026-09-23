"use client";

import { useState } from "react";
import { WhatsAppChat } from "@/components/chat/whatsapp-chat";
import { GroupIndex } from "@/components/hotel/group-index";
import { PointsCard } from "@/components/loyalty/points-card";
import { PointsToEarn, RedeemPoints } from "@/components/loyalty/redeem-points";
import { PointsStatement } from "@/components/loyalty/statement";
import { TierBadge } from "@/components/loyalty/tier-badge";
import { pointsToKobo, type LoyaltyMembershipView, type RedeemOffer, type StatementEntryView } from "@/lib/loyalty";

export const SAMPLE_MEMBERSHIP: LoyaltyMembershipView = {
  group: { slug: "palmwine-house", name: "The Palmwine House" },
  programmeName: "Palmwine Circle",
  memberNumber: "PWC-000218",
  points: 12450,
  pointsValueKobo: 1245000,
  earnPerThousand: 10,
  tier: { name: "Silver", color: "adire", perks: ["Late check-out to 2 pm", "Welcome drink"] },
  nightsThisYear: 17,
  next: { name: "Gold", nightsToGo: 8 },
  expiring: { points: 1200, on: "2026-11-20" },
};

const STATEMENT: StatementEntryView[] = [
  { id: "1", at: "2026-09-12T11:00:00Z", kind: "EARN", points: 1910, description: "Stay, 2 nights", code: "PWH-7K3Q9", propertyName: "The Palmwine House", balanceAfter: 12450 },
  { id: "2", at: "2026-08-30T09:30:00Z", kind: "REDEEM", points: -4000, description: "Taken off a booking", code: "PWI-2M8TX", propertyName: "Palmwine House Ikoyi", balanceAfter: 10540 },
  { id: "3", at: "2026-08-02T12:00:00Z", kind: "REVERSAL", points: 500, description: "Points returned from a cancelled booking", code: null, propertyName: null, balanceAfter: 14540 },
  { id: "4", at: "2026-06-30T23:00:00Z", kind: "EXPIRE", points: -300, description: "Points from June 2025", code: null, propertyName: null, balanceAfter: 14040 },
  { id: "5", at: "2026-06-11T10:15:00Z", kind: "ADJUST", points: 250, description: "Goodwill for the late room", code: "PWH-4HQ2D", propertyName: "The Palmwine House", balanceAfter: 14340 },
];

const OFFER: RedeemOffer = { programmeName: "Palmwine Circle", groupName: "The Palmwine House", balance: 12450, maxPoints: 12450, minPoints: 500, step: 100, pointValueKobo: 100, reason: null };

/** Development gallery of the M5 guest pieces: loyalty, the group index and WhatsApp entry points. */
export function PreviewM5() {
  const [applied, setApplied] = useState<{ points: number; discountKobo: number } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-16" data-testid="preview-m5">
      <section className="flex flex-wrap items-center gap-3">
        {(["palm", "adire", "brass", "laterite", "ochre", null] as const).map((c) => (
          <TierBadge key={String(c)} name={c ?? "Member"} color={c} />
        ))}
        <TierBadge name="Gold" color="brass" size="md" />
      </section>
      <section className="grid gap-8 lg:grid-cols-2">
        <PointsCard m={SAMPLE_MEMBERSHIP} />
        <div className="space-y-8">
          <PointsCard m={{ ...SAMPLE_MEMBERSHIP, group: { slug: "maitama-court", name: "Maitama Court" }, programmeName: "Court Rewards", points: 320, pointsValueKobo: 32000, tier: { name: "Member", color: "palm", perks: [] }, nightsThisYear: 3, next: { name: "Silver", nightsToGo: 7 }, expiring: null, earnPerThousand: null }} compact />
          <PointsCard m={{ ...SAMPLE_MEMBERSHIP, tier: { name: "Gold", color: "brass", perks: ["Late check-out to 4 pm"] }, nightsThisYear: 31, next: null, expiring: null }} compact />
        </div>
      </section>
      <section className="max-w-3xl">
        <PointsStatement entries={STATEMENT} programmeName="Palmwine Circle" />
      </section>
      <section className="grid max-w-2xl gap-5">
        <RedeemPoints
          offer={OFFER}
          applied={applied}
          busy={busy}
          problem={null}
          onApply={(p) => {
            setBusy(true);
            setTimeout(() => {
              setApplied({ points: p, discountKobo: pointsToKobo(p, OFFER.pointValueKobo) });
              setBusy(false);
            }, 500);
          }}
          onRemove={() => setApplied(null)}
        />
        <RedeemPoints offer={{ ...OFFER, balance: 320, maxPoints: 320 }} applied={null} busy={false} problem={null} onApply={() => undefined} onRemove={() => undefined} />
        <RedeemPoints offer={OFFER} applied={{ points: 4000, discountKobo: 400000 }} busy={false} problem={null} onApply={() => undefined} onRemove={() => undefined} />
        <PointsToEarn points={1910} programmeName="Palmwine Circle" />
        <PointsToEarn points={1910} programmeName="Palmwine Circle" state="earned" />
      </section>
      <section className="grid max-w-3xl gap-5 sm:grid-cols-2">
        <WhatsAppChat number="+2348031234567" hotelName="The Palmwine House" />
        <WhatsAppChat number="+2348031234567" hotelName="The Palmwine House" code="PWH-7K3Q9" />
        <ul className="divide-y divide-line rounded-md border border-line-strong bg-surface text-sm sm:col-span-2">
          <li>
            <WhatsAppChat number="+2348031234567" hotelName="The Palmwine House" code="PWH-7K3Q9" variant="row" />
          </li>
        </ul>
      </section>
      <section className="-mx-4 border-y border-line sm:-mx-8">
        <GroupIndex
          group={{ name: "Palmwine Group", tagline: "Two houses, one easy welcome", description: "The Palmwine House opened in Lekki in 2019; its sister in Ikoyi followed, quieter and closer to the island's offices." }}
          loyalty={{ programmeName: "Palmwine Circle", earnPerThousand: 10 }}
          properties={[
            { slug: "palmwine-house", name: "The Palmwine House", tagline: "A slow afternoon in Lekki", area: "Lekki Phase 1", city: "Lagos", state: "Lagos", coverImageUrl: null, startingRateKobo: 8500000, rating: 4.6, reviewCount: 18, amenities: ["Pool", "Wi-Fi", "Restaurant", "Bar", "Airport pick-up"], href: "#", bookHref: "#" },
            { slug: "palmwine-house-ikoyi", name: "Palmwine House Ikoyi", tagline: "Quiet rooms near the island's offices", area: "Ikoyi", city: "Lagos", state: "Lagos", coverImageUrl: null, startingRateKobo: 11000000, rating: null, reviewCount: 0, amenities: ["Wi-Fi", "Gym", "Workspace"], href: "#", bookHref: "#" },
          ]}
        />
      </section>
    </div>
  );
}
