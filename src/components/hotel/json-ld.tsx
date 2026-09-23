import { SITE_URL } from "@/lib/env";
import type { HotelDetail } from "@/lib/types";

/** schema.org Hotel structured data for search engines. */
export function HotelJsonLd({ hotel, path }: { hotel: HotelDetail; path: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: hotel.name,
    description: hotel.tagline,
    url: `${SITE_URL}${path}`,
    image: hotel.images.map((i) => i.url).slice(0, 5),
    telephone: hotel.phone ?? undefined,
    email: hotel.email ?? undefined,
    checkinTime: hotel.checkInTime ?? undefined,
    checkoutTime: hotel.checkOutTime ?? undefined,
    priceRange: hotel.startingRateKobo ? `From NGN ${Math.round(hotel.startingRateKobo / 100)}` : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: hotel.address,
      addressLocality: hotel.city,
      addressRegion: hotel.state,
      addressCountry: "NG",
    },
    amenityFeature: hotel.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
    ...(hotel.rating && hotel.reviewCount
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: hotel.rating, reviewCount: hotel.reviewCount, bestRating: 5 } }
      : {}),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
