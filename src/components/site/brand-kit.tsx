import { preconnect } from "react-dom";
import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import { KeyFob } from "@/components/ui/wordmark";
import { APP_NAME, SITE_URL } from "@/lib/env";
import { safeFooterLinks } from "@/lib/white-label";
import type { PublicWhiteLabel } from "@/lib/types";

/**
 * Loads a white-labelled hotel's chosen Google fonts. React hoists the stylesheets into <head> and
 * dedupes them; `display=swap` keeps text visible (in the house fonts) while they arrive.
 */
export function BrandFonts({ hrefs }: { hrefs: string[] }) {
  if (!hrefs.length) return null;
  preconnect("https://fonts.googleapis.com");
  preconnect("https://fonts.gstatic.com", { crossOrigin: "anonymous" });
  return (
    <>
      {hrefs.map((href) => (
        <link key={href} rel="stylesheet" href={href} precedence="brand" />
      ))}
    </>
  );
}

/** The platform credit in a hotel's footer. Never rendered for a white-labelled hotel that hides it. */
export function PoweredBy() {
  return (
    <a href={SITE_URL} className="group inline-flex items-center gap-2 hover:text-ink" data-testid="powered-by">
      <KeyFob className="h-4 w-auto text-ink-muted group-hover:text-laterite" />
      Powered by <span className="font-medium text-ink">{APP_NAME}</span>
      <ArrowUpRight size={12} aria-hidden />
    </a>
  );
}

/** The hotel's own footer links (terms, privacy, careers...), set in place of the platform credit. */
export function FooterLinks({ wl }: { wl: PublicWhiteLabel }) {
  const links = safeFooterLinks(wl.footerLinks);
  if (!links.length) return null;
  return (
    <nav aria-label={`${wl.brandName} links`}>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5" data-testid="white-label-links">
        {links.map((l) => (
          <li key={`${l.label}-${l.url}`}>
            <a href={l.url} className="link hover:text-ink" {...(/^https?:/i.test(l.url) ? { rel: "noopener" } : {})}>
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
