import type { MetadataRoute } from "next";
import { allHotels, api, settle } from "@/lib/api";
import { SITE_URL } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [hotels, cities] = await Promise.all([settle(allHotels()), settle(api.cities())]);
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/stays`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/for-hotels`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    ...(cities.data ?? []).map((c) => ({
      url: `${SITE_URL}/stays?city=${encodeURIComponent(c.name)}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...(hotels.data ?? []).map((h) => ({
      url: `${SITE_URL}/stays/${h.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
