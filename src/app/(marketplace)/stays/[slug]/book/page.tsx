import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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
  // A hotel that is not on the marketplace takes bookings only on its own site (channel BOOKING_SITE).
  if (hotel.booking && !hotel.booking.marketplaceListed) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string") q.set(k, v);
    redirect(`/h/${hotel.slug}/book${q.size ? `?${q}` : ""}`);
  }
  const today = todayInLagos();
  const stay = normaliseStay(one(sp.checkIn), one(sp.checkOut), today);
  return (
    <BookingPage
      hotel={hotel}
      today={today}
      hotelHref={`/stays/${hotel.slug}`}
      channel="MARKETPLACE"
      confirmPath="/booking/confirmation"
      initial={{ room: one(sp.room) || null, ...stay, guests: Math.min(Math.max(Number(one(sp.guests)) || 2, 1), 12) }}
    />
  );
}
