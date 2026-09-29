/**
 * A room type's own page ("View details"), laid out by the hotel's template over one data model
 * (API-ROOMS 5): the photographs, the name, highlights and key facts, the description, what is in
 * the room, what comes with it and what can be added, the rates for the guest's dates, the policies
 * and the other rooms. The server renders all of it; the gallery and the stay panel are the only
 * islands. Essentials has its own page without any (room-page-lite.tsx).
 */
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ISODate } from "@/lib/dates";
import { formatNaira } from "@/lib/format";
import type { RoomDetail } from "@/lib/rooms";
import { OrnamentRule } from "../site-templates/ornaments";
import { Plate } from "../ui/plate";
import { RoomGallery } from "./room-gallery";
import { AmenityGroups, FactLine, FactsRow, Highlights, MarkdownLite, RoomPolicies, RoomSectionHead, RoomServices, SimilarRooms, type RoomLook } from "./room-sections";
import { RoomBookBar, RoomStayPanel, RoomStayProvider } from "./room-stay";
import { ShareRoom } from "./share-room";

export interface RoomPageProps {
  detail: RoomDetail;
  look: RoomLook;
  /** "All rooms" goes here: the hotel's rooms section. */
  backHref: string;
  bookBase: string;
  roomsBase: string;
  conciergeBase: string;
  today: ISODate;
  initial: { checkIn: ISODate | null; checkOut: ISODate | null; guests: number };
  channel: "MARKETPLACE" | "BOOKING_SITE";
  /** Marketplace only: the trail above the page. */
  trail?: { href: string; label: string }[];
}

interface Part {
  key: string;
  title: string;
  aside?: string | null;
  body: React.ReactNode;
}

