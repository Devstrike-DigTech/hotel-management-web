import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HotelRow } from "@/components/hotel/hotel-card";
import { EmptyRack } from "@/components/marketing/illustrations";
import { SearchBar } from "@/components/search/search-bar";
import { SortSelect, StaysFilters } from "@/components/search/stays-filters";
import { allHotels, api, settle } from "@/lib/api";
import { formatShort, normaliseStay, todayInLagos } from "@/lib/dates";
import type { HotelCard } from "@/lib/types";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ searchParams }: PageProps<"/stays">): Promise<Metadata> {
  const city = one((await searchParams).city);
  return {
    title: city ? `Hotels in ${city}` : "Stays across Nigeria",
    description: city
      ? `Independent hotels in ${city} with rooms and naira prices straight from each hotel's front desk.`
      : "Independent hotels in Lagos, Abuja, Port Harcourt, Calabar, Ibadan and Enugu.",
    alternates: { canonical: city ? `/stays?city=${encodeURIComponent(city)}` : "/stays" },
  };
}

function sortHotels(list: HotelCard[], sort: string) {
  const byPrice = (a: HotelCard, b: HotelCard) => (a.startingRateKobo ?? Infinity) - (b.startingRateKobo ?? Infinity);
  const copy = [...list];
  switch (sort) {
    case "price-asc":
      return copy.sort(byPrice);
    case "price-desc":
      return copy.sort((a, b) => byPrice(b, a));
    case "rating":
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount);
    default:
      return copy.sort(
        (a, b) => Number(b.featured) - Number(a.featured) || (b.rating ?? 0) * Math.log1p(b.reviewCount) - (a.rating ?? 0) * Math.log1p(a.reviewCount),
      );
  }
}

