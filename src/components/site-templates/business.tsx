import { ArrowRight, Briefcase, Buildings, Check, Star } from "@phosphor-icons/react/ssr";
import { formatClock, formatNaira } from "@/lib/format";
import type { ThemeSection } from "@/lib/theme/types";
import { AmenityIcon } from "../ui/amenity";
import { Plate } from "../ui/plate";
import { MobileBookBar, StayProvider } from "../hotel/stay-context";
import { RatesTable } from "./rates-table";
import { ConciergeShowcase } from "./concierge";
import { StayBar } from "./stay-bar";
import type { SiteCtx } from "./context";
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

/** Amenities a business traveller looks for first. */
const WORK_FIRST = /wi-?fi|internet|power|generator|desk|work|meeting|conference|business|airport|shuttle|pickup|laundry|parking|gym/i;

/**
 * Business: rates first. The booking console and every room's live rates sit above the fold; the
 * rest is a dense, square-cornered ledger in the manner of a good travel desk: corporate rates,
 * meeting rooms, what matters when you are working.
 */
export function BusinessPage({ ctx, sections }: { ctx: SiteCtx; sections: ThemeSection[] }) {
  const { hotel } = ctx;
  const hero = sections.find((s) => s.key === "hero");
  const rates = sections.find((s) => s.key === "rates-calendar");
  const rest = sections.filter((s) => s.key !== "hero" && s.key !== "rates-calendar");
  return (
    <StayProvider initial={ctx.initial} today={ctx.today} bookBase={ctx.bookBase} slug={hotel.slug} cancellationPolicy={hotel.booking?.cancellationPolicy ?? null} channel="BOOKING_SITE">
      <div className="pb-16 lg:pb-0" data-template-page="business">
        {/* Without a hero the name still heads the page, above the booking console and the rates. */}
        <BusinessHero ctx={ctx} section={hero ?? null} rates={rates} />
        <div className="container-page mt-12 grid gap-10 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-12">
            {rest.map((s) => (
              <BusinessSection key={s.id} ctx={ctx} section={s} />
            ))}
          </div>
          <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start" aria-label="For companies">
            <CorporateCard ctx={ctx} />
            <FactsCard ctx={ctx} />
          </aside>
        </div>
      </div>
      <MobileBookBar fromKobo={ctx.from} />
    </StayProvider>
  );
}

function BusinessHero({ ctx, section, rates }: { ctx: SiteCtx; section: ThemeSection | null; rates?: ThemeSection }) {
  const { hotel } = ctx;
  const facts = hotel.amenities.filter((a) => WORK_FIRST.test(a)).slice(0, 4);
  const compact = !section;
  return (
    <section aria-labelledby="hotel-name" className="border-b border-line bg-surface" data-section={compact ? "title" : "hero"}>
      <div className={`container-page grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-end ${compact ? "py-6" : "py-8 lg:py-10"}`}>
        <div>
          <p className="kicker">{section?.options.subtitle ?? `${hotel.area}, ${hotel.city}`}</p>
          <h1 id="hotel-name" className={`mt-3 font-display font-medium leading-[1.02] tracking-[-0.03em] ${compact ? "text-[clamp(1.9rem,3.6vw,2.8rem)]" : "text-[clamp(2.2rem,4.6vw,3.6rem)]"}`}>
            {hotel.name}
          </h1>
          {ctx.tagline ? <p className="mt-3 max-w-2xl text-[1.0625rem] text-ink-muted">{ctx.tagline}</p> : null}
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            {hotel.rating ? (
              <li className="inline-flex items-center gap-1.5">
                <Star size={14} weight="fill" className="text-brass" aria-hidden />
                <span className="num font-medium">{hotel.rating.toFixed(1)}</span>
                <span className="text-ink-muted">({hotel.reviewCount})</span>
              </li>
            ) : null}
            {facts.map((a) => (
              <li key={a} className="inline-flex items-center gap-1.5 text-ink-muted">
                <AmenityIcon label={a} size={15} className="text-laterite" /> {a}
              </li>
            ))}
          </ul>
        </div>
        {compact ? null : <Plate src={section?.options.imageUrl ?? ctx.images[0]?.url} alt={ctx.images[0]?.alt ?? hotel.name} label={hotel.name} sizes="22rem" priority className="hidden aspect-[16/10] lg:block" />}
      </div>
      <div className="border-t border-line bg-paper">
        <div className="container-page py-5">
          <StayBar fromKobo={ctx.from} target="#rates" cta="Show rates" className="business-staybar" tone="surface" />
        </div>
      </div>
      {rates ? <RatesBand ctx={ctx} section={rates} flush /> : null}
    </section>
  );
}

