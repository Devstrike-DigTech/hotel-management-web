import { canonicalSite, getHotel } from "@/lib/site";

/** The hotel's page and its rooms' pages at its canonical address (the verified custom domain when it has one). */
export async function GET(_req: Request, ctx: RouteContext<"/h/[slug]/sitemap.xml">) {
  const { slug } = await ctx.params;
  const hotel = await getHotel(slug).catch(() => null);
  if (!hotel) return new Response("Not found", { status: 404 });
  const origin = await canonicalSite(hotel);
  // Each room type's own page (room details), by its stable slug.
  const rooms = hotel.roomTypes
    .filter((r) => r.slug)
    .map((r) => `  <url><loc>${origin}/rooms/${encodeURIComponent(r.slug!)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`)
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
${rooms}</urlset>
`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
