import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import type { BookingChannel } from "@/lib/booking-types";
import type { ISODate } from "@/lib/dates";
import { APP_NAME } from "@/lib/env";
import type { HotelDetail } from "@/lib/types";
import { BookingFlow } from "./booking-flow";

/** Server wrapper shared by the marketplace (MARKETPLACE channel) and microsite (BOOKING_SITE) booking routes. */
export function BookingPage({
  hotel,
  today,
  initial,
  hotelHref,
  channel,
  confirmPath,
}: {
  hotel: HotelDetail;
  today: ISODate;
  initial: { room: string | null; plan?: string | null; checkIn: ISODate | null; checkOut: ISODate | null; guests: number };
  hotelHref: string;
  channel: BookingChannel;
  confirmPath: string;
}) {
  return (
    <div className="container-page pb-8 pt-8 lg:pt-10">
      <Link href={hotelHref} className="kicker inline-flex items-center gap-2 hover:text-ink">
        <ArrowLeft size={13} aria-hidden /> {hotel.name}
      </Link>
      <h1 className="display-md mt-5 text-[clamp(2.4rem,5vw,4rem)]">
        Book a room at <em className="accent">{hotel.name}</em>
      </h1>
      <div className="mt-10">
        <BookingFlow
          hotel={{
            slug: hotel.slug,
            name: hotel.name,
            area: hotel.area,
            city: hotel.city,
            address: hotel.address,
            phone: hotel.phone,
            email: hotel.email,
            checkInTime: hotel.checkInTime,
            checkOutTime: hotel.checkOutTime,
            coverImageUrl: hotel.coverImageUrl,
            roomTypes: hotel.roomTypes,
            booking: hotel.booking ?? null,
          }}
          site={{ channel, confirmPath, hotelHref, devMode: process.env.NODE_ENV !== "production", appName: APP_NAME }}
          today={today}
          initial={initial}
        />
      </div>
    </div>
  );
}
