import { formatClock, groupLabel, placeName } from "@/lib/format";
import type { ThemeSection } from "@/lib/theme/types";
import { AmenityIcon } from "../ui/amenity";
import { Gallery } from "../hotel/gallery";
import { Rating } from "../hotel/rating";
import { RoomList } from "../hotel/room-list";
import { MobileBookBar, StayCard, StayProvider } from "../hotel/stay-context";
import { HotelReviews } from "../reviews/hotel-reviews";
import { WhatsAppChat } from "../chat/whatsapp-chat";
import { RatesTable } from "./rates-table";
import { ConciergeShowcase } from "./concierge";
import type { SiteCtx } from "./context";
import {
  AddressBlock,
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
  titleOf,
} from "./parts";

/**
 * Editorial: the house look. A printed travel magazine: a centred masthead, an asymmetric plate
 * grid, numbered sections under a hairline in ink, a drop cap, and the stay card pinned beside.
 */
export function EditorialPage({ ctx, sections }: { ctx: SiteCtx; sections: ThemeSection[] }) {
  const { hotel } = ctx;
  const hero = sections.find((s) => s.key === "hero");
  const body = sections.filter((s) => s.key !== "hero");
  return (
    <StayProvider initial={ctx.initial} today={ctx.today} bookBase={ctx.bookBase} slug={hotel.slug} cancellationPolicy={hotel.booking?.cancellationPolicy ?? null} channel="BOOKING_SITE">
      <div className="container-page pb-16 pt-8 lg:pb-0 lg:pt-10" data-template-page="editorial">
        {hero ? <EditorialHero ctx={ctx} section={hero} /> : null}
        <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="min-w-0 lg:col-span-8">
            {body.map((s, i) => (
              <EditorialSection key={s.id} ctx={ctx} section={s} n={i + 1} first={i === 0} />
            ))}
          </div>
          <aside aria-label="Plan your stay" className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <StayCard fromKobo={ctx.from} phone={hotel.phone} cancellationSummary={hotel.booking?.cancellationPolicy.summary} />
              {ctx.chat ? <WhatsAppChat number={ctx.chat} hotelName={hotel.name} className="mt-4" /> : null}
            </div>
          </aside>
        </div>
      </div>
      <MobileBookBar fromKobo={ctx.from} />
    </StayProvider>
  );
}

