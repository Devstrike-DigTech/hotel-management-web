import type { Metadata } from "next";
import { Suspense } from "react";
import { TripsView } from "@/components/account/trips-view";

export const metadata: Metadata = { title: "Your trips", robots: { index: false } };

export default function TripsPage() {
  return (
    <Suspense>
      <TripsView />
    </Suspense>
  );
}
