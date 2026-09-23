import { Bed, Ruler, UsersThree } from "@phosphor-icons/react/ssr";
import type { RoomTypePublic } from "@/lib/types";
import { AmenityIcon } from "../ui/amenity";
import { Plate } from "../ui/plate";
import { RoomOffer } from "./stay-context";

export function RoomList({ rooms }: { rooms: RoomTypePublic[] }) {
  if (!rooms.length)
    return <p className="border-y border-line py-10 text-ink-muted">This hotel has not published its rooms yet. Call the front desk for rates.</p>;
  const sorted = [...rooms].sort((a, b) => a.basePriceKobo - b.basePriceKobo);
  return (
    <ol className="divide-y divide-line border-y border-line">
      {sorted.map((r, i) => (
        <RoomRow key={r.id} room={r} n={i + 1} />
      ))}
    </ol>
  );
}

function RoomRow({ room, n }: { room: RoomTypePublic; n: number }) {
  return (
    <li className="grid gap-5 py-7 sm:grid-cols-[11rem_1fr] lg:grid-cols-[12rem_1fr_auto] lg:gap-7">
      <Plate
        src={room.images[0]?.url}
        alt={room.images[0]?.alt ?? room.name}
        label={room.name}
        sizes="(min-width: 640px) 12rem, 100vw"
        className="aspect-[4/3] rounded-sm"
      />
      <div className="min-w-0">
        <p className="kicker">
          <span className="text-laterite">Room type {String(n).padStart(2, "0")}</span>
        </p>
        <h3 className="display-sm mt-1.5 text-[1.6rem]">{room.name}</h3>
        {room.description ? <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-ink-muted">{room.description}</p> : null}
        <ul className="num mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-ink/85">
          <li className="flex items-center gap-1.5">
            <UsersThree size={16} weight="light" aria-hidden /> Sleeps {room.capacity}
          </li>
          {room.bedType ? (
            <li className="flex items-center gap-1.5">
              <Bed size={16} weight="light" aria-hidden /> {room.bedType}
            </li>
          ) : null}
          {room.sizeSqm ? (
            <li className="flex items-center gap-1.5">
              <Ruler size={16} weight="light" aria-hidden /> {room.sizeSqm} m&sup2;
            </li>
          ) : null}
        </ul>
        {room.amenities.length ? (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={`${room.name} amenities`}>
            {room.amenities.slice(0, 6).map((a) => (
              <li key={a} className="inline-flex items-center gap-1.5 rounded-xs border border-line px-2 py-1 text-xs text-ink-muted">
                <AmenityIcon label={a} size={13} /> {a}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex flex-col gap-4 border-t border-line pt-4 sm:col-span-2 sm:flex-row sm:items-end sm:justify-between lg:col-span-1 lg:w-52 lg:flex-col lg:items-end lg:justify-between lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
        <RoomOffer roomId={room.id} name={room.name} basePriceKobo={room.basePriceKobo} hourlyPriceKobo={room.hourlyPriceKobo} />
      </div>
    </li>
  );
}
