import { hotelOgImage } from "@/lib/og-hotel";

/**
 * The microsite's social card. A route rather than the opengraph-image file convention, so the
 * metadata can point at it on the hotel's canonical host (its custom domain), where "/og.png" is
 * served by this route through the host proxy.
 */
export async function GET(req: Request, ctx: RouteContext<"/h/[slug]/og.png">) {
  const { slug } = await ctx.params;
  // On a custom domain the proxy names the host, so a white-labelled hotel gets its own card (M6).
  const res = await hotelOgImage(slug, { poweredBy: true, host: req.headers.get("x-site-host") });
  res.headers.set("cache-control", "public, max-age=3600, s-maxage=3600");
  return res;
}
