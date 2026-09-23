import type { Metadata } from "next";
import { Suspense } from "react";
import { MagicLinkVerify } from "@/components/account/magic-link-verify";

export const metadata: Metadata = { title: "Signing you in", robots: { index: false } };

export default function VerifyPage() {
  return (
    <Suspense>
      <MagicLinkVerify />
    </Suspense>
  );
}
