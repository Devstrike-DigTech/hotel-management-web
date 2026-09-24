import { formatClock, roman } from "@/lib/format";
import type { ThemeSection } from "@/lib/theme/types";
import type { RoomTypePublic } from "@/lib/types";
import { Plate } from "../ui/plate";
import { MobileBookBar, RoomOffer, RoomPlans, StayProvider } from "../hotel/stay-context";
import { RatesTable } from "./rates-table";
import { StayBar } from "./stay-bar";
import type { SiteCtx } from "./context";
import { OrnamentRule } from "./ornaments";
import {
  AddressBlock,
  CancellationTimeline,
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
 * Heritage: formal and classical. Centred, capitals set with generous tracking, photographs in
 * double frames, sections opened by an ornamental rule and numbered in Roman figures.
 */
export function HeritagePage({ ctx, sections }: { ctx: SiteCtx; sections: ThemeSection[] }) {
  const { hotel } = ctx;
  let n = 0;
  return (
    <StayProvider initial={ctx.initial} today={ctx.today} bookBase={ctx.bookBase} slug={hotel.slug} cancellationPolicy={hotel.booking?.cancellationPolicy ?? null} channel="BOOKING_SITE">
      <div className="pb-16 lg:pb-0" data-template-page="heritage">
        {sections.map((s) => (
          <HeritageSection key={s.id} ctx={ctx} section={s} n={s.key === "hero" ? 0 : ++n} />
        ))}
      </div>
      <MobileBookBar fromKobo={ctx.from} />
    </StayProvider>
  );
}

function Heading({ id, n, title, kicker }: { id: string; n: number; title: string; kicker?: string | null }) {
  return (
    <header className="text-center">
      <OrnamentRule />
      <p className="heritage-numeral mt-4">{roman(n)}</p>
      <h2 id={id} className="heritage-title mt-2 text-[clamp(1.6rem,3.2vw,2.3rem)]">
        {title}
      </h2>
      {kicker ? <p className="mx-auto mt-3 max-w-xl font-display text-lg italic text-ink-muted">{kicker}</p> : null}
    </header>
  );
}

const IDS: Partial<Record<ThemeSection["key"], string>> = {
  highlights: "about",
  rooms: "rooms",
  gallery: "gallery",
  dining: "dining",
  reviews: "reviews",
  policies: "policies",
  "getting-here": "getting-here",
  "location-map": "location",
  faq: "faq",
  contact: "contact",
  "rates-calendar": "rates",
};

function HeritageSection({ ctx, section, n }: { ctx: SiteCtx; section: ThemeSection; n: number }) {
  const { hotel } = ctx;
  const id = IDS[section.key] ?? section.id;
  const tid = `${section.id}-title`;
  const shell = (title: string, children: React.ReactNode, kicker?: string | null, narrow = true) => (
    <section id={id} aria-labelledby={tid} className="scroll-mt-40 pt-24 sm:pt-28" data-section={section.key}>
      <div className="container-page">
        <Heading id={tid} n={n} title={title} kicker={kicker} />
        <div className={`mx-auto mt-12 ${narrow ? "max-w-4xl" : "max-w-6xl"}`}>{children}</div>
      </div>
    </section>
  );

  switch (section.key) {
    case "hero": {
      const cover = section.options.imageUrl ?? ctx.images[0]?.url ?? hotel.coverImageUrl;
      return (
        <section aria-labelledby="hotel-name" className="container-page pt-12 text-center sm:pt-16" data-section="hero">
          <p className="heritage-kicker">{section.options.subtitle ?? `${hotel.area} · ${hotel.city}`}</p>
          <h1 id="hotel-name" className="heritage-display mx-auto mt-6 max-w-5xl text-[clamp(2.5rem,7vw,5.6rem)]">
            {hotel.name}
          </h1>
          {ctx.tagline ? <p className="mx-auto mt-5 max-w-2xl font-display text-[clamp(1.2rem,2vw,1.55rem)] italic text-ink-muted">{ctx.tagline}</p> : null}
          <OrnamentRule className="mt-8" />
          <div className="heritage-frame mx-auto mt-10 max-w-5xl">
            <Plate src={cover} alt={ctx.images[0]?.alt ?? hotel.name} label={hotel.name} sizes="(min-width: 1024px) 64rem, 100vw" priority className="aspect-[16/8]" />
          </div>
          <StayBar fromKobo={ctx.from} className="heritage-staybar mx-auto mt-8 max-w-4xl text-left" tone="paper" />
        </section>
      );
    }
    case "highlights": {
      const facts = highlightItems(ctx, section);
      const paras = section.options.body ? section.options.body.split(/\n\s*\n/) : ctx.paragraphs.length ? ctx.paragraphs : [ctx.tagline];
      return shell(
        titleOf(section, "The House"),
        <>
          <div className="heritage-prose gap-10 text-[1.0625rem] leading-[1.8] md:columns-2">
            {paras.map((p, i) => (
              <p key={i} className="mb-4 break-inside-avoid">
                {p}
              </p>
            ))}
          </div>
          {facts.length ? (
            <dl className="mt-12 grid gap-px border-y border-line sm:grid-cols-4">
              {facts.map((f) => (
                <div key={f.title} className="px-4 py-5 text-center">
                  <dt className="heritage-caps text-[12px]">{f.title}</dt>
                  {f.body ? <dd className="mt-1.5 text-[13px] text-ink-muted">{f.body}</dd> : null}
                </div>
              ))}
            </dl>
          ) : null}
        </>,
        section.options.subtitle,
      );
    }
    case "rooms":
      return shell(
        titleOf(section, "Chambers and Suites"),
        <ul className="grid gap-10 md:grid-cols-2">
          {[...hotel.roomTypes]
            .sort((a, b) => a.basePriceKobo - b.basePriceKobo)
            .map((r) => (
              <HeritageRoom key={r.id} room={r} />
            ))}
        </ul>,
        section.options.subtitle,
        false,
      );
    case "gallery": {
      const pics = ctx.images.slice(1, 4);
      if (!pics.length) return null;
      return shell(
        titleOf(section, "The Rooms and Grounds"),
        <div className="grid gap-6 sm:grid-cols-3">
          {pics.map((img, i) => (
            <figure key={img.url + i} className="text-center">
              <div className="heritage-frame">
                <Plate src={img.url} alt={img.alt} label={img.alt} sizes="(min-width: 640px) 30vw, 100vw" className="aspect-[3/4]" />
              </div>
              <figcaption className="mt-3 font-display text-[0.9375rem] italic text-ink-muted">{img.alt}</figcaption>
            </figure>
          ))}
        </div>,
        section.options.subtitle,
        false,
      );
    }
    case "dining":
    case "experiences":
    case "meetings": {
      const list = section.key === "dining" ? diningItems(ctx, section) : section.key === "meetings" ? meetingItems(ctx, section) : experienceItems(ctx, section);
      if (!list.length && !section.options.body) return null;
      const fallback = section.key === "dining" ? "The Dining Room" : section.key === "meetings" ? "Functions and Receptions" : "Pursuits";
      return shell(
        titleOf(section, fallback),
        <div className="text-center">
          {section.options.body ? <p className="mx-auto max-w-2xl text-[1.0625rem] leading-[1.8]">{section.options.body}</p> : null}
          <ul className="mx-auto mt-8 max-w-xl">
            {list.map((it) => (
              <li key={it.title} className="flex items-baseline gap-3 py-2">
                <span className="heritage-caps text-[13px]">{it.title}</span>
                <span aria-hidden className="leader" />
                <span className="font-display italic text-ink-muted">{it.meta ?? it.body ?? ""}</span>
              </li>
            ))}
          </ul>
        </div>,
        section.options.subtitle,
      );
    }
    case "reviews": {
      const r = ctx.reviews?.items.find((x) => x.body) ?? null;
      if (!r) return null;
      return shell(
        titleOf(section, "From the Visitors' Book"),
        <figure className="text-center">
          <span aria-hidden className="block font-display text-7xl leading-none text-brass">&ldquo;</span>
          <blockquote className="mx-auto -mt-4 max-w-3xl font-display text-[clamp(1.35rem,2.4vw,1.8rem)] italic leading-[1.5]">{r.body.length > 320 ? `${r.body.slice(0, 317).trimEnd()}...` : r.body}</blockquote>
          <figcaption className="heritage-caps mt-6 text-[12px] text-ink-muted">
            {r.displayName}
            {hotel.rating ? (
              <>
                {" "}
                &middot; <span className="num">{hotel.rating.toFixed(1)}</span> across {hotel.reviewCount} stays
              </>
            ) : null}
          </figcaption>
        </figure>,
      );
    }
    case "policies":
      return shell(
        titleOf(section, "Terms of Residence"),
        <div className="space-y-10">
          {hotel.booking?.cancellationPolicy ? <CancellationTimeline policy={hotel.booking.cancellationPolicy} /> : null}
          <div className="grid gap-10 md:grid-cols-[1fr_16rem]">
            <HouseRules policies={hotel.policies} />
            <dl className="self-start border-y border-line text-center">
              <div className="py-4">
                <dt className="heritage-caps text-[11px] text-ink-muted">Arrival from</dt>
                <dd className="num mt-1 text-lg">{formatClock(hotel.checkInTime)}</dd>
              </div>
              <div className="border-t border-line py-4">
                <dt className="heritage-caps text-[11px] text-ink-muted">Departure by</dt>
                <dd className="num mt-1 text-lg">{formatClock(hotel.checkOutTime)}</dd>
              </div>
            </dl>
          </div>
        </div>,
      );
    case "getting-here":
      if (!ctx.theme.pickupPoints.length) return null;
      return shell(
        titleOf(section, "Arrival"),
        <>
          <p className="mx-auto max-w-2xl text-center text-[1.0625rem] leading-[1.8]">{section.options.body ?? pickupSentenceFor(ctx)} A car may be arranged when you reserve.</p>
          <div className="mt-10">
            <PickupList points={ctx.theme.pickupPoints} />
          </div>
        </>,
      );
    case "location-map":
      return shell(
        titleOf(section, "The Address"),
        <div className="grid gap-10 md:grid-cols-2">
          <div className="heritage-frame">
            <MapCard ctx={ctx} className="aspect-[4/3]" />
          </div>
          <div className="space-y-6 self-center">
            <AddressBlock ctx={ctx} />
            <ContactList ctx={ctx} />
          </div>
        </div>,
      );
    case "faq": {
      const items = faqItems(ctx);
      if (!items.length) return null;
      return shell(titleOf(section, "Enquiries"), <FaqList items={items} className="mx-auto max-w-2xl" />);
    }
    case "contact":
      return shell(
        titleOf(section, "Correspondence"),
        <div className="text-center">
          {section.options.body ? <p className="mx-auto max-w-xl text-[1.0625rem] leading-[1.8]">{section.options.body}</p> : null}
          <ContactList ctx={ctx} className="mt-6 inline-block text-left" />
        </div>,
      );
    case "amenities":
      return shell(
        titleOf(section, "Amenities"),
        <p className="heritage-caps mx-auto max-w-3xl text-center text-[12.5px] leading-[2.4]">{hotel.amenities.join("  ◆  ")}</p>,
      );
    case "rates-calendar":
      return shell(titleOf(section, "Tariff"), <RatesTable rooms={hotel.roomTypes} look="editorial" />, null, false);
    case "custom-text":
      return shell(titleOf(section, "A Note"), <CustomText section={section} className="mx-auto max-w-2xl text-center text-[1.0625rem] leading-[1.8]" />, section.options.subtitle);
    default:
      return null;
  }
}

function HeritageRoom({ room }: { room: RoomTypePublic }) {
  return (
    <li className="text-center">
      <div className="heritage-frame">
        <Plate src={room.images[0]?.url} alt={room.images[0]?.alt ?? room.name} label={room.name} sizes="(min-width: 768px) 45vw, 100vw" className="aspect-[4/3]" />
      </div>
      <h3 className="heritage-title mt-6 text-[1.35rem]">{room.name}</h3>
      <p className="mt-2 font-display italic text-ink-muted">
        For {room.capacity}
        {room.bedType ? `, ${room.bedType.toLowerCase()}` : ""}
        {room.sizeSqm ? `, ${room.sizeSqm} square metres` : ""}
      </p>
      {room.description ? <p className="mx-auto mt-4 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">{room.description}</p> : null}
      <div className="heritage-offer mx-auto mt-6 flex max-w-xs flex-col items-center gap-4 border-t border-line pt-5">
        <RoomOffer room={room} />
      </div>
      {room.ratePlans && room.ratePlans.length > 1 ? (
        <div className="mt-6 text-left">
          <RoomPlans room={room} />
        </div>
      ) : null}
    </li>
  );
}
