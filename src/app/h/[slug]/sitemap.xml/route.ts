import { getHotel, siteOrigin } from "@/lib/site";

export async function GET(_req: Request, ctx: RouteContext<"/h/[slug]/sitemap.xml">) {
  const { slug } = await ctx.params;
  const hotel = await getHotel(slug).catch(() => null);
  if (!hotel) return new Response("Not found", { status: 404 });
  const origin = await siteOrigin(slug);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${origin.includes("/h/") ? origin : `${origin}/`}</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>
`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
