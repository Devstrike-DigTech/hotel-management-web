import Link from "next/link";
import {
  ArrowUpRight,
  EnvelopeSimple,
  MapPin,
  Phone,
  SignIn,
  SignOut,
  WhatsappLogo,
  ShieldCheck,
} from "@phosphor-icons/react/ssr";
import type { HotelDetail } from "@/lib/types";
import type { ISODate } from "@/lib/dates";
import { formatClock, formatPhone, placeName, roman, toE164Digits } from "@/lib/format";
import { AmenityIcon } from "../ui/amenity";
import { Gallery } from "./gallery";
import { Rating } from "./rating";
import { HotelReviews } from "../reviews/hotel-reviews";
import type { CancellationPolicy, ReviewPage } from "@/lib/booking-types";
import { RoomList } from "./room-list";
import { MobileBookBar, StayCard, StayProvider } from "./stay-context";

interface Props {
  hotel: HotelDetail;
  reviews: ReviewPage | null;
  today: ISODate;
  initial: { checkIn: ISODate | null; checkOut: ISODate | null; guests: number };
  bookBase: string;
  variant: "marketplace" | "microsite";
}

/** The hotel page, shared by the marketplace (/stays/[slug]) and the hotel's own microsite. */
export function HotelView({ hotel, reviews, today, initial, bookBase, variant }: Props) {
  const policy = hotel.booking?.cancellationPolicy ?? null;
  const images = hotel.images.length
    ? hotel.images
    : hotel.coverImageUrl
      ? [{ url: hotel.coverImageUrl, alt: `${hotel.name}, ${hotel.area}` }]
      : [];
  const paragraphs = (hotel.description || "").split(/\n\s*\n/).filter(Boolean);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotel.name}, ${hotel.address || `${hotel.area}, ${hotel.city}`}`)}`;
  const minRoom = hotel.roomTypes.reduce<number | null>((m, r) => (m === null || r.basePriceKobo < m ? r.basePriceKobo : m), null);
  const from = hotel.startingRateKobo ?? minRoom;

  return (
    <StayProvider initial={initial} today={today} bookBase={bookBase} slug={hotel.slug}>
      <div className="container-page pb-16 pt-8 lg:pb-0 lg:pt-10">
        {variant === "marketplace" ? (
          <nav aria-label="Breadcrumb" className="kicker flex flex-wrap items-center gap-2">
            <Link href="/stays" className="hover:text-ink">
              Stays
            </Link>
            <span aria-hidden>/</span>
            <Link href={`/stays?city=${encodeURIComponent(hotel.city)}`} className="hover:text-ink">
              {hotel.city}
            </Link>
            <span aria-hidden>/</span>
            <span className="text-ink" aria-current="page">
              {hotel.name}
            </span>
          </nav>
        ) : null}

        {variant === "microsite" ? (
          <header className="mx-auto mt-6 flex max-w-4xl flex-col items-center text-center sm:mt-10">
            <span aria-hidden className="adire-rule mb-8 max-w-[14rem] text-laterite/60" />
            <p className="kicker">
              Welcome to {hotel.area}, {placeName(hotel.city, hotel.state)}
            </p>
            <h1 className="display mt-5 text-[clamp(3rem,9vw,7.4rem)]">
              <span className="reveal-line">
                <span>{hotel.name}</span>
              </span>
            </h1>
            {hotel.tagline ? (
              <p className="fade-up mt-5 max-w-2xl font-display text-[clamp(1.25rem,2.4vw,1.8rem)] italic leading-snug text-laterite [--d:200ms]">
                {hotel.tagline}
              </p>
            ) : null}
            <div className="mt-8 w-full max-w-md">
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-line bg-line text-sm text-left">
            <div className="bg-paper p-3">
              <dt className="kicker !text-[10px]">Reviews</dt>
              <dd className="mt-1.5">
                <Rating rating={hotel.rating} reviewCount={hotel.reviewCount} compact />
              </dd>
            </div>
            <div className="bg-paper p-3">
              <dt className="kicker !text-[10px]">Check in</dt>
              <dd className="num mt-1.5">{formatClock(hotel.checkInTime)}</dd>
            </div>
            <div className="bg-paper p-3">
              <dt className="kicker !text-[10px]">Check out</dt>
              <dd className="num mt-1.5">{formatClock(hotel.checkOutTime)}</dd>
            </div>
          </dl>
            </div>
          </header>
        ) : (
        <header className={`grid gap-6 lg:grid-cols-12 lg:items-end ${variant === "marketplace" ? "mt-8" : "mt-4"}`}>
          <div className="lg:col-span-8">
            <p className="kicker flex items-center gap-2">
              <MapPin size={14} weight="fill" className="text-laterite" aria-hidden />
              {hotel.area} &middot; {placeName(hotel.city, hotel.state)}
            </p>
            <h1 className="display mt-4 text-[clamp(2.8rem,7.4vw,6.6rem)]">
              <span className="reveal-line">
                <span>{hotel.name}</span>
              </span>
            </h1>
            {hotel.tagline ? (
              <p className="fade-up mt-4 font-display text-[clamp(1.25rem,2.2vw,1.7rem)] italic leading-snug text-ink-muted [--d:200ms]">
                {hotel.tagline}
              </p>
            ) : null}
          </div>
          <dl className="grid grid-cols-3 gap-px self-end overflow-hidden rounded-sm border border-line bg-line text-sm lg:col-span-4">
            <div className="bg-paper p-3">
              <dt className="kicker !text-[10px]">Reviews</dt>
              <dd className="mt-1.5">
                <Rating rating={hotel.rating} reviewCount={hotel.reviewCount} compact />
              </dd>
            </div>
            <div className="bg-paper p-3">
              <dt className="kicker !text-[10px]">Check in</dt>
              <dd className="num mt-1.5">{formatClock(hotel.checkInTime)}</dd>
            </div>
            <div className="bg-paper p-3">
              <dt className="kicker !text-[10px]">Check out</dt>
              <dd className="num mt-1.5">{formatClock(hotel.checkOutTime)}</dd>
            </div>
          </dl>
        </header>
        )}

        <div className="fade-up mt-8 [--d:150ms]">
          <Gallery images={images} name={hotel.name} />
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 lg:col-span-8">
            {/* About */}
            <section id="about" aria-labelledby="about-title" className="scroll-mt-28">
              <SectionHead n={1} id="about-title" title="The house" />
              <div className="prose-body drop-cap mt-6 max-w-[62ch]">
                {paragraphs.length ? paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p>{hotel.tagline}</p>}
              </div>
            </section>

            {/* Amenities */}
            {hotel.amenities.length ? (
              <section aria-labelledby="amenities-title" className="mt-14">
                <SectionHead n={2} id="amenities-title" title="What's here" />
                <ul className="mt-6 grid grid-cols-2 overflow-hidden rounded-sm border-l border-t border-line sm:grid-cols-3">
                  {hotel.amenities.map((a) => (
                    <li key={a} className="flex items-center gap-3 border-b border-r border-line px-4 py-4 text-[0.9375rem]">
                      <AmenityIcon label={a} size={22} className="shrink-0 text-laterite" />
                      {a}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Rooms */}
            <section id="rooms" aria-labelledby="rooms-title" className="mt-14 scroll-mt-28">
              <SectionHead n={3} id="rooms-title" title="Rooms" aside={`${hotel.roomTypes.length} ${hotel.roomTypes.length === 1 ? "type" : "types"}`} />
              <div className="mt-6">
                <RoomList rooms={hotel.roomTypes} />
              </div>
            </section>

            {/* Reviews */}
            <section id="reviews" aria-labelledby="reviews-title" className="mt-14 scroll-mt-28">
              <SectionHead
                n={4}
                id="reviews-title"
                title="Guest book"
                aside={reviews?.summary.count ? `${reviews.summary.count} verified ${reviews.summary.count === 1 ? "stay" : "stays"}` : undefined}
              />
              <div className="mt-6">
                {reviews ? (
                  <HotelReviews slug={hotel.slug} hotelName={hotel.name} initial={reviews} />
                ) : (
                  <p className="text-ink-muted">Reviews could not be loaded just now.</p>
                )}
              </div>
            </section>

            {/* Policies */}
            <section aria-labelledby="rules-title" className="mt-14">
              <SectionHead n={5} id="rules-title" title="House rules and cancellation" />
              {policy ? <CancellationCard policy={policy} /> : null}
              <div className="mt-6 grid gap-8 md:grid-cols-[1fr_15rem]">
                {hotel.policies.length ? (
                  <ol className="space-y-4">
                    {hotel.policies.map((p, i) => (
                      <li key={i} className="grid grid-cols-[2rem_1fr] gap-2 text-[0.9375rem] leading-relaxed">
                        <span className="font-display italic text-laterite">{roman(i + 1)}.</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-ink-muted">Ask the front desk about house rules before you arrive.</p>
                )}
                <dl className="self-start rounded-sm border border-line">
                  <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                    <dt className="flex items-center gap-2 text-sm text-ink-muted">
                      <SignIn size={17} weight="light" aria-hidden /> Check in from
                    </dt>
                    <dd className="num text-sm">{formatClock(hotel.checkInTime)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <dt className="flex items-center gap-2 text-sm text-ink-muted">
                      <SignOut size={17} weight="light" aria-hidden /> Check out by
                    </dt>
                    <dd className="num text-sm">{formatClock(hotel.checkOutTime)}</dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* Location */}
            <section id="location" aria-labelledby="where-title" className="mt-14 scroll-mt-28">
              <SectionHead n={6} id="where-title" title="Finding it" />
              <div className="mt-6 grid gap-6 rounded-sm border border-line bg-surface p-6 sm:grid-cols-2">
                <address className="not-italic">
                  <p className="display-sm text-xl">{hotel.name}</p>
                  <p className="mt-2 leading-relaxed text-ink-muted">{hotel.address || `${hotel.area}, ${hotel.city}`}</p>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="link-static mt-4 inline-flex items-center gap-1.5 text-sm">
                    Open in Google Maps <ArrowUpRight size={14} aria-hidden />
                  </a>
                </address>
                <ul className="space-y-3 text-[0.9375rem] sm:border-l sm:border-line sm:pl-6">
                  {hotel.phone ? (
                    <>
                      <li>
                        <a href={`tel:+${toE164Digits(hotel.phone)}`} className="flex items-center gap-3 hover:text-laterite">
                          <Phone size={18} weight="light" aria-hidden />
                          <span className="num">{formatPhone(hotel.phone)}</span>
                        </a>
                      </li>
                      <li>
                        <a
                          href={`https://wa.me/${toE164Digits(hotel.phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 hover:text-laterite"
                        >
                          <WhatsappLogo size={18} weight="light" aria-hidden /> Message on WhatsApp
                        </a>
                      </li>
                    </>
                  ) : null}
                  {hotel.email ? (
                    <li>
                      <a href={`mailto:${hotel.email}`} className="flex items-center gap-3 break-all hover:text-laterite">
                        <EnvelopeSimple size={18} weight="light" aria-hidden /> {hotel.email}
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
            </section>
          </div>

          <aside aria-label="Plan your stay" className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <StayCard fromKobo={from} phone={hotel.phone} cancellationSummary={policy?.summary} />
            </div>
          </aside>
        </div>
      </div>
      <MobileBookBar fromKobo={from} />
    </StayProvider>
  );
}

/** The cancellation policy as a three-step timeline: free, then a fee, then a no-show. */
function CancellationCard({ policy }: { policy: CancellationPolicy }) {
  const fee = policy.lateCancellationFeePct;
  const feeText = fee >= 100 ? "the first night" : fee > 0 ? `${fee}% of the first night` : "nothing";
  const noShow = policy.noShowFeePct >= 100 ? "the first night" : policy.noShowFeePct > 0 ? `${policy.noShowFeePct}% of the first night` : "nothing";
  const steps = [
    { k: "Free", body: policy.freeCancellationHours > 0 ? `Cancel up to ${policy.freeCancellationHours} hours before check-in and pay nothing. Paid online? It all comes back.` : "Cancellation is not free for this hotel; see below.", tone: "bg-palm" },
    { k: "Late", body: `Within ${policy.freeCancellationHours} hours of check-in, cancelling costs ${feeText}. The rest is refunded.`, tone: "bg-ochre" },
    { k: "No-show", body: `If you do not arrive, the hotel may charge ${noShow}.`, tone: "bg-danger" },
  ];
  return (
    <div className="mt-6 rounded-sm border border-line bg-surface p-5 sm:p-6" data-testid="cancellation-policy">
      <p className="flex items-center gap-2 text-[0.9375rem] font-medium">
        <ShieldCheck size={19} weight="light" className="text-palm" aria-hidden /> {policy.summary}
      </p>
      <ol className="mt-5 grid gap-5 sm:grid-cols-3 sm:gap-0">
        {steps.map((s, i) => (
          <li key={s.k} className="relative sm:pr-6">
            <div className="flex items-center gap-2" aria-hidden>
              <span className={`size-2.5 rounded-full ${s.tone}`} />
              {i < steps.length - 1 ? <span className="hidden h-px flex-1 bg-line-strong sm:block" /> : null}
            </div>
            <p className="kicker mt-3">{s.k}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SectionHead({ n, id, title, aside }: { n: number; id: string; title: string; aside?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-3">
      <h2 id={id} className="display-sm flex items-baseline gap-3 text-[1.9rem]">
        <span className="num text-xs text-laterite">{String(n).padStart(2, "0")}</span>
        {title}
      </h2>
      {aside ? <span className="kicker">{aside}</span> : null}
    </div>
  );
}
