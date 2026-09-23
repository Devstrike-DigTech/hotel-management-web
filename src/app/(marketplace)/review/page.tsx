import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewForm } from "@/components/reviews/review-form";

export const metadata: Metadata = { title: "Review your stay", robots: { index: false, follow: false } };

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewForm />
    </Suspense>
  );
}
