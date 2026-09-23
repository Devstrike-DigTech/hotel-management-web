"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { call, ClientApiError, humanError } from "@/lib/client-api";
import { notifySession } from "./account-link";

/** Completes an emailed sign-in link, then goes to Trips. */
export function MagicLinkVerify() {
  const token = useSearchParams().get("token");
  const router = useRouter();
  const [error, setError] = useState<string | null>(token ? null : "This sign-in link is incomplete.");

  useEffect(() => {
    if (!token) return;
    call("public/auth/email/verify", { method: "POST", body: { token } })
      .then(() => {
        notifySession();
        router.replace("/trips");
        router.refresh();
      })
      .catch((e) =>
        setError(
          e instanceof ClientApiError && (e.code === "LINK_EXPIRED" || e.code === "LINK_INVALID")
            ? "This sign-in link has expired or was already used. Links work once, for fifteen minutes."
            : humanError(e),
        ),
      );
  }, [token, router]);

  if (!error)
    return (
      <div className="container-page max-w-xl py-24 text-center" role="status">
        <p className="kicker">Sign in</p>
        <h1 className="display-md mt-3 text-4xl">
          Signing you <em className="accent">in</em>
        </h1>
        <div className="skeleton mx-auto mt-8 h-1 w-40 rounded-full" />
      </div>
    );
  return (
    <div className="container-page max-w-xl py-20 text-center">
      <p className="kicker">Sign in</p>
      <h1 className="display-md mt-3 text-4xl">That link did not work</h1>
      <p className="mt-4 text-ink-muted">{error}</p>
      <Link href="/account/sign-in" className="btn btn-primary mt-8">
        Sign in with your phone
      </Link>
    </div>
  );
}
