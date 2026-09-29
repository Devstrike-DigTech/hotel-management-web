/**
 * Essentials: a room's page with no client code at all, so the proxy serves it without the framework's
 * scripts like the home page (src/lib/server/lite.ts). Everything that is interactive elsewhere is plain
 * HTML here:
 *
 * - the photographs are small lazy thumbnails; each opens a full-screen view with `:target` (previous,
 *   next and close are links; the page's one tiny inline script adds Escape and the arrow keys);
 * - the kind of picture (Bedroom, Bathroom...) filters with radio buttons and CSS `:has()`;
 * - dates are a native form that reloads this page, which the server prices for the stay;
 * - "Book this room" is a link that stays at the bottom of the screen with `position: sticky`.
 */
import { ArrowLeft, ArrowRight, CaretLeft, CaretRight, Check, Plus, WhatsappLogo, X } from "@phosphor-icons/react/ssr";
import { addDays, formatShort, formatWeekday, type ISODate } from "@/lib/dates";
import { formatClock, formatNaira } from "@/lib/format";
import { plansFor, planTitle } from "@/lib/rates";
import { roomHref, TAG_LABEL, TAG_ORDER, type RoomDetail, type RoomImage } from "@/lib/rooms";
import { thumb } from "../site-templates/essentials";
import { MarkdownLite, underLabel } from "./room-sections";

