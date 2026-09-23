import { canonicalSite, getHotel } from "@/lib/site";

export async function GET(_req: Request, ctx: RouteContext<"/h/[slug]/robots.txt">) {
  const { slug } = await ctx.params;
  const hotel = await getHotel(slug).catch(() => null);
  const body = hotel
    ? `User-agent: *\nAllow: /\nDisallow: /book\n\nSitemap: ${await canonicalSite(hotel)}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
