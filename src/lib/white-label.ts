/**
 * White-label (M6): a hotel's own colours and type on its own domain, with no platform chrome.
 *
 * Colours go through the same contrast guard as the M1 brand accent: the primary colour takes the
 * laterite role (buttons, links, italic accents) at 4.5:1 on paper in both themes, the accent colour
 * the brass role (highlights, "featured") at 3:1. Fonts come from the curated Google list: the
 * heading font takes the display role; the body font is used only if it is a text face (a display
 * face as body copy would hurt legibility), otherwise the house grotesk stays. Money, dates and
 * codes keep IBM Plex Mono so figures still line up.
 */
import { brandVars } from "./brand";
import type { FontChoice, HotelDetail, PublicWhiteLabel } from "./types";

const FAMILY = /^[A-Za-z0-9][A-Za-z0-9 ]{0,47}$/;

const FALLBACK: Record<FontChoice["category"], string> = {
  serif: '"Iowan Old Style", Georgia, serif',
  display: 'Georgia, "Times New Roman", serif',
  sans: "ui-sans-serif, system-ui, sans-serif",
};

export function safeFamily(font: FontChoice | null | undefined): string | null {
  const family = font?.family?.trim();
  return family && FAMILY.test(family) ? family : null;
}

/**
 * The stylesheet URL for a font: the API's Google Fonts URL when it really is one, else built here.
 * `italics` asks for the italic cut too (the display role sets its accents in italic), so the browser
 * does not have to slant the upright.
 */
export function fontHref(font: FontChoice, italics = false): string | null {
  const family = safeFamily(font);
  if (!family) return null;
  const weights = [...new Set((font.weights ?? []).filter((w) => Number.isInteger(w) && w >= 100 && w <= 900))].sort((a, b) => a - b);
  if (italics && weights.length) {
    const axis = `ital,wght@${[...weights.map((w) => `0,${w}`), ...weights.map((w) => `1,${w}`)].join(";")}`;
    return `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:${axis}&display=swap`;
  }
  try {
    const u = new URL(font.googleFontsUrl);
    if (u.protocol === "https:" && u.hostname === "fonts.googleapis.com") {
      if (!u.searchParams.has("display")) u.searchParams.set("display", "swap");
      return u.toString();
    }
  } catch {
    /* build our own below */
  }
  const axis = weights.length ? `:wght@${weights.join(";")}` : "";
  return `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}${axis}&display=swap`;
}

const stack = (font: FontChoice) => `"${safeFamily(font)}", ${FALLBACK[font.category] ?? FALLBACK.serif}`;

export interface WhiteLabelTheme {
  style: React.CSSProperties;
  /** Stylesheets to load (Google Fonts), deduplicated. */
  fonts: string[];
  headingFamily: string | null;
  bodyFamily: string | null;
}

export function whiteLabelTheme(wl: PublicWhiteLabel, fallbackAccent?: string | null): WhiteLabelTheme {
  const style: Record<string, string> = {};
  const primary = brandVars(wl.primaryColor ?? fallbackAccent ?? null, 4.5);
  if (primary) {
    style["--brand"] = primary.light;
    style["--brand-ink"] = primary.lightInk;
    style["--brand-dark"] = primary.dark;
    style["--brand-dark-ink"] = primary.darkInk;
  }
  const accent = brandVars(wl.accentColor, 3);
  if (accent) {
    style["--brand-2"] = accent.light;
    style["--brand-2-dark"] = accent.dark;
  }
  const fonts: string[] = [];
  const heading = wl.headingFont && safeFamily(wl.headingFont) ? wl.headingFont : null;
  if (heading) {
    style["--font-fraunces"] = stack(heading);
    style["--font-display"] = stack(heading);
    const href = fontHref(heading, true);
    if (href) fonts.push(href);
  }
  const body = wl.bodyFont && safeFamily(wl.bodyFont) && wl.bodyFont.category !== "display" ? wl.bodyFont : null;
  if (body) {
    style["--font-schibsted"] = stack(body);
    style["--font-sans"] = stack(body);
    const href = fontHref(body);
    if (href && !fonts.includes(href)) fonts.push(href);
  }
  return { style: style as React.CSSProperties, fonts, headingFamily: heading ? safeFamily(heading) : null, bodyFamily: body ? safeFamily(body) : null };
}

/** Footer links a hotel added: only http(s), mailto and tel, at most eight. */
export function safeFooterLinks(links: PublicWhiteLabel["footerLinks"] | undefined) {
  return (links ?? [])
    .filter((l) => l && typeof l.label === "string" && l.label.trim() && /^(https?:\/\/|mailto:|tel:)/i.test(l.url ?? ""))
    .slice(0, 8)
    .map((l) => ({ label: l.label.trim().slice(0, 60), url: l.url }));
}

/** The brand name shown for a white-labelled hotel (the group's name for a chain), else null. */
export function whiteLabelOf(hotel: Pick<HotelDetail, "whiteLabel"> | null | undefined): PublicWhiteLabel | null {
  return hotel?.whiteLabel ?? null;
}

/** True when platform credits and marketplace links must be hidden. */
export const hidesPlatform = (wl: PublicWhiteLabel | null | undefined) => !!wl && wl.hidePoweredBy !== false;
