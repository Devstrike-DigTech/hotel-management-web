import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin } from "@phosphor-icons/react/ssr";
import { placeName, roman } from "@/lib/format";
import { AmenityIcon } from "../ui/amenity";
import { Money } from "../ui/money";
import { Plate } from "../ui/plate";
import { Rating } from "./rating";

export interface GroupPropertyEntry {
  slug: string;
  name: string;
  tagline: string;
  area: string;
  city: string;
  state: string;
  coverImageUrl: string | null;
  startingRateKobo: number | null;
  rating: number | null;
  reviewCount: number;
  amenities: string[];
  /** The property's own microsite. */
  href: string;
  /** Straight to booking on that site. */
  bookHref: string;
  /** Link leaves this host (another subdomain or a custom domain). */
  external?: boolean;
}

interface Props {
  group: { name: string; tagline?: string | null; description?: string | null };
  properties: GroupPropertyEntry[];
  loyalty?: { programmeName: string; earnPerThousand?: number | null } | null;
}

/**
 * A hotel group's own site: the group as masthead, then each property as a full-width entry in
 * the group's register (plate, numeral, place, voice, price), each leading to that hotel's own
 * microsite. Shown when a group has more than one property.
 */
export function GroupIndex({ group, properties, loyalty }: Props) {
  const cities = [...new Set(properties.map((p) => p.city))];
  const where = cities.length === 1 ? cities[0] : `${cities.slice(0, -1).join(", ")} and ${cities.at(-1)}`;
  return (
    <div className="container-page pb-4 pt-8 sm:pt-12" data-testid="group-index">
      <header className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <span aria-hidden className="adire-rule mb-8 max-w-[14rem] text-laterite/60" />
        <p className="kicker">
          {properties.length} {properties.length === 1 ? "hotel" : "hotels"} in {where}
        </p>
        <h1 className="display mt-5 text-[clamp(3rem,8.5vw,7rem)]">
          <span className="reveal-line">
            <span>{group.name}</span>
          </span>
        </h1>
        {group.tagline ? (
          <p className="fade-up mt-5 max-w-2xl font-display text-[clamp(1.25rem,2.4vw,1.8rem)] italic leading-snug text-laterite [--d:200ms]">{group.tagline}</p>
        ) : null}
        {group.description ? <p className="fade-up mt-6 max-w-[58ch] leading-relaxed text-ink-muted [--d:260ms]">{group.description}</p> : null}
      </header>

      <section aria-labelledby="houses-title" id="hotels" className="mt-16 scroll-mt-28 sm:mt-20">
        <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-3">
          <h2 id="houses-title" className="display-sm text-[1.9rem]">
            Our hotels
          </h2>
          <span className="kicker hidden sm:inline">Choose a house to see its rooms</span>
        </div>
        <ol className="divide-y divide-line">
          {properties.map((p, i) => (
            <li key={p.slug} className="group relative grid gap-6 py-10 md:grid-cols-12 md:items-center md:gap-10" data-testid="group-property" data-slug={p.slug}>
              <div className={`md:col-span-7 ${i % 2 ? "md:order-2" : ""}`}>
                <Plate
                  src={p.coverImageUrl}
                  alt={`${p.name}, ${p.area}`}
                  label={`${p.area}, ${p.city}`}
                  sizes="(min-width: 768px) 58vw, 100vw"
                  priority={i === 0}
                  className="aspect-[16/10] rounded-sm"
                  imgClassName="group-hover:scale-[1.02]"
                />
              </div>
              <div className={`min-w-0 md:col-span-5 ${i % 2 ? "md:order-1" : ""}`}>
                <p className="kicker flex items-center gap-2">
                  <span className="font-display text-base normal-case italic tracking-normal text-laterite">{roman(i + 1)}.</span>
                  <MapPin size={13} weight="fill" className="text-laterite" aria-hidden />
                  {p.area} &middot; {placeName(p.city, p.state)}
                </p>
                <h3 className="display-md mt-3 text-[clamp(2rem,4vw,3rem)]">
                  <Link href={p.href} className="after:absolute after:inset-0 after:content-[''] group-hover:text-laterite" data-testid="group-property-link">
                    {p.name}
                  </Link>
                </h3>
                {p.tagline ? <p className="mt-2 font-display text-[1.15rem] italic leading-snug text-ink-muted">{p.tagline}</p> : null}
                {p.amenities.length ? (
                  <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2" aria-label="Amenities">
                    {p.amenities.slice(0, 5).map((a) => (
                      <li key={a} className="flex items-center gap-1.5 text-[0.8125rem] text-ink-muted">
                        <AmenityIcon label={a} size={16} className="text-ink" />
                        {a}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4">
                  <div>
                    <Rating rating={p.rating} reviewCount={p.reviewCount} />
                    {p.startingRateKobo ? (
                      <p className="mt-1.5 text-sm text-ink-muted">
                        from <Money kobo={p.startingRateKobo} className="text-lg font-medium text-ink" /> a night
                      </p>
                    ) : null}
                  </div>
                  <span className="relative z-10 flex items-center gap-2">
                    <Link href={p.bookHref} className="btn btn-primary !min-h-10 text-sm">
                      Book <ArrowRight size={14} aria-hidden />
                    </Link>
                    <span className="btn btn-outline pointer-events-none !min-h-10 text-sm group-hover:border-ink" aria-hidden>
                      Visit <ArrowUpRight size={14} />
                    </span>
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {loyalty ? (
        <section aria-labelledby="circle-title" className="relative mt-10 overflow-hidden rounded-md border border-brass/50 bg-brass/[0.05] px-6 py-8 sm:px-10">
          <span aria-hidden className="adire-field pointer-events-none absolute -right-8 top-0 h-full w-64 text-brass opacity-[0.12]" />
          <p className="kicker flex items-center gap-2 !text-ink"><span aria-hidden className="size-1.5 rotate-45 bg-brass" />One programme, every house</p>
          <h2 id="circle-title" className="display-sm mt-2 text-[1.7rem]">
            {loyalty.programmeName}
          </h2>
          <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-muted">
            Stay at any of our hotels and your points and nights count together
            {loyalty.earnPerThousand ? (
              <>
                : <span className="num text-ink">{loyalty.earnPerThousand}</span> {loyalty.earnPerThousand === 1 ? "point" : "points"} for every <span className="num">₦1,000</span> on rooms, food and drink
              </>
            ) : null}
            . Sign in when you book to use them.
          </p>
        </section>
      ) : null}
    </div>
  );
}
