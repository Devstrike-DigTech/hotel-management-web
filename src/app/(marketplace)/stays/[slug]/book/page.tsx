import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingPage } from "@/components/booking/booking-page";
import { api } from "@/lib/api";
import { normaliseStay, todayInLagos } from "@/lib/dates";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ params }: PageProps<"/stays/[slug]/book">): Promise<Metadata> {
  const hotel = await api.hotel((await params).slug).catch(() => null);
  return { title: hotel ? `Book ${hotel.name}` : "Book a room", robots: { index: false } };
}

export default async function BookPage({ params, searchParams }: PageProps<"/stays/[slug]/book">) {
  const { slug } = await params;
  const sp = await searchParams;
  const hotel = await api.hotel(slug);
  if (!hotel) notFound();
  const today = todayInLagos();
  const stay = normaliseStay(one(sp.checkIn), one(sp.checkOut), today);
  return (
    <BookingPage
      hotel={hotel}
      today={today}
      hotelHref={`/stays/${hotel.slug}`}
      initial={{ room: one(sp.room) || null, ...stay, guests: Math.min(Math.max(Number(one(sp.guests)) || 2, 1), 12) }}
    />
  );
}
