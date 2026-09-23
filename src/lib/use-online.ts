"use client";

import { useSyncExternalStore } from "react";

/** navigator.onLine as state; true on the server so nothing flashes "offline" on first paint. */
export function useOnline() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}
