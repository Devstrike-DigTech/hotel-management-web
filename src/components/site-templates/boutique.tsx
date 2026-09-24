import { ArrowDown } from "@phosphor-icons/react/ssr";
import { formatClock } from "@/lib/format";
import type { ThemeSection } from "@/lib/theme/types";
import type { RoomTypePublic } from "@/lib/types";
import { Plate } from "../ui/plate";
import { MobileBookBar, RoomOffer, RoomPlans, StayProvider } from "../hotel/stay-context";
import { RatesTable } from "./rates-table";
import { StayBar } from "./stay-bar";
import type { SiteCtx } from "./context";
import {
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
  titleOf,
} from "./parts";

/**
 * Boutique: image-led and quiet. A full-bleed photograph under a transparent header, the name set
 * large and light, then rooms as big alternating plates with a line each, a staggered strip of
 * photographs, and a single guest's words. Few words, a great deal of air.
 */
export function BoutiquePage({ ctx, sections }: { ctx: SiteCtx; sections: ThemeSection[] }) {
  const { hotel } = ctx;
  return (
    <StayProvider initial={ctx.initial} today={ctx.today} bookBase={ctx.bookBase} slug={hotel.slug} cancellationPolicy={hotel.booking?.cancellationPolicy ?? null} channel="BOOKING_SITE">
      <div className="pb-16 lg:pb-0" data-template-page="boutique">
        {sections.map((s, i) => (
          <BoutiqueSection key={s.id} ctx={ctx} section={s} index={i} />
        ))}
      </div>
      <MobileBookBar fromKobo={ctx.from} />
    </StayProvider>
  );
}

const IDS: Partial<Record<ThemeSection["key"], string>> = {
  highlights: "about",
  rooms: "rooms",
  "location-map": "location",
  "getting-here": "getting-here",
  gallery: "gallery",
  dining: "dining",
  faq: "faq",
  reviews: "reviews",
  contact: "contact",
  "rates-calendar": "rates",
};

function Heading({ id, kicker, title, center = false }: { id: string; kicker?: string | null; title: string; center?: boolean }) {
  return (
    <header className={center ? "text-center" : ""}>
      {kicker ? <p className="boutique-kicker">{kicker}</p> : null}
      <h2 id={id} className="display mt-4 text-[clamp(2.4rem,5.5vw,4.4rem)]">
        {title}
      </h2>
    </header>
  );
}

