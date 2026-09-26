/**
 * M8: the concierge's own pages on a hotel's site. The catalogue (every live service, by kind) is
 * server-rendered with no client code, so on an Essentials site the proxy can send it without the
 * framework's scripts like the home page. A service's page tells what it is and how to ask for it;
 * only its "Arrange" panel is interactive.
 */
import { ArrowLeft, ArrowRight, Clock, LockSimple, MapPin, Timer } from "@phosphor-icons/react/ssr";
import {
  byCategory,
  CATEGORY_LINE,
  clock12,
  serviceDuration,
  LOCATION_LINE,
  priceLine,
  PRIVACY_NOTE,
  type ConciergeCatalogue,
  type ConciergeService,
} from "@/lib/concierge";
import { formatNaira, roman } from "@/lib/format";
import type { TemplateId } from "@/lib/theme/types";
import { ArrangePanel } from "../concierge/arrange-panel";
import { Plate } from "../ui/plate";
import { CATEGORY_ICON, categoryAnchor, ResortGlyph } from "./concierge";
import { OrnamentRule } from "./ornaments";

interface PageProps {
  hotelName: string;
  slug: string;
  base: string;
  look: TemplateId;
  catalogue: ConciergeCatalogue;
}

const WEEKDAY = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "Every day, 9:00 am to 9:00 pm" / "Mon to Fri, 8:00 am to 6:00 pm" / "Any time". */
export function hoursLine(s: ConciergeService): string {
  const a = s.availability;
  const days = !a.days.length ? "Every day" : a.days.length === 5 && a.days.every((d) => d <= 5) ? "Mon to Fri" : a.days.map((d) => WEEKDAY[d]).join(", ");
  if (!a.from || !a.to) return a.days.length ? days : "Any time";
  return `${days}, ${clock12(a.from)} to ${clock12(a.to)}`;
}

function Heading({ look, hotelName, intro }: { look: TemplateId; hotelName: string; intro: string }) {
  switch (look) {
    case "heritage":
      return (
        <header className="text-center">
          <p className="heritage-kicker">{hotelName}</p>
          <h1 className="heritage-display mx-auto mt-5 max-w-3xl text-[clamp(2rem,5vw,3.6rem)]">At Your Service</h1>
          <OrnamentRule className="mt-7" />
          <p className="mx-auto mt-7 max-w-2xl text-[1.0625rem] leading-[1.8]">{intro}</p>
        </header>
      );
    case "boutique":
      return (
        <header className="max-w-3xl">
          <p className="boutique-kicker">{hotelName} · The concierge</p>
          <h1 className="display mt-5 text-[clamp(2.8rem,7vw,5.6rem)]">Arranged for you</h1>
          <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-ink-muted">{intro}</p>
        </header>
      );
    case "business":
      return (
        <header className="max-w-3xl border-b border-ink pb-5">
          <p className="kicker">{hotelName}</p>
          <h1 className="mt-2 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-medium tracking-[-0.03em]">Concierge services</h1>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-muted">{intro}</p>
        </header>
      );
    case "resort":
      return (
        <header className="mx-auto max-w-2xl text-center">
          <p className="resort-kicker">The concierge</p>
          <h1 className="display-md mt-3 text-[clamp(2.4rem,5.5vw,4rem)]">Anything we can arrange</h1>
          <p className="mt-5 text-lg text-ink-muted">{intro}</p>
        </header>
      );
    case "essentials":
      return (
        <header className="pt-6">
          <h1 className="text-[1.75rem] font-bold leading-[1.1] tracking-[-0.02em]">Arrange something for your stay</h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">{intro}</p>
        </header>
      );
    default:
      return (
        <header className="max-w-3xl">
          <span aria-hidden className="adire-rule mb-6 max-w-[10rem] text-laterite/60" />
          <p className="kicker">{hotelName} · The concierge</p>
          <h1 className="display-md mt-4 text-[clamp(2.4rem,6vw,4.6rem)]">
            Arrange something <em className="accent">for your stay</em>
          </h1>
          <p className="prose-body mt-5 max-w-[60ch]">{intro}</p>
        </header>
      );
  }
}

