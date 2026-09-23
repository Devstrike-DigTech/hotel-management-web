import { hotelOgImage } from "@/lib/og-hotel";

/**
 * The microsite's social card. A route rather than the opengraph-image file convention, so the
 * metadata can point at it on the hotel's canonical host (its custom domain), where "/og.png" is
 * served by this route through the host proxy.
 */
export async function GET(_req: Request, ctx: RouteContext<"/h/[slug]/og.png">) {
  const { slug } = await ctx.params;
  const res = await hotelOgImage(slug, { poweredBy: true });
  res.headers.set("cache-control", "public, max-age=3600, s-maxage=3600");
  return res;
}
