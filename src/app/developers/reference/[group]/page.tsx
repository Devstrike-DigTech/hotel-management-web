import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/ssr";
import { MethodStamp } from "@/components/developers/doc-parts";
import { Operation, PathText } from "@/components/developers/operation";
import { loadSpec } from "@/lib/developers/spec";

export const revalidate = 300;

export async function generateStaticParams() {
  const { model } = await loadSpec();
  return model.groups.map((g) => ({ group: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/developers/reference/[group]">): Promise<Metadata> {
  const { group } = await params;
  const { model } = await loadSpec();
  const g = model.groups.find((x) => x.slug === group);
  if (!g) return { title: "Not found" };
  return {
    title: `${g.name} API`,
    description: g.description ?? `${g.name} endpoints of the partner API.`,
    alternates: { canonical: `/developers/reference/${g.slug}` },
  };
}

export default async function ReferenceGroupPage({ params }: PageProps<"/developers/reference/[group]">) {
  const { group } = await params;
  const { model } = await loadSpec();
  const i = model.groups.findIndex((x) => x.slug === group);
  if (i < 0) notFound();
  const g = model.groups[i];
  const prev = model.groups[i - 1];
  const next = model.groups[i + 1];

  return (
    <div className="pb-16">
      <header className="pb-4 pt-10 sm:pt-14">
        <p className="kicker">
          <Link href="/developers/reference" className="link">
            API reference
          </Link>{" "}
          <span className="text-line-strong">/</span> <span className="num">{String(i + 1).padStart(2, "0")}</span>
        </p>
        <h1 className="display-md mt-4 text-[clamp(2.3rem,5vw,3.5rem)]">{g.name}</h1>
        {g.description ? <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-muted">{g.description}</p> : null}
        <ul className="mt-7 max-w-3xl divide-y divide-line border-y border-line">
          {g.operations.map((op) => (
            <li key={op.id}>
              <a href={`#${op.id}`} className="group flex items-center gap-3 py-2.5 text-sm">
                <MethodStamp method={op.method} small />
                <code className="min-w-0 truncate font-mono text-[0.8125rem]">
                  <PathText path={op.path} />
                </code>
                <span className="leader max-sm:hidden" aria-hidden />
                <span className="shrink-0 text-ink-muted group-hover:text-ink max-sm:hidden">{op.summary}</span>
              </a>
            </li>
          ))}
        </ul>
      </header>

      {g.operations.map((op) => (
        <Operation key={op.id} op={op} baseUrl={model.baseUrl} />
      ))}

      <nav aria-label="Other endpoint groups" className="mt-4 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
        {prev ? (
          <Link href={`/developers/reference/${prev.slug}`} className="group rounded-sm border border-line p-4 hover:border-ink-muted">
            <span className="kicker flex items-center gap-1.5 !text-[10px]">
              <ArrowLeft size={12} aria-hidden /> Previous
            </span>
            <span className="mt-1 block font-display text-lg group-hover:text-laterite">{prev.name}</span>
          </Link>
        ) : null}
        {next ? (
          <Link href={`/developers/reference/${next.slug}`} className="group rounded-sm border border-line p-4 text-right hover:border-ink-muted sm:col-start-2">
            <span className="kicker flex items-center justify-end gap-1.5 !text-[10px]">
              Next <ArrowRight size={12} aria-hidden />
            </span>
            <span className="mt-1 block font-display text-lg group-hover:text-laterite">{next.name}</span>
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
