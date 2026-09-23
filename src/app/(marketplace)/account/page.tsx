import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileView } from "@/components/account/profile-view";

export const metadata: Metadata = { title: "Your profile", robots: { index: false } };

export default function AccountPage() {
  return (
    <Suspense>
      <ProfileView />
    </Suspense>
  );
}
