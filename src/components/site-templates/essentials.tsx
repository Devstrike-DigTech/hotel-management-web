import { ArrowRight, Phone, Star, WhatsappLogo } from "@phosphor-icons/react/ssr";
import { chatMessage, whatsappChatUrl } from "../chat/whatsapp-chat";
import { addDays } from "@/lib/dates";
import { formatClock, formatNaira, formatPhone, toE164Digits } from "@/lib/format";
import type { ThemeSection } from "@/lib/theme/types";
import type { RoomTypePublic } from "@/lib/types";
import type { SiteCtx } from "./context";
import { ConciergeShowcase } from "./concierge";
import { CustomText, diningItems, experienceItems, FaqList, faqItems, highlightItems, meetingItems, PickupList, pickupSentenceFor, titleOf } from "./parts";

/**
 * Essentials: text first, for guesthouses and patchy networks. No client components at all: the
 * page is plain HTML and one stylesheet, so on the hotel's home the proxy can serve it without the
 * framework's scripts (src/lib/server/lite.ts). Dates go to the booking page with a native form;
 * photographs are small, lazy and low resolution.
 */
export function EssentialsPage({ ctx, sections }: { ctx: SiteCtx; sections: ThemeSection[] }) {
  return (
    <div className="lite-page pb-10" data-template-page="essentials">
      {sections.map((s) => (
        <EssentialsSection key={s.id} ctx={ctx} section={s} />
      ))}
    </div>
  );
}

/** A low-resolution thumbnail from the image CDN, loaded only when scrolled to. */
function thumb(url: string | undefined | null, w: number) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (/(^|\.)unsplash\.com$/.test(u.hostname)) {
      u.searchParams.set("w", String(w));
      u.searchParams.set("q", "45");
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      return u.toString();
    }
    return url;
  } catch {
    return null;
  }
}

const IDS: Partial<Record<ThemeSection["key"], string>> = {
  "rates-calendar": "dates",
  rooms: "rooms",
  amenities: "amenities",
  "getting-here": "getting-here",
  reviews: "reviews",
  "location-map": "location",
  policies: "policies",
  faq: "faq",
  contact: "contact",
  highlights: "about",
  concierge: "concierge",
};

