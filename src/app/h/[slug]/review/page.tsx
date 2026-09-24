import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewForm } from "@/components/reviews/review-form";

export const metadata: Metadata = { title: "Review your stay", robots: { index: false, follow: false } };

/** Review a stay on the hotel's own site (M6 white-label), from the link on the trip page. */
export default function MicrositeReviewPage() {
  return (
    <Suspense>
      <ReviewForm />
    </Suspense>
  );
}
