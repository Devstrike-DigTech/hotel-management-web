import type { ReviewPage } from "@/lib/booking-types";
import type { ISODate } from "@/lib/dates";
import { visibleSections } from "@/lib/theme/normalise";
import type { SectionKey, SiteTheme, TemplateId } from "@/lib/theme/types";
import type { HotelDetail } from "@/lib/types";
import { BoutiquePage } from "./boutique";
import { BusinessPage } from "./business";
import type { SiteCtx } from "./context";
import { EditorialPage } from "./editorial";
import { EssentialsPage } from "./essentials";
import { HeritagePage } from "./heritage";
import { ResortPage } from "./resort";

export function buildSiteCtx(input: {
  hotel: HotelDetail;
  theme: SiteTheme;
  reviews: ReviewPage | null;
  base: string;
  today: ISODate;
  initial: SiteCtx["initial"];
  preview: boolean;
  concierge?: SiteCtx["concierge"];
}): SiteCtx {
  const { hotel } = input;
  const hero = input.theme.sections.find((s) => s.key === "hero");
  const images = hotel.images.length ? hotel.images : hotel.coverImageUrl ? [{ url: hotel.coverImageUrl, alt: `${hotel.name}, ${hotel.area}` }] : [];
  const minRoom = hotel.roomTypes.reduce<number | null>((m, r) => (m === null || r.basePriceKobo < m ? r.basePriceKobo : m), null);
  return {
    ...input,
    concierge: input.concierge?.services.length ? input.concierge : null,
    bookBase: `${input.base}/book`,
    from: hotel.startingRateKobo ?? minRoom,
    images,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotel.name}, ${hotel.address || `${hotel.area}, ${hotel.city}`}`)}`,
    chat: hotel.whatsapp?.available ? (hotel.whatsapp.phone ?? hotel.whatsapp.waUrl?.replace(/^.*wa\.me\//, "") ?? null) : null,
    paragraphs: (hotel.description || "").split(/\n\s*\n/).filter(Boolean),
    tagline: hero?.options.title ?? hero?.options.body ?? hotel.tagline,
  };
}

/** The hotel's home page in its template, sections in the order the theme gives them. */
export function SitePage({ ctx }: { ctx: SiteCtx }) {
  // M8: the concierge section only when the hotel has live services (so numbered sections stay in sequence).
  const sections = visibleSections(ctx.theme).filter((s) => s.key !== "concierge" || ctx.concierge);
  // A page always has its heading: when the hotel switched the hero off, the name is there for screen readers.
  const heading =
    sections.some((s) => s.key === "hero") || ctx.theme.templateId === "business" ? null : (
      <h1 id="hotel-name" className="sr-only">
        {ctx.hotel.name}
      </h1>
    );
  return (
    <>
      {heading}
      <TemplateBody ctx={ctx} sections={sections} />
    </>
  );
}

function TemplateBody({ ctx, sections }: { ctx: SiteCtx; sections: ReturnType<typeof visibleSections> }) {
  switch (ctx.theme.templateId) {
    case "boutique":
      return <BoutiquePage ctx={ctx} sections={sections} />;
    case "business":
      return <BusinessPage ctx={ctx} sections={sections} />;
    case "resort":
      return <ResortPage ctx={ctx} sections={sections} />;
    case "heritage":
      return <HeritagePage ctx={ctx} sections={sections} />;
    case "essentials":
      return <EssentialsPage ctx={ctx} sections={sections} />;
    default:
      return <EditorialPage ctx={ctx} sections={sections} />;
  }
}

/** Header links: the anchors this template's visible sections provide, in the words it uses. */
const NAV: Record<TemplateId, [SectionKey, string, string][]> = {
  editorial: [
    ["highlights", "about", "The house"],
    ["rooms", "rooms", "Rooms"],
    ["location-map", "location", "Finding us"],
  ],
  boutique: [
    ["rooms", "rooms", "Rooms"],
    ["gallery", "gallery", "The house"],
    ["location-map", "location", "Location"],
  ],
  business: [
    ["rates-calendar", "rates", "Rates"],
    ["rooms", "rooms", "Rooms"],
    ["meetings", "meetings", "Meetings"],
    ["location-map", "location", "Location"],
  ],
  resort: [
    ["experiences", "experiences", "Experiences"],
    ["rooms", "rooms", "Rooms"],
    ["dining", "dining", "Dining"],
    ["getting-here", "getting-here", "Getting here"],
  ],
  heritage: [
    ["highlights", "about", "The House"],
    ["rooms", "rooms", "Rooms"],
    ["dining", "dining", "Dining"],
    ["location-map", "location", "Address"],
  ],
  essentials: [],
};

export function siteNav(theme: SiteTheme) {
  const on = new Set(visibleSections(theme).map((s) => s.key));
  return NAV[theme.templateId].filter(([k]) => on.has(k)).map(([, id, label]) => ({ id, label }));
}
