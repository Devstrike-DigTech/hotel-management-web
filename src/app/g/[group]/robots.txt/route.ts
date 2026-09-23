import { canonicalGroup, getGroup } from "@/lib/site";

export async function GET(_req: Request, ctx: RouteContext<"/g/[group]/robots.txt">) {
  const { group: slug } = await ctx.params;
  const group = await getGroup(slug).catch(() => null);
  const body = group
    ? `User-agent: *\nAllow: /\nDisallow: /*/book\n\nSitemap: ${canonicalGroup(group.slug)}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
