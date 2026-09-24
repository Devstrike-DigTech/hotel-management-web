import type { Metadata } from "next";
import Link from "next/link";
import { DownloadSimple } from "@phosphor-icons/react/ssr";
import { CodeBlock } from "@/components/developers/code-block";
import { MethodStamp } from "@/components/developers/doc-parts";
import { PathText } from "@/components/developers/operation";
import { KEY_ENV } from "@/lib/developers/samples";
import { operationHref } from "@/lib/developers/reference";
import { loadSpec, SPEC_REVALIDATE } from "@/lib/developers/spec";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "API reference",
  description: "Every endpoint of the partner API, with parameters, schemas and examples in curl, Node and Python.",
  alternates: { canonical: "/developers/reference" },
};

export default async function ReferenceIndexPage() {
  const { model, source, specVersion } = await loadSpec();
  const total = model.groups.reduce((n, g) => n + g.operations.length, 0);

  return (
    <div className="pb-20 pt-10 sm:pt-14">
      <header className="max-w-3xl">
        <p className="kicker">API reference</p>
        <h1 className="display-md mt-4 text-[clamp(2.4rem,5.2vw,3.75rem)]">
          Every endpoint, <em className="accent">set out plainly.</em>
        </h1>
        <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink-muted">
          {total} endpoints in {model.groups.length} groups, read from the API&rsquo;s own OpenAPI document so this page cannot drift from
          what the server does. Each one lists its scope, parameters, body and responses, with the request in curl, Node and Python.
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <CodeBlock code={`${model.baseUrl}\n\nAuthorization: Bearer $${KEY_ENV}`} lang="http" title="Base URL and header" />
        <dl className="grid grid-cols-2 content-start gap-px overflow-hidden rounded-md border border-line bg-line text-sm">
          {[
            ["Version", `v1 (spec ${specVersion})`],
            ["Format", "JSON, UTF-8"],
            ["Money", "Integer kobo"],
            ["Dates", "ISO 8601, Africa/Lagos"],
          ].map(([k, v]) => (
            <div key={k} className="bg-surface p-3.5">
              <dt className="kicker !text-[10px]">{k}</dt>
              <dd className="mt-1 font-mono text-[0.8125rem]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted" data-testid="spec-source">
        <span>
          {source === "live"
            ? `Rendered from the live specification, refreshed every ${SPEC_REVALIDATE / 60} minutes.`
            : "Rendered from the copy of the specification published with these docs; the live one could not be read just now."}
        </span>
        <a href="/developers/openapi.json" className="inline-flex items-center gap-1.5 text-ink link-static" download>
          <DownloadSimple size={15} aria-hidden /> openapi.json
        </a>
      </p>

      <div className="mt-14 space-y-12">
        {model.groups.map((g, i) => (
          <section key={g.slug} aria-labelledby={`grp-${g.slug}`}>
            <div className="flex items-baseline gap-4 border-b border-ink pb-2">
              <span className="num text-xs text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
              <h2 id={`grp-${g.slug}`} className="display-sm text-2xl">
                <Link href={`/developers/reference/${g.slug}`} className="hover:text-laterite">
                  {g.name}
                </Link>
              </h2>
              {g.description ? <p className="hidden truncate text-sm text-ink-muted md:block">{g.description}</p> : null}
            </div>
            <ul className="divide-y divide-line">
              {g.operations.map((op) => (
                <li key={op.id}>
                  <Link href={operationHref(op)} className="group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 py-3 sm:grid-cols-[auto_minmax(0,22rem)_minmax(0,1fr)_auto]">
                    <MethodStamp method={op.method} small />
                    <code className="truncate font-mono text-[0.8125rem]">
                      <PathText path={op.path} />
                    </code>
                    <span className="col-start-2 text-sm text-ink-muted group-hover:text-ink sm:col-start-auto">{op.summary}</span>
                    <span className="hidden font-mono text-[11px] text-ink-muted sm:block">{op.scopes[0] ?? ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
