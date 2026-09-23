import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInView } from "@/components/account/sign-in-view";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function SignInPage() {
  return (
    <Suspense>
      <SignInView devMode={process.env.NODE_ENV !== "production"} />
    </Suspense>
  );
}