function EssentialsSection({ ctx, section }: { ctx: SiteCtx; section: ThemeSection }) {
  const { hotel } = ctx;
  const id = IDS[section.key] ?? section.id;
  const tid = `${section.id}-title`;
  const wrap = (title: string, children: React.ReactNode) => (
    <section id={id} aria-labelledby={tid} className="lite-section" data-section={section.key}>
      <h2 id={tid} className="lite-h2">
        {title}
      </h2>
      {children}
    </section>
  );

  switch (section.key) {
    case "hero": {
      const tel = hotel.phone ? `+${toE164Digits(hotel.phone)}` : null;
      return (
        <section aria-labelledby="hotel-name" className="pt-6" data-section="hero">
          <h1 id="hotel-name" className="text-[1.875rem] font-bold leading-[1.1] tracking-[-0.02em]">
            {hotel.name}
          </h1>
          {ctx.tagline ? <p className="mt-2 text-[1.0625rem] leading-snug text-ink-muted">{ctx.tagline}</p> : null}
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.9375rem]">
            {ctx.from ? (
              <li>
                From <span className="num font-semibold">{formatNaira(ctx.from)}</span> a night
              </li>
            ) : null}
            {hotel.rating ? (
              <li className="inline-flex items-center gap-1">
                <Star size={15} weight="fill" className="text-brass" aria-hidden /> <span className="num font-semibold">{hotel.rating.toFixed(1)}</span>
                <span className="text-ink-muted">({hotel.reviewCount} reviews)</span>
              </li>
            ) : null}
            <li className="text-ink-muted">
              Check in <span className="num text-ink">{formatClock(hotel.checkInTime)}</span>
            </li>
          </ul>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <a href={`${ctx.bookBase}`} className="lite-btn lite-btn-primary lite-btn-lg">
              Book a room <ArrowRight size={16} aria-hidden />
            </a>
            {ctx.chat ? (
              <a href={whatsappChatUrl(ctx.chat, chatMessage(hotel.name))} className="lite-btn lite-btn-outline lite-btn-lg" rel="noopener noreferrer" target="_blank">
                <WhatsappLogo size={17} aria-hidden /> WhatsApp
              </a>
            ) : tel ? (
              <a href={`tel:${tel}`} className="lite-btn lite-btn-outline lite-btn-lg">
                <Phone size={17} aria-hidden /> Call us
              </a>
            ) : null}
          </div>
        </section>
      );
    }
    case "rates-calendar": {
      const inDate = ctx.initial.checkIn ?? addDays(ctx.today, 1);
      const outDate = ctx.initial.checkOut ?? addDays(inDate, 1);
      return wrap(
        titleOf(section, "Check dates and prices"),
        <form method="get" action={ctx.bookBase} className="lite-form" data-testid="lite-dates">
          <label>
            <span>Arrive</span>
            <input type="date" name="checkIn" defaultValue={inDate} min={ctx.today} required />
          </label>
          <label>
            <span>Leave</span>
            <input type="date" name="checkOut" defaultValue={outDate} min={addDays(ctx.today, 1)} required />
          </label>
          <label>
            <span>Guests</span>
            <select name="guests" defaultValue={String(ctx.initial.guests)}>
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="lite-btn lite-btn-primary">
            See prices
          </button>
          <p className="lite-note">The next page shows each room&rsquo;s price for your dates, taxes included.</p>
        </form>,
      );
    }
    case "rooms":
      return wrap(
        titleOf(section, "Rooms"),
        <ul className="lite-rooms">
          {[...hotel.roomTypes]
            .sort((a, b) => a.basePriceKobo - b.basePriceKobo)
            .map((r) => (
              <EssentialsRoom key={r.id} room={r} bookBase={ctx.bookBase} />
            ))}
        </ul>,
      );
    case "amenities":
      return hotel.amenities.length ? wrap(titleOf(section, "What we have"), <p className="leading-relaxed">{hotel.amenities.join(", ")}.</p>) : null;
    case "highlights":
      return wrap(
        titleOf(section, "About us"),
        <>
          {(section.options.body ? [section.options.body] : ctx.paragraphs.slice(0, 2)).map((p, i) => (
            <p key={i} className="mt-2 leading-relaxed first:mt-0">
              {p}
            </p>
          ))}
          {section.options.items.length ? (
            <ul className="lite-list mt-3">
              {highlightItems(ctx, section).map((f) => (
                <li key={f.title}>{f.title}</li>
              ))}
            </ul>
          ) : null}
        </>,
      );
    case "getting-here":
      return ctx.theme.pickupPoints.length
        ? wrap(
            titleOf(section, "Getting here"),
            <>
              <p className="mb-4 leading-relaxed">{section.options.body ?? pickupSentenceFor(ctx)} Ask for a pickup when you book.</p>
              <PickupList points={ctx.theme.pickupPoints} compact />
            </>,
          )
        : null;
    case "reviews": {
      const items = (ctx.reviews?.items ?? []).filter((r) => r.body).slice(0, 3);
      if (!items.length) return null;
      return wrap(
        titleOf(section, hotel.rating ? `Guests rate us ${hotel.rating.toFixed(1)} of 5` : "What guests say"),
        <ul className="space-y-4">
          {items.map((r) => (
            <li key={r.id} className="border-l-2 border-line-strong pl-3">
              <p className="leading-relaxed">{r.body.length > 220 ? `${r.body.slice(0, 217).trimEnd()}...` : r.body}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {r.displayName}, <span className="num">{r.overall}/5</span>
              </p>
            </li>
          ))}
        </ul>,
      );
    }
    case "location-map":
      return wrap(
        titleOf(section, "Where we are"),
        <>
          <p className="leading-relaxed">
            {hotel.address || `${hotel.area}, ${hotel.city}`}, {hotel.city}, {hotel.state}
          </p>
          <a href={ctx.mapsUrl} className="lite-btn lite-btn-outline mt-3" rel="noopener noreferrer" target="_blank">
            Open in Maps
          </a>
        </>,
      );
    case "policies":
      return wrap(
        titleOf(section, "Good to know"),
        <ul className="lite-list">
          {hotel.policies.some((p) => /check-?\s?in/i.test(p)) ? null : (
            <li>
              Check in from <span className="num">{formatClock(hotel.checkInTime)}</span>, check out by <span className="num">{formatClock(hotel.checkOutTime)}</span>.
            </li>
          )}
          {hotel.booking?.cancellationPolicy ? <li>{hotel.booking.cancellationPolicy.summary}</li> : null}
          {hotel.policies.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>,
      );
    case "faq": {
      const items = faqItems(ctx);
      return items.length ? wrap(titleOf(section, "Questions"), <FaqList items={items} />) : null;
    }
    case "contact": {
      const tel = hotel.phone ? `+${toE164Digits(hotel.phone)}` : null;
      return wrap(
        titleOf(section, "Contact"),
        <div className="grid gap-2">
          {tel ? (
            <a href={`tel:${tel}`} className="lite-btn lite-btn-outline justify-start">
              <Phone size={17} aria-hidden /> <span className="num">{formatPhone(hotel.phone!)}</span>
            </a>
          ) : null}
          {ctx.chat ? (
            <a href={whatsappChatUrl(ctx.chat, chatMessage(hotel.name))} className="lite-btn lite-btn-outline justify-start" rel="noopener noreferrer" target="_blank">
              <WhatsappLogo size={17} aria-hidden /> WhatsApp
            </a>
          ) : null}
          {hotel.email ? (
            <a href={`mailto:${hotel.email}`} className="lite-btn lite-btn-outline justify-start break-all">
              {hotel.email}
            </a>
          ) : null}
        </div>,
      );
    }
    case "gallery": {
      const pics = ctx.images.slice(0, 4);
      return pics.length
        ? wrap(
            titleOf(section, "Photos"),
            <div className="grid grid-cols-2 gap-2">
              {pics.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- a plain lazy image keeps this page script-free
                <img key={img.url + i} src={thumb(img.url, 360) ?? ""} alt={img.alt} loading="lazy" decoding="async" width={360} height={270} className="lite-img aspect-[4/3] w-full object-cover" />
              ))}
            </div>,
          )
        : null;
    }
    case "dining":
    case "experiences":
    case "meetings": {
      const list = section.key === "dining" ? diningItems(ctx, section) : section.key === "meetings" ? meetingItems(ctx, section) : experienceItems(ctx, section);
      if (!list.length) return null;
      return wrap(
        titleOf(section, section.key === "dining" ? "Food and drink" : section.key === "meetings" ? "Meetings" : "Things to do"),
        <ul className="lite-list">
          {list.map((it) => (
            <li key={it.title}>
              {it.title}
              {it.meta ? <span className="text-ink-muted"> ({it.meta})</span> : null}
            </li>
          ))}
        </ul>,
      );
    }
    case "concierge":
      return ctx.concierge ? wrap(titleOf(section, "Arrange something for your stay"), <ConciergeShowcase catalogue={ctx.concierge} base={ctx.base} hotelName={ctx.hotel.name} look="essentials" body={section.options.body} />) : null;
    case "custom-text":
      return wrap(titleOf(section, "A note"), <CustomText section={section} className="leading-relaxed" />);
    default:
      return null;
  }
}

function EssentialsRoom({ room, bookBase }: { room: RoomTypePublic; bookBase: string }) {
  const img = thumb(room.images[0]?.url, 200);
  const from = room.fromKobo ?? room.basePriceKobo;
  return (
    <li className="lite-room" data-testid="lite-room">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element -- a plain lazy image keeps this page script-free
        <img src={img} alt="" loading="lazy" decoding="async" width={96} height={72} className="lite-img" />
      ) : (
        <span aria-hidden className="lite-img" />
      )}
      <div className="min-w-0">
        <h3 className="font-semibold leading-tight">{room.name}</h3>
        <p className="mt-0.5 text-sm text-ink-muted">
          Sleeps {room.capacity}
          {room.bedType ? `, ${room.bedType}` : ""}
        </p>
        <p className="mt-1 text-[0.9375rem]">
          <span className="num font-semibold">{formatNaira(from)}</span> <span className="text-ink-muted">a night</span>
        </p>
      </div>
      <a href={`${bookBase}?room=${encodeURIComponent(room.id)}`} className="lite-btn lite-btn-outline self-center" aria-label={`Book the ${room.name}`}>
        Book
      </a>
    </li>
  );
}