function BoutiqueSection({ ctx, section, index }: { ctx: SiteCtx; section: ThemeSection; index: number }) {
  const { hotel } = ctx;
  const id = IDS[section.key] ?? section.id;
  const tid = `${section.id}-title`;
  const shell = (children: React.ReactNode, className = "") => (
    <section id={id} aria-labelledby={tid} className={`scroll-mt-24 ${className}`} data-section={section.key}>
      {children}
    </section>
  );

  switch (section.key) {
    case "hero": {
      const cover = section.options.imageUrl ?? ctx.images[0]?.url ?? hotel.coverImageUrl;
      return (
        <>
          <section aria-labelledby="hotel-name" className="boutique-hero relative isolate" data-hero-bleed data-section="hero">
            <Plate src={cover} alt={ctx.images[0]?.alt ?? `${hotel.name}, ${hotel.area}`} sizes="100vw" priority caption={false} className="absolute inset-0 -z-10" />
            <div aria-hidden className="boutique-scrim absolute inset-0 -z-10" />
            <div className="container-page flex h-full flex-col justify-end pb-16 pt-32 sm:pb-24">
              <p className="boutique-kicker text-white/85">{section.options.subtitle ?? `${hotel.area}, ${hotel.city}`}</p>
              <h1 id="hotel-name" className="display mt-4 max-w-5xl text-[clamp(3.2rem,11vw,9.5rem)] text-white">
                <span className="reveal-line">
                  <span>{hotel.name}</span>
                </span>
              </h1>
              {ctx.tagline ? <p className="fade-up mt-5 max-w-xl text-[clamp(1.05rem,1.6vw,1.3rem)] leading-relaxed text-white/85 [--d:250ms]">{ctx.tagline}</p> : null}
              <a href="#about" className="mt-10 inline-flex w-fit items-center gap-3 text-[0.75rem] uppercase tracking-[0.24em] text-white/80 hover:text-white">
                <ArrowDown size={14} aria-hidden /> The house
              </a>
            </div>
          </section>
          <div className="container-page relative z-10 -mt-10">
            <StayBar fromKobo={ctx.from} className="boutique-staybar mx-auto max-w-5xl" />
          </div>
        </>
      );
    }
    case "highlights": {
      const facts = highlightItems(ctx, section).slice(0, 3);
      const lead = section.options.body ?? ctx.paragraphs[0] ?? ctx.tagline;
      return shell(
        <div className="container-page py-28 sm:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <p className="boutique-kicker">{section.options.subtitle ?? "The house"}</p>
            <h2 id={tid} className="sr-only">
              {titleOf(section, "The house")}
            </h2>
            <p className="display-md mt-8 text-[clamp(1.6rem,3.2vw,2.5rem)] leading-[1.25]">{lead}</p>
          </div>
          {facts.length ? (
            <ul className="mx-auto mt-16 grid max-w-4xl divide-y divide-line border-y border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {facts.map((f) => (
                <li key={f.title} className="px-6 py-6 text-center">
                  <p className="text-[0.9375rem]">{f.title}</p>
                  {f.body ? <p className="mt-1 text-[13px] text-ink-muted">{f.body}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>,
      );
    }
    case "rooms":
      return shell(
        <div className="container-page py-16">
          <Heading id={tid} kicker={section.options.subtitle ?? `${hotel.roomTypes.length} kinds of room`} title={titleOf(section, "Rooms")} />
          <ol className="mt-16 space-y-24 sm:space-y-32">
            {[...hotel.roomTypes]
              .sort((a, b) => a.basePriceKobo - b.basePriceKobo)
              .map((r, i) => (
                <BoutiqueRoom key={r.id} room={r} flip={i % 2 === 1} />
              ))}
          </ol>
        </div>,
      );
    case "gallery": {
      const pics = ctx.images.slice(0, 5);
      if (pics.length < 2) return null;
      return shell(
        <div className="py-24">
          <div className="container-page">
            <Heading id={tid} kicker={section.options.subtitle} title={titleOf(section, "Around the house")} />
          </div>
          <div className="boutique-strip mt-12 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:gap-5 sm:px-10">
            {pics.map((img, i) => (
              <Plate
                key={img.url + i}
                src={img.url}
                alt={img.alt}
                label={img.alt}
                sizes="(min-width: 768px) 38vw, 80vw"
                className={`shrink-0 snap-center ${i % 3 === 1 ? "aspect-[3/4] w-[62vw] sm:w-[26vw] sm:translate-y-10" : "aspect-[4/3] w-[80vw] sm:w-[38vw]"}`}
              />
            ))}
          </div>
        </div>,
      );
    }
    case "dining":
    case "experiences":
    case "meetings": {
      const list = section.key === "dining" ? diningItems(ctx, section) : section.key === "meetings" ? meetingItems(ctx, section) : experienceItems(ctx, section);
      if (!list.length && !section.options.body) return null;
      const img = section.options.imageUrl ?? ctx.images[(index % Math.max(ctx.images.length, 1)) || 1]?.url ?? null;
      const fallback = section.key === "dining" ? "At the table" : section.key === "meetings" ? "Gatherings" : "Slow days";
      return shell(
        <div className="grid items-stretch gap-0 py-16 lg:grid-cols-2">
          <Plate src={img} alt={titleOf(section, fallback)} label={titleOf(section, fallback)} sizes="(min-width: 1024px) 50vw, 100vw" className="aspect-[4/3] lg:aspect-auto lg:min-h-[34rem]" />
          <div className="flex flex-col justify-center px-6 py-14 sm:px-16">
            <Heading id={tid} kicker={section.options.subtitle} title={titleOf(section, fallback)} />
            {section.options.body ? <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-muted">{section.options.body}</p> : null}
            <ul className="mt-8 max-w-md space-y-3">
              {list.map((it) => (
                <li key={it.title} className="flex items-baseline justify-between gap-6 border-b border-line pb-3">
                  <span>{it.title}</span>
                  {it.meta ? <span className="num text-sm text-ink-muted">{it.meta}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>,
      );
    }
    case "reviews": {
      const r = ctx.reviews?.items.find((x) => x.body && x.overall >= 4) ?? ctx.reviews?.items[0];
      if (!r) return null;
      return shell(
        <div className="container-page py-28">
          <h2 id={tid} className="sr-only">
            {titleOf(section, "From the guest book")}
          </h2>
          <figure className="mx-auto max-w-3xl text-center">
            <blockquote className="display-md text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.3]">&ldquo;{r.body.length > 280 ? `${r.body.slice(0, 277).trimEnd()}...` : r.body}&rdquo;</blockquote>
            <figcaption className="boutique-kicker mt-8">
              {r.displayName} &middot; <span className="num">{r.overall}/5</span>
              {hotel.rating ? (
                <>
                  {" "}
                  &middot; <span className="num">{hotel.rating.toFixed(1)}</span> from {hotel.reviewCount} stays
                </>
              ) : null}
            </figcaption>
          </figure>
        </div>,
      );
    }
    case "getting-here":
      if (!ctx.theme.pickupPoints.length) return null;
      return shell(
        <div className="container-page grid gap-12 py-24 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <Heading id={tid} kicker={section.options.subtitle ?? "Arriving"} title={titleOf(section, "Getting here")} />
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-muted">{section.options.body ?? pickupSentenceFor(ctx)} Add a pickup when you book.</p>
          </div>
          <PickupList points={ctx.theme.pickupPoints} compact />
        </div>,
      );
    case "location-map":
      return shell(
        <div className="container-page py-20">
          <Heading id={tid} kicker={`${hotel.area}, ${hotel.city}`} title={titleOf(section, "Finding us")} />
          <div className="mt-10 grid gap-10 lg:grid-cols-[2fr_1fr]">
            <MapCard ctx={ctx} className="aspect-[16/9]" />
            <div className="space-y-6">
              <p className="text-lg leading-relaxed">{hotel.address || `${hotel.area}, ${hotel.city}`}</p>
              <ContactList ctx={ctx} />
              <p className="text-sm text-ink-muted">
                Check in from <span className="num">{formatClock(hotel.checkInTime)}</span>, out by <span className="num">{formatClock(hotel.checkOutTime)}</span>.
              </p>
            </div>
          </div>
        </div>,
      );
    case "faq": {
      const items = faqItems(ctx);
      if (!items.length) return null;
      return shell(
        <div className="container-page py-20">
          <div className="mx-auto max-w-2xl">
            <Heading id={tid} title={titleOf(section, "Before you come")} center />
            <FaqList items={items} className="mt-10" />
          </div>
        </div>,
      );
    }
    case "policies":
      return shell(
        <div className="container-page py-20">
          <div className="mx-auto max-w-2xl">
            <Heading id={tid} title={titleOf(section, "House rules")} center />
            {hotel.booking?.cancellationPolicy ? <p className="mt-8 text-center text-ink-muted">{hotel.booking.cancellationPolicy.summary}</p> : null}
            <div className="mt-8">
              <HouseRules policies={hotel.policies} numerals={false} />
            </div>
          </div>
        </div>,
      );
    case "amenities":
      return shell(
        <div className="container-page py-20 text-center">
          <Heading id={tid} title={titleOf(section, "In the house")} center />
          <p className="mx-auto mt-8 max-w-3xl text-lg leading-[1.9] text-ink-muted">{hotel.amenities.join("  ·  ")}</p>
        </div>,
      );
    case "rates-calendar":
      return shell(
        <div className="container-page py-20">
          <Heading id={tid} title={titleOf(section, "Rates")} />
          <div className="mt-10">
            <RatesTable rooms={hotel.roomTypes} look="editorial" />
          </div>
        </div>,
      );
    case "contact":
      return shell(
        <div className="container-page py-20 text-center">
          <Heading id={tid} kicker={section.options.subtitle} title={titleOf(section, "Say hello")} center />
          {section.options.body ? <p className="mx-auto mt-6 max-w-md text-lg text-ink-muted">{section.options.body}</p> : null}
          <ContactList ctx={ctx} className="mt-8 inline-block text-left" />
        </div>,
      );
    case "custom-text":
      return shell(
        <div className="container-page py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Heading id={tid} kicker={section.options.subtitle} title={titleOf(section, "A note")} center />
            <CustomText section={section} className="mt-8 text-lg leading-relaxed text-ink-muted" />
          </div>
        </div>,
      );
    default:
      return null;
  }
}

function BoutiqueRoom({ room, flip }: { room: RoomTypePublic; flip: boolean }) {
  const img = room.images[0];
  return (
    <li className={`grid items-center gap-8 lg:grid-cols-12 lg:gap-14`}>
      <Plate
        src={img?.url}
        alt={img?.alt ?? room.name}
        label={room.name}
        sizes="(min-width: 1024px) 58vw, 100vw"
        className={`aspect-[4/3] lg:col-span-7 ${flip ? "lg:order-2" : ""}`}
      />
      <div className={`lg:col-span-5 ${flip ? "lg:order-1" : ""}`}>
        <h3 className="display text-[clamp(2.2rem,4vw,3.4rem)]">{room.name}</h3>
        {room.description ? <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-muted">{room.description.split(/(?<=\.)\s/)[0]}</p> : null}
        <p className="boutique-kicker mt-6">
          Sleeps {room.capacity}
          {room.bedType ? ` · ${room.bedType}` : ""}
          {room.sizeSqm ? ` · ${room.sizeSqm} m²` : ""}
        </p>
        <div className="boutique-offer mt-8 flex flex-col items-start gap-4 border-t border-line pt-6">
          <RoomOffer room={room} />
        </div>
        {room.ratePlans && room.ratePlans.length > 1 ? (
          <div className="mt-6">
            <RoomPlans room={room} />
          </div>
        ) : null}
      </div>
    </li>
  );
}

