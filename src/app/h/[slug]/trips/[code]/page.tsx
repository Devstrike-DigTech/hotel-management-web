import type { Metadata } from "next";
import { Suspense } from "react";
import { TripDetail } from "@/components/account/trip-detail";
import { APP_NAME } from "@/lib/env";
import { getHotel } from "@/lib/site";
import { hidesPlatform } from "@/lib/white-label";

export const metadata: Metadata = { title: "Your booking", robots: { index: false, follow: false } };

/**
 * Manage a booking on the hotel's own site (M6 white-label), by the link in the confirmation. The
 * marketplace's /trips/[code] is the same view; a white-labelled hotel's guests never leave its domain.
 */
export default async function MicrositeTripPage({ params }: PageProps<"/h/[slug]/trips/[code]">) {
  const { slug, code } = await params;
  const hide = hidesPlatform((await getHotel(slug))?.whiteLabel);
  return (
    <Suspense>
      <TripDetail code={decodeURIComponent(code)} appName={hide ? null : APP_NAME} />
    </Suspense>
  );
}
