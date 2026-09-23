"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { GuestAccount } from "@/lib/booking-types";
import { call, ClientApiError, humanError } from "@/lib/client-api";
import { notifySession } from "./account-link";

export type GuestState =
  | { status: "loading" }
  | { status: "signed-in"; guest: GuestAccount }
  | { status: "signed-out" }
  | { status: "error"; message: string };

/** The signed-in guest, or a redirect to sign-in (with `next`) when `required`. */
export function useGuest({ required = false, next }: { required?: boolean; next?: string } = {}) {
  const router = useRouter();
  const [state, setState] = useState<GuestState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctl = new AbortController();
    call<GuestAccount>("guest/me", { signal: ctl.signal })
      .then((guest) => setState({ status: "signed-in", guest }))
      .catch((e) => {
        if (ctl.signal.aborted) return;
        if (e instanceof ClientApiError && (e.status === 401 || e.status === 403)) {
          notifySession();
          setState({ status: "signed-out" });
          if (required) router.replace(`/account/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`);
        } else setState({ status: "error", message: humanError(e) });
      });
    return () => ctl.abort();
  }, [required, next, router, attempt]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/session/logout", { method: "POST" });
    } catch {}
    notifySession();
    router.push("/");
    router.refresh();
  }, [router]);

  return { state, setState, retry: () => setAttempt((n) => n + 1), signOut };
}
