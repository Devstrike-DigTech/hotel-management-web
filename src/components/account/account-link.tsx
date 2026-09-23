"use client";

import { SuitcaseRolling, UserCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

/** First name from the readable session hint cookie, or null when signed out. */
function readHint(): string | null {
  try {
    const m = /(?:^|;\s*)guest_hint=([^;]*)/.exec(document.cookie);
    return m && m[1] ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();
/** Call after signing in or out so the header updates without a reload. */
export function notifySession() {
  listeners.forEach((l) => l());
}

export function useGuestHint() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener("focus", cb);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("focus", cb);
      };
    },
    readHint,
    () => null,
  );
}

/** "Trips" for a signed-in guest, "Sign in" otherwise; `base` keeps microsite links on the hotel's host. */
export function AccountLink({ base = "", className = "" }: { base?: string; className?: string }) {
  const name = useGuestHint();
  return name ? (
    <Link href={`${base}/trips`} className={`inline-flex items-center gap-2 rounded-sm px-3 py-2 text-[0.9375rem] text-ink/85 transition-colors hover:bg-surface-2 hover:text-ink ${className}`}>
      <SuitcaseRolling size={18} weight="light" aria-hidden />
      <span>Trips</span>
      <span className="sr-only">for {name}</span>
    </Link>
  ) : (
    <Link href={`${base}/account/sign-in`} className={`inline-flex items-center gap-2 rounded-sm px-3 py-2 text-[0.9375rem] text-ink/85 transition-colors hover:bg-surface-2 hover:text-ink ${className}`}>
      <UserCircle size={19} weight="light" aria-hidden />
      <span>Sign in</span>
    </Link>
  );
}
