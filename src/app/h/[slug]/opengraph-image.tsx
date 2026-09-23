import { hotelOgImage, ogSize } from "@/lib/og-hotel";

export const alt = "The hotel's booking site";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return hotelOgImage(slug, { poweredBy: true });
}
