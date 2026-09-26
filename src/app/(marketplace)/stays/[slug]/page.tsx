import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { HotelView } from "@/components/hotel/hotel-view";
import { HotelJsonLd } from "@/components/hotel/json-ld";
import { api, settle } from "@/lib/api";
import { normaliseStay, todayInLagos } from "@/lib/dates";
import { formatNaira } from "@/lib/format";

const getHotel = cache((slug: string) => api.hotel(slug));
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ params }: PageProps<"/stays/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const hotel = await getHotel(slug).catch(() => null);
  if (!hotel) return { title: "Hotel not found" };
  const price = hotel.startingRateKobo ? ` Rooms from ${formatNaira(hotel.startingRateKobo)} a night.` : "";
  return {
    title: `${hotel.name}, ${hotel.area}`,
    description: `${hotel.tagline}. ${hotel.area}, ${hotel.city}.${price}`,
    alternates: { canonical: `/stays/${hotel.slug}` },
    openGraph: { title: hotel.name, description: hotel.tagline, type: "website" },
  };
}

export default async function HotelPage({ params, searchParams }: PageProps<"/stays/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const hotel = await getHotel(slug);
  if (!hotel) notFound();
  const [reviews, concierge] = await Promise.all([settle(api.reviews(hotel.slug, { pageSize: 6 })), settle(api.concierge(hotel.slug))]);
  const today = todayInLagos();
  const stay = normaliseStay(one(sp.checkIn), one(sp.checkOut), today);
  const guests = Math.min(Math.max(Number(one(sp.guests)) || 2, 1), 12);

  return (
    <>
      <HotelJsonLd hotel={hotel} path={`/stays/${hotel.slug}`} />
      <HotelView
        hotel={hotel}
        reviews={reviews.data}
        concierge={concierge.data}
        today={today}
        initial={{ ...stay, guests }}
        bookBase={`/stays/${hotel.slug}/book`}
        variant="marketplace"
      />
    </>
  );
}
