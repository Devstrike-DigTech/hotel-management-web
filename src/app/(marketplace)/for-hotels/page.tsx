import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Broom,
  ChatCircleText,
  ClockCountdown,
  IdentificationCard,
  Lightning,
  Storefront,
  UsersThree,
} from "@phosphor-icons/react/ssr";
import { DayTimeline, KeyRack, OfflineTicker, OwnerDigest } from "@/components/marketing/vignettes";
import { Money } from "@/components/ui/money";
import { api, settle } from "@/lib/api";
import { APP_NAME, SUPPORT_EMAIL, signupUrl } from "@/lib/env";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "For hotels: stop revenue leakage",
  description: `${APP_NAME} is the front desk for Nigerian hotels: Revenue Guard, an offline front desk for when the power goes, hourly bookings, a digital guest register and a nightly WhatsApp digest for owners.`,
  alternates: { canonical: "/for-hotels" },
};

const LEAKS = [
  {
    title: "The room that was never sold",
    body: "A guest pays cash at eleven, leaves at six, and the room is made up before you arrive. On paper, nobody slept there.",
  },
  {
    title: "The discount nobody can explain",
    body: "Thirty per cent off for a “regular” whose name no one remembers. It happens twice a week and it adds up to a salary.",
  },
  {
    title: "Three hours that became a night",
    body: "A day-use booking that quietly turns into an overnight stay, charged at the day-use price, or not charged at all.",
  },
];