function RatesBand({ ctx, section, flush = false }: { ctx: SiteCtx; section: ThemeSection; flush?: boolean }) {
  return (
    <div id="rates" className={`scroll-mt-28 bg-paper ${flush ? "" : "border-b border-line"}`} data-section="rates-calendar">
      <div className="container-page pb-8 pt-2">
        <h2 className="sr-only">{titleOf(section, "Rates")}</h2>
        <RatesTable rooms={ctx.hotel.roomTypes} look="business" />
      </div>
    </div>
  );
}

function Head({ id, title, aside }: { id: string; title: string; aside?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-2">
      <h2 id={id} className="font-display text-[1.35rem] font-medium tracking-[-0.015em]">
        {title}
      </h2>
      {aside ? <span className="text-[12px] text-ink-muted">{aside}</span> : null}
    </div>
  );
}

const IDS: Partial<Record<ThemeSection["key"], string>> = {
  rooms: "rooms",
  meetings: "meetings",
  amenities: "amenities",
  highlights: "about",
  "getting-here": "getting-here",
  reviews: "reviews",
  policies: "policies",
  "location-map": "location",
  faq: "faq",
  contact: "contact",
  concierge: "concierge",
};

function BusinessSection({ ctx, section }: { ctx: SiteCtx; section: ThemeSection }) {
  const { hotel } = ctx;
  const id = IDS[section.key] ?? section.id;
  const tid = `${section.id}-title`;
  const wrap = (title: string, children: React.ReactNode, aside?: string) => (
    <section id={id} aria-labelledby={tid} className="scroll-mt-28" data-section={section.key}>
      <Head id={tid} title={title} aside={aside} />
      <div className="mt-4">{children}</div>
    </section>
  );

  switch (section.key) {
    case "rooms":
      return wrap(
        titleOf(section, "Rooms"),
        <ul className="divide-y divide-line border-b border-line">
          {[...hotel.roomTypes]
            .sort((a, b) => a.basePriceKobo - b.basePriceKobo)
            .map((r) => (
              <li key={r.id} className="grid grid-cols-[6.5rem_1fr] gap-4 py-4 sm:grid-cols-[8rem_1fr_auto]">
                <Plate src={r.images[0]?.url} alt={r.images[0]?.alt ?? r.name} caption={false} sizes="8rem" className="aspect-[4/3]" />
                <div className="min-w-0">
                  <h3 className="font-medium">{r.name}</h3>
                  <p className="num mt-0.5 text-[12px] text-ink-muted">
                    Sleeps {r.capacity}
                    {r.bedType ? ` · ${r.bedType}` : ""}
                    {r.sizeSqm ? ` · ${r.sizeSqm} m²` : ""}
                  </p>
                  {r.amenities.length ? (
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-muted">
                      {r.amenities.slice(0, 5).map((a) => (
                        <li key={a} className="inline-flex items-center gap-1">
                          <Check size={11} aria-hidden className="text-palm" /> {a}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end sm:justify-center">
                  <p className="num text-right">
                    <span className="text-[11px] text-ink-muted">from </span>
                    <span className="font-medium">{formatNaira(r.fromKobo ?? r.basePriceKobo)}</span>
                  </p>
                  <a href="#rates" className="inline-flex items-center gap-1 text-[13px] text-laterite hover:underline">
                    Rates <ArrowRight size={12} aria-hidden />
                  </a>
                </div>
              </li>
            ))}
        </ul>,
        `${hotel.roomTypes.length} types`,
      );
    case "meetings": {
      const list = meetingItems(ctx, section);
      if (!list.length && !section.options.body) return null;
      return wrap(
        titleOf(section, "Meetings and events"),
        <>
          {section.options.body ? <p className="max-w-[65ch] text-[0.9375rem] leading-relaxed text-ink-muted">{section.options.body}</p> : null}
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                <th scope="col" className="py-2 font-medium">Space</th>
                <th scope="col" className="py-2 text-right font-medium">Capacity</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.title} className="border-t border-line">
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <Buildings size={15} className="text-laterite" aria-hidden /> {m.title}
                    </span>
                    {m.body ? <span className="block pl-6 text-[12.5px] text-ink-muted">{m.body}</span> : null}
                  </td>
                  <td className="num py-2.5 text-right text-ink-muted">{m.meta ?? "Ask the desk"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hotel.email ? (
            <a href={`mailto:${hotel.email}?subject=${encodeURIComponent("Meeting room enquiry")}`} className="btn btn-outline mt-4 !min-h-9 !rounded-none text-sm">
              Ask for a quote
            </a>
          ) : null}
        </>,
      );
    }
    case "amenities": {
      if (!hotel.amenities.length) return null;
      const ordered = [...hotel.amenities].sort((a, b) => Number(WORK_FIRST.test(b)) - Number(WORK_FIRST.test(a)));
      return wrap(
        titleOf(section, "Facilities"),
        <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[0.9375rem] sm:grid-cols-3">
          {ordered.map((a) => (
            <li key={a} className="flex items-center gap-2.5">
              <AmenityIcon label={a} size={18} className="shrink-0 text-laterite" /> {a}
            </li>
          ))}
        </ul>,
      );
    }
    case "highlights": {
      const items = highlightItems(ctx, section);
      return wrap(
        titleOf(section, "About the hotel"),
        <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <div className="space-y-3 text-[0.9375rem] leading-relaxed">
            {(section.options.body ? [section.options.body] : ctx.paragraphs.slice(0, 2)).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <dl className="grid grid-cols-2 gap-px self-start border border-line bg-line text-sm">
            {items.map((f) => (
              <div key={f.title} className="bg-paper p-3">
                <dt className="font-medium">{f.title}</dt>
                {f.body ? <dd className="mt-0.5 text-[12.5px] text-ink-muted">{f.body}</dd> : null}
              </div>
            ))}
          </dl>
        </div>,
      );
    }
    case "getting-here": {
      if (!ctx.theme.pickupPoints.length) return null;
      const airportFirst = [...ctx.theme.pickupPoints].sort((a, b) => Number(b.kind === "AIRPORT") - Number(a.kind === "AIRPORT"));
      return wrap(
        titleOf(section, "Airport and station transfers"),
        <>
          <p className="mb-5 max-w-[65ch] text-[0.9375rem] text-ink-muted">{section.options.body ?? pickupSentenceFor(ctx)} Book it with your room; the driver&rsquo;s details come by SMS or WhatsApp.</p>
          <PickupList points={airportFirst} compact />
        </>,
      );
    }
    case "reviews": {
      const s = ctx.reviews?.summary;
      const items = (ctx.reviews?.items ?? []).slice(0, 3);
      if (!s?.count) return null;
      const subs: [string, number | null][] = [
        ["Cleanliness", s.subscores.cleanliness],
        ["Service", s.subscores.service],
        ["Location", s.subscores.location],
        ["Value", s.subscores.value],
      ];
      return wrap(
        titleOf(section, "Guest ratings"),
        <div className="grid gap-6 md:grid-cols-[14rem_1fr]">
          <div>
            <p className="num text-4xl font-medium">{s.rating?.toFixed(1) ?? "–"}</p>
            <p className="text-[12.5px] text-ink-muted">{s.count} verified stays</p>
            <dl className="mt-4 space-y-1.5 text-[12.5px]">
              {subs.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-2">
                  <dt className="text-ink-muted">{k}</dt>
                  <span className="h-1 bg-line" aria-hidden>
                    <span className="block h-1 bg-laterite" style={{ width: `${((v ?? 0) / 5) * 100}%` }} />
                  </span>
                  <dd className="num text-right">{v?.toFixed(1) ?? "–"}</dd>
                </div>
              ))}
            </dl>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {items.map((r) => (
              <li key={r.id} className="border-l-2 border-laterite pl-3 text-[13px] leading-relaxed">
                <p className="line-clamp-5">{r.body}</p>
                <p className="mt-2 text-[12px] text-ink-muted">
                  {r.displayName}, <span className="num">{r.overall}/5</span>
                </p>
              </li>
            ))}
          </ul>
        </div>,
      );
    }
    case "policies":
      return wrap(
        titleOf(section, "Policies"),
        <div className="grid gap-6 md:grid-cols-2">
          {hotel.booking?.cancellationPolicy ? <CancellationTimeline policy={hotel.booking.cancellationPolicy} /> : null}
          <HouseRules policies={hotel.policies} numerals={false} />
        </div>,
      );
    case "location-map":
      return wrap(
        titleOf(section, "Location"),
        <div className="grid gap-6 sm:grid-cols-[1fr_1.4fr]">
          <div className="space-y-4">
            <AddressBlock ctx={ctx} />
            <ContactList ctx={ctx} />
          </div>
          <MapCard ctx={ctx} className="aspect-[16/10]" />
        </div>,
      );
    case "faq": {
      const items = faqItems(ctx);
      if (!items.length) return null;
      return wrap(titleOf(section, "FAQ"), <FaqList items={items} />);
    }
    case "contact":
      return wrap(titleOf(section, "Contact"), <ContactList ctx={ctx} />);
    case "dining":
    case "experiences":
    case "gallery": {
      if (section.key === "gallery") {
        const pics = ctx.images.slice(0, 4);
        if (!pics.length) return null;
        return wrap(
          titleOf(section, "Photos"),
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {pics.map((img, i) => (
              <Plate key={img.url + i} src={img.url} alt={img.alt} label={img.alt} sizes="25vw" className="aspect-[4/3]" />
            ))}
          </div>,
        );
      }
      const list = section.key === "dining" ? diningItems(ctx, section) : experienceItems(ctx, section);
      if (!list.length) return null;
      return wrap(
        titleOf(section, section.key === "dining" ? "Food and drink" : "Leisure"),
        <ul className="grid gap-2 text-[0.9375rem] sm:grid-cols-2">
          {list.map((it) => (
            <li key={it.title} className="flex justify-between gap-3 border-b border-line pb-2">
              <span>{it.title}</span>
              {it.meta ? <span className="num text-ink-muted">{it.meta}</span> : null}
            </li>
          ))}
        </ul>,
      );
    }
    case "concierge":
      return ctx.concierge ? wrap(titleOf(section, "Concierge"), <ConciergeShowcase catalogue={ctx.concierge} base={ctx.base} hotelName={ctx.hotel.name} look="business" body={section.options.body} />, `${ctx.concierge.services.length} services`) : null;
    case "custom-text":
      return wrap(titleOf(section, "Notes"), <CustomText section={section} className="max-w-[65ch] text-[0.9375rem] leading-relaxed" />);
    default:
      return null;
  }
}

function CorporateCard({ ctx }: { ctx: SiteCtx }) {
  const { hotel } = ctx;
  const mail = hotel.email ? `mailto:${hotel.email}?subject=${encodeURIComponent(`Corporate rates at ${hotel.name}`)}&body=${encodeURIComponent("Company name:\nTypical nights a month:\nContact person:\n")}` : null;
  return (
    <div className="border border-ink bg-surface p-5" data-testid="corporate-cta">
      <p className="flex items-center gap-2 font-medium">
        <Briefcase size={18} className="text-laterite" aria-hidden /> Travelling for work?
      </p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
        Companies that send staff regularly get a negotiated rate, one monthly invoice and a named contact at the desk.
      </p>
      {mail ? (
        <a href={mail} className="btn btn-ink mt-4 w-full !min-h-10 !rounded-none text-sm">
          Ask about corporate rates
        </a>
      ) : null}
    </div>
  );
}

function FactsCard({ ctx }: { ctx: SiteCtx }) {
  const h = ctx.hotel;
  return (
    <dl className="grid grid-cols-2 border border-line text-[13px]">
      <div className="border-b border-r border-line p-3">
        <dt className="text-ink-muted">Check in</dt>
        <dd className="num mt-0.5 font-medium">{formatClock(h.checkInTime)}</dd>
      </div>
      <div className="border-b border-line p-3">
        <dt className="text-ink-muted">Check out</dt>
        <dd className="num mt-0.5 font-medium">{formatClock(h.checkOutTime)}</dd>
      </div>
      <div className="col-span-2 p-3">
        <dt className="text-ink-muted">Cancellation</dt>
        <dd className="mt-0.5 leading-snug">{h.booking?.cancellationPolicy.summary ?? "Ask the front desk."}</dd>
      </div>
    </dl>
  );
}
