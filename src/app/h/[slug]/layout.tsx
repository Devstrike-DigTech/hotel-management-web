import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandFonts } from "@/components/site/brand-kit";
import { SiteLinksProvider } from "@/components/site/site-links";
import { SiteFooter, SiteHeader, type ChromeProps } from "@/components/site-templates/chrome";
import { LiteScript } from "@/components/site-templates/lite";
import { PreviewBanner } from "@/components/site-templates/preview-banner";
import { siteNav } from "@/components/site-templates/site-page";
import { brandStyle } from "@/lib/brand";
import { APP_DOMAIN, SITE_URL } from "@/lib/env";
import { canonicalSite, getHotel, groupRootHref, siteBase } from "@/lib/site";
import { themeStyle } from "@/lib/theme/normalise";
import { getSiteTheme, previewToken } from "@/lib/theme/server";
import { hidesPlatform, whiteLabelTheme } from "@/lib/white-label";

export async function generateMetadata({ params }: LayoutProps<"/h/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const hotel = await getHotel(slug).catch(() => null);
  if (!hotel) return { title: "Hotel not found" };
  // The hotel's canonical address (its verified custom domain, else its subdomain), however this copy was reached.
  const canonical = await canonicalSite(hotel);
  const description = `${hotel.tagline}. Book direct with ${hotel.name} in ${hotel.area}, ${hotel.city}.`;
  const wl = hotel.whiteLabel ?? null;
  const theme = await getSiteTheme(hotel).catch(() => null);
  const preview = !!(await previewToken());
  // White-label (M6) or the brand kit (M7): the hotel's own favicon replaces the platform's key fob.
  const favicon = wl?.faviconUrl || theme?.faviconUrl || null;
  return {
    metadataBase: new URL(new URL(canonical).origin || SITE_URL),
    title: { default: `${hotel.name}, ${hotel.area}`, template: `%s — ${hotel.name}` },
    description,
    applicationName: wl?.brandName || hotel.name,
    ...(favicon ? { icons: { icon: [{ url: favicon }], shortcut: [{ url: favicon }], apple: [{ url: favicon }] } } : {}),
    // A draft shown through a preview token is never indexed.
    ...(preview ? { robots: { index: false, follow: false, nocache: true } } : {}),
    alternates: { canonical: `${canonical}/` },
    openGraph: {
      siteName: wl?.brandName || hotel.name,
      title: hotel.name,
      description: hotel.tagline,
      url: `${canonical}/`,
      type: "website",
      locale: "en_NG",
      images: [{ url: `${canonical}/og.png`, width: 1200, height: 630, alt: `${hotel.name}, ${hotel.area}` }],
    },
  };
}

/** True for an absolute link to the platform's own domain or its subdomains (or local ones). */
function onPlatformHost(href: string) {
  try {
    const host = new URL(href).hostname;
    return host === APP_DOMAIN || host.endsWith(`.${APP_DOMAIN}`) || host.endsWith(".localhost");
  } catch {
    return false; // a relative link stays on this host
  }
}

/** Before first paint: a site whose theme defaults to dark (or light) uses it unless the guest chose. */
const modeScript = (mode: string) =>
  `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')return}catch(e){}document.documentElement.dataset.theme=${JSON.stringify(mode)}})();`;

export default async function MicrositeLayout({ children, params }: LayoutProps<"/h/[slug]">) {
  const { slug } = await params;
  const hotel = await getHotel(slug);
  if (!hotel) notFound();
  const base = await siteBase(slug);
  const home = base || "/";
  const group = hotel.group && hotel.group.propertyCount > 1 ? hotel.group : null;
  // White-label (M6): on the hotel's verified domain, its own colours, type, logo and footer, and no platform chrome.
  const wl = hotel.whiteLabel ?? null;
  const hide = hidesPlatform(wl);
  // A white-labelled hotel never links to the group root on the platform's own subdomain.
  const rootHref = group ? await groupRootHref(slug, group.slug) : null;
  const groupHref = rootHref && hide && onPlatformHost(rootHref) ? null : rootHref;
  // M7: the published theme (or the draft behind a preview token): template, colours, fonts.
  const theme = await getSiteTheme(hotel);
  const token = await previewToken();
  const wlTheme = wl ? whiteLabelTheme(wl, hotel.branding.accentColor) : null;
  const siteTheme = themeStyle(theme);
  // The white-label brand is the most specific: its colours and fonts win where it sets them.
  const style = { ...(siteTheme.style as object), ...((wlTheme?.style as object) ?? {}) } as React.CSSProperties;
  const fonts = [...new Set([...(wlTheme?.fonts ?? []), ...(wlTheme?.headingFamily ? [] : siteTheme.fonts)])];
  const essentials = theme.templateId === "essentials";

  const chrome: ChromeProps = {
    template: theme.templateId,
    name: hotel.name,
    tagline: hotel.tagline,
    area: hotel.area,
    city: hotel.city,
    state: hotel.state,
    address: hotel.address,
    phone: hotel.phone,
    email: hotel.email,
    checkInTime: hotel.checkInTime,
    checkOutTime: hotel.checkOutTime,
    logo: wl?.logoUrl || theme.logoUrl || hotel.branding.logoUrl,
    base,
    home,
    group: group && groupHref ? { name: group.name, propertyCount: group.propertyCount, href: groupHref } : null,
    wl,
    hidePlatform: hide,
    brandName: wl?.brandName || hotel.name,
    nav: siteNav(theme),
  };

  return (
    <div
      className="brand-scope flex min-h-dvh flex-col font-sans"
      style={Object.keys(style).length ? style : brandStyle(hotel.branding.accentColor)}
      data-template={theme.templateId}
      data-white-label={wl ? "true" : undefined}
      data-preview={token ? "true" : undefined}
    >
      {theme.colourMode !== "SYSTEM" ? <script data-lite-keep="" dangerouslySetInnerHTML={{ __html: modeScript(theme.colourMode === "DARK" ? "dark" : "light") }} /> : null}
      {essentials ? (
        <>
          <LiteScript />
          {fonts.length ? <span hidden data-lite-fonts={fonts.join("\n")} /> : null}
        </>
      ) : fonts.length ? (
        <BrandFonts hrefs={fonts} />
      ) : null}
      {token ? <PreviewBanner draft={theme.draft} /> : null}
      <SiteHeader {...chrome} />

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <SiteLinksProvider value={{ whiteLabel: hide, base: hide ? base : "", home }}>{children}</SiteLinksProvider>
      </main>

      <SiteFooter {...chrome} />
    </div>
  );
}
