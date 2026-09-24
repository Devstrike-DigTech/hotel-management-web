/**
 * Server-rendered building blocks shared by the six booking-site templates. None of them needs
 * JavaScript in the browser (FAQ answers open with <details>), so the Essentials template can use
 * them on a page that ships no scripts at all.
 */
import {
  AirplaneLanding,
  ArrowUpRight,
  Boat,
  Bus,
  EnvelopeSimple,
  MapPin,
  NavigationArrow,
  Phone,
  ShieldCheck,
  SignIn,
  SignOut,
  Train,
  WhatsappLogo,
} from "@phosphor-icons/react/ssr";
import { chatMessage, whatsappChatUrl } from "../chat/whatsapp-chat";
import { formatClock, formatPhone, roman, toE164Digits } from "@/lib/format";
import { groupByKind, KIND_ARRIVAL, KIND_PLURAL, pickupSentence, pickupTerms, priceFrom } from "@/lib/pickup";
import type { CancellationPolicy } from "@/lib/booking-types";
import type { FaqItem, PickupKind, PickupPoint, SectionItem, ThemeSection } from "@/lib/theme/types";
import type { SiteCtx } from "./context";

export function KindIcon({ kind, size = 20, className = "" }: { kind: PickupKind; size?: number; className?: string }) {
  const Icon = kind === "AIRPORT" ? AirplaneLanding : kind === "MOTOR_PARK" ? Bus : kind === "TRAIN_STATION" ? Train : kind === "JETTY" ? Boat : MapPin;
  return <Icon size={size} weight="light" className={className} aria-hidden />;
}

/** A section's own heading when the hotel wrote one, else the template's. */
export const titleOf = (section: ThemeSection, fallback: string) => section.options.title ?? fallback;

/* ------------------------------------------------------------------ derived content */

/** Highlights the hotel wrote, or facts from its own data (never invented copy). */
export function highlightItems(ctx: SiteCtx, section?: ThemeSection): SectionItem[] {
  if (section?.options.items.length) return section.options.items.slice(0, 6);
  const h = ctx.hotel;
  const out: SectionItem[] = [];
  if (h.rating && h.reviewCount) out.push({ title: `${h.rating.toFixed(1)} from guests`, body: `${h.reviewCount} verified ${h.reviewCount === 1 ? "stay" : "stays"}`, imageUrl: null, meta: null });
  if (h.checkInTime) out.push({ title: `Check in from ${formatClock(h.checkInTime)}`, body: h.checkOutTime ? `Check out by ${formatClock(h.checkOutTime)}` : null, imageUrl: null, meta: null });
  for (const a of h.amenities.slice(0, 4 - out.length)) out.push({ title: a, body: null, imageUrl: null, meta: null });
  if (ctx.theme.pickupPoints.length && out.length < 4) out.push({ title: "Pickups arranged", body: pickupSentence(ctx.theme.pickupPoints), imageUrl: null, meta: null });
  return out.slice(0, 4);
}

const pick = (amenities: string[], re: RegExp): SectionItem[] =>
  amenities.filter((a) => re.test(a)).map((a) => ({ title: a, body: null, imageUrl: null, meta: null }));

export const diningItems = (ctx: SiteCtx, s?: ThemeSection) =>
  s?.options.items.length ? s.options.items : pick(ctx.hotel.amenities, /restaurant|dining|bar|lounge|breakfast|kitchen|room service|cafe|grill/i);
export const meetingItems = (ctx: SiteCtx, s?: ThemeSection) =>
  s?.options.items.length ? s.options.items : pick(ctx.hotel.amenities, /meeting|conference|business|board ?room|event|hall|co-?work/i);
export const experienceItems = (ctx: SiteCtx, s?: ThemeSection) =>
  s?.options.items.length ? s.options.items : pick(ctx.hotel.amenities, /pool|spa|gym|fitness|beach|garden|terrace|rooftop|massage|tour|games/i);

/** The hotel's own FAQ, or answers straight from its settings when it has not written any. */
export function faqItems(ctx: SiteCtx): FaqItem[] {
  if (ctx.theme.faq.length) return ctx.theme.faq;
  const h = ctx.hotel;
  const out: FaqItem[] = [];
  if (h.checkInTime || h.checkOutTime)
    out.push({ q: "What time are check-in and check-out?", a: `Check in from ${formatClock(h.checkInTime)}; check out by ${formatClock(h.checkOutTime)}.` });
  const policy = h.booking?.cancellationPolicy;
  if (policy) out.push({ q: "Can I cancel?", a: policy.summary });
  if (h.booking) {
    const ways = [h.booking.payOnlineAvailable ? "online by card, bank transfer or USSD when you book" : null, h.booking.payAtHotelAvailable ? "at the front desk when you arrive" : null].filter(Boolean);
    if (ways.length) out.push({ q: "How do I pay?", a: `You can pay ${ways.join(", or ")}.` });
  }
  if (ctx.theme.pickupPoints.length) out.push({ q: "Can you pick me up?", a: `${pickupSentence(ctx.theme.pickupPoints)} Ask for it while you book.` });
  const parking = h.amenities.find((a) => /park/i.test(a));
  if (parking) out.push({ q: "Is there parking?", a: `Yes: ${parking.toLowerCase()}.` });
  return out;
}