export default async function StaysPage({ searchParams }: PageProps<"/stays">) {
  const sp: SP = await searchParams;
  const city = one(sp.city);
  const q = one(sp.q);
  const guests = Math.min(Math.max(Number(one(sp.guests)) || 2, 1), 12);
  const sort = one(sp.sort) || "recommended";
  const minK = Number(one(sp.min)) || undefined;
  const maxK = Number(one(sp.max)) || undefined;
  const wanted = one(sp.amenities).split(",").filter(Boolean);
  const today = todayInLagos();
  const stay = normaliseStay(one(sp.checkIn), one(sp.checkOut), today);

  const [citiesRes, facetRes, resultRes] = await Promise.all([
    settle(api.cities()),
    settle(allHotels({ city: city || undefined, q: q || undefined })),
    settle(allHotels({ city: city || undefined, q: q || undefined, guests, minPriceKobo: minK, maxPriceKobo: maxK })),
  ]);
  const cities = citiesRes.data ?? [];
  const facet = facetRes.data ?? [];
  const prices = facet.map((h) => h.startingRateKobo).filter((p): p is number => !!p);
  const step = 500000;
  const bounds: [number, number] = prices.length
    ? [Math.floor(Math.min(...prices) / step) * step, Math.ceil(Math.max(...prices) / step) * step]
    : [0, 50000000];
  if (bounds[0] === bounds[1]) bounds[1] += step;

  const amenityCounts = new Map<string, number>();
  for (const h of facet) for (const a of h.amenities) amenityCounts.set(a, (amenityCounts.get(a) ?? 0) + 1);
  const amenities = [...amenityCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([label, count]) => ({ label, count }));

  const results = sortHotels(
    (resultRes.data ?? []).filter((h) => wanted.every((w) => h.amenities.includes(w))),
    sort,
  );

  const carry = new URLSearchParams();
  if (stay.checkIn && stay.checkOut) {
    carry.set("checkIn", stay.checkIn);
    carry.set("checkOut", stay.checkOut);
  }
  carry.set("guests", String(guests));
  const query = `?${carry.toString()}`;

  const keep: Record<string, string> = {};
  for (const k of ["sort", "min", "max", "amenities"]) if (one(sp[k])) keep[k] = one(sp[k]);

  const cityInfo = cities.find((c) => c.name.toLowerCase() === city.toLowerCase());
  const filtersActive = !!(minK || maxK || wanted.length);

  return (
    <div className="container-page pb-10 pt-8 lg:pt-12">
      <nav aria-label="Breadcrumb" className="kicker flex items-center gap-2">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <span aria-hidden>/</span>
        <Link href="/stays" className="hover:text-ink">
          Stays
        </Link>
        {city ? (
          <>
            <span aria-hidden>/</span>
            <span className="text-ink" aria-current="page">
              {city}
            </span>
          </>
        ) : null}
      </nav>

      <header className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-end">
        <h1 className="display-md text-[clamp(2.6rem,6vw,5.2rem)] lg:col-span-8">
          {city ? (
            <>
              Rooms in <em className="accent">{city}</em>
            </>
          ) : (
            <>
              Every stay, <em className="accent">every city</em>
            </>
          )}
        </h1>
        <p className="max-w-sm text-ink-muted lg:col-span-4 lg:justify-self-end lg:text-right">
          {cityInfo ? `${cityInfo.state === "FCT" ? "Federal Capital Territory" : `${cityInfo.state} State`}. ` : ""}
          {stay.checkIn && stay.checkOut ? (
            <>
              Showing prices for <span className="num text-ink">{formatShort(stay.checkIn)}</span> to{" "}
              <span className="num text-ink">{formatShort(stay.checkOut)}</span>, {guests} {guests === 1 ? "guest" : "guests"}.
            </>
          ) : (
            "Nightly prices from each hotel's front desk, in naira, before VAT."
          )}
        </p>
      </header>

      <div className="mt-8">
        <SearchBar
          key={`${city}-${stay.checkIn}-${stay.checkOut}-${guests}`}
          cities={cities}
          today={today}
          size="md"
          initial={{ city, checkIn: stay.checkIn, checkOut: stay.checkOut, guests }}
          keep={keep}
        />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[15.5rem_1fr] lg:gap-14">
        <aside aria-label="Filters" className="lg:sticky lg:top-24 lg:self-start">
          <Suspense>
            <StaysFilters priceBounds={bounds} amenities={amenities} />
          </Suspense>
        </aside>

        <section aria-labelledby="results-title" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink pb-4">
            <h2 id="results-title" className="text-[0.9375rem]">
              <span className="num text-lg font-medium">{String(results.length).padStart(2, "0")}</span>{" "}
              <span className="text-ink-muted">{results.length === 1 ? "stay" : "stays"}</span>
              {filtersActive ? <span className="text-ink-muted"> match your filters</span> : null}
            </h2>
            <Suspense>
              <SortSelect value={sort} />
            </Suspense>
          </div>

          {resultRes.error ? (
            <div role="alert" className="py-16 text-center">
              <p className="display-sm text-2xl">The listings did not load.</p>
              <p className="mt-3 text-ink-muted">This is on our side. Please try again in a moment.</p>
            </div>
          ) : results.length ? (
            <div className="divide-y divide-line">
              {results.map((h, i) => (
                <HotelRow key={h.slug} hotel={h} index={i} query={query} />
              ))}
            </div>
          ) : (
            <EmptyState city={city} filtersActive={filtersActive} cities={cities.filter((c) => c.name !== city)} />
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyState({ city, filtersActive, cities }: { city: string; filtersActive: boolean; cities: { name: string; hotelCount: number }[] }) {
  return (
    <div className="grid items-center gap-10 py-16 md:grid-cols-[14rem_1fr]">
      <EmptyRack className="mx-auto w-44 text-ink md:w-full" />
      <div>
        <p className="kicker text-laterite">No vacancy on this rack</p>
        <h3 className="display-md mt-3 text-4xl">
          Nothing matches{city ? <> in <em className="accent">{city}</em></> : null}, yet.
        </h3>
        <p className="mt-4 max-w-md leading-relaxed text-ink-muted">
          {filtersActive
            ? "Try loosening the price range or dropping an amenity or two. Most hotels here have generators and Wi-Fi even when they forget to list them."
            : "We are adding hotels city by city, and only list places that run their front desk with us. Try a neighbouring city in the meantime."}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {filtersActive ? (
            <Link href={city ? `/stays?city=${encodeURIComponent(city)}` : "/stays"} className="btn btn-ink">
              Clear filters
            </Link>
          ) : null}
          {cities.slice(0, 4).map((c) => (
            <Link key={c.name} href={`/stays?city=${encodeURIComponent(c.name)}`} className="btn btn-outline">
              {c.name} <span className="num text-xs text-ink-muted">{c.hotelCount}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
