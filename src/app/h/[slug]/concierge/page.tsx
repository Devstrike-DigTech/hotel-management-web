import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConciergeCataloguePage } from "@/components/site-templates/concierge-pages";
import { api, settle } from "@/lib/api";
import { getHotel, siteBase } from "@/lib/site";
import { getSiteTheme } from "@/lib/theme/server";

export async function generateMetadata({ params }: PageProps<"/h/[slug]/concierge">): Promise<Metadata> {
  const { slug } = await params;
  const hotel = await getHotel(slug).catch(() => null);
  return { title: "The concierge", description: hotel ? `Things ${hotel.name} can arrange for your stay, priced before anything is booked.` : undefined };
}

/** M8: every service the hotel's concierge offers, by kind, in the site's template. */
export default async function ConciergeCatalogue({ params }: PageProps<"/h/[slug]/concierge">) {
  const { slug } = await params;
  const hotel = await getHotel(slug);
  if (!hotel) notFound();
  const [theme, base, catalogue] = await Promise.all([getSiteTheme(hotel), siteBase(slug), settle(api.concierge(hotel.slug))]);
  if (!catalogue.data || !catalogue.data.services.length) notFound();
  return <ConciergeCataloguePage hotelName={hotel.name} slug={hotel.slug} base={base} look={theme.templateId} catalogue={catalogue.data} />;
}