export const pickupSentenceFor = (ctx: SiteCtx) => pickupSentence(ctx.theme.pickupPoints) ?? "";

/* ------------------------------------------------------------------ blocks */

export function FaqList({ items, className = "" }: { items: FaqItem[]; className?: string }) {
  if (!items.length) return null;
  return (
    <div className={`faq divide-y divide-line border-y border-line ${className}`}>
      {items.map((f, i) => (
        <details key={i} className="group">
          <summary className="flex cursor-pointer items-baseline justify-between gap-6 py-4 text-left">
            <span className="text-[1.0625rem] font-medium">{f.q}</span>
            <span aria-hidden className="faq-mark shrink-0 text-laterite transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="max-w-[62ch] pb-5 pr-8 leading-relaxed text-ink-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Pickup points grouped by kind: airports, motor parks, train stations, jetties. */
export function PickupList({ points, compact = false }: { points: PickupPoint[]; compact?: boolean }) {
  if (!points.length) return null;
  return (
    <div className="space-y-8" data-testid="pickup-points">
      {groupByKind(points).map(([kind, list]) => (
        <div key={kind}>
          <h3 className="kicker flex items-center gap-2">
            <KindIcon kind={kind} size={16} className="text-laterite" /> {KIND_PLURAL[kind]}
          </h3>
          {!compact ? <p className="mt-1.5 max-w-[60ch] text-sm leading-relaxed text-ink-muted">{KIND_ARRIVAL[kind]}</p> : null}
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {list.map((p) => (
              <li key={p.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:gap-6">
                <div className="min-w-0">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-[13px] leading-relaxed text-ink-muted">
                    {[p.address || p.city, ...pickupTerms(p)].filter(Boolean).join(" · ")}
                  </p>
                  {p.notes && !compact ? <p className="mt-1 text-[13px] italic text-ink-muted">{p.notes}</p> : null}
                </div>
                <p className="num text-sm sm:text-right">{priceFrom(p)}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function ContactList({ ctx, className = "" }: { ctx: SiteCtx; className?: string }) {
  const h = ctx.hotel;
  return (
    <ul className={`space-y-3 text-[0.9375rem] ${className}`}>
      {h.phone ? (
        <li>
          <a href={`tel:+${toE164Digits(h.phone)}`} className="inline-flex items-center gap-3 hover:text-laterite">
            <Phone size={18} weight="light" aria-hidden />
            <span className="num">{formatPhone(h.phone)}</span>
          </a>
        </li>
      ) : null}
      {ctx.chat ? (
        <li>
          <a href={whatsappChatUrl(ctx.chat, chatMessage(h.name))} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 hover:text-laterite">
            <WhatsappLogo size={18} weight="light" aria-hidden /> Chat on WhatsApp
          </a>
        </li>
      ) : null}
      {h.email ? (
        <li>
          <a href={`mailto:${h.email}`} className="inline-flex items-center gap-3 break-all hover:text-laterite">
            <EnvelopeSimple size={18} weight="light" aria-hidden /> {h.email}
          </a>
        </li>
      ) : null}
    </ul>
  );
}

/** The address with a way to open it in a maps app. No map SDK: a drawn plate and a link. */
export function MapCard({ ctx, className = "" }: { ctx: SiteCtx; className?: string }) {
  const h = ctx.hotel;
  return (
    <a
      href={ctx.mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`map-card group relative block overflow-hidden border border-line bg-surface ${className}`}
      aria-label={`Open ${h.name} in Google Maps`}
    >
      <span aria-hidden className="map-lines absolute inset-0 text-line-strong" />
      <span aria-hidden className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-[70%] place-items-center">
        <span className="grid size-11 place-items-center rounded-full bg-laterite text-laterite-ink shadow-[var(--shadow-float)]">
          <MapPin size={22} weight="fill" />
        </span>
      </span>
      <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-paper/92 px-4 py-3 text-sm">
        <span className="min-w-0 truncate">{h.address || `${h.area}, ${h.city}`}</span>
        <span className="inline-flex shrink-0 items-center gap-1 font-medium text-laterite">
          Directions <NavigationArrow size={14} weight="fill" aria-hidden className="rotate-90" />
        </span>
      </span>
    </a>
  );
}

export function AddressBlock({ ctx }: { ctx: SiteCtx }) {
  const h = ctx.hotel;
  return (
    <address className="not-italic">
      <p className="display-sm text-xl">{h.name}</p>
      <p className="mt-2 leading-relaxed text-ink-muted">
        {h.address || `${h.area}, ${h.city}`}
        <br />
        {h.city}, {h.state}
      </p>
      <a href={ctx.mapsUrl} target="_blank" rel="noopener noreferrer" className="link-static mt-3 inline-flex items-center gap-1.5 text-sm">
        Open in Google Maps <ArrowUpRight size={14} aria-hidden />
      </a>
    </address>
  );
}

export function CheckTimes({ ctx, className = "" }: { ctx: SiteCtx; className?: string }) {
  return (
    <dl className={`rounded-sm border border-line ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <dt className="flex items-center gap-2 text-sm text-ink-muted">
          <SignIn size={17} weight="light" aria-hidden /> Check in from
        </dt>
        <dd className="num text-sm">{formatClock(ctx.hotel.checkInTime)}</dd>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <dt className="flex items-center gap-2 text-sm text-ink-muted">
          <SignOut size={17} weight="light" aria-hidden /> Check out by
        </dt>
        <dd className="num text-sm">{formatClock(ctx.hotel.checkOutTime)}</dd>
      </div>
    </dl>
  );
}

export function HouseRules({ policies, numerals = true }: { policies: string[]; numerals?: boolean }) {
  if (!policies.length) return <p className="text-ink-muted">Ask the front desk about house rules before you arrive.</p>;
  return (
    <ol className="space-y-4">
      {policies.map((p, i) => (
        <li key={i} className="grid grid-cols-[2rem_1fr] gap-2 text-[0.9375rem] leading-relaxed">
          <span className="font-display italic text-laterite">{numerals ? `${roman(i + 1)}.` : `${i + 1}.`}</span>
          <span>{p}</span>
        </li>
      ))}
    </ol>
  );
}

/** The cancellation policy as a three-step timeline: free, then a fee, then a no-show. */
export function CancellationTimeline({ policy }: { policy: CancellationPolicy }) {
  const fee = policy.lateCancellationFeePct;
  const feeText = fee >= 100 ? "the first night" : fee > 0 ? `${fee}% of the first night` : "nothing";
  const noShow = policy.noShowFeePct >= 100 ? "the first night" : policy.noShowFeePct > 0 ? `${policy.noShowFeePct}% of the first night` : "nothing";
  const steps = [
    {
      k: "Free",
      body:
        policy.freeCancellationHours > 0
          ? `Cancel up to ${policy.freeCancellationHours} hours before check-in and pay nothing. Paid online? It all comes back.`
          : "Cancellation is not free for this hotel; see below.",
      tone: "bg-palm",
    },
    { k: "Late", body: `Within ${policy.freeCancellationHours} hours of check-in, cancelling costs ${feeText}. The rest is refunded.`, tone: "bg-ochre" },
    { k: "No-show", body: `If you do not arrive, the hotel may charge ${noShow}.`, tone: "bg-danger" },
  ];
  return (
    <div className="rounded-sm border border-line bg-surface p-5 sm:p-6" data-testid="cancellation-policy">
      <p className="flex items-center gap-2 text-[0.9375rem] font-medium">
        <ShieldCheck size={19} weight="light" className="text-palm" aria-hidden /> {policy.summary}
      </p>
      <ol className="mt-5 grid gap-5 sm:grid-cols-3 sm:gap-0">
        {steps.map((s, i) => (
          <li key={s.k} className="relative sm:pr-6">
            <div className="flex items-center gap-2" aria-hidden>
              <span className={`size-2.5 rounded-full ${s.tone}`} />
              {i < steps.length - 1 ? <span className="hidden h-px flex-1 bg-line-strong sm:block" /> : null}
            </div>
            <p className="kicker mt-3">{s.k}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A hotel-written text block (up to three per page). Paragraphs split on blank lines; no HTML. */
export function CustomText({ section, className = "" }: { section: ThemeSection; className?: string }) {
  const body = section.options.body;
  if (!body && !section.options.title) return null;
  return (
    <div className={className}>
      {(body ?? "")
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="mt-3 first:mt-0">
            {p}
          </p>
        ))}
    </div>
  );
}

/** Up to `max` published reviews as quotations, for templates that keep the guest book short. */
export function ReviewQuotes({ ctx, max = 3, className = "" }: { ctx: SiteCtx; max?: number; className?: string }) {
  const items = (ctx.reviews?.items ?? []).filter((r) => r.body).slice(0, max);
  if (!items.length) return null;
  return (
    <ul className={className}>
      {items.map((r) => (
        <li key={r.id} className="review-quote">
          <blockquote>
            <p>{r.title ? <span className="font-medium">{r.title}. </span> : null}{r.body.length > 260 ? `${r.body.slice(0, 257).trimEnd()}...` : r.body}</p>
          </blockquote>
          <p className="kicker mt-3">
            {r.displayName}, <span className="num">{r.overall}/5</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
