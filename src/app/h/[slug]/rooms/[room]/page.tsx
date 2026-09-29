import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { RoomJsonLd } from "@/components/rooms/room-json-ld";
import { RoomPage } from "@/components/rooms/room-page";
import { RoomPageLite } from "@/components/rooms/room-page-lite";
import { canonicalSite, getHotel, siteBase } from "@/lib/site";
import { loadRoom, roomRequest } from "@/lib/server/room";
import { getSiteTheme, previewToken } from "@/lib/theme/server";

async function load(slug: string, room: string, sp: Record<string, string | string[] | undefined>) {
  const hotel = await getHotel(slug);
  if (!hotel) return null;
  const req = roomRequest(sp);
  const token = await previewToken();
  const detail = await loadRoom(hotel.slug, decodeURIComponent(room), req.initial.checkIn, req.initial.checkOut, req.initial.guests, "BOOKING_SITE", token);
  return detail ? { hotel, detail, req, token } : null;
}

export async function generateMetadata({ params, searchParams }: PageProps<"/h/[slug]/rooms/[room]">): Promise<Metadata> {
  const { slug, room } = await params;
  const found = await load(slug, room, await searchParams).catch(() => null);
  if (!found) return { title: "Room not found" };
  const { detail, hotel } = found;
  const url = `${await canonicalSite(hotel)}/rooms/${detail.room.slug}`;
  const image = detail.seo.image ?? detail.room.cover?.url ?? null;
  return {
    title: { absolute: detail.seo.title },
    description: detail.seo.description,
    alternates: { canonical: url },
    ...(detail.preview ? { robots: { index: false, follow: false, nocache: true } } : {}),
    openGraph: {
      title: detail.seo.title,
      description: detail.seo.description,
      url,
      type: "website",
      locale: "en_NG",
      siteName: hotel.whiteLabel?.brandName || hotel.name,
      images: image ? [{ url: image, alt: detail.room.cover?.alt ?? detail.room.name }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: detail.seo.title, description: detail.seo.description, images: image ? [image] : undefined },
  };
}

/** A room type's own page on the hotel's site, in its template ("View details" on every room card). */
export default async function MicrositeRoom({ params, searchParams }: PageProps<"/h/[slug]/rooms/[room]">) {
  const { slug, room } = await params;
  const sp = await searchParams;
  const found = await load(slug, room, sp);
  if (!found) notFound();
  const { hotel, detail, req } = found;
  const base = await siteBase(slug);
  // An old link by id (or another spelling) goes to the room's stable address, keeping the stay.
  if (decodeURIComponent(room) !== detail.room.slug) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string") q.set(k, v);
    permanentRedirect(`${base}/rooms/${detail.room.slug}${q.size ? `?${q}` : ""}`);
  }
  const theme = await getSiteTheme(hotel);
  const canonical = await canonicalSite(hotel);
  const url = `${canonical}/rooms/${detail.room.slug}`;
  const shared = {
    backHref: `${base}/#rooms`,
    bookBase: `${base}/book`,
    roomsBase: `${base}/rooms`,
    today: req.today,
    initial: req.initial,
  };
  const note = detail.preview ? (
    <div role="status" className="night border-b border-line" data-testid="room-draft-note">
      <p className="container-page flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5 text-[12.5px]">
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="size-2 rounded-full bg-brass" />
          <span className="kicker !text-[11px] !text-ink">Room draft</span>
          <span className="text-ink-muted">Unpublished changes to this room. Guests still see the published room.</span>
        </span>
        <a href="?preview=off" className="text-ink-muted underline decoration-1 underline-offset-2 hover:text-ink">
          Leave preview
        </a>
      </p>
    </div>
  ) : null;
  return (
    <>
      <RoomJsonLd detail={detail} url={url} hotelUrl={`${canonical}/`} />
      {note}
      {theme.templateId === "essentials" ? (
        <RoomPageLite
          detail={detail}
          {...shared}
          selfPath={`${base}/rooms/${detail.room.slug}`}
          shareUrl={`${url}${req.initial.checkIn && req.initial.checkOut ? `?checkIn=${req.initial.checkIn}&checkOut=${req.initial.checkOut}` : ""}`}
        />
      ) : (
        <RoomPage detail={detail} look={theme.templateId} {...shared} conciergeBase={`${base}/concierge`} channel="BOOKING_SITE" />
      )}
    </>
  );
}
