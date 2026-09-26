import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConciergeServicePage } from "@/components/site-templates/concierge-pages";
import { api, settle } from "@/lib/api";
import { getHotel, siteBase } from "@/lib/site";
import { getSiteTheme } from "@/lib/theme/server";
import { hidesPlatform } from "@/lib/white-label";

async function load(slug: string, id: string) {
  const hotel = await getHotel(slug);
  if (!hotel) return null;
  const catalogue = await settle(api.concierge(hotel.slug));
  const service = catalogue.data?.services.find((s) => s.id === id) ?? null;
  return service ? { hotel, service } : null;
}

export async function generateMetadata({ params }: PageProps<"/h/[slug]/concierge/[id]">): Promise<Metadata> {
  const { slug, id } = await params;
  const found = await load(slug, decodeURIComponent(id)).catch(() => null);
  return found ? { title: found.service.name, description: found.service.description || undefined } : { title: "The concierge" };
}

/** M8: one concierge service and how to ask for it. */
export default async function ConciergeService({ params }: PageProps<"/h/[slug]/concierge/[id]">) {
  const { slug, id } = await params;
  const found = await load(slug, decodeURIComponent(id));
  if (!found) notFound();
  const [theme, base] = await Promise.all([getSiteTheme(found.hotel), siteBase(slug)]);
  return (
    <ConciergeServicePage
      hotelName={found.hotel.name}
      slug={found.hotel.slug}
      base={base}
      look={theme.templateId}
      service={found.service}
      whiteLabel={hidesPlatform(found.hotel.whiteLabel)}
    />
  );
}
