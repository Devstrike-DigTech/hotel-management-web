import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bank,
  CreditCard,
  Receipt,
  SealCheck,
  Storefront,
  UserCheck,
} from "@phosphor-icons/react/ssr";
import { HotelCard } from "@/components/hotel/hotel-card";
import { CityIndex } from "@/components/marketing/city-index";
import { SearchBar } from "@/components/search/search-bar";
import { Plate } from "@/components/ui/plate";
import { allHotels, api, settle } from "@/lib/api";
import { todayInLagos } from "@/lib/dates";
import { APP_NAME } from "@/lib/env";
import type { City, HotelCard as Hotel } from "@/lib/types";

export const revalidate = 60;

function citiesFromHotels(hotels: Hotel[]): City[] {
  const m = new Map<string, City>();
  for (const h of hotels) {
    const c = m.get(h.city) ?? { name: h.city, state: h.state, hotelCount: 0 };
    c.hotelCount++;
    m.set(h.city, c);
  }
  return [...m.values()].sort((a, b) => b.hotelCount - a.hotelCount);
}

export default async function HomePage() {
  const [citiesRes, hotelsRes] = await Promise.all([settle(api.cities()), settle(allHotels())]);
  const hotels = hotelsRes.data ?? [];
  const cities = citiesRes.data?.length ? citiesRes.data : citiesFromHotels(hotels);
  const featured = [...hotels.filter((h) => h.featured), ...hotels.filter((h) => !h.featured)].slice(0, 6);
  const [lead, second] = featured;
  const today = todayInLagos();
  const offline = !!hotelsRes.error && !!citiesRes.error;

  return (
    <>
      {/* ------------------------------------------------------------ Hero */}
      <section className="container-page relative pb-16 pt-10 sm:pt-14 lg:pb-24 lg:pt-16">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7 lg:pt-6">
            <p className="kicker fade-up flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-laterite">No. 01</span>
              <span aria-hidden className="h-px w-8 bg-line-strong" />
              <span>Independent hotels across Nigeria</span>
            </p>
            <h1 className="display mt-6 text-[clamp(3.1rem,9.2vw,8.4rem)]">
              <span className="reveal-line">
                <span style={{ "--d": "80ms" } as React.CSSProperties}>Good rooms,</span>
              </span>
              <span className="reveal-line">
                <span style={{ "--d": "200ms" } as React.CSSProperties}>
                  from <em className="accent">Lekki</em>
                </span>
              </span>
              <span className="reveal-line">
                <span style={{ "--d": "320ms" } as React.CSSProperties}>
                  to <em className="accent">Calabar.</em>
                </span>
              </span>
            </h1>
            <div className="fade-up mt-8 grid max-w-xl gap-4 [--d:520ms] sm:grid-cols-[auto_1fr] sm:gap-6">
              <span aria-hidden className="mt-2.5 hidden h-px w-12 bg-laterite sm:block" />
              <p className="text-[1.075rem] leading-relaxed text-ink/80">
                A guesthouse in Bodija that still does a proper breakfast. A quiet suite in Maitama for the week of
                meetings. A pool in the GRA after the long drive in. Every hotel here runs its front desk on {APP_NAME},
                so the rooms and prices you see come from the desk itself, not a spreadsheet someone forgot to update.
              </p>
            </div>
          </div>

          {/* Plates */}
          <div className="relative hidden lg:col-span-5 lg:block">
            <figure className="fade-up relative ml-auto w-[88%] [--d:250ms]">
              <Plate
                src={lead?.coverImageUrl}
                alt={lead ? `${lead.name}, ${lead.area}` : "A hotel room"}
                label={lead ? `${lead.area}, ${lead.city}` : undefined}
                sizes="(min-width: 1024px) 36vw, 0px"
                priority
                className="aspect-[4/5] rounded-sm"
              />
              <figcaption className="mt-3 flex items-baseline justify-between gap-4 border-t border-line pt-2">
                <span className="kicker">Plate I</span>
                <span className="truncate font-display text-sm italic text-ink-muted">
                  {lead ? `${lead.name}, ${lead.area}` : "From the listings"}
                </span>
              </figcaption>
            </figure>
            {second ? (
              <figure className="fade-up absolute -left-2 bottom-24 w-[46%] border-[6px] border-paper bg-paper shadow-[var(--shadow-float)] [--d:450ms]">
                <Plate
                  src={second.coverImageUrl}
                  alt={`${second.name}, ${second.area}`}
                  label={`${second.area}`}
                  sizes="(min-width: 1024px) 18vw, 0px"
                  className="aspect-square"
                />
                <figcaption className="kicker bg-paper pt-2 !text-[10px]">
                  Plate II &middot; {second.city}
                </figcaption>
              </figure>
            ) : null}
          </div>
        </div>

        <div className="fade-up relative z-10 mt-12 [--d:650ms] lg:mt-14 xl:mr-[22%]">
          <SearchBar cities={cities} today={today} />
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted">
            <span className="kicker">Or go straight to</span>
            {cities.slice(0, 6).map((c) => (
              <Link key={c.name} href={`/stays?city=${encodeURIComponent(c.name)}`} className="link-static text-ink/80 hover:text-laterite">
                {c.name}
              </Link>
            ))}
          </p>
        </div>
      </section>

      {offline ? (
        <div className="container-page">
          <p role="status" className="rounded-sm border border-ochre/40 bg-ochre/8 px-4 py-3 text-sm text-ink">
            We could not reach the listings just now, so some sections are empty. Please refresh in a moment.
          </p>
        </div>
      ) : null}

      {/* ------------------------------------------------------------ Cities */}
      <section id="cities" aria-labelledby="cities-title" className="container-page scroll-mt-24 py-16 lg:py-24">
        <span aria-hidden className="adire-rule mb-14 text-line-strong" />
        <header className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="kicker">The index</p>
            <h2 id="cities-title" className="display-md mt-4 text-[clamp(2.4rem,4.6vw,3.9rem)]">
              {cities.length ? numberWord(cities.length) : "Six"} cities, <em className="accent">one front desk.</em>
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="max-w-md leading-relaxed text-ink-muted">
              Filed the old way. Pull a card to see every hotel we list in that city, from business stays on the island
              to family guesthouses off the Ring Road.
            </p>
            <Link href="/stays" className="link-static mt-4 inline-flex items-center gap-2 text-[0.95rem]">
              Browse every stay <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
        </header>
        <div className="mt-12">
          {cities.length ? (
            <CityIndex cities={cities} hotels={hotels} />
          ) : (
            <p className="text-ink-muted">Cities will appear here as soon as the listings load.</p>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------ Featured */}
      {featured.length ? (
        <section aria-labelledby="featured-title" className="border-y border-line bg-surface py-16 lg:py-24">
          <div className="container-page">
            <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="kicker">Featured stays</p>
                <h2 id="featured-title" className="display-md mt-4 text-[clamp(2.4rem,4.6vw,3.9rem)]">
                  Where we would <em className="accent">book tonight.</em>
                </h2>
              </div>
              <Link href="/stays" className="link-static shrink-0 text-[0.95rem]">
                All {hotels.length} stays
              </Link>
            </header>
            <div className="mt-12 grid gap-x-10 gap-y-14 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <HotelCard hotel={featured[0]} plate={1} size="lg" aspect="aspect-[4/3] lg:aspect-[6/5]" />
              </div>
              <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1 lg:gap-y-10">
                {featured.slice(1, 3).map((h, i) => (
                  <HotelCard key={h.slug} hotel={h} plate={i + 2} aspect="aspect-[16/10]" />
                ))}
              </div>
            </div>
            {featured.length > 3 ? (
              <div className="mt-14 grid gap-x-8 gap-y-14 border-t border-line pt-14 sm:grid-cols-2 lg:grid-cols-3">
                {featured.slice(3, 6).map((h, i) => (
                  <HotelCard key={h.slug} hotel={h} plate={i + 4} />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ Trust */}
      <section aria-labelledby="trust-title" className="container-page py-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-12">
          <header className="lg:col-span-4">
            <p className="kicker">Before you book</p>
            <h2 id="trust-title" className="display-md mt-4 text-[clamp(2.4rem,4.6vw,3.9rem)]">
              The small print, <em className="accent">in large type.</em>
            </h2>
          </header>
          <ol className="grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3 lg:col-span-8">
            <TrustItem
              n="i"
              icon={<UserCheck size={26} weight="light" />}
              title="Reviews from people who slept there"
              body="Only a guest with a completed stay on the hotel's own register can leave a review. No stars from the owner's cousin."
            />
            <TrustItem
              n="ii"
              icon={
                <span className="flex gap-1.5">
                  <CreditCard size={26} weight="light" />
                  <Bank size={26} weight="light" />
                </span>
              }
              title="Pay the way you already pay"
              body="Card through Paystack, a bank transfer, or at the desk when you arrive. Prices are in naira, and the 7.5% VAT is shown before you commit."
            />
            <TrustItem
              n="iii"
              icon={<SealCheck size={26} weight="light" />}
              title="Confirmed by the front desk itself"
              body="Bookings go straight onto the screen the receptionist works from, so a confirmed room cannot be sold again to a walk-in."
            />
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------ For hotels band */}
      <section aria-labelledby="owners-title" className="container-page">
        <div className="night relative overflow-hidden rounded-md px-6 py-12 sm:px-10 lg:px-16 lg:py-16">
          <span aria-hidden className="adire-field pointer-events-none absolute -right-10 top-0 h-full w-[45%] text-ink opacity-[0.06]" />
          <div className="relative grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="kicker">For hotel owners</p>
              <h2 id="owners-title" className="display-md mt-4 text-[clamp(2.2rem,4.4vw,3.6rem)]">
                Somewhere between the front desk and the bank, <em className="accent">money is leaking.</em>
              </h2>
              <p className="mt-5 max-w-xl leading-relaxed text-ink-muted">
                Rooms sold for cash and never written down. Discounts nobody approved. {APP_NAME} closes the gaps and sends
                you the night&apos;s takings on WhatsApp before you sleep.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:col-span-5 lg:justify-end">
              <Link href="/for-hotels" className="btn btn-primary">
                See how it works <ArrowUpRight size={16} aria-hidden />
              </Link>
              <Link href="/pricing" className="btn btn-outline">
                Pricing
              </Link>
            </div>
          </div>
          <ul className="relative mt-12 grid gap-6 border-t border-line pt-8 text-sm text-ink-muted sm:grid-cols-3">
            <li className="flex gap-3">
              <Receipt size={20} weight="light" className="shrink-0 text-laterite" aria-hidden />
              Revenue Guard flags stays that never reached the register.
            </li>
            <li className="flex gap-3">
              <Storefront size={20} weight="light" className="shrink-0 text-laterite" aria-hidden />
              A booking site in your colours, and a place in this marketplace.
            </li>
            <li className="flex gap-3">
              <SealCheck size={20} weight="light" className="shrink-0 text-laterite" aria-hidden />
              A front desk that keeps working when NEPA takes light.
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}

function TrustItem({ n, icon, title, body }: { n: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="flex flex-col bg-paper p-6 lg:p-7">
      <div className="flex items-start justify-between text-laterite">
        {icon}
        <span className="font-display text-lg italic text-ink-muted">{n}.</span>
      </div>
      <h3 className="display-sm mt-8 text-xl">{title}</h3>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">{body}</p>
    </li>
  );
}

function numberWord(n: number) {
  return ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"][n] ?? String(n);
}
