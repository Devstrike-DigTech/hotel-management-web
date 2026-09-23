import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import type { HotelCard as Hotel } from "@/lib/types";
import { placeName } from "@/lib/format";
import { AmenityIcon } from "../ui/amenity";
import { Money } from "../ui/money";
import { Plate } from "../ui/plate";
import { Rating } from "./rating";

interface Props {
  hotel: Hotel;
  plate?: number;
  size?: "lg" | "md";
  priority?: boolean;
  /** Query string (dates, guests) to carry through to the hotel page. */
  query?: string;
  /** Override the plate's aspect-ratio classes. */
  aspect?: string;
}

/** Editorial card: plate, caption, name, one line of voice, the price in mono. */
export function HotelCard({ hotel, plate, size = "md", priority, query = "", aspect }: Props) {
  const href = `/stays/${hotel.slug}${query}`;
  return (
    <article className="group relative flex flex-col">
      <div className="relative">
        <Plate
          src={hotel.coverImageUrl}
          alt={`${hotel.name}, ${hotel.area}`}
          label={`${hotel.area}, ${hotel.city}`}
          sizes={size === "lg" ? "(min-width: 1024px) 55vw, 100vw" : "(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"}
          priority={priority}
          className={`rounded-sm ${aspect ?? (size === "lg" ? "aspect-[4/3] lg:aspect-[5/4]" : "aspect-[4/3]")}`}
          imgClassName="group-hover:scale-[1.025]"
        />
        {hotel.featured ? (
          <span className="kicker absolute left-3 top-3 rounded-xs bg-paper/92 px-2 py-1 !text-[10px] !text-ink">Featured</span>
        ) : null}
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="kicker flex items-center gap-2">
            {plate !== undefined ? <span className="text-laterite">Pl. {String(plate).padStart(2, "0")}</span> : null}
            <span className="truncate">
              {hotel.area} &middot; {hotel.city}
            </span>
          </p>
          <h3 className={`mt-2 ${size === "lg" ? "display-md text-3xl sm:text-4xl" : "display-sm text-2xl"}`}>
            <Link href={href} className="after:absolute after:inset-0 after:content-['']">
              {hotel.name}
            </Link>
          </h3>
          <p className="mt-1.5 line-clamp-2 font-display text-[1.02rem] italic leading-snug text-ink-muted">{hotel.tagline}</p>
        </div>
        <ArrowUpRight
          size={20}
          weight="light"
          aria-hidden
          className="mt-6 shrink-0 text-ink-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-laterite"
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <Rating rating={hotel.rating} reviewCount={hotel.reviewCount} compact />
        {hotel.startingRateKobo ? (
          <p className="text-sm text-ink-muted">
            from <Money kobo={hotel.startingRateKobo} className="text-[0.95rem] font-medium text-ink" />
          </p>
        ) : null}
      </div>
    </article>
  );
}

/** Horizontal listing for search results, like an entry in a guidebook. */
export function HotelRow({ hotel, query = "", index }: { hotel: Hotel; query?: string; index: number }) {
  const href = `/stays/${hotel.slug}${query}`;
  return (
    <article className="group relative grid gap-5 py-7 sm:grid-cols-[minmax(0,15rem)_1fr] md:grid-cols-[minmax(0,19rem)_1fr_auto] md:gap-8">
      <Plate
        src={hotel.coverImageUrl}
        alt={`${hotel.name}, ${hotel.area}`}
        label={`${hotel.area}, ${hotel.city}`}
        sizes="(min-width: 768px) 19rem, (min-width: 640px) 15rem, 100vw"
        priority={index < 2}
        className="aspect-[4/3] rounded-sm"
        imgClassName="group-hover:scale-[1.025]"
      />
      <div className="min-w-0">
        <p className="kicker flex items-center gap-2">
          <span className="text-laterite">{String(index + 1).padStart(2, "0")}</span>
          <span className="truncate">
            {hotel.area} &middot; {placeName(hotel.city, hotel.state)}
          </span>
        </p>
        <h2 className="display-sm mt-2 text-[1.75rem]">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] group-hover:text-laterite">
            {hotel.name}
          </Link>
        </h2>
        <p className="mt-1 font-display text-[1.05rem] italic text-ink-muted">{hotel.tagline}</p>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2" aria-label="Amenities">
          {hotel.amenities.slice(0, 6).map((a) => (
            <li key={a} className="flex items-center gap-1.5 text-[0.8125rem] text-ink-muted">
              <AmenityIcon label={a} size={16} className="text-ink" />
              {a}
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Rating rating={hotel.rating} reviewCount={hotel.reviewCount} />
        </div>
      </div>
      <div className="flex items-end justify-between gap-4 border-t border-line pt-4 md:w-48 md:flex-col md:items-end md:justify-between md:border-l md:border-t-0 md:pl-8 md:pt-0">
        {hotel.searchAvailability ? (
          <div className="md:text-right" data-testid="result-price">
            <p className="kicker">
              {hotel.searchAvailability.nights} {hotel.searchAvailability.nights === 1 ? "night" : "nights"}, all in, from
            </p>
            <Money kobo={hotel.searchAvailability.cheapestTotalKobo} className="mt-1 block text-2xl font-medium text-ink" />
            <p className="mt-0.5 text-xs text-ink-muted">
              <Money kobo={hotel.searchAvailability.cheapestRateKobo} /> a night{hotel.searchAvailability.nights > 1 ? " on average" : ""}, before taxes
            </p>
            <p className="kicker mt-2.5 inline-flex items-center gap-1.5 !text-palm">
              <span aria-hidden className="size-1.5 rounded-full bg-palm" />
              {hotel.searchAvailability.availableRoomTypes} {hotel.searchAvailability.availableRoomTypes === 1 ? "room type" : "room types"} free
            </p>
          </div>
        ) : (
          <div className="md:text-right">
            <p className="kicker">From, per night</p>
            <Money kobo={hotel.startingRateKobo} className="mt-1 block text-2xl font-medium text-ink" />
            <p className="mt-0.5 text-xs text-ink-muted">before taxes</p>
          </div>
        )}
        <div className="flex flex-col items-end gap-2">
          {hotel.freeCancellationHours ? (
            <p className="hidden text-right text-xs text-ink-muted md:block">Free cancellation up to {hotel.freeCancellationHours} h before</p>
          ) : null}
          <span className="btn btn-outline pointer-events-none !min-h-10 text-sm group-hover:border-ink">
            {hotel.searchAvailability ? "Choose a room" : "See rooms"} <ArrowUpRight size={15} aria-hidden />
          </span>
        </div>
      </div>
    </article>
  );
}