function CategoryHead({ look, n, id, label, line }: { look: TemplateId; n: number; id: string; label: string; line: string }) {
  switch (look) {
    case "heritage":
      return (
        <header className="text-center">
          <p className="heritage-numeral">{roman(n)}</p>
          <h2 id={id} className="heritage-title mt-2 text-[clamp(1.3rem,2.4vw,1.7rem)]">
            {label}
          </h2>
          <p className="mx-auto mt-2 max-w-xl font-display italic text-ink-muted">{line}</p>
        </header>
      );
    case "boutique":
      return (
        <header>
          <p className="boutique-kicker">{String(n).padStart(2, "0")}</p>
          <h2 id={id} className="display-md mt-3 text-[clamp(1.8rem,3.4vw,2.6rem)]">
            {label}
          </h2>
          <p className="mt-2 max-w-xl text-ink-muted">{line}</p>
        </header>
      );
    case "business":
      return (
        <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
          <h2 id={id} className="font-display text-[1.25rem] font-medium tracking-[-0.015em]">
            {label}
          </h2>
          <span className="text-[12px] text-ink-muted">{line}</span>
        </div>
      );
    case "resort":
      return (
        <header>
          <h2 id={id} className="display-sm text-[1.8rem]">
            {label}
          </h2>
          <p className="mt-1 text-ink-muted">{line}</p>
        </header>
      );
    case "essentials":
      return (
        <h2 id={id} className="lite-h2">
          {label}
        </h2>
      );
    default:
      return (
        <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-3">
          <h2 id={id} className="display-sm flex items-baseline gap-3 text-[1.7rem]">
            <span className="num text-xs text-laterite">{String(n).padStart(2, "0")}</span>
            {label}
          </h2>
          <span className="kicker max-sm:hidden">{line}</span>
        </div>
      );
  }
}

function ServiceItem({ s, href, look }: { s: ConciergeService; href: string; look: TemplateId }) {
  const meta = [serviceDuration(s), LOCATION_LINE[s.location]].filter(Boolean).join(" · ");
  const lock = s.discreetEligible ? <LockSimple size={13} className="text-ink-muted" aria-label="Can be kept private" /> : null;
  switch (look) {
    case "resort":
      return (
        <li className="group overflow-hidden rounded-[22px] border border-line bg-surface">
          <a href={href} className="block" data-testid="catalogue-service">
            {s.imageUrl ? <Plate src={s.imageUrl} alt={s.name} label={s.categoryLabel} sizes="(min-width: 1024px) 30vw, 100vw" className="aspect-[16/10]" /> : <ResortGlyph category={s.category} />}
            <div className="p-5">
              <p className="display-sm flex items-center gap-2 text-xl group-hover:text-laterite">
                {s.name} {lock}
              </p>
              {s.description ? <p className="mt-2 line-clamp-3 text-[0.9375rem] leading-relaxed text-ink-muted">{s.description}</p> : null}
              <p className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
                <span className="num rounded-full bg-surface-2 px-3 py-1">{priceLine(s)}</span>
                {meta ? <span className="rounded-full bg-surface-2 px-3 py-1">{meta}</span> : null}
              </p>
            </div>
          </a>
        </li>
      );
    case "heritage":
      return (
        <li>
          <a href={href} className="group block py-3" data-testid="catalogue-service">
            <span className="flex items-baseline gap-3">
              <span className="heritage-caps text-[13px] group-hover:text-laterite">{s.name}</span>
              <span aria-hidden className="leader" />
              <span className="num shrink-0 font-display italic text-ink-muted">{priceLine(s)}</span>
            </span>
            {s.description ? <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{s.description}</span> : null}
          </a>
        </li>
      );
    case "business":
      return (
        <li className="border-b border-line last:border-b-0">
          <a href={href} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-0.5 py-2.5 text-sm hover:text-laterite" data-testid="catalogue-service">
            <span className="inline-flex items-center gap-2 font-medium">
              {s.name} {lock}
            </span>
            <span className="num">{priceLine(s)}</span>
            <span className="text-[12.5px] text-ink-muted">{meta}</span>
          </a>
        </li>
      );
    case "essentials":
      return (
        <li>
          <a href={href} className="flex min-h-14 items-center justify-between gap-3 px-3.5 py-3" data-testid="catalogue-service">
            <span className="min-w-0">
              <span className="block font-semibold">{s.name}</span>
              {meta ? <span className="block text-[0.8125rem] text-ink-muted">{meta}</span> : null}
            </span>
            <span className="shrink-0 text-right text-[0.9375rem] font-semibold">{priceLine(s)}</span>
          </a>
        </li>
      );
    case "boutique":
      return (
        <li className="border-b border-line">
          <a href={href} className="group grid gap-2 py-7 sm:grid-cols-[1fr_auto] sm:gap-10" data-testid="catalogue-service">
            <span>
              <span className="display-md flex items-center gap-2 text-[1.5rem] leading-tight group-hover:text-laterite">
                {s.name} {lock}
              </span>
              {s.description ? <span className="mt-2 block max-w-xl leading-relaxed text-ink-muted">{s.description}</span> : null}
            </span>
            <span className="num text-sm text-ink-muted sm:text-right">
              {priceLine(s)}
              {meta ? <span className="boutique-kicker mt-2 block">{meta}</span> : null}
            </span>
          </a>
        </li>
      );
    default:
      return (
        <li>
          <a href={href} className="group grid grid-cols-[1fr_auto] items-baseline gap-4 py-4" data-testid="catalogue-service">
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-medium group-hover:text-laterite">
                {s.name} {lock}
              </span>
              {s.description ? <span className="mt-1 block text-sm leading-relaxed text-ink-muted">{s.description}</span> : null}
              {meta ? <span className="mt-1.5 block text-xs text-ink-muted">{meta}</span> : null}
            </span>
            <span className="num text-sm">{priceLine(s)}</span>
          </a>
        </li>
      );
  }
}

