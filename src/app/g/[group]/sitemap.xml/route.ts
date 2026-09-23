import { canonicalGroup, getGroup } from "@/lib/site";

/** The group root, and each of its hotels at its own canonical address. */
export async function GET(_req: Request, ctx: RouteContext<"/g/[group]/sitemap.xml">) {
  const { group: slug } = await ctx.params;
  const group = await getGroup(slug).catch(() => null);
  if (!group) return new Response("Not found", { status: 404 });
  const urls = [`${canonicalGroup(group.slug)}/`, ...group.properties.map((p) => `${p.canonicalUrl.replace(/\/$/, "")}/`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u, i) => `  <url><loc>${u}</loc><changefreq>weekly</changefreq><priority>${i ? "0.8" : "1.0"}</priority></url>`).join("\n")}
</urlset>
`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
