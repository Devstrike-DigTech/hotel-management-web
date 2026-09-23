import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmationView } from "@/components/booking/confirmation-view";
import { APP_NAME } from "@/lib/env";

export const metadata: Metadata = { title: "Your booking", robots: { index: false, follow: false } };

export default function ConfirmationPage() {
  return (
    <div className="container-page">
      <Suspense>
        <ConfirmationView appName={APP_NAME} />
      </Suspense>
    </div>
  );
}
