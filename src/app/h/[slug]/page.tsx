import { notFound } from "next/navigation";
import { HotelView } from "@/components/hotel/hotel-view";
import { HotelJsonLd } from "@/components/hotel/json-ld";
import { normaliseStay, todayInLagos } from "@/lib/dates";
import { getHotel, siteBase } from "@/lib/site";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function MicrositeHome({ params, searchParams }: PageProps<"/h/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const hotel = await getHotel(slug);
  if (!hotel) notFound();
  const base = await siteBase(slug);
  const today = todayInLagos();
  const stay = normaliseStay(one(sp.checkIn), one(sp.checkOut), today);
  return (
    <>
      <HotelJsonLd hotel={hotel} path={base || "/"} />
      <HotelView
        hotel={hotel}
        today={today}
        initial={{ ...stay, guests: Math.min(Math.max(Number(one(sp.guests)) || 2, 1), 12) }}
        bookBase={`${base}/book`}
        variant="microsite"
      />
    </>
  );
}
