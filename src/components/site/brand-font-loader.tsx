"use client";

import { useEffect } from "react";

/**
 * Attaches a white-labelled hotel's font stylesheets after hydration. A stylesheet React manages
 * (`precedence`) holds the page until it loads, so a slow or blocked fonts.googleapis.com would
 * freeze booking; here the house fonts show at once and the hotel's swap in when they arrive
 * (the server already asked the browser to preload them).
 */
export function BrandFontLoader({ hrefs }: { hrefs: string[] }) {
  // Keyed on the URLs, not the array, so navigating within the site never re-attaches the stylesheets.
  const key = hrefs.join("\n");
  useEffect(() => {
    const added: HTMLLinkElement[] = [];
    for (const href of key.split("\n").filter(Boolean)) {
      if (document.querySelector(`link[rel="stylesheet"][href="${CSS.escape(href)}"]`)) continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.brandFont = "";
      document.head.appendChild(link);
      added.push(link);
    }
    return () => added.forEach((l) => l.remove());
  }, [key]);
  return null;
}