export default async function ForHotelsPage() {
  const { data: plans } = await settle(api.plans());
  const tiers = (plans ?? []).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      {/* ------------------------------------------------------------ Hero */}
      <section className="container-page pb-20 pt-10 sm:pt-14 lg:pb-28">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <p className="kicker fade-up flex items-center gap-3">
              <span className="text-laterite">For hotel owners</span>
              <span aria-hidden className="h-px w-8 bg-line-strong" />
              <span>Revenue Guard</span>
            </p>
            <h1 className="display mt-6 text-[clamp(3rem,7.6vw,7rem)]">
              <span className="reveal-line">
                <span style={{ "--d": "60ms" } as React.CSSProperties}>Stop the</span>
              </span>
              <span className="reveal-line">
                <span style={{ "--d": "170ms" } as React.CSSProperties}>
                  <em className="accent">leak</em> between
                </span>
              </span>
              <span className="reveal-line">
                <span style={{ "--d": "280ms" } as React.CSSProperties}>the front desk</span>
              </span>
              <span className="reveal-line">
                <span style={{ "--d": "390ms" } as React.CSSProperties}>and the bank.</span>
              </span>
            </h1>
            <p className="fade-up mt-8 max-w-xl text-[1.1rem] leading-relaxed text-ink/80 [--d:500ms]">
              {APP_NAME} is the front desk for independent Nigerian hotels. Every room, every naira and every key is
              accounted for, and at eleven every night you get the day&apos;s takings on WhatsApp, with anything odd
              already circled.
            </p>
            <div className="fade-up mt-9 flex flex-col gap-3 [--d:600ms] sm:flex-row">
              <a href={signupUrl("growth")} className="btn btn-primary group">
                Start your 14-day trial <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link href="/pricing" className="btn btn-outline">
                See pricing
              </Link>
            </div>
            <p className="fade-up mt-4 text-sm text-ink-muted [--d:650ms]">
              Growth plan free for 14 days. No card needed to start.
            </p>
          </div>
          <div className="fade-up relative lg:col-span-5 [--d:300ms]">
            <span aria-hidden className="adire-field absolute -inset-6 text-line-strong opacity-50 [mask-image:radial-gradient(closest-side,black,transparent)]" />
            <OwnerDigest appName={APP_NAME} className="relative rotate-[1.5deg] motion-reduce:rotate-0" />
            <p className="relative mt-6 text-center font-display text-sm italic text-ink-muted">
              The nightly owner digest. Illustration, with example figures.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Leaks */}
      <section aria-labelledby="leaks-title" className="border-y border-line bg-surface py-20 lg:py-28">
        <div className="container-page">
          <div className="grid gap-6 lg:grid-cols-12">
            <p className="kicker lg:col-span-4">Where the money goes</p>
            <h2 id="leaks-title" className="display-md text-[clamp(2.2rem,4.4vw,3.6rem)] lg:col-span-8">
              Most hotels do not lose money to bad months. They lose it <em className="accent">a few thousand naira at a time.</em>
            </h2>
          </div>
          <ol className="mt-16 grid gap-px overflow-hidden border-y border-line bg-line md:grid-cols-3">
            {LEAKS.map((l, i) => (
              <li key={l.title} className="bg-surface py-8 md:px-8 md:first:pl-0 md:last:pr-0">
                <span className="display block text-[5.5rem] leading-none text-laterite/90" style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1', fontStyle: "italic" }}>
                  {i + 1}
                </span>
                <h3 className="display-sm mt-6 text-2xl">{l.title}</h3>
                <p className="mt-3 leading-relaxed text-ink-muted">{l.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------ Revenue Guard */}
      <section id="revenue-guard" aria-labelledby="guard-title" className="scroll-mt-24 py-20 lg:py-28">
        <div className="container-page">
          <div className="night overflow-hidden rounded-md px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
            <div className="grid gap-14 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5">
                <p className="kicker !text-laterite">Revenue Guard</p>
                <h2 id="guard-title" className="display-md mt-4 text-[clamp(2.2rem,4vw,3.4rem)]">
                  It reads the key board <em className="accent">the way you would,</em> every hour.
                </h2>
                <p className="mt-6 leading-relaxed text-ink-muted">
                  Revenue Guard cross-checks what the front desk says against what the building shows. When a room is
                  cleaned with nobody on the register, when a discount skips approval, or when the cash drawer is short
                  at shift change, it is flagged, named and timed.
                </p>
                <ul className="mt-8 space-y-4 border-t border-line pt-8">
                  {[
                    ["Register against housekeeping", "A room made up that nobody checked out of."],
                    ["Discounts need a second key", "Anything over your limit waits for a manager."],
                    ["Shift close, reconciled", "Cash, transfer and card counted against the folios."],
                    ["Day-use that overstays", "Hourly stays that run past their time are charged, not forgiven."],
                  ].map(([t, b]) => (
                    <li key={t} className="grid grid-cols-[1.25rem_1fr] gap-3">
                      <span aria-hidden className="mt-2 size-1.5 rotate-45 bg-laterite" />
                      <span>
                        <span className="block font-medium">{t}</span>
                        <span className="text-sm text-ink-muted">{b}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-7 lg:pt-4">
                <KeyRack />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Features */}
      <section aria-labelledby="features-title" className="container-page">
        <div className="grid gap-6 lg:grid-cols-12">
          <p className="kicker lg:col-span-4">Everything the desk needs</p>
          <h2 id="features-title" className="display-md text-[clamp(2.2rem,4.4vw,3.6rem)] lg:col-span-8">
            Built for how Nigerian hotels <em className="accent">actually run.</em>
          </h2>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-line bg-line lg:grid-cols-2">
          <Feature
            icon={<Lightning size={26} weight="light" />}
            title="A front desk that works when NEPA takes light"
            body="The generator is warming up and the router is off. Check-ins, payments and room changes carry on offline and sync the moment the network is back. No lost bookings, no paper to type up tomorrow."
          >
            <OfflineTicker />
          </Feature>
          <Feature
            icon={<ClockCountdown size={26} weight="light" />}
            title="Hourly and day-use, done properly"
            body="Sell a room for three hours at lunchtime and again overnight. Each stay is timed, priced and on the register, so short stays are income rather than a blind spot."
          >
            <DayTimeline />
          </Feature>
        </div>

        <ul className="mt-px grid gap-px overflow-hidden rounded-b-sm border-x border-b border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <SmallFeature icon={<IdentificationCard size={24} weight="light" />} title="Guest register" body="A digital register with ID details, ready when the authorities ask, and searchable when you need it." />
          <SmallFeature icon={<Storefront size={24} weight="light" />} title="Marketplace and booking site" body={`Listed here for guests across Nigeria, plus your own booking site in your colours on a ${APP_NAME} subdomain or your domain.`} />
          <SmallFeature icon={<ChatCircleText size={24} weight="light" />} title="Owner digest on WhatsApp" body="Takings by payment method, occupancy and flags, every night at eleven. Read it in bed, act on it at breakfast." />
          <SmallFeature icon={<Broom size={24} weight="light" />} title="Housekeeping board" body="Rooms move from dirty to clean on a phone, so the desk never sells a room that has not been made up." />
        </ul>
      </section>

      {/* ------------------------------------------------------------ Steps */}
      <section aria-labelledby="steps-title" className="container-page py-20 lg:py-28">
        <span aria-hidden className="adire-rule mb-16 text-line-strong" />
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="kicker">Switching over</p>
            <h2 id="steps-title" className="display-md mt-4 text-[clamp(2.2rem,4vw,3.2rem)]">
              From paper to live <em className="accent">in an afternoon.</em>
            </h2>
          </div>
          <ol className="grid gap-10 sm:grid-cols-3 lg:col-span-8">
            {[
              ["Sign up", "Tell us your hotel's name and city. Your 14-day Growth trial starts at once."],
              ["Load your rooms", "Add your room types, then whole floors at once: rooms 101 to 120 in a single step."],
              ["Hand the desk over", "Add your receptionists with their own logins. Your first digest arrives that night."],
            ].map(([t, b], i) => (
              <li key={t} className="border-t border-ink pt-5">
                <span className="num text-xs text-laterite">Step {String(i + 1).padStart(2, "0")}</span>
                <h3 className="display-sm mt-3 text-2xl">{t}</h3>
                <p className="mt-2 leading-relaxed text-ink-muted">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------ Pricing teaser */}
      <section aria-labelledby="price-title" className="container-page">
        <div className="rounded-md border border-line-strong bg-surface p-6 sm:p-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="kicker">Pricing</p>
              <h2 id="price-title" className="display-md mt-3 text-[clamp(2rem,3.6vw,3rem)]">
                One price a month. <em className="accent">No surprises.</em>
              </h2>
            </div>
            <Link href="/pricing" className="link-static inline-flex items-center gap-2">
              Compare every plan <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
          {tiers.length ? (
            <ul className="mt-10 grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {tiers.map((p) => (
                <li key={p.code} className={`p-5 ${p.highlighted ? "bg-paper" : "bg-surface"}`}>
                  <p className="flex items-center justify-between">
                    <span className="display-sm text-xl">{p.name}</span>
                    {p.highlighted ? <span className="kicker !text-brass">Most chosen</span> : null}
                  </p>
                  <p className="mt-3">
                    {p.priceMonthlyKobo !== null ? (
                      <>
                        <Money kobo={p.priceMonthlyKobo} className="text-2xl font-medium" />
                        <span className="text-sm text-ink-muted"> / month</span>
                      </>
                    ) : (
                      <span className="text-2xl font-display italic">Talk to us</span>
                    )}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
                    <UsersThree size={15} aria-hidden />
                    {p.limits.max_rooms === -1 ? "Unlimited rooms" : `Up to ${p.limits.max_rooms} rooms`}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {/* ------------------------------------------------------------ CTA */}
      <section className="container-page pt-20 text-center lg:pt-28">
        <h2 className="display mx-auto max-w-4xl text-[clamp(2.6rem,6vw,5.4rem)]">
          Know what your hotel <em className="accent">made tonight.</em>
        </h2>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <a href={signupUrl("growth")} className="btn btn-primary">
            Start your 14-day trial <ArrowUpRight size={16} aria-hidden />
          </a>
          <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} demo`)}`} className="btn btn-outline">
            Book a walkthrough
          </a>
        </div>
      </section>
    </>
  );
}

function Feature({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-8 bg-paper p-6 sm:p-8">
      <div>
        <span className="text-laterite">{icon}</span>
        <h3 className="display-sm mt-5 text-[1.75rem]">{title}</h3>
        <p className="mt-3 max-w-lg leading-relaxed text-ink-muted">{body}</p>
      </div>
      <div className="mt-auto">{children}</div>
    </div>
  );
}

function SmallFeature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="bg-paper p-6">
      <span className="text-laterite">{icon}</span>
      <h3 className="display-sm mt-4 text-xl">{title}</h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">{body}</p>
    </li>
  );
}
