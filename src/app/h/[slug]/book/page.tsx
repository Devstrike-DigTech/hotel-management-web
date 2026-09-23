import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingPage } from "@/components/booking/booking-page";
import { normaliseStay, todayInLagos } from "@/lib/dates";
import { getHotel, siteBase } from "@/lib/site";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export const metadata: Metadata = { title: "Book a room", robots: { index: false } };

export default async function MicrositeBook({ params, searchParams }: PageProps<"/h/[slug]/book">) {
  const { slug } = await params;
  const sp = await searchParams;
  const hotel = await getHotel(slug);
  if (!hotel) notFound();
  const base = await siteBase(slug);
  const today = todayInLagos();
  const stay = normaliseStay(one(sp.checkIn), one(sp.checkOut), today);
  return (
    <BookingPage
      hotel={hotel}
      today={today}
      hotelHref={base || "/"}
      initial={{ room: one(sp.room) || null, ...stay, guests: Math.min(Math.max(Number(one(sp.guests)) || 2, 1), 12) }}
    />
  );
}
