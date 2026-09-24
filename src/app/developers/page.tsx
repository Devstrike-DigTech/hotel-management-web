import Link from "next/link";
import { ArrowRight, ArrowsClockwise, Broom, ChartLineUp, Plugs } from "@phosphor-icons/react/ssr";
import { CodeBlock } from "@/components/developers/code-block";
import { ADMIN_KEYS_URL, PAGE_LIMIT, RATE_LIMIT } from "@/lib/developers/constants";
import { GUIDES } from "@/lib/developers/guides";
import { KEY_ENV } from "@/lib/developers/samples";
import { loadSpec } from "@/lib/developers/spec";
import { APP_NAME } from "@/lib/env";

export const revalidate = 300;

const USES = [
  {
    icon: Plugs,
    title: "Connect your PMS, ERP or accounting",
    body: "Pull reservations, folios and daily figures into the systems your finance team already closes the month in.",
  },
  {
    icon: ArrowsClockwise,
    title: "Keep a channel or rate tool in step",
    body: "Read availability, push rate overrides and hear about every booking the moment it lands, from any channel.",
  },
  {
    icon: Broom,
    title: "Wire up rooms and housekeeping",
    body: "Door locks, energy controllers and housekeeping devices can read room status and mark rooms clean.",
  },
  {
    icon: ChartLineUp,
    title: "Build the owner's own dashboards",
    body: "Occupancy, ADR and RevPAR per property per day, for a group's BI tool or a board pack.",
  },
];

export default async function DevelopersOverview() {
  const { model } = await loadSpec();
  const firstGet = model.groups.flatMap((g) => g.operations).find((o) => o.method === "get" && !o.params.path.length && o.path.includes("propert"));
  const firstPath = firstGet?.path ?? "/properties";
  const curl = `curl ${model.baseUrl}${firstPath} \\\n  -H "Authorization: Bearer $${KEY_ENV}"`;
  const total = model.groups.reduce((n, g) => n + g.operations.length, 0);

  return (
    <div className="pb-20">
      <section className="grid gap-10 border-b border-line pb-14 pt-12 sm:pt-16 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] xl:items-end">
        <div className="min-w-0">
          <p className="kicker fade-up">
            The partner API <span className="text-line-strong">/</span> Version 1 <span className="text-line-strong">/</span> Enterprise
          </p>
          <h1 className="display mt-6 text-[clamp(2.7rem,6.4vw,5.6rem)]">
            <span className="reveal-line">
              <span style={{ "--d": "60ms" } as React.CSSProperties}>Build on the front desk</span>
            </span>
            <span className="reveal-line">
              <span style={{ "--d": "170ms" } as React.CSSProperties}>
                <em className="accent">hotels already run.</em>
              </span>
            </span>
          </h1>
          <p className="fade-up mt-7 max-w-xl text-[1.075rem] leading-relaxed text-ink-muted [--d:350ms]">
            Reservations, availability, rates, rooms, housekeeping and daily figures from every hotel that runs on {APP_NAME}, over
            a plain JSON API with signed webhooks. Stable, versioned and documented from the same specification the server enforces.
          </p>
          <div className="fade-up mt-8 flex flex-wrap gap-3 [--d:450ms]">
            <Link href="/developers/getting-started" className="btn btn-primary">
              Make your first request <ArrowRight size={16} aria-hidden />
            </Link>
            <Link href="/developers/reference" className="btn btn-outline">
              Browse {total} endpoints
            </Link>
          </div>
        </div>
        <div className="fade-up min-w-0 [--d:300ms]">
          <CodeBlock code={curl} lang="bash" title="Your first request" />
          <p className="mt-3 text-sm text-ink-muted">
            Keys are made by a hotel&rsquo;s owner in the hotel admin, under{" "}
            <a href={ADMIN_KEYS_URL} className="link-static text-ink">
              Developers, API keys
            </a>
            .
          </p>
        </div>
      </section>

      <section aria-labelledby="uses" className="border-b border-line py-14">
        <h2 id="uses" className="kicker">
          What people build with it
        </h2>
        <ul className="mt-6 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 2xl:grid-cols-4">
          {USES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="bg-surface p-6">
              <Icon size={26} weight="thin" className="text-laterite" aria-hidden />
              <h3 className="mt-4 font-display text-xl leading-snug [font-variation-settings:'opsz'_36]">{title}</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-14 py-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <section aria-labelledby="contents">
          <h2 id="contents" className="display-md text-4xl">
            Contents
          </h2>
          <ol className="mt-6 border-t border-ink">
            {GUIDES.map((g, i) => (
              <li key={g.slug} className="border-b border-line">
                <Link href={`/developers/${g.slug}`} className="group grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2 py-4 sm:grid-cols-[3rem_minmax(0,1fr)]">
                  <span className="num pt-1 text-xs text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="flex items-baseline gap-3">
                      <span className="font-display text-[1.35rem] leading-tight group-hover:text-laterite">{g.title}</span>
                      <span className="leader max-sm:hidden" aria-hidden />
                      <ArrowRight size={15} className="shrink-0 self-center text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-laterite max-sm:hidden" aria-hidden />
                    </span>
                    <span className="mt-1 block text-[0.9375rem] leading-relaxed text-ink-muted">{g.summary}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <aside className="space-y-10">
          <section aria-labelledby="facts">
            <h2 id="facts" className="kicker">
              At a glance
            </h2>
            <dl className="mt-4 divide-y divide-line border-y border-line text-[0.9375rem]">
              {[
                ["Base URL", <span key="b" className="break-all font-mono text-[0.8125rem]">{model.baseUrl}</span>],
                ["Authentication", "Bearer API key, scoped"],
                ["Keys", <span key="k" className="font-mono text-[0.8125rem]">hk_live_ / hk_test_</span>],
                ["Pagination", `Cursor, up to ${PAGE_LIMIT.max} per page`],
                ["Rate limit", `${RATE_LIMIT.perMinute} requests a minute per key`],
                ["Money", "Integer kobo (₦1 = 100)"],
                ["Time", "ISO 8601, Africa/Lagos"],
                ["Webhooks", "HMAC-SHA256 signed, retried 24h"],
              ].map(([k, v]) => (
                <div key={String(k)} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3 py-2.5">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="groups">
            <h2 id="groups" className="kicker">
              Reference
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-2">
              {model.groups.map((g) => (
                <li key={g.slug}>
                  <Link href={`/developers/reference/${g.slug}`} className="flex items-baseline justify-between rounded-sm border border-line bg-surface px-3 py-2.5 text-sm hover:border-ink-muted">
                    <span>{g.name}</span>
                    <span className="num text-[11px] text-ink-muted">{g.operations.length}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
