import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import type { BookingChannel } from "@/lib/booking-types";
import type { ISODate } from "@/lib/dates";
import { APP_NAME } from "@/lib/env";
import { hidesPlatform } from "@/lib/white-label";
import type { HotelDetail } from "@/lib/types";
import { BookingFlow } from "./booking-flow";
import { api } from "@/lib/api";
import { builtInForm, normaliseForm } from "@/lib/booking-form";

/** Server wrapper shared by the marketplace (MARKETPLACE channel) and microsite (BOOKING_SITE) booking routes. */
export async function BookingPage({
  hotel,
  today,
  initial,
  hotelHref,
  channel,
  confirmPath,
  preview = null,
  formChannel,
}: {
  hotel: HotelDetail;
  today: ISODate;
  initial: { room: string | null; plan?: string | null; checkIn: ISODate | null; checkOut: ISODate | null; guests: number; arrange?: string | null };
  hotelHref: string;
  channel: BookingChannel;
  confirmPath: string;
  /** M7: a preview token renders the hotel's draft form (the final booking is switched off). */
  preview?: string | null;
  /** In a preview, the Form Builder can show the form of another channel. */
  formChannel?: BookingChannel;
}) {
  // M7: the hotel's own booking form for this channel; the built-in one against an older API.
  const raw = await api.bookingForm(hotel.slug, formChannel ?? channel, preview).catch(() => null);
  const form = raw ? normaliseForm(raw, formChannel ?? channel) : builtInForm(channel);
  // M8: services the concierge takes while booking (null without the concierge).
  const concierge = await api.concierge(hotel.slug, "BOOKING_FLOW").catch(() => null);
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
            groupName: hotel.group?.name ?? null,
          }}
          site={{ channel, confirmPath, hotelHref, devMode: process.env.NODE_ENV !== "production", appName: hidesPlatform(hotel.whiteLabel) ? null : APP_NAME }}
          today={today}
          initial={initial}
          form={form}
          preview={preview && form.preview ? preview : null}
          concierge={concierge}
        />
      </div>
    </div>
  );
}
