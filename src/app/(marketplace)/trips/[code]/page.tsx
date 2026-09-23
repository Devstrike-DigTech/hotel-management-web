import type { Metadata } from "next";
import { Suspense } from "react";
import { TripDetail } from "@/components/account/trip-detail";
import { APP_NAME } from "@/lib/env";

export const metadata: Metadata = { title: "Your booking", robots: { index: false, follow: false } };

export default async function TripPage({ params }: PageProps<"/trips/[code]">) {
  const { code } = await params;
  return (
    <Suspense>
      <TripDetail code={decodeURIComponent(code)} appName={APP_NAME} />
    </Suspense>
  );
}