export function RoomPageLite({
  detail,
  backHref,
  bookBase,
  roomsBase,
  selfPath,
  shareUrl,
  today,
  initial,
}: {
  detail: RoomDetail;
  backHref: string;
  bookBase: string;
  roomsBase: string;
  /** This page's own path, for the date form. */
  selfPath: string;
  shareUrl: string;
  today: ISODate;
  initial: { checkIn: ISODate | null; checkOut: ISODate | null; guests: number };
}) {
  const r = detail.room;
  const stay = detail.stay;
  const plans = plansFor(r, stay ? { ratePlans: stay.ratePlans, quote: stay.quote, bookable: stay.bookable } : null);
  const best = stay?.bookable ? (plans.find((p) => p.bookable && p.quote) ?? null) : null;
  const book = (planId?: string) => {
    const q = new URLSearchParams({ room: r.id });
    if (planId && plans.length > 1) q.set("plan", planId);
    if (initial.checkIn && initial.checkOut) {
      q.set("checkIn", initial.checkIn);
      q.set("checkOut", initial.checkOut);
    }
    q.set("guests", String(initial.guests));
    return `${bookBase}?${q}`;
  };
  const inDate = initial.checkIn ?? addDays(today, 1);
  const outDate = initial.checkOut ?? addDays(inDate, 1);
  const tags = TAG_ORDER.map((t) => [t, r.gallery.filter((g) => g.tag === t).length] as const).filter(([, n]) => n > 0);
  const shareText = `The ${r.name} at ${detail.hotel.name}, ${detail.hotel.area}: ${shareUrl}`;

  return (
    <article className="lite-page pb-4" data-room-page="essentials" data-testid="room-page">
      <p className="pt-4 text-sm">
        <a href={backHref} className="inline-flex min-h-11 items-center gap-1.5 text-ink-muted hover:text-ink" data-testid="room-back">
          <ArrowLeft size={14} aria-hidden /> All rooms
        </a>
      </p>
      <h1 id="room-name" className="text-[1.875rem] font-bold leading-[1.1] tracking-[-0.02em]">
        {r.name}
      </h1>
      <p className="mt-2 text-[0.9375rem]">
        From <span className="num font-semibold">{formatNaira(r.fromKobo)}</span> <span className="text-ink-muted">a night</span>
      </p>
      <ul className="lite-facts mt-3" data-testid="room-facts">
        {r.facts.map((f) => (
          <li key={f.key}>
            <span className="text-ink-muted">{f.label}</span> {underLabel(f)}
          </li>
        ))}
      </ul>
      {r.highlights.length ? (
        <ul className="lite-list mt-3" data-testid="room-highlights">
          {r.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      ) : null}

      {r.gallery.length ? (
        <section id="photos" aria-labelledby="photos-title" className="lite-section lite-gallery" data-testid="room-gallery" data-look="essentials">
          <h2 id="photos-title" className="lite-h2">
            Photos <span className="num text-base font-normal text-ink-muted">{r.gallery.length}</span>
          </h2>
          {tags.length > 1 ? (
            <fieldset className="lite-chips">
              <legend className="sr-only">Show photos of</legend>
              <input type="radio" name="room-tag" id="tag-ALL" value="ALL" defaultChecked />
              <label htmlFor="tag-ALL" data-testid="room-tag-chip" data-tag="ALL">
                All <span className="num">{r.gallery.length}</span>
              </label>
              {tags.map(([t, n]) => (
                <span key={t} className="contents">
                  <input type="radio" name="room-tag" id={`tag-${t}`} value={t} />
                  <label htmlFor={`tag-${t}`} data-testid="room-tag-chip" data-tag={t}>
                    {TAG_LABEL[t]} <span className="num">{n}</span>
                  </label>
                </span>
              ))}
            </fieldset>
          ) : null}
          <ul className="lite-thumbs">
            {r.gallery.map((g, i) => (
              <li key={`${g.url}-${i}`} data-tag={g.tag ?? "OTHER"} className="lite-thumb">
                <a href={`#photo-${i + 1}`} aria-label={`Open photo ${i + 1} of ${r.gallery.length}: ${g.alt}`} data-testid="room-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element -- plain lazy images keep this page script-free */}
                  <img src={thumb(g.url, 240) ?? g.url} alt={g.alt} loading={i < 3 ? "eager" : "lazy"} decoding="async" width={120} height={90} />
                </a>
              </li>
            ))}
          </ul>
          {r.gallery.map((g, i) => (
            <LiteLightboxItem key={`lb-${i}`} image={g} n={i + 1} total={r.gallery.length} title={r.name} />
          ))}
        </section>
      ) : null}

      <section id="prices" aria-labelledby="prices-title" className="lite-section">
        <h2 id="prices-title" className="lite-h2">
          Prices for your dates
        </h2>
        <form method="get" action={`${selfPath}#prices`} className="lite-form" data-testid="lite-dates">
          <label>
            <span>Arrive</span>
            <input type="date" name="checkIn" defaultValue={inDate} min={today} required />
          </label>
          <label>
            <span>Leave</span>
            <input type="date" name="checkOut" defaultValue={outDate} min={addDays(today, 1)} required />
          </label>
          <label>
            <span>Guests</span>
            <select name="guests" defaultValue={String(initial.guests)}>
              {Array.from({ length: Math.max(r.capacity + 1, 4) }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="lite-btn lite-btn-outline">
            Check prices
          </button>
        </form>
        {stay ? (
          <div className="mt-4" aria-live="polite">
            <p className="text-[0.9375rem]" data-testid="room-availability">
              <span className="num">
                {formatWeekday(stay.checkIn)} {formatShort(stay.checkIn)} to {formatWeekday(stay.checkOut)} {formatShort(stay.checkOut)}
              </span>
              , {stay.nights} {stay.nights === 1 ? "night" : "nights"}:{" "}
              <strong className={stay.bookable ? (stay.lowAvailability ? "text-laterite" : "text-palm") : "text-ochre"}>
                {stay.bookable
                  ? stay.lowAvailability
                    ? `only ${stay.available} left`
                    : "free"
                  : stay.unavailableReason === "CAPACITY"
                    ? `sleeps ${r.capacity}, too small for your group`
                    : "full on those dates"}
              </strong>
            </p>
            <ul className="lite-rates mt-3" data-testid="room-rates">
              {plans.map((p) => (
                <li key={p.id} data-testid="room-rate" data-plan-kind={p.kind}>
                  <div className="min-w-0">
                    <p className="font-semibold">{planTitle(p)}</p>
                    <p className="text-[13px] text-ink-muted">
                      {[p.includesBreakfast ? "Breakfast included" : null, p.refundable ? "Free cancellation" : "Non-refundable", !p.bookable && p.reason ? p.reason : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="text-right">
                    {p.quote && p.bookable ? (
                      <p className="num font-semibold" data-testid="room-rate-total">
                        {formatNaira(p.quote.totalKobo)}
                      </p>
                    ) : null}
                    {p.bookable ? (
                      <a href={book(p.id)} className="text-sm font-semibold text-laterite underline underline-offset-4">
                        Book
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[13px] text-ink-muted">Totals include taxes, for the whole stay.</p>
          </div>
        ) : (
          <p className="mt-3 text-[13px] text-ink-muted">Choose your dates to see the total for your stay, taxes included.</p>
        )}
      </section>

      {r.longDescription || r.description ? (
        <section aria-labelledby="about-title" className="lite-section">
          <h2 id="about-title" className="lite-h2">
            About the room
          </h2>
          <MarkdownLite source={r.longDescription || r.description} className="room-md leading-relaxed" bullet="dot" />
        </section>
      ) : null}

      {r.amenityGroups.length ? (
        <section aria-labelledby="amenities-title" className="lite-section" data-testid="room-amenities">
          <h2 id="amenities-title" className="lite-h2">
            In the room
          </h2>
          {r.amenityGroups.map((g) => (
            <div key={g.group} className="mt-3 first:mt-0">
              <h3 className="font-semibold">{g.label}</h3>
              <p className="mt-0.5 leading-relaxed text-ink-muted">{g.items.map((i) => i.label).join(", ")}.</p>
            </div>
          ))}
        </section>
      ) : null}

      <LiteServices detail={detail} />

      <section aria-labelledby="policies-title" className="lite-section" data-testid="room-policies">
        <h2 id="policies-title" className="lite-h2">
          Good to know
        </h2>
        <ul className="lite-list">
          <li>
            Check in from <span className="num">{formatClock(detail.policies.checkInTime)}</span>, check out by <span className="num">{formatClock(detail.policies.checkOutTime)}</span>.
          </li>
          {detail.policies.cancellation ? <li>{detail.policies.cancellation.summary}</li> : null}
          <li>{r.smoking ? "Smoking is allowed in this room." : "This is a non-smoking room."}</li>
          {r.extraBed.available ? <li>Extra bed on request{r.extraBed.priceKobo ? `, ${formatNaira(r.extraBed.priceKobo)} a night` : ""}.</li> : null}
          {r.accessibilityNotes ? <li>{r.accessibilityNotes}</li> : null}
          {detail.policies.hotelPolicies.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        {detail.policies.houseRules ? <MarkdownLite source={detail.policies.houseRules} className="room-md mt-3 text-[0.9375rem] leading-relaxed" bullet="dot" /> : null}
      </section>

      {detail.similar.length ? (
        <section aria-labelledby="similar-title" className="lite-section">
          <h2 id="similar-title" className="lite-h2">
            Other rooms
          </h2>
          <ul className="lite-rooms" data-testid="similar-rooms">
            {detail.similar.map((s) => (
              <li key={s.id} className="lite-room">
                {s.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a plain lazy image keeps this page script-free
                  <img src={thumb(s.cover.url, 200) ?? s.cover.url} alt="" loading="lazy" decoding="async" width={96} height={72} className="lite-img" />
                ) : (
                  <span aria-hidden className="lite-img" />
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold leading-tight">{s.name}</h3>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    Sleeps {s.capacity}
                    {s.bedType ? `, ${s.bedType}` : ""}
                  </p>
                  <p className="mt-1 text-[0.9375rem]">
                    <span className="num font-semibold">{formatNaira(s.fromKobo)}</span> <span className="text-ink-muted">a night</span>
                  </p>
                </div>
                <a href={roomHref(roomsBase, s, initial)} className="lite-btn lite-btn-outline self-center" aria-label={`View details of the ${s.name}`}>
                  Details
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="lite-section flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-semibold">
          <WhatsappLogo size={17} aria-hidden /> Share on WhatsApp
        </a>
        <a href={`sms:?&body=${encodeURIComponent(shareText)}`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold">
          Send by text
        </a>
      </p>

      <div className="lite-bookbar" data-testid="room-book-bar">
        <p className="min-w-0 text-sm leading-tight">
          {best?.quote ? (
            <>
              <span className="block text-ink-muted">
                {stay!.nights} {stay!.nights === 1 ? "night" : "nights"}, all in
              </span>
              <span className="num text-lg font-semibold">{formatNaira(best.quote.totalKobo)}</span>
            </>
          ) : (
            <>
              <span className="block text-ink-muted">From</span>
              <span className="num text-lg font-semibold">{formatNaira(r.fromKobo)}</span> a night
            </>
          )}
        </p>
        {detail.hotel.onlineBookingEnabled ? (
          <a href={book(best?.id)} className="lite-btn lite-btn-primary lite-btn-lg" data-testid="book-this-room">
            Book this room <ArrowRight size={16} aria-hidden />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function LiteLightboxItem({ image, n, total, title }: { image: RoomImage; n: number; total: number; title: string }) {
  const prev = n === 1 ? total : n - 1;
  const next = n === total ? 1 : n + 1;
  return (
    <div id={`photo-${n}`} className="lite-lb" role="group" aria-label={`Photo ${n} of ${total}, the ${title}`} data-testid="room-lightbox">
      <a href="#photos" className="lite-lb-close" aria-label="Close photo" data-lb-close="">
        <X size={22} aria-hidden />
      </a>
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element -- loaded only when this photo is opened */}
        <img src={thumb(image.url, 1200) ?? image.url} alt={image.alt} loading="lazy" decoding="async" />
        <figcaption>
          <span className="num">
            {n} / {total}
          </span>
          {image.tag ? ` · ${TAG_LABEL[image.tag]}` : ""} · {image.caption || image.alt}
        </figcaption>
      </figure>
      {total > 1 ? (
        <>
          <a href={`#photo-${prev}`} className="lite-lb-nav lite-lb-prev" aria-label="Previous photo" data-lb-prev="">
            <CaretLeft size={22} aria-hidden />
          </a>
          <a href={`#photo-${next}`} className="lite-lb-nav lite-lb-next" aria-label="Next photo" data-lb-next="">
            <CaretRight size={22} aria-hidden />
          </a>
        </>
      ) : null}
    </div>
  );
}

function LiteServices({ detail }: { detail: RoomDetail }) {
  const { included, extras, pickups, concierge } = detail.services;
  if (!included.length && !extras.length && !pickups.length && !concierge.length) return null;
  return (
    <section aria-labelledby="services-title" className="lite-section" data-testid="room-services">
      <h2 id="services-title" className="lite-h2">
        With your stay
      </h2>
      {included.length ? (
        <div data-testid="room-included">
          <h3 className="font-semibold">Included</h3>
          <ul className="mt-1 space-y-1">
            {included.map((i) => (
              <li key={i.code || i.label} className="flex gap-2">
                <Check size={16} className="mt-1 shrink-0 text-palm" aria-hidden />
                <span>
                  {i.label}
                  {i.detail ? <span className="text-ink-muted">. {i.detail}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {extras.length || pickups.length || concierge.length ? (
        <div className="mt-4" data-testid="room-addons">
          <h3 className="font-semibold">Add to your stay</h3>
          <ul className="mt-1 space-y-1">
            {extras.map((e) => (
              <li key={e.id} className="flex gap-2">
                <Plus size={14} className="mt-1.5 shrink-0 text-brass" aria-hidden />
                <span>
                  {e.name}{" "}
                  <span className="num text-ink-muted">
                    {e.stayPriceKobo !== null ? `${formatNaira(e.stayPriceKobo)} for your stay` : e.priceKobo !== null ? `${formatNaira(e.priceKobo)}${e.unit ? ` ${e.unit}` : ""}` : ""}
                  </span>
                </span>
              </li>
            ))}
            {pickups.map((p) => (
              <li key={p.id} className="flex gap-2">
                <Plus size={14} className="mt-1.5 shrink-0 text-brass" aria-hidden />
                <span>
                  Pickup from {p.name} <span className="num text-ink-muted">{p.priceKobo !== null ? `from ${formatNaira(p.priceKobo)}` : ""}</span>
                </span>
              </li>
            ))}
            {concierge.map((c) => (
              <li key={c.id} className="flex gap-2">
                <Plus size={14} className="mt-1.5 shrink-0 text-brass" aria-hidden />
                <span>
                  {c.name} <span className="num text-ink-muted">{c.priceLabel}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-ink-muted">Extras and pickups are chosen while you book.</p>
        </div>
      ) : null}
    </section>
  );
}
