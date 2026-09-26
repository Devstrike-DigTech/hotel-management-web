import type { Metadata } from "next";
import { Suspense } from "react";
import { QuotePage } from "@/components/concierge/quote-page";

export const metadata: Metadata = { title: "A price from the concierge", robots: { index: false, follow: false } };

/** M8: the concierge's price by its signed link (`${WEB_URL}/concierge/q/<token>`), in the hotel's colour. */
export default async function ConciergeQuote({ params }: PageProps<"/concierge/q/[token]">) {
  const { token } = await params;
  return (
    <Suspense>
      <QuotePage token={decodeURIComponent(token)} />
    </Suspense>
  );
}