export function RoomPage(props: RoomPageProps) {
  const { detail, look } = props;
  const r = detail.room;
  const gallery = look === "marketplace" ? "editorial" : look;
  const shareText = `The ${r.name} at ${detail.hotel.name}, ${detail.hotel.area}.`;
  const share = <ShareRoom title={`${r.name}, ${detail.hotel.name}`} text={shareText} tone={look === "boutique" || look === "heritage" ? "caps" : "default"} />;
  const panel = <RoomStayPanel look={look} share={share} />;
  const aboutBody = r.longDescription || r.description;

  const parts = ([
    aboutBody
      ? {
          key: "about",
          title: look === "heritage" ? "The Room" : look === "business" ? "About the room" : "The room",
          body: (
            <MarkdownLite
              source={aboutBody}
              className={`room-md ${look === "boutique" ? "text-[1.1875rem] leading-[1.75] text-ink/90" : look === "heritage" ? "heritage-prose mx-auto max-w-2xl text-[1.0625rem] leading-[1.85]" : look === "business" ? "max-w-[70ch] text-[0.9375rem] leading-relaxed" : "prose-body max-w-[62ch]"}`}
              dropCap={look === "editorial" || look === "marketplace"}
              bullet={look === "heritage" || look === "boutique" ? "dot" : "dash"}
            />
          ),
        }
      : null,
    {
      key: "amenities",
      title: look === "heritage" ? "Appointments" : look === "boutique" ? "In the room" : look === "resort" ? "Everything in your room" : "In the room",
      aside: look === "resort" ? "Comforts" : `${r.amenityGroups.reduce((n, g) => n + g.items.length, 0)} things`,
      body: <AmenityGroups groups={r.amenityGroups} look={look} />,
    },
    detail.services.included.length || detail.services.extras.length || detail.services.pickups.length || detail.services.concierge.length
      ? {
          key: "services",
          title: look === "heritage" ? "With Your Stay" : look === "resort" ? "Your stay, your way" : "With your stay",
          aside: look === "resort" ? "Included and extras" : null,
          body: <RoomServices detail={detail} look={look} conciergeBase={props.conciergeBase} />,
        }
      : null,
    {
      key: "policies",
      title: look === "heritage" ? "Terms of the House" : look === "boutique" ? "Good to know" : "Policies",
      aside: look === "resort" ? "Good to know" : null,
      body: <RoomPolicies detail={detail} look={look} />,
    },
  ] as (Part | null)[]).filter((p): p is Part => !!p);

  const similar = detail.similar.length
    ? {
        title: look === "heritage" ? "Other Chambers" : look === "boutique" ? "Other rooms" : look === "resort" ? "You might also love" : "Other rooms here",
        body: <SimilarRooms rooms={detail.similar} look={look} roomsBase={props.roomsBase} stay={props.initial} />,
      }
    : null;

  const section = (p: Part, n: number, className = "") => (
    <section key={p.key} id={`room-${p.key}`} aria-labelledby={`room-${p.key}-title`} className={`scroll-mt-28 ${className}`} data-room-section={p.key}>
      <RoomSectionHead look={look} n={n} id={`room-${p.key}-title`} title={p.title} aside={p.aside} />
      {p.body}
    </section>
  );

  const provider = (children: React.ReactNode) => (
    <RoomStayProvider
      slug={detail.hotel.slug}
      room={{ id: r.id, slug: r.slug, name: r.name, basePriceKobo: r.basePriceKobo, fromKobo: r.fromKobo, capacity: r.capacity, ratePlans: r.ratePlans }}
      initial={{ ...props.initial, stay: detail.stay }}
      today={props.today}
      bookBase={props.bookBase}
      channel={props.channel}
      policy={detail.policies.cancellation}
      onlineBooking={detail.hotel.onlineBookingEnabled}
    >
      {children}
      <RoomBookBar look={look} />
    </RoomStayProvider>
  );

  const back = (className = "") => (
    <Link href={props.backHref} className={`inline-flex items-center gap-2 hover:text-ink ${className}`} data-testid="room-back">
      <ArrowLeft size={13} aria-hidden /> All rooms at {detail.hotel.name}
    </Link>
  );

  switch (look) {
    /* -------------------------------------------------------------- Boutique: image-led, a lot of air */
    case "boutique":
      return provider(
        <article data-room-page="boutique" data-testid="room-page" className="pb-24 lg:pb-8">
          <section data-hero-bleed aria-labelledby="room-name" className="boutique-hero relative isolate flex items-end overflow-hidden">
            <Plate src={r.cover?.url} alt={r.cover?.alt ?? r.name} label={r.name} caption={false} priority sizes="100vw" className="!absolute inset-0 -z-10" />
            <div aria-hidden className="boutique-scrim absolute inset-0 -z-10" />
            <div className="container-page pb-14 sm:pb-20">
              <p className="boutique-kicker">
                <Link href={props.backHref} className="hover:underline" data-testid="room-back">
                  {detail.hotel.name}
                </Link>{" "}
                · Rooms
              </p>
              <h1 id="room-name" className="display mt-5 max-w-4xl text-[clamp(3rem,9vw,7rem)]">
                {r.name}
              </h1>
              <div className="mt-8">
                <FactsRow facts={r.facts} look="boutique" />
              </div>
            </div>
          </section>

          <div className="container-page grid gap-14 py-20 lg:grid-cols-12 lg:gap-16 lg:py-28">
            <div className="min-w-0 lg:col-span-7">
              {parts[0]?.key === "about" ? (
                <>
                  {parts[0].body}
                  <Highlights items={r.highlights} look="boutique" />
                </>
              ) : (
                <Highlights items={r.highlights} look="boutique" />
              )}
            </div>
            <aside aria-label="Dates and rates" className="lg:col-span-5">
              <div className="lg:sticky lg:top-8">{panel}</div>
            </aside>
          </div>

          <section aria-labelledby="room-pictures" className="py-10">
            <div className="container-page">
              <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
                <div>
                  <p className="boutique-kicker">Pictures</p>
                  <h2 id="room-pictures" className="display-md mt-3 text-[clamp(1.9rem,3.4vw,2.7rem)]">
                    Around the room
                  </h2>
                </div>
              </header>
              <RoomGallery images={r.gallery} title={r.name} look="boutique" />
            </div>
          </section>

          <div className="container-page mt-16 space-y-28">
            {parts
              .filter((p) => p.key !== "about")
              .map((p, i) => section(p, i + 1, "mx-auto max-w-5xl"))}
            {similar ? section({ key: "similar", title: similar.title, body: similar.body }, parts.length, "") : null}
          </div>
        </article>,
      );

    /* -------------------------------------------------------------- Business: rates first, dense */
    case "business":
      return provider(
        <article data-room-page="business" data-testid="room-page" className="container-page pb-28 pt-5 lg:pb-12">
          <p className="text-[12.5px] text-ink-muted">{back()}</p>
          <header className="mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-ink pb-4">
            <div className="min-w-0">
              <h1 id="room-name" className="font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-medium leading-tight tracking-[-0.03em]">
                {r.name}
              </h1>
              <Highlights items={r.highlights} look="business" />
            </div>
            <p className="num text-right text-sm text-ink-muted">
              from <span className="text-xl font-medium text-ink">{formatNaira(r.fromKobo)}</span> / night
            </p>
          </header>
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="min-w-0 space-y-5">
              <RoomGallery images={r.gallery} title={r.name} look="business" />
              <FactsRow facts={r.facts} look="business" />
            </div>
            <aside aria-label="Dates and rates">
              <div className="lg:sticky lg:top-24">{panel}</div>
            </aside>
          </div>
          <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="min-w-0 space-y-12">
              {parts.map((p, i) => section(p, i + 1))}
              {similar ? section({ key: "similar", title: similar.title, aside: `${detail.similar.length} types`, body: similar.body }, parts.length + 1) : null}
            </div>
          </div>
        </article>,
      );

    /* -------------------------------------------------------------- Resort: immersive and soft */
    case "resort":
      return provider(
        <article data-room-page="resort" data-testid="room-page" className="pb-28 lg:pb-12">
          <div className="container-page pt-4">
            <p className="mb-4 text-sm text-ink-muted">{back("rounded-full bg-surface-2 px-4 py-2")}</p>
            <RoomGallery images={r.gallery} title={r.name} look="resort" />
            <header className="relative mx-auto -mt-2 max-w-4xl rounded-[28px] border border-line bg-paper p-6 text-center shadow-[var(--shadow-card)] sm:-mt-16 sm:p-9">
              <p className="resort-kicker">{detail.hotel.name}</p>
              <h1 id="room-name" className="display-md mt-2 text-[clamp(2.4rem,5.5vw,4rem)]">
                {r.name}
              </h1>
              <div className="mt-5 flex justify-center">
                <FactsRow facts={r.facts} look="resort" />
              </div>
            </header>
          </div>
          <div className="container-page mt-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-14">
            <div className="min-w-0 space-y-20">
              {parts.map((p, i) =>
                p.key === "about" ? (
                  <section key="about" id="room-about" aria-labelledby="room-about-title" data-room-section="about">
                    <RoomSectionHead look="resort" n={i + 1} id="room-about-title" title={p.title} aside="Stay" />
                    {p.body}
                    <Highlights items={r.highlights} look="resort" />
                  </section>
                ) : (
                  section(p, i + 1)
                ),
              )}
            </div>
            <aside aria-label="Dates and rates" className="max-lg:order-first">
              <div className="lg:sticky lg:top-24">{panel}</div>
            </aside>
          </div>
          {similar ? <div className="container-page mt-24">{section({ key: "similar", title: similar.title, aside: "More rooms", body: similar.body }, parts.length + 1)}</div> : null}
        </article>,
      );

    /* -------------------------------------------------------------- Heritage: formal, centred, framed */
    case "heritage":
      return provider(
        <article data-room-page="heritage" data-testid="room-page" className="pb-28 lg:pb-12">
          <div className="container-page pt-10 text-center sm:pt-14">
            <p className="heritage-kicker">
              <Link href={props.backHref} className="hover:text-ink" data-testid="room-back">
                {detail.hotel.name}
              </Link>{" "}
              · Chambers and Suites
            </p>
            <h1 id="room-name" className="heritage-display mx-auto mt-6 max-w-4xl text-[clamp(2.3rem,6vw,4.6rem)]">
              {r.name}
            </h1>
            <Highlights items={r.highlights} look="heritage" />
            <OrnamentRule className="mt-8" />
            <div className="mx-auto mt-10 max-w-6xl">
              <RoomGallery images={r.gallery} title={r.name} look="heritage" />
            </div>
            <div className="mx-auto mt-14 grid max-w-5xl items-start gap-12 text-left lg:grid-cols-[1fr_22rem]">
              <FactsRow facts={r.facts} look="heritage" />
              <aside aria-label="Dates and rates">{panel}</aside>
            </div>
          </div>
          <div className="container-page mt-24 space-y-24">
            {parts.map((p, i) => section(p, i + 1, "mx-auto max-w-4xl"))}
            {similar ? section({ key: "similar", title: similar.title, body: similar.body }, parts.length + 1, "mx-auto max-w-6xl") : null}
          </div>
        </article>,
      );

    /* -------------------------------------------------------------- Editorial (and the marketplace) */
    default:
      return provider(
        <article data-room-page={look} data-testid="room-page" className="container-page pb-28 pt-8 lg:pb-12 lg:pt-10">
          {props.trail?.length ? (
            <nav aria-label="You are here" className="kicker flex flex-wrap items-center gap-x-2 gap-y-1">
              {props.trail.map((t, i) => (
                <span key={t.href} className="inline-flex items-center gap-2">
                  {i ? <span aria-hidden>/</span> : null}
                  <Link href={t.href} className="hover:text-ink" data-testid={i === props.trail!.length - 1 ? "room-back" : undefined}>
                    {t.label}
                  </Link>
                </span>
              ))}
            </nav>
          ) : (
            <p className="kicker">{back()}</p>
          )}
          <header className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <span aria-hidden className="adire-rule mb-6 max-w-[10rem] text-laterite/60" />
              <p className="kicker">
                Room type <span className="text-laterite">·</span> {detail.hotel.name}, {detail.hotel.area}
              </p>
              <h1 id="room-name" className="display mt-4 text-[clamp(2.8rem,7vw,5.8rem)]">
                <span className="reveal-line">
                  <span>{r.name}</span>
                </span>
              </h1>
            </div>
            <div className="lg:col-span-4 lg:pb-3 lg:text-right">
              <p className="kicker">From, per night</p>
              <p className="num mt-1 text-3xl font-medium">{formatNaira(r.fromKobo)}</p>
              <div className="mt-3 lg:flex lg:justify-end">
                <FactLine detail={detail} />
              </div>
            </div>
          </header>
          <Highlights items={r.highlights} look={look} />
          <div className="fade-up mt-10 [--d:120ms]">
            <RoomGallery images={r.gallery} title={r.name} look={gallery} />
          </div>
          <div className="mt-8">
            <FactsRow facts={r.facts} look={look} />
          </div>
          <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="min-w-0 space-y-14 lg:col-span-8">{parts.map((p, i) => section(p, i + 1))}</div>
            <aside aria-label="Dates and rates" className="max-lg:order-first lg:col-span-4">
              <div className="lg:sticky lg:top-24">{panel}</div>
            </aside>
          </div>
          {similar ? <div className="mt-16">{section({ key: "similar", title: similar.title, aside: `${detail.similar.length} more`, body: similar.body }, parts.length + 1)}</div> : null}
        </article>,
      );
  }
}
