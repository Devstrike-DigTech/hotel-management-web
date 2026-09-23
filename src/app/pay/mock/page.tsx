import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MockCheckout } from "@/components/booking/mock-checkout";

export const metadata: Metadata = { title: "Practice checkout", robots: { index: false, follow: false } };

/** Development stand-in for Paystack's hosted checkout. A 404 in production builds. */
export default function MockPayPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main id="main" className="min-h-dvh bg-surface-2/60">
      <Suspense>
        <MockCheckout />
      </Suspense>
    </main>
  );
}
