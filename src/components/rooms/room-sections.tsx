/**
 * The room page's server-rendered sections, each set in the template's own manner: the key facts,
 * the description, the grouped amenities, "Included with your stay" against "Add to your stay",
 * the policies and the similar rooms. Nothing here needs JavaScript in the browser.
 */
import { ArrowRight, ArrowUpRight, Bed, Check, Clock, Plus, Ruler, SignIn, SignOut, UsersThree } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { formatClock, formatNaira, roman } from "@/lib/format";
import { KIND_PLURAL } from "@/lib/pickup";
import { parseMarkdownLite, roomHref, type AmenityGroup, type Inline, type RoomDetail, type RoomFact, type SimilarRoom } from "@/lib/rooms";
import type { TemplateId } from "@/lib/theme/types";
import { CancellationTimeline, HouseRules } from "../site-templates/parts";
import { OrnamentRule } from "../site-templates/ornaments";
import { Plate } from "../ui/plate";
import { RoomIcon } from "./room-icon";

export type RoomLook = Exclude<TemplateId, "essentials"> | "marketplace";
const editorialish = (l: RoomLook) => l === "editorial" || l === "marketplace";

/* ------------------------------------------------------------------ section heading */

export function RoomSectionHead({ look, n, id, title, aside }: { look: RoomLook; n: number; id: string; title: string; aside?: string | null }) {
  switch (look) {
    case "boutique":
      return (
        <header className="mb-10">
          <p className="boutique-kicker">{String(n).padStart(2, "0")}</p>
          <h2 id={id} className="display-md mt-3 text-[clamp(1.9rem,3.4vw,2.7rem)]">
            {title}
          </h2>
        </header>
      );
    case "business":
      return (
        <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-ink pb-2">
          <h2 id={id} className="font-display text-[1.3rem] font-medium tracking-[-0.02em]">
            {title}
          </h2>
          {aside ? <span className="text-[12px] text-ink-muted">{aside}</span> : null}
        </div>
      );
    case "resort":
      return (
        <header className="mb-7">
          {aside ? <p className="resort-kicker">{aside}</p> : null}
          <h2 id={id} className="display-sm mt-2 text-[clamp(1.8rem,3vw,2.4rem)]">
            {title}
          </h2>
        </header>
      );
    case "heritage":
      return (
        <header className="mb-10 text-center">
          <OrnamentRule />
          <p className="heritage-numeral mt-4">{roman(n)}</p>
          <h2 id={id} className="heritage-title mt-2 text-[clamp(1.35rem,2.6vw,1.9rem)]">
            {title}
          </h2>
        </header>
      );
    default:
      return (
        <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-ink pb-3">
          <h2 id={id} className="display-sm flex items-baseline gap-3 text-[1.75rem]">
            <span className="num text-xs text-laterite">{String(n).padStart(2, "0")}</span>
            {title}
          </h2>
          {aside ? <span className="kicker">{aside}</span> : null}
        </div>
      );
  }
}

/* ------------------------------------------------------------------ key facts */

/** A fact's value under its own label: "2 adults + 1 child" under "Sleeps", not "Sleeps Sleeps...". */
export const underLabel = (f: RoomFact) => (f.value.toLowerCase().startsWith(`${f.label.toLowerCase()} `) ? f.value.slice(f.label.length + 1) : f.value);

