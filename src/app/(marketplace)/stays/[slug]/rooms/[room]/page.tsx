import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { cache } from "react";
import { RoomJsonLd } from "@/components/rooms/room-json-ld";
import { RoomPage } from "@/components/rooms/room-page";
import { api } from "@/lib/api";
import { SITE_URL } from "@/lib/env";
import { loadRoom, roomRequest } from "@/lib/server/room";

const getHotel = cache((slug: string) => api.hotel(slug));

async function load(slug: string, room: string, sp: Record<string, string | string[] | undefined>) {
  const hotel = await getHotel(slug);
  if (!hotel) return null;
  const req = roomRequest(sp);
  const detail = await loadRoom(hotel.slug, decodeURIComponent(room), req.initial.checkIn, req.initial.checkOut, req.initial.guests, "MARKETPLACE", null);
  return detail ? { hotel, detail, req } : null;
}

export async function generateMetadata({ params, searchParams }: PageProps<"/stays/[slug]/rooms/[room]">): Promise<Metadata> {
  const { slug, room } = await params;
  const found = await load(slug, room, await searchParams).catch(() => null);
  if (!found) return { title: "Room not found" };
  const { detail } = found;
  const path = `/stays/${detail.hotel.slug}/rooms/${detail.room.slug}`;
  const image = detail.seo.image ?? detail.room.cover?.url ?? null;
  return {
    title: detail.seo.title,
    description: detail.seo.description,
    alternates: { canonical: path },
    openGraph: { title: detail.seo.title, description: detail.seo.description, type: "website", url: path, images: image ? [{ url: image, alt: detail.room.cover?.alt ?? detail.room.name }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title: detail.seo.title, description: detail.seo.description, images: image ? [image] : undefined },
  };
}

/** A room type's page on the marketplace, in the platform's own look ("View details" on the hotel page). */
export default async function MarketplaceRoom({ params, searchParams }: PageProps<"/stays/[slug]/rooms/[room]">) {
  const { slug, room } = await params;
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") q.set(k, v);
  const found = await load(slug, room, sp);
  if (!found) notFound();
  const { hotel, detail, req } = found;
  // A hotel that is not on the marketplace shows its rooms on its own site.
  if (hotel.booking && !hotel.booking.marketplaceListed) redirect(`/h/${hotel.slug}/rooms/${detail.room.slug}${q.size ? `?${q}` : ""}`);
  if (decodeURIComponent(room) !== detail.room.slug) permanentRedirect(`/stays/${hotel.slug}/rooms/${detail.room.slug}${q.size ? `?${q}` : ""}`);
  const hotelPath = `/stays/${hotel.slug}`;
  return (
    <>
      <RoomJsonLd detail={detail} url={`${SITE_URL}${hotelPath}/rooms/${detail.room.slug}`} hotelUrl={`${SITE_URL}${hotelPath}`} />
      <RoomPage
        detail={detail}
        look="marketplace"
        backHref={`${hotelPath}#rooms`}
        bookBase={`${hotelPath}/book`}
        roomsBase={`${hotelPath}/rooms`}
        conciergeBase={`/h/${hotel.slug}/concierge`}
        today={req.today}
        initial={req.initial}
        channel="MARKETPLACE"
        trail={[
          { href: `/stays?city=${encodeURIComponent(hotel.city)}`, label: hotel.city },
          { href: `${hotelPath}#rooms`, label: hotel.name },
        ]}
      />
    </>
  );
}
