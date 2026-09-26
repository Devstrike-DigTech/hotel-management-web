import type { Metadata } from "next";
import { Suspense } from "react";
import { QuotePage } from "@/components/concierge/quote-page";

export const metadata: Metadata = { title: "A price from the concierge", robots: { index: false, follow: false } };

/** M8: the concierge's price on the hotel's own site, in its template (trip pages link here). */
export default async function MicrositeConciergeQuote({ params }: PageProps<"/h/[slug]/concierge/q/[token]">) {
  const { token } = await params;
  return (
    <Suspense>
      <QuotePage token={decodeURIComponent(token)} branded />
    </Suspense>
  );
}
