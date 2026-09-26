/**
 * M8: "Arrange something for your stay" on the hotel's home, in each template's own manner. Server
 * rendered with no client code, so the Essentials home can still go out without scripts; each
 * service links to its own page where the request is made.
 */
import {
  ArrowRight,
  BellSimple,
  Briefcase,
  Cake,
  Camera,
  Car,
  Compass,
  Confetti,
  ForkKnife,
  FlowerLotus,
  Baby,
  LockSimple,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  TShirt,
  Wine,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { byCategory, CATEGORY_NAME, durationLine, LOCATION_LINE, priceLine, type ConciergeCatalogue, type ConciergeCategory, type ConciergeService } from "@/lib/concierge";
import { slugify } from "@/lib/format";
import type { TemplateId } from "@/lib/theme/types";
import { Plate } from "../ui/plate";

export const CATEGORY_ICON: Record<ConciergeCategory, Icon> = {
  WELLNESS: FlowerLotus,
  DINING: ForkKnife,
  ROMANCE_AND_CELEBRATION: Cake,
  GROOMING: Scissors,
  TRANSPORT: Car,
  SECURITY: ShieldCheck,
  TOURS_AND_EXPERIENCES: Compass,
  FAMILY: Baby,
  SHOPPING: ShoppingBag,
  PHOTOGRAPHY: Camera,
  EVENTS: Confetti,
  NIGHTLIFE_RESERVATIONS: Wine,
  BUSINESS: Briefcase,
  LAUNDRY_EXPRESS: TShirt,
  OTHER: BellSimple,
};

export const categoryAnchor = (c: ConciergeCategory) => `c-${slugify(CATEGORY_NAME[c])}`;

/** The section's intro, in the hotel's words when it wrote some (the section's text, else its concierge welcome line). */
export const conciergeIntro = (catalogue: ConciergeCatalogue, hotelName: string, body: string | null) =>
  body ??
  catalogue.intro ??
  `Tell us what would make the stay, and the concierge at ${hotelName} will arrange it: priced before anything is booked, charged only when it is confirmed.`;

const PRIVATE_LINE = "Some requests can be kept private. Only the concierge team sees them.";

/** A few services to show on the home page, one of each category first. */
function featured(services: ConciergeService[], n: number) {
  const firsts = byCategory(services).map((g) => g.services[0]);
  const rest = services.filter((s) => !firsts.includes(s));
  return [...firsts, ...rest].slice(0, n);
}

function meta(s: ConciergeService) {
  return [durationLine(s.durationMinutes), LOCATION_LINE[s.location]].filter(Boolean).join(" · ");
}

export function ConciergeShowcase({
  catalogue: cat,
  base,
  hotelName,
  look,
  body,
}: {
  catalogue: ConciergeCatalogue | null;
  base: string;
  hotelName: string;
  look: TemplateId;
  body: string | null;
}) {
  if (!cat || !cat.services.length) return null;
  const href = `${base}/concierge`;
  const link = (s: ConciergeService) => `${base}/concierge/${encodeURIComponent(s.id)}`;
  const groups = byCategory(cat.services);
  const anyPrivate = cat.services.some((s) => s.discreetEligible);
  const intro = conciergeIntro(cat, hotelName, body);
  const total = cat.services.length;

  const categoryLinks = (className: string, chip: string) => (
    <ul className={className} aria-label="Browse by kind">
      {groups.map((g) => {
        const I = CATEGORY_ICON[g.category];
        return (
          <li key={g.category}>
            <a href={`${href}#${categoryAnchor(g.category)}`} className={chip}>
              <I size={16} weight="light" aria-hidden className="shrink-0 text-laterite" />
              {CATEGORY_NAME[g.category]}
            </a>
          </li>
        );
      })}
    </ul>
  );

  const privateNote = (className = "") =>
    anyPrivate ? (
      <p className={`flex items-start gap-2 text-sm text-ink-muted ${className}`}>
        <LockSimple size={15} weight="light" aria-hidden className="mt-0.5 shrink-0" />
        {PRIVATE_LINE}
      </p>
    ) : null;

  switch (look) {
    case "essentials":
      return (
        <div data-testid="concierge-showcase">
          <p className="text-[0.9375rem] leading-relaxed text-ink-muted">{intro}</p>
          <ul className="mt-4 divide-y divide-line rounded-md border border-line bg-surface">
            {featured(cat.services, 6).map((s) => (
              <li key={s.id}>
                <a href={link(s)} className="flex min-h-14 items-center justify-between gap-3 px-3.5 py-3">
                  <span className="min-w-0">
                    <span className="block font-semibold">{s.name}</span>
                    <span className="block text-[0.8125rem] text-ink-muted">{CATEGORY_NAME[s.category]}</span>
                  </span>
                  <span className="shrink-0 text-right text-[0.9375rem] font-semibold">{priceLine(s)}</span>
                </a>
              </li>
            ))}
          </ul>
          <a href={href} className="lite-btn lite-btn-outline mt-3 w-full" data-testid="concierge-all">
            All {total} services <ArrowRight size={16} aria-hidden />
          </a>
          {anyPrivate ? <p className="mt-3 text-[0.8125rem] text-ink-muted">{PRIVATE_LINE}</p> : null}
        </div>
      );

    case "business":
      return (
        <div data-testid="concierge-showcase">
          <p className="max-w-[65ch] text-[0.9375rem] leading-relaxed text-ink-muted">{intro}</p>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                <th scope="col" className="py-2 font-medium">Service</th>
                <th scope="col" className="py-2 font-medium max-sm:hidden">Time</th>
                <th scope="col" className="py-2 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {featured(cat.services, 8).map((s) => {
                const I = CATEGORY_ICON[s.category];
                return (
                  <tr key={s.id} className="border-t border-line">
                    <td className="py-2.5">
                      <a href={link(s)} className="inline-flex items-center gap-2 hover:text-laterite">
                        <I size={15} className="shrink-0 text-laterite" aria-hidden /> {s.name}
                      </a>
                      <span className="block pl-6 text-[12.5px] text-ink-muted">{CATEGORY_NAME[s.category]}</span>
                    </td>
                    <td className="num py-2.5 text-ink-muted max-sm:hidden">{durationLine(s.durationMinutes) ?? "As needed"}</td>
                    <td className="num py-2.5 text-right">{priceLine(s)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <a href={href} className="btn btn-outline !min-h-9 !rounded-none text-sm" data-testid="concierge-all">
              All {total} services <ArrowRight size={14} aria-hidden />
            </a>
            {privateNote()}
          </div>
        </div>
      );

    case "resort":
      return (
        <div data-testid="concierge-showcase">
          <p className="mx-auto mt-5 max-w-xl text-center text-lg text-ink-muted">{intro}</p>
          {categoryLinks("mt-8 flex flex-wrap justify-center gap-2", "inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm hover:border-ink-muted")}
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured(cat.services, 6).map((s) => (
              <li key={s.id} className="group overflow-hidden rounded-[22px] border border-line bg-surface">
                <a href={link(s)} className="block">
                  {s.imageUrl ? (
                    <Plate src={s.imageUrl} alt={s.name} label={CATEGORY_NAME[s.category]} sizes="(min-width: 1024px) 30vw, 100vw" className="aspect-[16/10]" />
                  ) : (
                    <ResortGlyph category={s.category} />
                  )}
                  <div className="p-5">
                    <p className="display-sm text-xl group-hover:text-laterite">{s.name}</p>
                    {s.description ? <p className="mt-2 line-clamp-2 text-[0.9375rem] leading-relaxed text-ink-muted">{s.description}</p> : null}
                    <p className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
                      <span className="num rounded-full bg-surface-2 px-3 py-1">{priceLine(s)}</span>
                      {durationLine(s.durationMinutes) ? <span className="rounded-full bg-surface-2 px-3 py-1">{durationLine(s.durationMinutes)}</span> : null}
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col items-center gap-4">
            <a href={href} className="btn btn-primary rounded-full" data-testid="concierge-all">
              See all {total} <ArrowRight size={16} aria-hidden />
            </a>
            {privateNote("justify-center text-center")}
          </div>
        </div>
      );

    case "heritage":
      return (
        <div className="text-center" data-testid="concierge-showcase">
          <p className="mx-auto max-w-2xl text-[1.0625rem] leading-[1.8]">{intro}</p>
          <ul className="mx-auto mt-8 max-w-xl text-left">
            {featured(cat.services, 8).map((s) => (
              <li key={s.id}>
                <a href={link(s)} className="group flex items-baseline gap-3 py-2">
                  <span className="heritage-caps text-[13px] group-hover:text-laterite">{s.name}</span>
                  <span aria-hidden className="leader" />
                  <span className="num shrink-0 font-display italic text-ink-muted">{priceLine(s)}</span>
                </a>
              </li>
            ))}
          </ul>
          <a href={href} className="heritage-caps mt-8 inline-flex items-center gap-2 border-b border-laterite pb-1 text-[12px] text-laterite" data-testid="concierge-all">
            The full list of {total} services
          </a>
          {privateNote("mx-auto mt-5 max-w-md justify-center")}
        </div>
      );

    case "boutique":
      return (
        <div data-testid="concierge-showcase">
          <p className="max-w-xl text-[1.0625rem] leading-relaxed text-ink-muted">{intro}</p>
          <ul className="mt-12 grid border-t border-line sm:grid-cols-2 sm:gap-x-16">
            {featured(cat.services, 6).map((s) => (
              <li key={s.id} className="border-b border-line">
                <a href={link(s)} className="group flex items-baseline justify-between gap-6 py-6">
                  <span>
                    <span className="display-md block text-[1.6rem] leading-tight group-hover:text-laterite">{s.name}</span>
                    <span className="boutique-kicker mt-2 block">{CATEGORY_NAME[s.category]}</span>
                  </span>
                  <span className="num shrink-0 text-sm text-ink-muted">{priceLine(s)}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <a href={href} className="boutique-reserve inline-flex items-center gap-3 border border-ink px-6 py-3 text-[0.75rem] uppercase tracking-[0.2em]" data-testid="concierge-all">
              All {total} services <ArrowRight size={14} aria-hidden />
            </a>
            {privateNote()}
          </div>
        </div>
      );

    default:
      // Editorial: a numbered ledger with dotted leaders, the categories as an index above it.
      return (
        <div data-testid="concierge-showcase">
          <p className="prose-body max-w-[62ch]">{intro}</p>
          {categoryLinks("mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm", "inline-flex items-center gap-1.5 text-ink-muted hover:text-ink")}
          <ol className="mt-6 divide-y divide-line border-y border-line">
            {featured(cat.services, 6).map((s, i) => (
              <li key={s.id}>
                <a href={link(s)} className="group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-3 py-4">
                  <span className="font-display italic text-laterite">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">
                    <span className="font-medium group-hover:text-laterite">{s.name}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{meta(s) || CATEGORY_NAME[s.category]}</span>
                  </span>
                  <span className="num text-sm">{priceLine(s)}</span>
                </a>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <a href={href} className="link-static inline-flex items-center gap-2 text-sm font-medium" data-testid="concierge-all">
              Everything we can arrange ({total}) <ArrowRight size={14} aria-hidden />
            </a>
            {privateNote()}
          </div>
        </div>
      );
  }
}

/** Resort without a photograph: the kind's mark on a soft tinted field, rounded like the rest of the template. */
export function ResortGlyph({ category }: { category: ConciergeCategory }) {
  const I = CATEGORY_ICON[category];
  return (
    <div aria-hidden className="relative flex h-28 items-end overflow-hidden bg-surface-2/70 px-5 pb-4">
      <span aria-hidden className="adire-field absolute inset-0 text-laterite opacity-[0.07]" />
      <span className="relative grid size-12 place-items-center rounded-full bg-paper text-laterite shadow-[0_1px_0_var(--line)]">
        <I size={24} weight="light" />
      </span>
    </div>
  );
}
