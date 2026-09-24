import { Star } from "@phosphor-icons/react/ssr";
import type { ThemeSection } from "@/lib/theme/types";
import type { RoomTypePublic } from "@/lib/types";
import { AmenityIcon } from "../ui/amenity";
import { Plate } from "../ui/plate";
import { Gallery } from "../hotel/gallery";
import { MobileBookBar, RoomOffer, RoomPlans, StayProvider } from "../hotel/stay-context";
import { RatesTable } from "./rates-table";
import { StayBar } from "./stay-bar";
import type { SiteCtx } from "./context";
import {
  CancellationTimeline,
  CheckTimes,
  ContactList,
  CustomText,
  diningItems,
  experienceItems,
  FaqList,
  faqItems,
  highlightItems,
  HouseRules,
  MapCard,
  meetingItems,
  PickupList,
  pickupSentenceFor,
  ReviewQuotes,
  titleOf,
} from "./parts";

/**
 * Resort: immersive and soft. A mosaic of photographs opens the page with the name on a card,
 * then days by the water: things to do as picture cards, rooms as rounded cards, the table, a
 * gallery. Rounder corners, a gentle wave between chapters.
 */
export function ResortPage({ ctx, sections }: { ctx: SiteCtx; sections: ThemeSection[] }) {
  const { hotel } = ctx;
  return (
    <StayProvider initial={ctx.initial} today={ctx.today} bookBase={ctx.bookBase} slug={hotel.slug} cancellationPolicy={hotel.booking?.cancellationPolicy ?? null} channel="BOOKING_SITE">
      <div className="pb-16 lg:pb-0" data-template-page="resort">
        {sections.map((s, i) => (
          <ResortSection key={s.id} ctx={ctx} section={s} first={i === 0} />
        ))}
      </div>
      <MobileBookBar fromKobo={ctx.from} />
    </StayProvider>
  );
}

/** Mosaic cells on a 4 x 2 grid for one to five photographs (phones show the first only). */
function mosaicCell(i: number, n: number) {
  if (i === 0) return n === 1 ? "col-span-4 row-span-2" : n === 2 ? "col-span-4 row-span-2 md:col-span-2" : "col-span-4 row-span-2 md:col-span-2";
  const rest: Record<number, string[]> = {
    2: ["md:col-span-2 md:row-span-2"],
    3: ["md:col-span-1 md:row-span-2", "md:col-span-1 md:row-span-2"],
    4: ["md:col-span-2 md:row-span-1", "md:col-span-1 md:row-span-1", "md:col-span-1 md:row-span-1"],
  };
  return `hidden md:block ${(rest[n] ?? [])[i - 1] ?? "md:col-span-1 md:row-span-1"}`;
}

