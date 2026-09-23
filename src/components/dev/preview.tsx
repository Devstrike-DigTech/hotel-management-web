"use client";

import { useState } from "react";
import { OtpInput, ResendTimer } from "@/components/account/otp-input";
import { ConfirmationCard, type ConfirmationData } from "@/components/booking/confirmation-card";
import { HoldCountdown } from "@/components/booking/hold-countdown";
import { PaymentState, type PaymentPhase } from "@/components/booking/payment-state";
import { ReviewItem } from "@/components/reviews/review-parts";
import { StarInput } from "@/components/reviews/stars";
import { APP_NAME } from "@/lib/env";
import type { ISODate } from "@/lib/dates";
import { PreviewRates } from "./preview-rates";

const SAMPLE: ConfirmationData = {
  code: "PWH-7K3Q9",
  status: "CONFIRMED",
  hotel: {
    name: "The Palmwine House",
    area: "Lekki Phase 1",
    city: "Lagos",
    address: "14 Admiralty Way, Lekki Phase 1, Lagos",
    phone: "08031234567",
    checkInTime: "14:00",
    checkOutTime: "12:00",
  },
  roomTypeName: "Deluxe King",
  stayType: "NIGHTLY",
  checkIn: "2026-10-08",
  checkOut: "2026-10-10",
  nights: 2,
  guests: 2,
  guestName: "Adaeze Okonkwo",
  lines: [
    { label: "Deluxe King, 2 nights at ₦85,000", amountKobo: 17000000 },
    { label: "VAT 7.5%", amountKobo: 1275000, kind: "tax" },
    { label: "Lagos consumption tax 5%", amountKobo: 850000, kind: "tax" },
  ],
  totalKobo: 19125000,
  paidKobo: 19125000,
  balanceKobo: 0,
  payAtHotel: false,
  paymentLabel: "Paid by card, 23 Sep",
  manageHref: "/trips/PWH-7K3Q9",
  cancellationNote: "Free cancellation until Tue 6 Oct, 2:00 pm. After that, the first night is charged.",
};

/** Development-only gallery of the M3 and M4 building blocks, for design review. */
export function Preview({ only, today }: { only?: string; today: ISODate }) {
  const [otp, setOtp] = useState("");
  const [bad, setBad] = useState(false);
  const [stars, setStars] = useState(4);
  const [startedAt] = useState(() => Date.now());
  const [soon] = useState(() => ({
    full: new Date(Date.now() + 19 * 60_000 + 42_000).toISOString(),
    late: new Date(Date.now() + 2 * 60_000 + 10_000).toISOString(),
    over: new Date(Date.now() - 1000).toISOString(),
  }));
  const show = (k: string) => !only || only === k;

  return (
    <div className="container-page space-y-20 py-12">
      {show("rates") ? <PreviewRates today={today} /> : null}
      {show("card") ? (
        <section className="space-y-10">
          <ConfirmationCard data={SAMPLE} appName={APP_NAME} />
          <ConfirmationCard
            data={{ ...SAMPLE, code: "PWH-2M8TX", paidKobo: 0, balanceKobo: SAMPLE.totalKobo, payAtHotel: true, paymentLabel: null, manageHref: null }}
            appName={APP_NAME}
          />
        </section>
      ) : null}
      {show("hold") ? (
        <section className="grid max-w-xl gap-4">
          <HoldCountdown expiresAt={soon.full} />
          <HoldCountdown expiresAt={soon.late} />
          <HoldCountdown expiresAt={soon.over} />
          <HoldCountdown expiresAt={soon.full} variant="inline" />
        </section>
      ) : null}
      {show("otp") ? (
        <section className="max-w-md space-y-4">
          <OtpInput value={otp} onChange={(v) => { setOtp(v); setBad(false); }} onComplete={(v) => setBad(v !== "123456")} invalid={bad} autoFocus={false} />
          <ResendTimer startedAt={startedAt} onResend={() => undefined} />
        </section>
      ) : null}
      {show("pay") ? (
        <section className="divide-y divide-line">
          {(["verifying", "slow", "failed", "expired", "refunding", "offline", "success"] as PaymentPhase[]).map((p) => (
            <PaymentState key={p} phase={p} reference="HTL_9f3k2m1q" />
          ))}
        </section>
      ) : null}
      {show("review") ? (
        <section className="max-w-3xl">
          <StarInput name="overall" label="Overall" value={stars} onChange={setStars} />
          <div className="mt-8 divide-y divide-line border-y border-line">
            <ReviewItem
              hotelName="The Palmwine House"
              review={{
                id: "1",
                overall: 5,
                cleanliness: 5,
                service: 4,
                location: 5,
                value: 4,
                title: "Quiet rooms, and the jollof at breakfast",
                body: "We came for a wedding in Lekki and stayed three nights. The generator switch-over was so smooth we only noticed it once. Staff remembered our names by the second morning.",
                stayMonth: "2026-08",
                travellerType: "COUPLE",
                displayName: "Tunde A.",
                hotelReply: "Thank you, Tunde. We will tell the kitchen; the jollof is Mama Bisi's recipe.",
              }}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
