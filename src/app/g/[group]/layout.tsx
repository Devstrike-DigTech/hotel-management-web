import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandFonts, FooterLinks, PoweredBy } from "@/components/site/brand-kit";
import { SiteHeader, type ChromeProps } from "@/components/site-templates/chrome";
import { LiteScript } from "@/components/site-templates/lite";
import { PreviewBanner } from "@/components/site-templates/preview-banner";
import { themeStyle } from "@/lib/theme/normalise";
import { getGroupTheme, previewToken } from "@/lib/theme/server";
import { brandStyle } from "@/lib/brand";
import { canonicalGroup, getGroup, getGroupWhiteLabel, groupBase } from "@/lib/site";
import { hidesPlatform, whiteLabelTheme } from "@/lib/white-label";

export async function generateMetadata({ params }: LayoutProps<"/g/[group]">): Promise<Metadata> {
  const { group: slug } = await params;
  const group = await getGroup(slug).catch(() => null);
  if (!group) return { title: "Hotel group not found" };
  const canonical = canonicalGroup(group.slug);
  const places = [...new Set(group.properties.map((p) => p.area))].join(", ");
  const description = `${group.properties.length} hotels in ${places}. Book direct with ${group.name}.`;
  const wl = await getGroupWhiteLabel(group);
  return {
    metadataBase: new URL(canonical),
    title: { default: group.name, template: `%s — ${group.name}` },
    description,
    applicationName: wl?.brandName || group.name,
    ...((await previewToken()) ? { robots: { index: false, follow: false, nocache: true } } : {}),
    ...(wl?.faviconUrl ? { icons: { icon: [{ url: wl.faviconUrl }], shortcut: [{ url: wl.faviconUrl }], apple: [{ url: wl.faviconUrl }] } } : {}),
    alternates: { canonical: `${canonical}/` },
    openGraph: {
      siteName: group.name,
      title: group.name,
      description,
      url: `${canonical}/`,
      type: "website",
      locale: "en_NG",
      images: [{ url: `${canonical}/og.png`, width: 1200, height: 630, alt: `${group.name}, the hotel group's booking site` }],
    },
  };
}

/** A hotel group's own site: the group's letterhead around the list of its hotels. */
export default async function GroupLayout({ children, params }: LayoutProps<"/g/[group]">) {
  const { group: slug } = await params;
  const group = await getGroup(slug);
  if (!group) notFound();
  const base = await groupBase(slug);
  const home = base || "/";
  const wl = await getGroupWhiteLabel(group);
  const hide = hidesPlatform(wl);
  const wlTheme = wl ? whiteLabelTheme(wl, group.branding.accentColor) : null;
  // M7: the group root is themed too (its own theme, or its primary property's).
  const theme = await getGroupTheme(group);
  const token = await previewToken();
  const site = themeStyle(theme);
  const style = { ...(site.style as object), ...((wlTheme?.style as object) ?? {}) } as React.CSSProperties;
  const fonts = [...new Set([...(wlTheme?.fonts ?? []), ...(wlTheme?.headingFamily ? [] : site.fonts)])];
  const logo = wl?.logoUrl || theme.logoUrl || group.branding.logoUrl;
  const brandName = wl?.brandName || group.name;
  const count = group.properties.length;
  const chrome: ChromeProps = {
    template: theme.templateId,
    name: group.name,
    tagline: "",
    area: `${count} ${count === 1 ? "hotel" : "hotels"}`,
    city: [...new Set(group.properties.map((p) => p.city))].slice(0, 3).join(", "),
    state: "",
    address: "",
    phone: null,
    email: null,
    checkInTime: null,
    checkOutTime: null,
    logo,
    base,
    home,
    group: null,
    wl,
    hidePlatform: hide,
    brandName,
    nav: [],
    book: { href: `${base}#hotels`, label: "Choose a hotel" },
  };
  return (
    <div
      className="brand-scope flex min-h-dvh flex-col font-sans"
      style={Object.keys(style).length ? style : brandStyle(group.branding.accentColor)}
      data-template={theme.templateId}
      data-white-label={wl ? "true" : undefined}
      data-preview={token ? "true" : undefined}
    >
      {theme.templateId === "essentials" ? <LiteScript /> : null}
      {fonts.length ? <BrandFonts hrefs={fonts} /> : null}
      {token ? <PreviewBanner draft={theme.draft} problem={theme.previewProblem ?? null} /> : null}
      <SiteHeader {...chrome} />

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>

      <footer className="mt-24 border-t border-line bg-surface">
        <div className="container-page">
          <span aria-hidden className="adire-rule -mt-[10px] text-line-strong" />
          <ul className="grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-3">
            {group.properties.map((p) => (
              <li key={p.slug}>
                <p className="display-sm text-xl">{p.name}</p>
                <p className="mt-1 text-[0.9375rem] text-ink-muted">
                  {p.area}, {p.city}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-line">
          <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              <span className="num">&copy; {new Date().getFullYear()}</span> {brandName}
            </p>
            {wl ? <FooterLinks wl={wl} /> : null}
            {hide ? null : <PoweredBy />}
          </div>
        </div>
      </footer>
    </div>
  );
}
