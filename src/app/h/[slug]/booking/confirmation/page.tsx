import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmationView } from "@/components/booking/confirmation-view";
import { APP_NAME, SITE_URL } from "@/lib/env";
import { getHotel, siteBase } from "@/lib/site";
import { hidesPlatform } from "@/lib/white-label";

export const metadata: Metadata = { title: "Your booking", robots: { index: false, follow: false } };

/** The hotel's own confirmation page (BOOKING_SITE bookings return here from Paystack). */
export default async function MicrositeConfirmationPage({ params }: PageProps<"/h/[slug]/booking/confirmation">) {
  const { slug } = await params;
  const base = await siteBase(slug);
  const hide = hidesPlatform((await getHotel(slug))?.whiteLabel);
  return (
    <div className="container-page">
      <Suspense>
        <ConfirmationView appName={hide ? null : APP_NAME} hotelHref={base || "/"} marketplace={hide ? "" : SITE_URL} />
      </Suspense>
    </div>
  );
}