function EditorialHero({ ctx, section }: { ctx: SiteCtx; section: ThemeSection }) {
  const { hotel } = ctx;
  return (
    <section aria-labelledby="hotel-name" data-section="hero">
      <header className="mx-auto mt-6 flex max-w-4xl flex-col items-center text-center sm:mt-10">
        <span aria-hidden className="adire-rule mb-8 max-w-[14rem] text-laterite/60" />
        <p className="kicker">{section.options.subtitle ?? `Welcome to ${hotel.area}, ${placeName(hotel.city, hotel.state)}`}</p>
        <h1 id="hotel-name" className="display mt-5 text-[clamp(3rem,9vw,7.4rem)]">
          <span className="reveal-line">
            <span>{hotel.name}</span>
          </span>
        </h1>
        {ctx.tagline ? (
          <p className="fade-up mt-5 max-w-2xl font-display text-[clamp(1.25rem,2.4vw,1.8rem)] italic leading-snug text-laterite [--d:200ms]">{ctx.tagline}</p>
        ) : null}
        {hotel.group && hotel.group.propertyCount > 1 ? (
          <p className="fade-up mt-3 text-sm text-ink-muted [--d:240ms]">
            One of {hotel.group.propertyCount} hotels of {groupLabel(hotel.group.name)}
          </p>
        ) : null}
        <div className="mt-8 w-full max-w-md">
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-line bg-line text-left text-sm">
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
      {ctx.images.length ? (
        <div className="fade-up mt-8 [--d:150ms]">
          <Gallery images={ctx.images} name={hotel.name} />
        </div>
      ) : null}
    </section>
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

const ANCHORS: Partial<Record<ThemeSection["key"], string>> = {
  highlights: "about",
  rooms: "rooms",
  "location-map": "location",
  reviews: "reviews",
  "getting-here": "getting-here",
  faq: "faq",
  contact: "contact",
  "rates-calendar": "rates",
  concierge: "concierge",
};

function EditorialSection({ ctx, section, n, first }: { ctx: SiteCtx; section: ThemeSection; n: number; first: boolean }) {
  const { hotel } = ctx;
  const id = ANCHORS[section.key] ?? section.id;
  const tid = `${section.id}-title`;
  const wrap = (title: string, children: React.ReactNode, aside?: string) => (
    <section id={id} aria-labelledby={tid} className={`scroll-mt-28 ${first ? "" : "mt-14"}`} data-section={section.key}>
      <SectionHead n={n} id={tid} title={title} aside={aside} />
      <div className="mt-6">{children}</div>
    </section>
  );

  switch (section.key) {
    case "highlights": {
      const facts = section.options.items.length ? highlightItems(ctx, section) : [];
      return wrap(
        titleOf(section, "The house"),
        <>
          <div className="prose-body drop-cap max-w-[62ch]">
            {(section.options.body ? section.options.body.split(/\n\s*\n/) : ctx.paragraphs.length ? ctx.paragraphs : [ctx.tagline]).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {facts.length ? (
            <ul className="mt-8 grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-2">
              {facts.map((f) => (
                <li key={f.title} className="bg-paper p-4">
                  <p className="font-display text-lg italic text-laterite">{f.title}</p>
                  {f.body ? <p className="mt-1 text-sm text-ink-muted">{f.body}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </>,
      );
    }
    case "amenities":
      if (!hotel.amenities.length) return null;
      return wrap(
        titleOf(section, "What's here"),
        <ul className="grid grid-cols-2 overflow-hidden rounded-sm border-l border-t border-line sm:grid-cols-3">
          {hotel.amenities.map((a) => (
            <li key={a} className="flex items-center gap-3 border-b border-r border-line px-4 py-4 text-[0.9375rem]">
              <AmenityIcon label={a} size={22} className="shrink-0 text-laterite" />
              {a}
            </li>
          ))}
        </ul>,
      );
    case "rooms":
      return wrap(titleOf(section, "Rooms"), <RoomList rooms={hotel.roomTypes} />, `${hotel.roomTypes.length} ${hotel.roomTypes.length === 1 ? "type" : "types"}`);
    case "rates-calendar":
      return wrap(titleOf(section, "Rates by date"), <RatesTable rooms={hotel.roomTypes} look="editorial" />);
    case "reviews":
      return wrap(
        titleOf(section, "Guest book"),
        ctx.reviews ? <HotelReviews slug={hotel.slug} hotelName={hotel.name} initial={ctx.reviews} /> : <p className="text-ink-muted">Reviews could not be loaded just now.</p>,
        ctx.reviews?.summary.count ? `${ctx.reviews.summary.count} verified ${ctx.reviews.summary.count === 1 ? "stay" : "stays"}` : undefined,
      );
    case "policies":
      return wrap(
        titleOf(section, "House rules and cancellation"),
        <>
          {hotel.booking?.cancellationPolicy ? <CancellationTimeline policy={hotel.booking.cancellationPolicy} /> : null}
          <div className="mt-6 grid gap-8 md:grid-cols-[1fr_15rem]">
            <HouseRules policies={hotel.policies} />
            <CheckTimes ctx={ctx} className="self-start" />
          </div>
        </>,
      );
    case "location-map":
      return wrap(
        titleOf(section, "Finding it"),
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-5">
            <AddressBlock ctx={ctx} />
            <ContactList ctx={ctx} />
          </div>
          <MapCard ctx={ctx} className="aspect-[4/3] rounded-sm" />
        </div>,
      );
    case "getting-here":
      if (!ctx.theme.pickupPoints.length) return null;
      return wrap(
        titleOf(section, "Getting here"),
        <>
          <p className="prose-body max-w-[60ch]">{section.options.body ?? pickupSentenceFor(ctx)} Ask for a pickup while you book; the driver&rsquo;s name and number come to you before you land or pull in.</p>
          <div className="mt-6">
            <PickupList points={ctx.theme.pickupPoints} />
          </div>
        </>,
      );
    case "faq": {
      const items = faqItems(ctx);
      if (!items.length) return null;
      return wrap(titleOf(section, "Questions, answered"), <FaqList items={items} />);
    }
    case "contact":
      return wrap(
        titleOf(section, "Talk to the front desk"),
        <div className="grid gap-6 sm:grid-cols-2">
          <p className="prose-body">{section.options.body ?? "Before you book or once you have, the front desk is a call away."}</p>
          <ContactList ctx={ctx} />
        </div>,
      );
    case "gallery":
      return ctx.images.length > 1 ? wrap(titleOf(section, "Pictures"), <Gallery images={ctx.images} name={hotel.name} />) : null;
    case "dining":
    case "experiences":
    case "meetings": {
      const list = section.key === "dining" ? diningItems(ctx, section) : section.key === "meetings" ? meetingItems(ctx, section) : experienceItems(ctx, section);
      if (!list.length && !section.options.body) return null;
      const fallback = section.key === "dining" ? "At the table" : section.key === "meetings" ? "Meetings and events" : "Things to do";
      return wrap(
        titleOf(section, fallback),
        <>
          {section.options.body ? <p className="prose-body max-w-[62ch]">{section.options.body}</p> : null}
          <ol className="mt-4 divide-y divide-line border-y border-line">
            {list.map((it, i) => (
              <li key={it.title} className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-3 py-4">
                <span className="font-display italic text-laterite">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="font-medium">{it.title}</span>
                  {it.body ? <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{it.body}</span> : null}
                </span>
                {it.meta ? <span className="num text-sm text-ink-muted">{it.meta}</span> : null}
              </li>
            ))}
          </ol>
        </>,
      );
    }
    case "concierge":
      return ctx.concierge
        ? wrap(
            titleOf(section, "Arrange something for your stay"),
            <ConciergeShowcase catalogue={ctx.concierge} base={ctx.base} hotelName={ctx.hotel.name} look="editorial" body={section.options.body} />,
            section.options.subtitle ?? "The concierge",
          )
        : null;
    case "custom-text":
      return wrap(titleOf(section, section.options.subtitle ?? "A note from the house"), <CustomText section={section} className="prose-body max-w-[62ch]" />);
    default:
      return null;
  }
}

