import { planTitle, plansFor } from "@/lib/rates";
import type { RoomDetail } from "@/lib/rooms";

const naira = (kobo: number) => (kobo / 100).toFixed(2);

/**
 * schema.org structured data for a room type's page: the HotelRoom (bed, occupancy, size, amenities,
 * photographs, the hotel it is in) and an Offer for each of its rates. With dates the offers carry the
 * stay's total and whether it is free; without, the lowest nightly rate.
 */
export function RoomJsonLd({ detail, url, hotelUrl }: { detail: RoomDetail; url: string; hotelUrl: string }) {
  const r = detail.room;
  const h = detail.hotel;
  const stay = detail.stay;
  const roomId = `${url}#room`;
  const plans = plansFor(r, stay ? { ratePlans: stay.ratePlans, quote: stay.quote, bookable: stay.bookable } : null);
  const offers = (plans.length ? plans : [null]).map((p) => {
    const quote = p?.quote ?? (!p ? stay?.quote : null) ?? null;
    const dated = !!(stay && quote);
    const nightly = p?.fromKobo ?? r.fromKobo;
    return {
      "@type": "Offer",
      name: p ? `${r.name}, ${planTitle(p)}` : r.name,
      url,
      priceCurrency: "NGN",
      price: naira(dated ? quote!.totalKobo : nightly),
      ...(dated
        ? {
            description: `${stay!.nights} ${stay!.nights === 1 ? "night" : "nights"} from ${stay!.checkIn}, taxes included`,
            availabilityStarts: stay!.checkIn,
            availabilityEnds: stay!.checkOut,
            availability: (p ? p.bookable : stay!.bookable) ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
          }
        : {
            priceSpecification: { "@type": "UnitPriceSpecification", price: naira(nightly), priceCurrency: "NGN", unitCode: "DAY", unitText: "night" },
          }),
      itemOffered: { "@id": roomId },
      offeredBy: { "@type": "Hotel", name: h.name, url: hotelUrl },
    };
  });
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HotelRoom",
        "@id": roomId,
        name: r.name,
        description: (r.description || r.longDescription).slice(0, 500),
        url,
        image: r.gallery.slice(0, 10).map((g) => g.url),
        ...(r.bedType ? { bed: { "@type": "BedDetails", typeOfBed: r.bedType, numberOfBeds: r.bedCount } } : {}),
        occupancy: { "@type": "QuantitativeValue", maxValue: r.capacity, unitCode: "C62" },
        ...(r.sizeSqm ? { floorSize: { "@type": "QuantitativeValue", value: r.sizeSqm, unitCode: "MTK" } } : {}),
        smokingAllowed: r.smoking,
        amenityFeature: r.amenityGroups.flatMap((g) => g.items.map((i) => ({ "@type": "LocationFeatureSpecification", name: i.label, value: true }))),
        containedInPlace: {
          "@type": "Hotel",
          name: h.name,
          url: hotelUrl,
          address: { "@type": "PostalAddress", streetAddress: h.address, addressLocality: h.city, addressRegion: h.state, addressCountry: "NG" },
          ...(h.checkInTime ? { checkinTime: h.checkInTime } : {}),
          ...(h.checkOutTime ? { checkoutTime: h.checkOutTime } : {}),
        },
      },
      ...offers,
    ],
  };
  return <script type="application/ld+json" data-testid="room-json-ld" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
