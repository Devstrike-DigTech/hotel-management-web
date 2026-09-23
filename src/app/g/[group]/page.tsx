import { notFound, redirect } from "next/navigation";
import { GroupIndex } from "@/components/hotel/group-index";
import { API_URL } from "@/lib/env";
import type { HotelLoyalty } from "@/lib/types";
import { getGroup, propertyHref } from "@/lib/site";

async function programme(slug: string): Promise<HotelLoyalty["programme"]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/public/hotels/${encodeURIComponent(slug)}/loyalty`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(4000) });
    return res.ok ? ((await res.json()) as HotelLoyalty).programme : null;
  } catch {
    return null;
  }
}

/** The root of a hotel group's site: its hotels, each leading to its own microsite. */
export default async function GroupHome({ params }: PageProps<"/g/[group]">) {
  const { group: slug } = await params;
  const group = await getGroup(slug);
  if (!group || !group.properties.length) notFound();
  const entries = await Promise.all(
    group.properties.map(async (p) => {
      const href = await propertyHref(group.slug, p);
      return { ...p, href, bookHref: `${href.replace(/\/$/, "")}/book` };
    }),
  );
  // A group of one is just that hotel.
  if (entries.length === 1) redirect(entries[0].href);
  const loyalty = await programme(group.properties[0].slug);
  return (
    <GroupIndex
      group={{ name: group.name, tagline: null, description: null }}
      properties={entries}
      loyalty={loyalty ? { programmeName: loyalty.name, earnPerThousand: loyalty.earnPointsPer1000 } : null}
    />
  );
}
