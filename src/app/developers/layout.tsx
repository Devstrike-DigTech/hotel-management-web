import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import { DocsMobileNav, DocsSidebar, type NavData } from "@/components/developers/docs-nav";
import { SearchDialog } from "@/components/developers/search-dialog";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { KeyFob, Wordmark } from "@/components/ui/wordmark";
import { ADMIN_KEYS_URL, DOCS_TITLE } from "@/lib/developers/constants";
import { GUIDES } from "@/lib/developers/guides";
import { buildSearchIndex } from "@/lib/developers/search-index";
import { loadSpec } from "@/lib/developers/spec";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/env";

export const metadata: Metadata = {
  title: { default: DOCS_TITLE, template: `%s — ${APP_NAME} developers` },
  description: `Build on ${APP_NAME}: the partner API for reservations, availability, rates, rooms, housekeeping and reports, with signed webhooks.`,
  alternates: { canonical: "/developers" },
  openGraph: { title: DOCS_TITLE, siteName: APP_NAME, type: "website", locale: "en_NG" },
};

export default async function DevelopersLayout({ children }: LayoutProps<"/developers">) {
  const { model } = await loadSpec();
  const nav: NavData = {
    guides: GUIDES.map((g) => ({ href: `/developers/${g.slug}`, label: g.nav })),
    groups: model.groups.map((g) => ({
      slug: g.slug,
      name: g.name,
      operations: g.operations.map((o) => ({ id: o.id, method: o.method, summary: o.summary })),
    })),
  };
  const index = buildSearchIndex(model);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/92 backdrop-blur-[6px] print:hidden">
        <div className="mx-auto flex h-14 max-w-[96rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <DocsMobileNav data={nav} />
          <Link href="/" className="-m-1 flex shrink-0 items-center rounded-sm p-1" aria-label={`${APP_NAME} home`}>
            <Wordmark className="max-sm:hidden" />
            <KeyFob className="h-[22px] w-auto text-laterite sm:hidden" />
          </Link>
          <span aria-hidden className="text-line-strong">/</span>
          <Link
            href="/developers"
            className="shrink-0 font-display text-[1.2rem] italic leading-none text-ink [font-variation-settings:'opsz'_72,'SOFT'_100,'WONK'_1]"
          >
            Developers
          </Link>
          <span className="num ml-1 hidden rounded-xs border border-line px-1.5 py-0.5 text-[10px] tracking-wider text-ink-muted md:inline">
            API v1
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <SearchDialog index={index} className="sm:w-64 lg:w-72" />
            <a href={ADMIN_KEYS_URL} className="btn btn-outline hidden !min-h-10 !px-3.5 text-sm xl:inline-flex">
              Get an API key <ArrowUpRight size={14} aria-hidden />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[96rem] flex-1 px-4 sm:px-6 lg:px-8">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-line py-8 pr-5 [scrollbar-width:thin] lg:block">
          <DocsSidebar data={nav} />
        </aside>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none lg:pl-10 xl:pl-14">
          {children}
        </main>
      </div>

      <footer className="border-t border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-[96rem] flex-col gap-3 px-4 py-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            <span className="num">&copy; {new Date().getFullYear()}</span> Devstrike Digital Limited. The {APP_NAME} partner API is
            available on the Enterprise plan.
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li>
              <Link className="link" href="/pricing">
                Plans
              </Link>
            </li>
            <li>
              <Link className="link" href="/for-hotels">
                For hotels
              </Link>
            </li>
            <li>
              <a className="link" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
