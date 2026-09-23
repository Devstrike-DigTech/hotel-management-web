import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import { Monogram } from "@/components/ui/monogram";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { KeyFob } from "@/components/ui/wordmark";
import { brandStyle } from "@/lib/brand";
import { APP_NAME, SITE_URL } from "@/lib/env";
import { canonicalGroup, getGroup, groupBase } from "@/lib/site";

export async function generateMetadata({ params }: LayoutProps<"/g/[group]">): Promise<Metadata> {
  const { group: slug } = await params;
  const group = await getGroup(slug).catch(() => null);
  if (!group) return { title: "Hotel group not found" };
  const canonical = canonicalGroup(group.slug);
  const places = [...new Set(group.properties.map((p) => p.area))].join(", ");
  const description = `${group.properties.length} hotels in ${places}. Book direct with ${group.name}.`;
  return {
    metadataBase: new URL(canonical),
    title: { default: group.name, template: `%s — ${group.name}` },
    description,
    applicationName: group.name,
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
  return (
    <div className="brand-scope flex min-h-dvh flex-col" style={brandStyle(group.branding.accentColor)}>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-[6px]">
        <div className="container-page flex h-[4.5rem] items-center justify-between gap-4">
          <Link href={home} className="-m-1 flex min-w-0 items-center gap-3 rounded-sm p-1">
            {group.branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- hotel logos live on arbitrary hosts
              <img src={group.branding.logoUrl} alt="" className="h-10 w-auto max-w-[8rem] object-contain" />
            ) : (
              <Monogram name={group.name} />
            )}
            <span className="min-w-0">
              <span className="display-sm block truncate text-lg leading-tight">{group.name}</span>
              <span className="kicker block truncate !text-[10px]">
                {group.properties.length} {group.properties.length === 1 ? "hotel" : "hotels"}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link href={`${base}#hotels`} className="btn btn-primary ml-1 !min-h-10 !px-4 text-sm">
              Choose a hotel
            </Link>
          </div>
        </div>
      </header>

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
              <span className="num">&copy; {new Date().getFullYear()}</span> {group.name}
            </p>
            <a href={SITE_URL} className="group inline-flex items-center gap-2 hover:text-ink">
              <KeyFob className="h-4 w-auto text-ink-muted group-hover:text-laterite" />
              Powered by <span className="font-medium text-ink">{APP_NAME}</span>
              <ArrowUpRight size={12} aria-hidden />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