const listClass: Record<TemplateId, string> = {
  editorial: "mt-2 divide-y divide-line",
  boutique: "mt-6 border-t border-line",
  business: "mt-1",
  resort: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
  heritage: "mx-auto mt-6 max-w-2xl",
  essentials: "divide-y divide-line rounded-md border border-line bg-surface",
};

/** Every live service, by kind, with an index to jump between kinds. */
export function ConciergeCataloguePage({ hotelName, base, look, catalogue }: PageProps) {
  const groups = byCategory(catalogue.services);
  const intro =
    catalogue.intro ?? `Tell us what would make the stay, and we will arrange it: priced before anything is booked, charged only once it is confirmed.`;
  const lite = look === "essentials";
  const privateAny = catalogue.services.some((s) => s.discreetEligible);
  const index = groups.length > 1 && !lite && (
    <nav aria-label="Kinds of service" className={lite ? "mt-4" : look === "heritage" || look === "resort" ? "mt-10 flex justify-center" : "mt-10"}>
      <ul className={`flex flex-wrap gap-2 ${look === "heritage" || look === "resort" ? "justify-center" : ""}`}>
        {groups.map((g) => {
          const I = CATEGORY_ICON[g.category];
          return (
            <li key={g.category}>
              <a
                href={`#${categoryAnchor(g.category)}`}
                className={`inline-flex items-center gap-2 border border-line-strong bg-surface px-3.5 py-2 text-sm hover:border-ink-muted ${look === "resort" ? "rounded-full" : "rounded-sm"}`}
              >
                <I size={16} weight="light" aria-hidden className="text-laterite" />
                {g.services[0].categoryLabel}
                <span className="num text-xs text-ink-muted">{g.services.length}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <div className={lite ? "lite-page pb-12" : "container-page pb-20 pt-10 sm:pt-14"} data-template-page="concierge" data-testid="concierge-catalogue">
      {!lite ? (
        <a href={base || "/"} className="kicker mb-8 inline-flex items-center gap-1.5 hover:text-ink">
          <ArrowLeft size={12} aria-hidden /> {hotelName}
        </a>
      ) : null}
      <Heading look={look} hotelName={hotelName} intro={intro} />
      {privateAny ? (
        <p className={`mt-5 flex items-start gap-2 text-sm text-ink-muted ${look === "heritage" || look === "resort" ? "justify-center text-center" : ""}`}>
          <LockSimple size={15} weight="light" aria-hidden className="mt-0.5 shrink-0" />
          {catalogue.privacyNote || `Some requests can be kept private. ${PRIVACY_NOTE}`}
        </p>
      ) : null}
      {index}
      <div className={lite ? "" : look === "heritage" ? "mt-16 space-y-20" : look === "boutique" ? "mt-20 space-y-24" : "mt-14 space-y-14"}>
        {groups.map((g, i) => {
          const id = categoryAnchor(g.category);
          return (
            <section key={g.category} id={id} aria-labelledby={`${id}-title`} className={lite ? "lite-section" : "scroll-mt-28"} data-category={g.category}>
              <CategoryHead look={look} n={i + 1} id={`${id}-title`} label={g.services[0].categoryLabel} line={CATEGORY_LINE[g.category]} />
              <ul className={listClass[look]}>
                {g.services.map((s) => (
                  <ServiceItem key={s.id} s={s} href={`${base}/concierge/${encodeURIComponent(s.id)}`} look={look} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {catalogue.freeForm ? (
        <aside className={`${lite ? "lite-section" : "mt-16 rounded-md border border-dashed border-line-strong p-6 sm:p-8"} ${look === "heritage" ? "text-center" : ""}`}>
          <h2 className={lite ? "lite-h2" : "display-sm text-2xl"}>Not on the list?</h2>
          <p className={`mt-2 max-w-xl leading-relaxed text-ink-muted ${look === "heritage" ? "mx-auto" : ""}`}>
            Ask for something else from your booking, in your own words. A member of the concierge team reads it and comes back to you, usually with a price.
          </p>
        </aside>
      ) : null}
    </div>
  );
}

/** One service: what it is, what it costs, when it runs, and how to ask for it. */
export function ConciergeServicePage({
  slug,
  base,
  look,
  service: s,
  whiteLabel,
}: Omit<PageProps, "catalogue"> & { service: ConciergeService; whiteLabel: boolean }) {
  const I = CATEGORY_ICON[s.category];
  const facts: [React.ReactNode, string, string][] = [
    [<Timer key="t" size={18} weight="light" aria-hidden />, "How long", s.variants.length > 1 ? s.variants.map((v) => v.name).join(" or ") : (serviceDuration(s) ?? "As long as it takes")],
    [<MapPin key="m" size={18} weight="light" aria-hidden />, "Where", LOCATION_LINE[s.location]],
    [<Clock key="c" size={18} weight="light" aria-hidden />, "When", `${hoursLine(s)}${s.leadTimeHours ? `; ${s.leadTimeHours === 1 ? "an hour" : `${s.leadTimeHours} hours`} notice` : ""}`],
  ];
  const centred = look === "heritage";
  return (
    <div className={look === "essentials" ? "lite-page pb-12 pt-6" : "container-page pb-20 pt-10 sm:pt-14"} data-template-page="concierge-service" data-testid="concierge-service">
      <a href={`${base}/concierge`} className="kicker inline-flex items-center gap-1.5 hover:text-ink">
        <ArrowLeft size={12} aria-hidden /> All services
      </a>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-16">
        <div className={`min-w-0 ${centred ? "text-center" : ""}`}>
          <p className={`${look === "boutique" ? "boutique-kicker" : look === "heritage" ? "heritage-kicker" : look === "resort" ? "resort-kicker" : "kicker"} inline-flex items-center gap-2`}>
            <I size={15} aria-hidden /> {s.categoryLabel}
          </p>
          <h1
            className={
              look === "heritage"
                ? "heritage-display mt-4 text-[clamp(1.9rem,4.4vw,3.2rem)]"
                : look === "business"
                  ? "mt-3 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] font-medium tracking-[-0.03em]"
                  : look === "essentials"
                    ? "mt-2 text-[1.75rem] font-bold leading-[1.1]"
                    : "display-md mt-4 text-[clamp(2.2rem,5vw,3.8rem)]"
            }
          >
            {s.name}
          </h1>
          <p className="num mt-4 text-xl" data-testid="service-page-price">
            {priceLine(s)}
          </p>
          {s.imageUrl && look !== "essentials" ? (
            <Plate src={s.imageUrl} alt={s.name} label={s.categoryLabel} sizes="(min-width: 1024px) 50vw, 100vw" className="mt-8 aspect-[16/9] rounded-md" />
          ) : null}
          {s.description ? <p className={`mt-6 max-w-[60ch] text-[1.0625rem] leading-relaxed ${centred ? "mx-auto" : ""}`}>{s.description}</p> : null}
          {s.variants.length > 1 ? (
            <ul className={`mt-6 max-w-md divide-y divide-line border-y border-line ${centred ? "mx-auto text-left" : ""}`}>
              {s.variants.map((v) => (
                <li key={v.id} className="flex items-baseline gap-3 py-2.5">
                  <span>{v.name}</span>
                  <span aria-hidden className="leader" />
                  <span className="num">{s.pricing === "FROM" ? `From ${formatNaira(v.priceKobo)}` : formatNaira(v.priceKobo)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <dl className={`mt-8 grid gap-px overflow-hidden rounded-sm border border-line bg-line text-left sm:grid-cols-3`}>
            {facts.map(([icon, k, v]) => (
              <div key={k} className="bg-paper p-4">
                <dt className="kicker flex items-center gap-2 !text-[10px]">
                  <span className="text-laterite">{icon}</span> {k}
                </dt>
                <dd className="mt-1.5 text-sm">{v}</dd>
              </div>
            ))}
          </dl>
          <p className={`mt-6 max-w-xl text-sm leading-relaxed text-ink-muted ${centred ? "mx-auto" : ""}`}>
            {s.pricing === "FROM"
              ? "Every request is different, so the concierge sends you an exact price first. Nothing is booked or charged until you accept it."
              : s.pricing === "FREE"
                ? "Complimentary for guests. Confirmed as soon as the time is free."
                : "Priced up front and confirmed as soon as the time is free; pay online or add it to your bill."}
            {s.discreetEligible ? " You can ask for it privately: only the concierge team sees private requests, and your bill shows a neutral line." : ""}
          </p>
        </div>
        <aside aria-label="Arrange this" className="lg:pt-2">
          <div className="lg:sticky lg:top-28">
            <ArrangePanel
              slug={slug}
              serviceId={s.id}
              serviceName={s.name}
              base={base}
              bookHref={`${base}/book`}
              preArrival={s.preArrival}
              duringStay={s.duringStay}
              whiteLabel={whiteLabel}
            />
            <a href={`${base}/concierge`} className="mt-6 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
              Everything else we can arrange <ArrowRight size={14} aria-hidden />
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
