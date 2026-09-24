import type { MetadataRoute } from "next";
import { allHotels, api, settle } from "@/lib/api";
import { GUIDES } from "@/lib/developers/guides";
import { loadSpec } from "@/lib/developers/spec";
import { SITE_URL } from "@/lib/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [hotels, cities, spec] = await Promise.all([settle(allHotels()), settle(api.cities()), loadSpec()]);
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/stays`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/for-hotels`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    // M6: the developer docs.
    ...["/developers", ...GUIDES.map((g) => `/developers/${g.slug}`), "/developers/reference", ...spec.model.groups.map((g) => `/developers/reference/${g.slug}`)].map(
      (path) => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.5 }),
    ),
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