export function FactsRow({ facts, look }: { facts: RoomFact[]; look: RoomLook }) {
  if (!facts.length) return null;
  switch (look) {
    case "boutique":
      return (
        <ul className="boutique-kicker flex flex-wrap gap-x-6 gap-y-2" data-testid="room-facts">
          {facts.map((f, i) => (
            <li key={f.key} className="flex items-center gap-6">
              {i ? <span aria-hidden className="h-3 w-px bg-line-strong" /> : null}
              <span>
                <span className="sr-only">{f.label}: </span>
                {f.value}
              </span>
            </li>
          ))}
        </ul>
      );
    case "business":
      return (
        <dl className="grid grid-cols-2 border-l border-t border-line text-[13px] sm:grid-cols-3 xl:grid-cols-5" data-testid="room-facts">
          {facts.map((f) => (
            <div key={f.key} className="border-b border-r border-line px-3 py-2.5">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                <RoomIcon name={f.icon} label={f.value} size={14} /> {f.label}
              </dt>
              <dd className="num mt-1 font-medium">{underLabel(f)}</dd>
            </div>
          ))}
        </dl>
      );
    case "resort":
      return (
        <ul className="flex flex-wrap gap-2" data-testid="room-facts">
          {facts.map((f) => (
            <li key={f.key} className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm">
              <RoomIcon name={f.icon} label={f.value} size={17} className="text-laterite" />
              <span className="sr-only">{f.label}: </span>
              {f.value}
            </li>
          ))}
        </ul>
      );
    case "heritage":
      return (
        <dl className="mx-auto grid max-w-xl gap-2.5 text-left" data-testid="room-facts">
          {facts.map((f) => (
            <div key={f.key} className="flex items-baseline gap-3">
              <dt className="heritage-caps text-[11px] text-ink-muted">{f.label}</dt>
              <span aria-hidden className="leader" />
              <dd className="font-display text-[1.0625rem] italic">{underLabel(f)}</dd>
            </div>
          ))}
        </dl>
      );
    default:
      return (
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3 lg:grid-cols-5" data-testid="room-facts">
          {facts.map((f) => (
            <div key={f.key} className="bg-paper p-3.5">
              <dt className="kicker flex items-center gap-1.5 !text-[10px]">
                <RoomIcon name={f.icon} label={f.value} size={14} className="text-laterite" /> {f.label}
              </dt>
              <dd className="mt-1.5 text-[0.9375rem] leading-snug">{underLabel(f)}</dd>
            </div>
          ))}
        </dl>
      );
  }
}

/* ------------------------------------------------------------------ highlights */

