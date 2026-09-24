/**
 * M7, Essentials: the hotel's home page without the framework's JavaScript.
 *
 * The Essentials template is built only from server components (no client islands), so its HTML is
 * complete on its own: links are links, dates go to the booking page with a native form, FAQ answers
 * open with <details>. The React and Next.js runtime (about 130 KB gzipped) would only hydrate a page
 * that has nothing to hydrate. For a guesthouse's guests on 3G and small Android phones that is the
 * slowest part of the page, so on the hotel's home the proxy renders the page as usual and sends it
 * on with every script removed except three that the page needs and that are inline: the theme
 * resolver in <head>, the site's colour mode, and the tiny Essentials script (light/dark switch,
 * fonts after first paint). JSON-LD (structured data, not code) stays. Preloads for scripts and for
 * the house web fonts (which Essentials does not use) go too.
 *
 * The booking page and everything after it are the normal React app.
 */

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const KEEP_ATTR = /\bdata-lite-keep\b|\bid="theme-init"|type="application\/ld\+json"/i;
const LINK = /<link\b[^>]*>/gi;

export function stripScripts(html: string): string {
  return html
    .replace(SCRIPT, (whole, attrs: string) => (KEEP_ATTR.test(attrs) ? whole : ""))
    .replace(LINK, (tag) => {
      const t = tag.toLowerCase();
      if (/\brel="?modulepreload/.test(t)) return "";
      if (/\brel="?preload/.test(t) && /\bas="?(script|font)/.test(t)) return "";
      return tag;
    });
}

/** Bytes of JavaScript left in a stripped page (inline only; there are no external scripts). */
export function inlineScriptBytes(html: string): number {
  let n = 0;
  for (const m of html.matchAll(SCRIPT)) if (!/application\/ld\+json/i.test(m[1])) n += m[2].length;
  return n;
}
