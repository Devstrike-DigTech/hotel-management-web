"use client";

import { createContext, useContext } from "react";

/**
 * Where guest pages link to. On the marketplace and ordinary microsites, trips, reviews and
 * documents live on the marketplace. On a white-labelled hotel's own domain (M6) they are served
 * under the hotel's site instead, and nothing links back to the platform.
 */
export interface SiteLinks {
  whiteLabel: boolean;
  /** Prefix for trip, document and review links: "" on the marketplace, the microsite base when white-labelled. */
  base: string;
  /** Where "back" goes when there is no trips list: the hotel's home. */
  home: string;
}

const SiteLinksContext = createContext<SiteLinks>({ whiteLabel: false, base: "", home: "/" });

export function SiteLinksProvider({ value, children }: { value: SiteLinks; children: React.ReactNode }) {
  return <SiteLinksContext.Provider value={value}>{children}</SiteLinksContext.Provider>;
}

export const useSiteLinks = () => useContext(SiteLinksContext);