export function Highlights({ items, look }: { items: string[]; look: RoomLook }) {
  if (!items.length) return null;
  switch (look) {
    case "boutique":
      return (
        <ul className="mt-6 space-y-1.5 text-[1.0625rem] text-ink-muted" data-testid="room-highlights">
          {items.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      );
    case "business":
      return (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13.5px]" data-testid="room-highlights">
          {items.map((h) => (
            <li key={h} className="inline-flex items-center gap-1.5">
              <Check size={13} weight="bold" className="text-palm" aria-hidden /> {h}
            </li>
          ))}
        </ul>
      );
    case "resort":
      return (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2" data-testid="room-highlights">
          {items.map((h) => (
            <li key={h} className="flex items-center gap-3 rounded-[18px] border border-line bg-surface px-4 py-3.5">
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-laterite/12 text-laterite">
                <RoomIcon name="" label={h} size={16} weight="regular" />
              </span>
              <span className="font-medium">{h}</span>
            </li>
          ))}
        </ul>
      );
    case "heritage":
      return (
        <ul className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-x-3 gap-y-1 font-display text-[1.15rem] italic text-ink-muted" data-testid="room-highlights">
          {items.map((h, i) => (
            <li key={h} className="flex items-center gap-3">
              {i ? (
                <span aria-hidden className="text-brass">
                  &middot;
                </span>
              ) : null}
              {h}
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2" data-testid="room-highlights">
          {items.map((h, i) => (
            <li key={h} className="grid grid-cols-[2rem_1fr] items-baseline border-t border-line pt-2">
              <span className="font-display text-sm italic text-laterite">{roman(i + 1).toLowerCase()}.</span>
              <span className="font-display text-[1.2rem] italic leading-snug">{h}</span>
            </li>
          ))}
        </ol>
      );
  }
}

/* ------------------------------------------------------------------ description */

function Runs({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.strong ? (
          <strong key={i} className="font-semibold">
            {p.text}
          </strong>
        ) : p.em ? (
          <em key={i}>{p.text}</em>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/** The API's markdown-lite, rendered as plain elements (never as HTML). */
export function MarkdownLite({ source, className = "", dropCap = false, bullet = "dash" }: { source: string; className?: string; dropCap?: boolean; bullet?: "dash" | "dot" }) {
  const blocks = parseMarkdownLite(source);
  if (!blocks.length) return null;
  return (
    <div className={`${className} ${dropCap ? "drop-cap" : ""}`}>
      {blocks.map((b, i) =>
        b.kind === "p" ? (
          <p key={i}>
            <Runs parts={b.parts} />
          </p>
        ) : (
          <ul key={i} className={`room-md-list ${bullet === "dot" ? "room-md-dot" : ""}`}>
            {b.items.map((it, j) => (
              <li key={j}>
                <Runs parts={it} />
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ amenities */

export function AmenityGroups({ groups, look }: { groups: AmenityGroup[]; look: RoomLook }) {
  if (!groups.length) return <p className="text-ink-muted">The hotel has not listed what is in this room yet. The front desk will tell you.</p>;
  switch (look) {
    case "boutique":
      return (
        <div className="grid gap-x-16 gap-y-12 sm:grid-cols-2" data-testid="room-amenities">
          {groups.map((g) => (
            <section key={g.group} aria-label={g.label}>
              <h3 className="boutique-kicker">{g.label}</h3>
              <ul className="mt-4 space-y-2.5 text-[1.0625rem]">
                {g.items.map((it) => (
                  <li key={it.label} className="flex items-baseline gap-3">
                    <span aria-hidden className="h-px w-4 shrink-0 translate-y-[-0.3em] bg-line-strong" />
                    {it.label}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      );
    case "business":
      return (
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3" data-testid="room-amenities">
          {groups.map((g) => (
            <section key={g.group} aria-label={g.label}>
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                <RoomIcon name={g.icon} size={14} /> {g.label}
              </h3>
              <ul className="mt-2 space-y-1 text-[13.5px]">
                {g.items.map((it) => (
                  <li key={it.label} className="flex items-start gap-2">
                    <Check size={13} weight="bold" className="mt-1 shrink-0 text-palm" aria-hidden /> {it.label}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      );
    case "resort":
      return (
        <div className="grid gap-4 sm:grid-cols-2" data-testid="room-amenities">
          {groups.map((g) => (
            <section key={g.group} aria-label={g.label} className="rounded-[22px] border border-line bg-surface p-5">
              <h3 className="flex items-center gap-2.5 font-display text-[1.2rem]">
                <span aria-hidden className="grid size-9 place-items-center rounded-full bg-laterite/12 text-laterite">
                  <RoomIcon name={g.icon} size={18} weight="regular" />
                </span>
                {g.label}
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {g.items.map((it) => (
                  <li key={it.label} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[13px]">
                    <RoomIcon name={it.icon} label={it.label} size={14} className="text-ink-muted" /> {it.label}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      );
    case "heritage":
      return (
        <div className="grid gap-x-12 gap-y-10 text-center sm:grid-cols-2" data-testid="room-amenities">
          {groups.map((g) => (
            <section key={g.group} aria-label={g.label}>
              <h3 className="heritage-caps text-[12px] text-laterite">{g.label}</h3>
              <ul className="mt-3 space-y-1.5 font-display text-[1.0625rem] italic text-ink-muted">
                {g.items.map((it) => (
                  <li key={it.label}>{it.label}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      );
    default:
      return (
        <div className="columns-1 gap-10 sm:columns-2" data-testid="room-amenities">
          {groups.map((g) => (
            <section key={g.group} aria-label={g.label} className="mb-8 break-inside-avoid">
              <h3 className="kicker flex items-center gap-2 border-b border-line pb-2">
                <RoomIcon name={g.icon} size={15} className="text-laterite" /> {g.label}
              </h3>
              <ul className="mt-1">
                {g.items.map((it) => (
                  <li key={it.label} className="flex items-center gap-3 border-b border-line/70 py-2.5 text-[0.9375rem]">
                    <RoomIcon name={it.icon} label={it.label} size={19} className="shrink-0 text-ink-muted" />
                    {it.label}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      );
  }
}

/* ------------------------------------------------------------------ services */

/**
 * "Included with your stay" against "Add to your stay": what every (or a named) rate brings, then the
 * paid extras, the pickups and the concierge's services this room can have, each with its price.
 */
export function RoomServices({ detail, look, conciergeBase }: { detail: RoomDetail; look: RoomLook; conciergeBase: string }) {
  const { included, extras, pickups, concierge } = detail.services;
  const adds = extras.length + pickups.length + concierge.length;
  if (!included.length && !adds) return null;
  const heritage = look === "heritage";
  const colHead = (t: string, sub: string) =>
    heritage ? (
      <header className="mb-5 text-center">
        <h3 className="heritage-caps text-[12px] text-laterite">{t}</h3>
        <p className="mt-1 font-display text-sm italic text-ink-muted">{sub}</p>
      </header>
    ) : look === "boutique" ? (
      <header className="mb-6">
        <h3 className="display-sm text-[1.5rem]">{t}</h3>
        <p className="mt-1 text-sm text-ink-muted">{sub}</p>
      </header>
    ) : look === "business" ? (
      <header className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em]">{t}</h3>
        <p className="text-[12px] text-ink-muted">{sub}</p>
      </header>
    ) : (
      <header className="mb-4">
        <h3 className={look === "resort" ? "font-display text-[1.35rem]" : "kicker !text-ink"}>{t}</h3>
        <p className="mt-1 text-[13px] text-ink-muted">{sub}</p>
      </header>
    );
  const card = look === "resort" ? "rounded-[22px] border border-line bg-surface p-5 sm:p-6" : look === "business" ? "border border-line p-4" : "";
  const row = look === "business" ? "py-2 text-[13.5px]" : "py-3";

  const CONCIERGE_SHOWN = 5;
  const extraRows = [
    ...extras.map((e) => ({
      key: `x-${e.id}`,
      name: e.name,
      note: e.available === false ? (e.reason ?? "Not for your dates") : (e.category ?? e.description),
      price: e.stayPriceKobo !== null && e.available !== false ? `${formatNaira(e.stayPriceKobo)} for your stay` : e.priceKobo !== null ? `${formatNaira(e.priceKobo)}${e.unit ? ` ${e.unit}` : ""}` : "",
      href: null as string | null,
      off: e.available === false,
      kind: "extra",
    })),
    // Pickups: one line per kind of place (airports, motor parks...), naming them, from the lowest price.
    ...[...new Set(pickups.map((p) => p.kind))].map((kind) => {
      const list = pickups.filter((p) => p.kind === kind);
      const prices = list.map((p) => p.priceKobo).filter((n): n is number => n !== null);
      const plural = KIND_PLURAL[kind as keyof typeof KIND_PLURAL] ?? "Other places";
      return {
        key: `p-${kind}`,
        name: list.length === 1 ? `Pickup from ${list[0].name}` : `Pickup from ${list.length} ${plural.toLowerCase()}`,
        note: list.length === 1 ? (list[0].city ?? null) : list.map((p) => p.name).join(", "),
        price: prices.length ? `from ${formatNaira(Math.min(...prices))}` : "",
        href: null as string | null,
        off: false,
        kind: "pickup",
      };
    }),
    ...concierge.slice(0, CONCIERGE_SHOWN).map((c) => ({
      key: `c-${c.id}`,
      name: c.name,
      note: c.categoryLabel ? `${c.categoryLabel}, from the concierge` : "From the concierge",
      price: c.priceLabel || (c.priceKobo !== null ? formatNaira(c.priceKobo) : ""),
      href: `${conciergeBase}/${encodeURIComponent(c.id)}`,
      off: false,
      kind: "concierge",
    })),
  ];

  return (
    <div className={`grid gap-8 ${included.length && adds ? "md:grid-cols-2" : ""} ${heritage ? "md:gap-14" : ""}`} data-testid="room-services">
      {included.length ? (
        <section className={card} aria-label="Included with your stay" data-testid="room-included">
          {colHead("Included with your stay", "At no extra cost")}
          <ul className={`divide-y divide-line ${heritage ? "text-center" : ""}`}>
            {included.map((i) => (
              <li key={i.code || i.label} className={`flex items-start gap-3 ${row} ${heritage ? "flex-col items-center gap-1" : ""}`}>
                {heritage ? null : (
                  <span aria-hidden className={`mt-0.5 grid size-7 shrink-0 place-items-center text-palm ${look === "resort" ? "rounded-full bg-palm/12" : "rounded-full border border-palm/35"}`}>
                    <RoomIcon name={i.icon} label={i.label} size={15} weight="regular" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className={heritage ? "font-display text-[1.0625rem] italic" : "font-medium"}>{i.label}</span>
                  {i.detail ? <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-muted">{i.detail}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {adds ? (
        <section className={card} aria-label="Add to your stay" data-testid="room-addons">
          {colHead("Add to your stay", "Chosen while you book, or asked for later")}
          <ul className={`divide-y divide-line ${heritage ? "text-center" : ""}`}>
            {extraRows.map((x) => (
              <li key={x.key} className={`${row} ${x.off ? "opacity-60" : ""}`} data-kind={x.kind}>
                <div className={`flex gap-3 ${heritage ? "flex-col items-center gap-0.5" : "items-baseline"}`}>
                  {heritage ? null : <Plus size={13} weight="bold" aria-hidden className="mt-1 shrink-0 self-start text-brass" />}
                  <span className="min-w-0 flex-1">
                    {x.href ? (
                      <Link href={x.href} className="font-medium underline-offset-4 hover:text-laterite hover:underline">
                        {x.name}
                      </Link>
                    ) : (
                      <span className={heritage ? "font-display text-[1.0625rem] italic" : "font-medium"}>{x.name}</span>
                    )}
                    {x.note ? <span className="mt-0.5 block text-[12.5px] text-ink-muted">{x.note}</span> : null}
                  </span>
                  {x.price ? <span className="num shrink-0 text-[13px] text-ink sm:text-right">{x.price}</span> : null}
                </div>
              </li>
            ))}
          </ul>
          {concierge.length > CONCIERGE_SHOWN ? (
            <Link href={conciergeBase} className={`mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-laterite hover:underline ${heritage ? "w-full justify-center" : ""}`}>
              {concierge.length - CONCIERGE_SHOWN} more from the concierge <ArrowRight size={13} aria-hidden />
            </Link>
          ) : null}
          <p className={`mt-3 text-[12.5px] leading-relaxed text-ink-muted ${heritage ? "text-center" : ""}`}>
            {extras.length || pickups.length ? "Extras and pickups are chosen in the booking, after your details. " : ""}
            {concierge.length ? "The concierge arranges the rest once you have booked." : ""}
          </p>
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ policies */

export function RoomPolicies({ detail, look }: { detail: RoomDetail; look: RoomLook }) {
  const p = detail.policies;
  const r = detail.room;
  const center = look === "heritage";
  const notes: { k: string; v: string }[] = [];
  if (r.extraBed.available) notes.push({ k: "Extra bed", v: r.extraBed.priceKobo ? `On request, ${formatNaira(r.extraBed.priceKobo)} a night` : "On request, at no charge" });
  if (r.connectingAvailable) notes.push({ k: "Connecting rooms", v: "Can connect to a neighbouring room for families; ask when you book" });
  notes.push({ k: "Smoking", v: r.smoking ? "Smoking is allowed in this room" : "This is a non-smoking room" });
  if (r.accessible || r.accessibilityNotes) notes.push({ k: "Access", v: r.accessibilityNotes ?? "Step-free, accessible room" });
  if (p.taxes.length) notes.push({ k: "Taxes", v: p.taxes.map((t) => `${t.label} ${(t.rateBps / 100).toString()}%${t.inclusive ? " (in the price)" : ""}`).join(", ") });

  return (
    <div className="space-y-8" data-testid="room-policies">
      {p.cancellation ? <CancellationTimeline policy={p.cancellation} /> : null}
      <div className={`grid gap-8 ${center ? "text-left" : ""} md:grid-cols-[1fr_16rem]`}>
        <div className="space-y-6">
          {p.houseRules ? (
            <div>
              <h3 className={look === "heritage" ? "heritage-caps text-[12px] text-laterite" : look === "boutique" ? "boutique-kicker" : "kicker"}>In this room</h3>
              <MarkdownLite source={p.houseRules} className="room-md mt-2 text-[0.9375rem] leading-relaxed" bullet="dot" />
            </div>
          ) : null}
          <dl className="divide-y divide-line border-y border-line text-[0.9375rem]">
            {notes.map((n) => (
              <div key={n.k} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <dt className="text-ink-muted">{n.k}</dt>
                <dd>{n.v}</dd>
              </div>
            ))}
          </dl>
          {p.hotelPolicies.length ? (
            <div>
              <h3 className={`mb-3 ${look === "heritage" ? "heritage-caps text-[12px] text-laterite" : look === "boutique" ? "boutique-kicker" : "kicker"}`}>House rules</h3>
              <HouseRules policies={p.hotelPolicies} numerals={look !== "business"} />
            </div>
          ) : null}
        </div>
        <dl className="self-start rounded-sm border border-line">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <dt className="flex items-center gap-2 text-sm text-ink-muted">
              <SignIn size={17} weight="light" aria-hidden /> Check in from
            </dt>
            <dd className="num text-sm">{formatClock(p.checkInTime)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <dt className="flex items-center gap-2 text-sm text-ink-muted">
              <SignOut size={17} weight="light" aria-hidden /> Check out by
            </dt>
            <dd className="num text-sm">{formatClock(p.checkOutTime)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ similar rooms */

export function SimilarRooms({
  rooms,
  look,
  roomsBase,
  stay,
}: {
  rooms: SimilarRoom[];
  look: RoomLook;
  roomsBase: string;
  stay: { checkIn: string | null; checkOut: string | null; guests: number };
}) {
  if (!rooms.length) return null;
  const link = (r: SimilarRoom) => roomHref(roomsBase, r, stay);
  const meta = (r: SimilarRoom) => [`Sleeps ${r.capacity}`, r.bedType, r.sizeSqm ? `${r.sizeSqm} m²` : null].filter(Boolean).join(" · ");

  if (look === "business")
    return (
      <ul className="divide-y divide-line border-b border-line" data-testid="similar-rooms">
        {rooms.map((r) => (
          <li key={r.id} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-4 py-3">
            <Plate src={r.cover?.url} alt={r.cover?.alt ?? r.name} caption={false} sizes="6rem" className="aspect-[4/3]" />
            <div className="min-w-0">
              <p className="font-medium">{r.name}</p>
              <p className="num text-[12px] text-ink-muted">{meta(r)}</p>
            </div>
            <div className="text-right">
              <p className="num text-sm">
                <span className="text-[11px] text-ink-muted">from </span>
                {formatNaira(r.fromKobo)}
              </p>
              <Link href={link(r)} className="inline-flex items-center gap-1 text-[13px] text-laterite hover:underline" aria-label={`View details of the ${r.name}`}>
                View details <ArrowRight size={12} aria-hidden />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    );

  const grid = look === "boutique" ? "grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3" : look === "heritage" ? "grid gap-10 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3";
  return (
    <ul className={grid} data-testid="similar-rooms">
      {rooms.slice(0, 3).map((r) => (
        <li key={r.id} className={look === "heritage" ? "text-center" : ""}>
          <Link
            href={link(r)}
            className={`group block ${look === "resort" ? "overflow-hidden rounded-[22px] border border-line bg-surface" : ""}`}
            aria-label={`View details of the ${r.name}, from ${formatNaira(r.fromKobo)} a night`}
          >
            <span className={`block ${look === "heritage" ? "heritage-frame" : ""}`}>
              <Plate
                src={r.cover?.url}
                alt={r.cover?.alt ?? r.name}
                label={r.name}
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                className={`${look === "boutique" ? "aspect-[3/4]" : "aspect-[4/3]"} ${editorialish(look) ? "rounded-sm" : ""}`}
                imgClassName="transition-transform duration-700 group-hover:scale-[1.03]"
              />
            </span>
            <span className={`block ${look === "resort" ? "p-5" : "pt-4"}`}>
              <span
                className={`block ${
                  look === "heritage" ? "heritage-title text-[1.05rem]" : look === "boutique" ? "display-sm text-[1.6rem]" : "display-sm text-[1.35rem]"
                } group-hover:text-laterite`}
              >
                {r.name}
              </span>
              <span className={`mt-1 block text-[12.5px] text-ink-muted ${look === "heritage" ? "font-display italic" : "num"}`}>{meta(r)}</span>
              <span className={`mt-3 flex items-baseline gap-2 ${look === "heritage" ? "justify-center" : "justify-between"}`}>
                <span className="text-[13px] text-ink-muted">
                  from <span className="num text-[0.9375rem] font-medium text-ink">{formatNaira(r.fromKobo)}</span>
                </span>
                {look !== "heritage" ? (
                  <span className="inline-flex items-center gap-1 text-[13px] font-medium text-laterite">
                    View details <ArrowUpRight size={13} aria-hidden />
                  </span>
                ) : null}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ small pieces */

/** Size, bed and sleeps as a compact line, for the header of looks that keep it short. */
export function FactLine({ detail }: { detail: RoomDetail }) {
  const r = detail.room;
  return (
    <ul className="num flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-ink/85">
      <li className="flex items-center gap-1.5">
        <UsersThree size={16} weight="light" aria-hidden /> Sleeps {r.capacity}
      </li>
      {r.bedType ? (
        <li className="flex items-center gap-1.5">
          <Bed size={16} weight="light" aria-hidden /> {r.bedType}
        </li>
      ) : null}
      {r.sizeSqm ? (
        <li className="flex items-center gap-1.5">
          <Ruler size={16} weight="light" aria-hidden /> {r.sizeSqm} m&sup2;
        </li>
      ) : null}
      {r.hourlyPriceKobo ? (
        <li className="flex items-center gap-1.5 text-brass">
          <Clock size={16} weight="bold" aria-hidden /> Day use {formatNaira(r.hourlyPriceKobo)} / hr
        </li>
      ) : null}
    </ul>
  );
}
