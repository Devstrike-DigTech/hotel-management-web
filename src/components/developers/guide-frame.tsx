import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/ssr";
import { GUIDES, guideBySlug, neighbours } from "@/lib/developers/guides";
import { OnThisPage } from "./on-this-page";

/** The frame every guide sits in: its masthead, the reading column, the page's contents and the way on. */
export function GuideFrame({ slug, children, aside }: { slug: string; children: React.ReactNode; aside?: React.ReactNode }) {
  const guide = guideBySlug(slug)!;
  const n = GUIDES.findIndex((g) => g.slug === slug) + 1;
  const { prev, next } = neighbours(slug);
  return (
    <div className="flex gap-12 xl:gap-16">
      <article className="min-w-0 max-w-[46rem] flex-1 pb-20 pt-10 sm:pt-14">
        <header className="border-b border-line pb-8">
          <p className="kicker">
            Guide <span className="num">{String(n).padStart(2, "0")}</span> <span className="text-line-strong">/</span>{" "}
            <span className="num">{String(GUIDES.length).padStart(2, "0")}</span>
          </p>
          <h1 className="display-md mt-4 text-[clamp(2.3rem,5vw,3.5rem)]">{guide.title}</h1>
          <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-muted">{guide.summary}</p>
        </header>
        <div className="doc-prose mt-2">{children}</div>
        <nav aria-label="More guides" className="mt-16 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
          {prev ? (
            <Link href={`/developers/${prev.slug}`} className="group rounded-sm border border-line p-4 hover:border-ink-muted">
              <span className="kicker flex items-center gap-1.5 !text-[10px]">
                <ArrowLeft size={12} aria-hidden /> Previous
              </span>
              <span className="mt-1 block font-display text-lg group-hover:text-laterite">{prev.title}</span>
            </Link>
          ) : (
            <Link href="/developers" className="group rounded-sm border border-line p-4 hover:border-ink-muted">
              <span className="kicker flex items-center gap-1.5 !text-[10px]">
                <ArrowLeft size={12} aria-hidden /> Back to
              </span>
              <span className="mt-1 block font-display text-lg group-hover:text-laterite">Overview</span>
            </Link>
          )}
          {next ? (
            <Link href={`/developers/${next.slug}`} className="group rounded-sm border border-line p-4 text-right hover:border-ink-muted sm:col-start-2">
              <span className="kicker flex items-center justify-end gap-1.5 !text-[10px]">
                Next <ArrowRight size={12} aria-hidden />
              </span>
              <span className="mt-1 block font-display text-lg group-hover:text-laterite">{next.title}</span>
            </Link>
          ) : (
            <Link href="/developers/reference" className="group rounded-sm border border-line p-4 text-right hover:border-ink-muted sm:col-start-2">
              <span className="kicker flex items-center justify-end gap-1.5 !text-[10px]">
                Next <ArrowRight size={12} aria-hidden />
              </span>
              <span className="mt-1 block font-display text-lg group-hover:text-laterite">API reference</span>
            </Link>
          )}
        </nav>
      </article>
      <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-52 shrink-0 overflow-y-auto pt-16 xl:block">
        <OnThisPage items={guide.sections} />
        {aside}
      </aside>
    </div>
  );
}
