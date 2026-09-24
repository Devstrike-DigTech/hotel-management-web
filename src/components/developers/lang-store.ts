"use client";

import { useSyncExternalStore } from "react";

/**
 * The reader's preferred code language, shared by every sample on the page and remembered in
 * localStorage (guarded: private windows and blocked storage just fall back to the default).
 */
const KEY = "developers.lang";
const listeners = new Set<() => void>();
let memory: string | null = null;

function read(): string | null {
  try {
    return localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

export function setPreferredLang(lang: string) {
  memory = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* storage unavailable: keep it for this page only */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePreferredLang() {
  return useSyncExternalStore(subscribe, read, () => null);
}
