"use client";

import { useEffect } from "react";
import { ADMIN_URL } from "@/lib/env";

/**
 * Tells the admin page framing this preview what it is showing, so the Brand Studio or Form Builder
 * can fetch a fresh token when the one it used has expired:
 *   window.parent.postMessage({ type: "site-preview", state: "DRAFT" | "EXPIRED" | "NOT_FOUND" | "UNAVAILABLE", href }, adminOrigin)
 * Sent only to the admin's origin, and only when the page is framed.
 */
export function PreviewSignal({ state }: { state: string }) {
  useEffect(() => {
    if (window.parent === window) return;
    let origin: string;
    try {
      origin = new URL(ADMIN_URL).origin;
    } catch {
      return;
    }
    window.parent.postMessage({ type: "site-preview", state, href: window.location.href }, origin);
  }, [state]);
  return null;
}
