import type { Metadata } from "next";
import { Suspense } from "react";
import { PointsView } from "@/components/account/points-view";

export const metadata: Metadata = { title: "Your points", robots: { index: false } };

export default function PointsPage() {
  return (
    <Suspense>
      <PointsView />
    </Suspense>
  );
}
