import Link from "next/link";
import type { City, HotelCard } from "@/lib/types";
import { formatNaira } from "@/lib/format";

const TILTS = ["-rotate-[0.7deg]", "rotate-[0.5deg]", "-rotate-[0.35deg]", "rotate-[0.6deg]", "-rotate-[0.5deg]", "rotate-[0.35deg]"];

function stateLabel(state: string) {
  return /state|fct|territory/i.test(state) ? state : `${state} State`;
}

/**
 * The cities, set as library catalogue cards: a red head rule, faint blue ruled lines,
 * a punched hole, and the entry typed in mono. The count is stamped in the corner.
 */
export function CityIndex({ cities, hotels }: { cities: City[]; hotels: HotelCard[] }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 pt-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-x-6 sm:gap-y-7 sm:overflow-visible sm:p-0 lg:grid-cols-3">
      {cities.map((c, i) => {
        const inCity = hotels.filter((h) => h.city === c.name);
        const areas = [...new Set(inCity.map((h) => h.area))].slice(0, 3);
        const from = inCity.reduce<number | null>(
          (m, h) => (h.startingRateKobo && (m === null || h.startingRateKobo < m) ? h.startingRateKobo : m),
          null,
        );
        return (
          <li key={c.name} className="w-[84%] shrink-0 snap-center sm:w-auto">
            <Link
              href={`/stays?city=${encodeURIComponent(c.name)}`}
              aria-label={`${c.name}, ${stateLabel(c.state)}: ${c.hotelCount} ${c.hotelCount === 1 ? "hotel" : "hotels"}`}
              className={`group relative block overflow-hidden rounded-xs border border-line-strong bg-surface px-6 pb-12 pt-5 transition-[transform,box-shadow] duration-300 ease-out hover:rotate-0 hover:shadow-[var(--shadow-float)] motion-reduce:rotate-0 ${TILTS[i % TILTS.length]}`}
            >
              {/* ruled lines below the head rule */}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 top-[7.1rem]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, transparent 0 calc(1.75rem - 1px), color-mix(in oklab, var(--adire) 20%, transparent) calc(1.75rem - 1px) 1.75rem)",
                }}
              />
              <span aria-hidden className="absolute inset-x-0 top-[7.05rem] h-px bg-laterite/60" />
              <span aria-hidden className="absolute bottom-0 left-[5.2rem] top-[7.05rem] w-px bg-laterite/25" />
              {/* punched hole */}
              <span
                aria-hidden
                className="absolute bottom-3.5 left-1/2 size-4 -translate-x-1/2 rounded-full border border-line-strong bg-paper shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)]"
              />

              <div className="relative flex h-[5.85rem] items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="num text-[11px] tracking-[0.14em] text-ink-muted">No. {String(i + 1).padStart(2, "0")}</p>
                  <h3 className="display-md mt-1.5 truncate text-[2.35rem] leading-none transition-colors duration-200 group-hover:text-laterite">
                    {c.name}
                  </h3>
                  <p className="num mt-1.5 text-[11px] uppercase tracking-[0.14em] text-ink-muted">{stateLabel(c.state)}</p>
                </div>
                <span
                  aria-hidden
                  className="num mt-1 shrink-0 rotate-[-8deg] rounded-sm border-[1.5px] border-laterite/70 px-2.5 py-1.5 text-center text-[10px] uppercase leading-tight tracking-[0.14em] text-laterite transition-transform duration-300 group-hover:rotate-[-3deg]"
                >
                  <span className="block text-xl leading-none tracking-normal">{String(c.hotelCount).padStart(2, "0")}</span>
                  {c.hotelCount === 1 ? "stay" : "stays"}
                </span>
              </div>
              <dl className="num relative mt-0 text-[12.5px] leading-[1.75rem] text-ink/85">
                <div className="flex gap-3">
                  <dt className="w-[3.4rem] shrink-0 text-ink-muted">Areas</dt>
                  <dd className="truncate">{areas.length ? areas.join(", ") : "Opening soon"}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-[3.4rem] shrink-0 text-ink-muted">From</dt>
                  <dd>{from ? `${formatNaira(from)} a night` : "—"}</dd>
                </div>
              </dl>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
