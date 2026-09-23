import { notFound, redirect } from "next/navigation";
import { GroupIndex } from "@/components/hotel/group-index";
import { api } from "@/lib/api";
import { getGroup, propertyHref } from "@/lib/site";

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
  const loyalty = await api.loyalty(group.properties[0].slug);
  return (
    <GroupIndex
      group={{ name: group.name, tagline: null, description: `Book direct at any of our hotels, in ${list(entries.map((p) => p.area))}.` }}
      properties={entries}
      loyalty={loyalty ? { programmeName: loyalty.name, earnPerThousand: loyalty.earnPointsPer1000 } : null}
    />
  );
}

const list = (xs: string[]) => {
  const u = [...new Set(xs)];
  return u.length < 2 ? (u[0] ?? "") : `${u.slice(0, -1).join(", ")} and ${u.at(-1)}`;
};
