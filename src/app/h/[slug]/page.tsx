import { notFound } from "next/navigation";
import { HotelJsonLd } from "@/components/hotel/json-ld";
import { buildSiteCtx, SitePage } from "@/components/site-templates/site-page";
import { normaliseStay, todayInLagos } from "@/lib/dates";
import { canonicalSite, getHotel, siteBase } from "@/lib/site";
import { getSiteTheme, previewToken } from "@/lib/theme/server";
import { api, settle } from "@/lib/api";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** A hotel's home on its own site, laid out by its template (M7) over the same data. */
export default async function MicrositeHome({ params, searchParams }: PageProps<"/h/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const hotel = await getHotel(slug);
  if (!hotel) notFound();
  const [reviews, theme, base, token, concierge] = await Promise.all([
    settle(api.reviews(hotel.slug, { pageSize: 6 })),
    getSiteTheme(hotel),
    siteBase(slug),
    previewToken(),
    settle(api.concierge(hotel.slug)),
  ]);
  const today = todayInLagos();
  const stay = normaliseStay(one(sp.checkIn), one(sp.checkOut), today);
  const ctx = buildSiteCtx({
    hotel,
    theme,
    reviews: reviews.data,
    base,
    today,
    initial: { ...stay, guests: Math.min(Math.max(Number(one(sp.guests)) || 2, 1), 12) },
    preview: !!token,
    concierge: concierge.data,
  });
  return (
    <>
      <HotelJsonLd hotel={hotel} path={`${await canonicalSite(hotel)}/`} />
      <SitePage ctx={ctx} />
    </>
  );
}