function Wave() {
  return (
    <svg viewBox="0 0 1200 24" preserveAspectRatio="none" className="mx-auto block h-5 w-full max-w-3xl text-laterite/45" aria-hidden>
      <path d="M0 12 C 100 0, 200 24, 300 12 S 500 0, 600 12 S 800 24, 900 12 S 1100 0, 1200 12" fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Heading({ id, kicker, title, center = true }: { id: string; kicker?: string | null; title: string; center?: boolean }) {
  return (
    <header className={center ? "mx-auto max-w-2xl text-center" : ""}>
      {kicker ? <p className="resort-kicker">{kicker}</p> : null}
      <h2 id={id} className="display-md mt-3 text-[clamp(2.1rem,4.4vw,3.4rem)]">
        {title}
      </h2>
    </header>
  );
}

const IDS: Partial<Record<ThemeSection["key"], string>> = {
  highlights: "about",
  experiences: "experiences",
  rooms: "rooms",
  dining: "dining",
  gallery: "gallery",
  amenities: "amenities",
  reviews: "reviews",
  "getting-here": "getting-here",
  "location-map": "location",
  policies: "policies",
  faq: "faq",
  contact: "contact",
  "rates-calendar": "rates",
};

function ResortSection({ ctx, section, first }: { ctx: SiteCtx; section: ThemeSection; first: boolean }) {
  const { hotel } = ctx;
  const id = IDS[section.key] ?? section.id;
  const tid = `${section.id}-title`;
  const shell = (children: React.ReactNode, className = "") => (
    <section id={id} aria-labelledby={tid} className={`scroll-mt-28 ${first ? "" : "pt-20 sm:pt-28"} ${className}`} data-section={section.key}>
      {!first && section.key !== "hero" ? <Wave /> : null}
      <div className={section.key === "hero" ? "" : "mt-10"}>{children}</div>
    </section>
  );

  switch (section.key) {
    case "hero": {
      const pics = ctx.images.slice(0, 5);
      return (
        <section aria-labelledby="hotel-name" className="container-page pt-4" data-section="hero">
          <div className="resort-mosaic relative grid h-[min(78vh,46rem)] min-h-[26rem] grid-cols-4 grid-rows-2 gap-2 sm:gap-3">
            {(pics.length ? pics : [{ url: hotel.coverImageUrl ?? "", alt: hotel.name }]).map((img, i) => (
              <Plate
                key={img.url + i}
                src={img.url || null}
                alt={img.alt}
                label={i === 0 ? undefined : img.alt}
                caption={i !== 0}
                sizes={i === 0 ? "(min-width: 768px) 50vw, 100vw" : "25vw"}
                priority={i === 0}
                className={`rounded-[22px] ${mosaicCell(i, pics.length)}`}
              />
            ))}
            <div className="absolute bottom-4 left-4 right-4 max-w-lg rounded-[20px] bg-paper/95 p-5 shadow-[var(--shadow-float)] sm:bottom-6 sm:left-6 sm:p-7">
              <p className="resort-kicker">{section.options.subtitle ?? `${hotel.area}, ${hotel.city}`}</p>
              <h1 id="hotel-name" className="display-md mt-2 text-[clamp(2.2rem,5vw,3.8rem)]">
                {hotel.name}
              </h1>
              {ctx.tagline ? <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink-muted">{ctx.tagline}</p> : null}
              {hotel.rating ? (
                <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 text-sm">
                  <Star size={14} weight="fill" className="text-brass" aria-hidden />
                  <span className="num font-medium">{hotel.rating.toFixed(1)}</span>
                  <span className="text-ink-muted">from {hotel.reviewCount} stays</span>
                </p>
              ) : null}
            </div>
          </div>
          <StayBar fromKobo={ctx.from} className="resort-staybar mx-auto mt-6 max-w-5xl" />
        </section>
      );
    }
    case "highlights": {
      const facts = highlightItems(ctx, section);
      return shell(
        <div className="container-page">
          <Heading id={tid} kicker={section.options.subtitle ?? "Welcome"} title={titleOf(section, "Days by the water")} />
          <div className="mx-auto mt-8 max-w-2xl space-y-4 text-center text-lg leading-relaxed text-ink-muted">
            {(section.options.body ? [section.options.body] : ctx.paragraphs.slice(0, 2)).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2.5">
            {facts.map((f) => (
              <li key={f.title} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm">
                <AmenityIcon label={f.title} size={16} className="text-laterite" /> {f.title}
              </li>
            ))}
          </ul>
        </div>,
      );
    }
    case "experiences":
    case "dining":
    case "meetings": {
      const list = section.key === "experiences" ? experienceItems(ctx, section) : section.key === "dining" ? diningItems(ctx, section) : meetingItems(ctx, section);
      if (!list.length && !section.options.body) return null;
      const fallback = section.key === "experiences" ? "Things to do" : section.key === "dining" ? "Eat and drink" : "Celebrations and meetings";
      const imgs = ctx.images;
      return shell(
        <div className="container-page">
          <Heading id={tid} kicker={section.options.subtitle} title={titleOf(section, fallback)} />
          {section.options.body ? <p className="mx-auto mt-5 max-w-xl text-center text-lg text-ink-muted">{section.options.body}</p> : null}
          <ul className={`mt-10 grid gap-4 ${list.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
            {list.map((it, i) => (
              <li key={it.title} className="overflow-hidden rounded-[22px] border border-line bg-surface">
                <Plate src={it.imageUrl ?? imgs[(i + 1) % Math.max(imgs.length, 1)]?.url} alt={it.title} label={it.title} sizes="(min-width: 1024px) 30vw, 100vw" className="aspect-[5/4]" />
                <div className="p-5">
                  <p className="display-sm text-xl">{it.title}</p>
                  {it.body ? <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">{it.body}</p> : null}
                  {it.meta ? <p className="mt-3 inline-block rounded-full bg-surface-2 px-3 py-1 text-[12.5px]">{it.meta}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>,
      );
    }
    case "rooms":
      return shell(
        <div className="container-page">
          <Heading id={tid} kicker={section.options.subtitle ?? "Stay"} title={titleOf(section, "Rooms and suites")} />
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {[...hotel.roomTypes]
              .sort((a, b) => a.basePriceKobo - b.basePriceKobo)
              .map((r) => (
                <ResortRoom key={r.id} room={r} />
              ))}
          </ul>
        </div>,
      );
    case "gallery":
      return ctx.images.length > 1
        ? shell(
            <div className="container-page">
              <Heading id={tid} kicker={section.options.subtitle} title={titleOf(section, "Gallery")} />
              <div className="resort-gallery mt-10">
                <Gallery images={ctx.images} name={hotel.name} />
              </div>
            </div>,
          )
        : null;
    case "amenities":
      return hotel.amenities.length
        ? shell(
            <div className="container-page">
              <Heading id={tid} title={titleOf(section, "Everything here")} />
              <ul className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-2.5">
                {hotel.amenities.map((a) => (
                  <li key={a} className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2.5 text-[0.9375rem]">
                    <AmenityIcon label={a} size={18} className="text-laterite" /> {a}
                  </li>
                ))}
              </ul>
            </div>,
          )
        : null;
    case "reviews":
      return ctx.reviews?.items.length
        ? shell(
            <div className="container-page">
              <Heading id={tid} kicker={hotel.rating ? `${hotel.rating.toFixed(1)} out of 5` : null} title={titleOf(section, "What guests say")} />
              <ReviewQuotes ctx={ctx} max={3} className="resort-quotes mt-10 grid gap-4 md:grid-cols-3" />
            </div>,
          )
        : null;
    case "getting-here":
      return ctx.theme.pickupPoints.length
        ? shell(
            <div className="container-page">
              <div className="grid gap-10 rounded-[28px] bg-surface p-6 sm:p-10 lg:grid-cols-[1fr_1.4fr]">
                <div>
                  <Heading id={tid} kicker={section.options.subtitle ?? "Arrive easy"} title={titleOf(section, "We'll collect you")} center={false} />
                  <p className="mt-5 text-lg leading-relaxed text-ink-muted">{section.options.body ?? pickupSentenceFor(ctx)} Choose a pickup while you book, and the driver will be waiting.</p>
                </div>
                <PickupList points={ctx.theme.pickupPoints} compact />
              </div>
            </div>,
          )
        : null;
    case "location-map":
      return shell(
        <div className="container-page">
          <Heading id={tid} kicker={`${hotel.area}, ${hotel.city}`} title={titleOf(section, "Where we are")} />
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <MapCard ctx={ctx} className="aspect-[16/9] rounded-[22px]" />
            <div className="space-y-5 rounded-[22px] border border-line p-6">
              <p className="text-lg">{hotel.address || `${hotel.area}, ${hotel.city}`}</p>
              <ContactList ctx={ctx} />
            </div>
          </div>
        </div>,
      );
    case "policies":
      return shell(
        <div className="container-page">
          <Heading id={tid} title={titleOf(section, "Good to know")} />
          <div className="mx-auto mt-10 max-w-4xl space-y-6">
            {hotel.booking?.cancellationPolicy ? <CancellationTimeline policy={hotel.booking.cancellationPolicy} /> : null}
            <div className="grid gap-6 md:grid-cols-[1fr_15rem]">
              <HouseRules policies={hotel.policies} numerals={false} />
              <CheckTimes ctx={ctx} className="self-start" />
            </div>
          </div>
        </div>,
      );
    case "faq": {
      const items = faqItems(ctx);
      return items.length
        ? shell(
            <div className="container-page">
              <div className="mx-auto max-w-2xl">
                <Heading id={tid} title={titleOf(section, "Questions")} />
                <FaqList items={items} className="mt-8" />
              </div>
            </div>,
          )
        : null;
    }
    case "rates-calendar":
      return shell(
        <div className="container-page">
          <Heading id={tid} title={titleOf(section, "Rates")} />
          <div className="mt-8 rounded-[22px] border border-line p-4 sm:p-6">
            <RatesTable rooms={hotel.roomTypes} look="editorial" />
          </div>
        </div>,
      );
    case "contact":
      return shell(
        <div className="container-page text-center">
          <Heading id={tid} title={titleOf(section, "Talk to us")} />
          <ContactList ctx={ctx} className="mt-8 inline-block text-left" />
        </div>,
      );
    case "custom-text":
      return shell(
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <Heading id={tid} kicker={section.options.subtitle} title={titleOf(section, "A note")} />
            <CustomText section={section} className="mt-6 text-lg leading-relaxed text-ink-muted" />
          </div>
        </div>,
      );
    default:
      return null;
  }
}

function ResortRoom({ room }: { room: RoomTypePublic }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-[24px] border border-line bg-surface">
      <Plate src={room.images[0]?.url} alt={room.images[0]?.alt ?? room.name} label={room.name} sizes="(min-width: 768px) 45vw, 100vw" className="aspect-[16/10]" />
      <div className="flex flex-1 flex-col p-6">
        <h3 className="display-sm text-[1.6rem]">{room.name}</h3>
        {room.description ? <p className="mt-2 line-clamp-3 text-[0.9375rem] leading-relaxed text-ink-muted">{room.description}</p> : null}
        <ul className="mt-4 flex flex-wrap gap-2 text-[12.5px]">
          <li className="rounded-full bg-surface-2 px-3 py-1">Sleeps {room.capacity}</li>
          {room.bedType ? <li className="rounded-full bg-surface-2 px-3 py-1">{room.bedType}</li> : null}
          {room.sizeSqm ? <li className="num rounded-full bg-surface-2 px-3 py-1">{room.sizeSqm} m&sup2;</li> : null}
        </ul>
        <div className="resort-offer mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
          <RoomOffer room={room} />
        </div>
        {room.ratePlans && room.ratePlans.length > 1 ? (
          <div className="mt-5">
            <RoomPlans room={room} />
          </div>
        ) : null}
      </div>
    </li>
  );
}
