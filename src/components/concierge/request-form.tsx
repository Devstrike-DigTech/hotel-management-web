"use client";

import { ArrowRight, ChatCircleText, CheckCircle, CreditCard, DeviceMobile, EnvelopeSimple, LockSimple, Receipt, WhatsappLogo } from "@phosphor-icons/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { checkField, isVisible, type Answers, type AnswerValue, type PublicBookingForm } from "@/lib/booking-form";
import { call, ClientApiError, getClockSkew, humanError, newKey } from "@/lib/client-api";
import {
  clock12,
  CONTACT_LABEL,
  dayWords,
  durationLine,
  estimateKobo,
  LOCATION_LINE,
  needsQuote,
  normaliseRequest,
  priceLine,
  slotsFor,
  statusWords,
  type ConciergeRequestView,
  type ConciergeService,
  type ContactPreference,
  type PaymentMethod,
} from "@/lib/concierge";
import { addDays, diffDays, type ISODate } from "@/lib/dates";
import { formatNaira } from "@/lib/format";
import { FormFieldInput } from "../booking/form-fields";
import { GuestsStepper } from "../search/guests-stepper";

/** What a request is made for: a stay already booked (by its manage link), or one being booked. */
export type RequestContext =
  | {
      kind: "trip";
      code: string;
      token: string;
      arrivalDate: ISODate;
      departureDate: ISODate;
      party: number;
      hotelSlug: string;
      today: ISODate;
      /** The stay's bill is open (checked in): auto-priced requests can go on it. */
      folioOpen: boolean;
      payments: { online: boolean; folio: boolean };
      /** The booking has an email (for the EMAIL channel). */
      hasEmail: boolean;
    }
  | { kind: "draft"; arrivalDate: ISODate; departureDate: ISODate; party: number; hotelSlug: string; today: ISODate; hasEmail: boolean };

/** A payment to make right away (auto-priced service paid online). */
export interface PaymentLink {
  reference: string;
  authorizationUrl: string;
  amountKobo: number;
}

/** A request the booking will carry (booking step), before there is a reservation to attach it to. */
export interface DraftRequest {
  key: string;
  serviceId: string | null;
  variantId: string | null;
  title: string;
  answers: Record<string, unknown>;
  preferredAt: string | null;
  partySize: number | null;
  hours: number | null;
  notes: string;
  discreet: boolean;
  contactPreference: ContactPreference;
  /** For the summary: what it costs before tax, or null when the concierge quotes. */
  estimateKobo: number | null;
  priceLine: string;
}

const CONTACT_ICON: Record<ContactPreference, typeof WhatsappLogo> = {
  WHATSAPP: WhatsappLogo,
  SMS: DeviceMobile,
  EMAIL: EnvelopeSimple,
  IN_APP: ChatCircleText,
};

/** The draft (booking step) as the API's `GuestCreateRequest`. */
export function draftBody(d: DraftRequest) {
  return {
    ...(d.serviceId ? { serviceId: d.serviceId } : { requestText: d.notes }),
    ...(d.variantId ? { variantId: d.variantId } : {}),
    answers: d.answers,
    ...(d.preferredAt ? { preferredStart: d.preferredAt } : {}),
    ...(d.partySize ? { partySize: d.partySize } : {}),
    ...(d.hours ? { hours: d.hours } : {}),
    ...(d.serviceId && d.notes ? { notes: d.notes } : {}),
    discreet: d.discreet,
    contactPreference: d.contactPreference,
    source: "BOOKING_FLOW" as const,
  };
}

/** A small form model for the service's questions, so the M7 condition engine applies as is. */
function questionForm(s: ConciergeService | null): PublicBookingForm {
  return {
    formVersionId: null,
    version: null,
    preview: false,
    channel: "BOOKING_SITE",
    sections: [],
    fields: s?.questions ?? [],
    rules: { emailRequiredFor: [], consentRequired: false },
    extras: [],
    pickup: null,
    uploads: { enabled: false, maxFileMB: 5 },
    builtIn: false,
  };
}

const lagosISO = (date: string, time: string) => new Date(`${date}T${time}:00+01:00`).toISOString();

/**
 * One request: the service's own questions, the version of it (60 or 90 minutes), when, how many,
 * anything else, whether to keep it private, how to be reached and how to pay. With a trip it is
 * sent at once (API-M8 6.8); in the booking flow it is kept as a draft and sent right after the
 * booking is made. A null service is "Ask for something else" (free-form).
 */
export function RequestForm({
  service,
  ctx,
  contactChannels,
  neutralLabel,
  defaultContact,
  initial,
  onSent,
  onDraft,
  onCancel,
}: {
  service: ConciergeService | null;
  ctx: RequestContext;
  contactChannels: ContactPreference[];
  /** How a private request reads on the bill, when the hotel says. */
  neutralLabel?: string | null;
  defaultContact?: ContactPreference;
  initial?: DraftRequest | null;
  onSent?: (r: ConciergeRequestView) => void;
  onDraft?: (d: DraftRequest) => void;
  onCancel?: () => void;
}) {
  const uid = useId();
  const freeForm = !service;
  const form = useMemo(() => questionForm(service), [service]);
  const [nowMs] = useState(() => Date.now() + getClockSkew());
  const firstDay = ctx.today > ctx.arrivalDate ? ctx.today : ctx.arrivalDate;
  const lastDay = ctx.departureDate > firstDay ? ctx.departureDate : firstDay;
  const days = useMemo(() => {
    const out: ISODate[] = [];
    for (let i = 0; i <= Math.min(diffDays(firstDay, lastDay), 20); i++) out.push(addDays(firstDay, i));
    return out;
  }, [firstDay, lastDay]);
  // Days the service runs at all (the API's slots say which times are free on the chosen one).
  const openDays = useMemo(() => (service ? days.filter((d) => slotsFor(service, d, nowMs).length) : days), [service, days, nowMs]);

  const initialWhen = initial?.preferredAt ? new Date(Date.parse(initial.preferredAt) + 3600_000).toISOString() : null;
  const [answers, setAnswers] = useState<Answers>((initial?.answers as Answers) ?? {});
  const [variantId, setVariantId] = useState<string | null>(initial?.variantId ?? (service?.variants.length === 1 ? service.variants[0].id : null));
  const variant = service?.variants.find((v) => v.id === variantId) ?? null;
  const [day, setDay] = useState<ISODate | null>(initialWhen?.slice(0, 10) ?? (service?.requiresSlot ? (openDays[0] ?? null) : null));
  const [time, setTime] = useState<string | null>(initialWhen?.slice(11, 16) ?? null);
  const [timed, setTimed] = useState<boolean>(!!initialWhen || !!service?.requiresSlot);
  const partyMax = service?.maxParty ?? 12;
  const partyMin = service?.minParty ?? 1;
  const [party, setParty] = useState(initial?.partySize ?? Math.max(partyMin, Math.min(ctx.party, partyMax)));
  const duration = variant?.durationMinutes ?? service?.durationMinutes ?? 60;
  const [hours, setHours] = useState(initial?.hours ?? Math.max(1, Math.ceil(duration / 60)));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [discreet, setDiscreet] = useState(initial?.discreet ?? false);
  const channels = contactChannels.filter((c) => c !== "EMAIL" || ctx.hasEmail);
  const [contact, setContact] = useState<ContactPreference>(initial?.contactPreference ?? (defaultContact && channels.includes(defaultContact) ? defaultContact : (channels[0] ?? "SMS")));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState<{ request: ConciergeRequestView; payment: PaymentLink | null } | null>(null);
  const key = useRef(newKey());

  const quoted = needsQuote(service);
  const free = service?.pricing === "FREE";
  const canFolio = ctx.kind === "trip" && ctx.folioOpen && ctx.payments.folio;
  const canOnline = ctx.kind === "trip" ? ctx.payments.online : true;
  const [pay, setPay] = useState<PaymentMethod>(canFolio ? "FOLIO" : "ONLINE");
  const payMethod: PaymentMethod = !canFolio ? "ONLINE" : !canOnline ? "FOLIO" : pay;

  // Slots from the API for services booked by the slot (it knows what is already taken).
  const [slotDay, setSlotDay] = useState<{ date: string; slots: { time: string; available: boolean; reason: string | null }[] } | null>(null);
  useEffect(() => {
    if (!service?.requiresSlot || !day || !timed) return;
    const ctl = new AbortController();
    call<{ date: string; slots: { start: string; available: boolean; reason: string | null }[] }>(
      `public/hotels/${encodeURIComponent(ctx.hotelSlug)}/concierge/services/${encodeURIComponent(service.id)}/slots`,
      { query: { date: day }, signal: ctl.signal },
    )
      .then((r) =>
        setSlotDay({
          date: day,
          slots: (r.slots ?? []).map((x) => ({
            time: /^\d{2}:\d{2}$/.test(x.start) ? x.start : new Date(Date.parse(x.start) + 3600_000).toISOString().slice(11, 16),
            available: x.available !== false,
            reason: x.reason ?? null,
          })),
        }),
      )
      .catch(() => undefined);
    return () => ctl.abort();
  }, [service, day, timed, ctx.hotelSlug]);

  const cond = { answers, adults: party, children: 0 };
  const visible = form.fields.filter((f) => isVisible(f, form, cond));
  const liveSlots = service?.requiresSlot && slotDay && slotDay.date === day ? slotDay.slots : null;
  const slots = liveSlots ? liveSlots.map((x) => x.time) : service && day ? slotsFor(service, day, nowMs) : [];
  const unavailable = new Set(liveSlots?.filter((x) => !x.available).map((x) => x.time) ?? []);
  const showParty = !freeForm && (service!.pricing === "PER_PERSON" || /^(DINING|TOURS_AND_EXPERIENCES|NIGHTLIFE_RESERVATIONS|EVENTS)$/.test(service!.category));
  const showHours = !freeForm && service!.pricing === "PER_HOUR";
  const offerPrivate = freeForm || !!service?.discreetEligible;
  const estimate = service ? estimateKobo(service, party, hours, variantId) : null;
  const preferredAt = timed && day && time ? lagosISO(day, time) : null;
  const effectiveContact: ContactPreference = channels.includes(contact) ? contact : (channels[0] ?? "SMS");

  const setAnswer = (k: string, v: AnswerValue) => {
    setAnswers((a) => ({ ...a, [k]: v }));
    setErrors(({ [k]: _drop, ...rest }) => (void _drop, rest));
  };

  function check(): Record<string, string> {
    const e: Record<string, string> = {};
    if (service && service.variants.length > 1 && !variantId) e.variantId = "Choose one.";
    for (const f of visible) {
      const m = checkField(f, answers[f.key]);
      if (m) e[f.key] = m;
    }
    if (freeForm && notes.trim().length < 5) e.notes = "Tell the concierge what you would like arranged.";
    if (service?.requiresSlot && !preferredAt) e.when = openDays.length ? "Choose a day and a time." : "There is no time left during your stay for this; ask the concierge instead.";
    else if (timed && !preferredAt) e.when = "Choose a time, or switch to “Any time”.";
    return e;
  }

  const body = () => {
    const out: Record<string, unknown> = {};
    for (const f of visible) {
      const v = answers[f.key];
      if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) continue;
      out[f.key] = typeof v === "string" ? v.trim() : v;
    }
    return {
      ...(service ? { serviceId: service.id } : { requestText: notes.trim() }),
      ...(variantId ? { variantId } : {}),
      answers: out,
      ...(preferredAt ? { preferredStart: preferredAt } : {}),
      ...(showParty ? { partySize: party } : {}),
      ...(showHours ? { hours } : {}),
      ...(service && notes.trim() ? { notes: notes.trim() } : {}),
      discreet: offerPrivate ? discreet : false,
      contactPreference: effectiveContact,
      ...(ctx.kind === "trip" && service && !quoted && !free ? { paymentMethod: payMethod } : {}),
      source: ctx.kind === "draft" ? ("BOOKING_FLOW" as const) : ("TRIP_PAGE" as const),
    };
  };

  /** Server issues under their fields (API-M8 6.8 paths). */
  function showIssues(err: ClientApiError) {
    const fe: Record<string, string> = {};
    const issues = ((err.details as { issues?: { path: string; message: string }[] })?.issues ?? []).concat(
      Object.entries(err.fields).map(([path, m]) => ({ path, message: m.join(" ") })),
    );
    for (const i of issues) {
      const k = i.path.replace(/^answers\./, "");
      if (/^preferred/.test(i.path)) fe.when = i.message;
      else if (i.path === "requestText" || i.path === "notes") fe.notes = i.message;
      else if (i.path === "variantId") fe.variantId = i.message;
      else if (i.path === "contactPreference") fe.contact = i.message;
      else if (i.path === "paymentMethod") fe.pay = i.message;
      else if (form.fields.some((f) => f.key === k)) fe[k] = i.message;
    }
    setErrors(fe);
    setProblem(Object.keys(fe).length ? "Please check the highlighted answers." : err.message);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = check();
    setErrors(found);
    setProblem(null);
    if (Object.keys(found).length) {
      setTimeout(() => document.querySelector<HTMLElement>(`[data-form="${uid}"] [aria-invalid="true"], [data-form="${uid}"] [role="alert"]`)?.focus?.(), 30);
      return;
    }
    const b = body();
    if (ctx.kind === "draft") {
      onDraft?.({
        key: initial?.key ?? key.current,
        serviceId: service?.id ?? null,
        variantId,
        title: service ? (variant ? `${service.name}, ${variant.name}` : service.name) : "Something else",
        answers: b.answers,
        preferredAt,
        partySize: showParty ? party : null,
        hours: showHours ? hours : null,
        notes: notes.trim(),
        discreet: !!b.discreet,
        contactPreference: effectiveContact,
        estimateKobo: estimate,
        priceLine: service ? (variant ? formatNaira(variant.priceKobo) : priceLine(service)) : "Priced for you",
      });
      return;
    }
    setBusy(true);
    try {
      const raw = await call<{ request?: unknown; payment?: PaymentLink | null }>(`public/trips/${encodeURIComponent(ctx.code)}/concierge/requests`, {
        method: "POST",
        query: { t: ctx.token },
        body: b,
        idempotencyKey: key.current,
        timeoutMs: 20_000,
      });
      const r = normaliseRequest(raw?.request ?? raw);
      if (!r) throw new ClientApiError(500, "BAD_RESPONSE", "The request was sent, but we could not read the answer. Refresh to see it.");
      setSent({ request: r, payment: raw?.payment ?? null });
      onSent?.(r);
    } catch (err) {
      if (err instanceof ClientApiError && err.code === "VALIDATION_ERROR") showIssues(err);
      else if (err instanceof ClientApiError && err.code === "CONCIERGE_DISABLED") setProblem("The concierge is not taking requests just now. Please call the front desk.");
      else setProblem(humanError(err, "The request could not be sent. Nothing has been charged; please try again."));
      key.current = newKey();
    } finally {
      setBusy(false);
    }
  }

  if (sent) return <SentState request={sent.request} payment={sent.payment} onClose={onCancel} />;

  const priceNow = variant ? { ...service!, priceKobo: variant.priceKobo, variants: [] } : service;

  return (
    <form onSubmit={submit} noValidate data-form={uid} className="space-y-8" data-testid="concierge-form">
      {service ? (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span className="num text-ink" data-testid="service-price">
            {priceLine(service)}
          </span>
          {durationLine(duration === 60 && !service.durationMinutes && !variant ? null : duration) ? <span>{durationLine(duration)}</span> : null}
          <span>{LOCATION_LINE[service.location]}</span>
        </p>
      ) : null}

      {service && service.variants.length > 1 ? (
        <fieldset>
          <legend className="kicker mb-3">Choose</legend>
          <div role="radiogroup" className="grid gap-2 sm:grid-cols-2" data-testid="variants">
            {service.variants.map((v) => {
              const on = v.id === variantId;
              return (
                <label
                  key={v.id}
                  className={`flex cursor-pointer items-baseline justify-between gap-3 rounded-sm border px-3.5 py-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-laterite ${
                    on ? "border-laterite bg-laterite/[0.06]" : "border-line-strong hover:border-ink-muted"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name={`${uid}-variant`}
                    checked={on}
                    onChange={() => {
                      setVariantId(v.id);
                      setErrors(({ variantId: _v, ...r }) => (void _v, r));
                    }}
                  />
                  <span className="font-medium">{v.name}</span>
                  <span className="num text-ink-muted">{service.pricing === "FROM" ? `From ${formatNaira(v.priceKobo)}` : formatNaira(v.priceKobo)}</span>
                </label>
              );
            })}
          </div>
          {errors.variantId ? (
            <p role="alert" className="mt-2 text-xs text-danger">
              {errors.variantId}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {visible.length ? (
        <fieldset className="space-y-6">
          <legend className="kicker mb-4">A few details</legend>
          {visible.map((f) => (
            <FormFieldInput key={f.key} field={f} value={answers[f.key]} onChange={(v) => setAnswer(f.key, v)} error={errors[f.key]} required={f.required === "REQUIRED"} testId={`q-${f.key}`} />
          ))}
        </fieldset>
      ) : null}

      {freeForm ? (
        <div>
          <label htmlFor={`${uid}-ask`} className="mb-2 block text-sm font-medium">
            What would you like?
          </label>
          <textarea
            id={`${uid}-ask`}
            className="field min-h-32 resize-y"
            value={notes}
            maxLength={1000}
            aria-invalid={!!errors.notes || undefined}
            aria-describedby={`${uid}-ask-hint`}
            placeholder="A cake for Saturday evening, a tailor who can take in a suit, tickets for a show..."
            onChange={(e) => {
              setNotes(e.target.value);
              if (errors.notes) setErrors(({ notes: _n, ...r }) => (void _n, r));
            }}
            data-testid="free-form-ask"
          />
          <p id={`${uid}-ask-hint`} className={`mt-1.5 text-xs ${errors.notes ? "text-danger" : "text-ink-muted"}`} role={errors.notes ? "alert" : undefined}>
            {errors.notes ?? "In your own words. A person reads it and comes back to you, usually with a price."}
          </p>
        </div>
      ) : null}

      <fieldset>
        <legend className="kicker mb-3">When</legend>
        {!service?.requiresSlot ? (
          <div role="radiogroup" aria-label="When" className="mb-4 inline-grid grid-cols-2 rounded-sm border border-line-strong p-1 text-sm">
            {(
              [
                [false, freeForm ? "Whenever suits" : "Any time"],
                [true, "Choose a time"],
              ] as const
            ).map(([v, l]) => (
              <label key={l} className={`flex min-w-28 cursor-pointer items-center justify-center rounded-xs px-4 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laterite ${timed === v ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"}`}>
                <input
                  type="radio"
                  className="sr-only"
                  name={`${uid}-timed`}
                  checked={timed === v}
                  onChange={() => {
                    setTimed(v);
                    if (v && !day) setDay(openDays[0] ?? days[0] ?? null);
                    setErrors(({ when: _w, ...r }) => (void _w, r));
                  }}
                />
                {l}
              </label>
            ))}
          </div>
        ) : null}
        {timed ? (
          <SlotPicker
            days={service ? openDays : days}
            today={ctx.today}
            day={day}
            setDay={(d) => {
              setDay(d);
              setTime(null);
            }}
            slots={service ? slots : FREE_SLOTS}
            unavailable={unavailable}
            loading={!!service?.requiresSlot && !liveSlots}
            time={time}
            setTime={(t) => {
              setTime(t);
              setErrors(({ when: _w, ...r }) => (void _w, r));
            }}
            lead={service?.leadTimeHours ?? 0}
          />
        ) : (
          <p className="text-sm text-ink-muted">{freeForm ? "The concierge will ask if timing matters." : "The concierge will suggest a time and confirm it with you."}</p>
        )}
        {errors.when ? (
          <p role="alert" className="mt-2 text-xs text-danger" data-testid="when-error">
            {errors.when}
          </p>
        ) : null}
      </fieldset>

      {showParty || showHours ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {showParty ? (
            <div className="rounded-sm border border-line px-4 py-3">
              <GuestsStepper value={party} onChange={setParty} min={partyMin} max={partyMax} label="How many people" layout="row" />
            </div>
          ) : null}
          {showHours ? (
            <div className="rounded-sm border border-line px-4 py-3">
              <GuestsStepper value={hours} onChange={setHours} min={1} max={24} label="Hours" layout="row" />
            </div>
          ) : null}
        </div>
      ) : null}

      {!freeForm ? (
        <div>
          <label htmlFor={`${uid}-notes`} className="mb-2 flex items-baseline justify-between text-sm font-medium">
            Anything else we should know <span className="text-xs font-normal text-ink-muted">Optional</span>
          </label>
          <textarea id={`${uid}-notes`} className="field min-h-24 resize-y" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="concierge-notes" />
          {errors.notes ? (
            <p role="alert" className="mt-1.5 text-xs text-danger">
              {errors.notes}
            </p>
          ) : null}
        </div>
      ) : null}

      {offerPrivate ? (
        <div className={`rounded-md border p-4 transition-colors ${discreet ? "border-adire/45 bg-adire/[0.05]" : "border-line"}`} data-testid="discreet-block">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 size-[18px] shrink-0 accent-[var(--adire)]" checked={discreet} onChange={(e) => setDiscreet(e.target.checked)} data-testid="discreet-toggle" />
            <span>
              <span className="flex items-center gap-2 font-medium">
                <LockSimple size={16} weight={discreet ? "fill" : "regular"} className="text-adire" aria-hidden /> Keep this private
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-ink-muted" data-testid="discreet-copy">
                Only the concierge team sees this.
                {discreet ? (
                  <>
                    {" "}
                    It stays off the screens at the front desk, we contact you only the way you choose below and never through your room phone, and your bill will
                    simply say &ldquo;{neutralLabel || (service?.location === "IN_ROOM" ? "In-room service" : "Guest service")}&rdquo;.
                  </>
                ) : null}
              </span>
            </span>
          </label>
        </div>
      ) : null}

      <fieldset>
        <legend className="kicker mb-3">How should we reach you about it?</legend>
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-2" data-testid="contact-options">
          {channels.map((c) => {
            const I = CONTACT_ICON[c];
            const on = effectiveContact === c;
            return (
              <label
                key={c}
                className={`flex cursor-pointer items-center gap-3 rounded-sm border px-3.5 py-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-laterite ${
                  on ? "border-laterite bg-laterite/[0.06]" : "border-line-strong hover:border-ink-muted"
                }`}
              >
                <input type="radio" className="sr-only" name={`${uid}-contact`} value={c} checked={on} onChange={() => setContact(c)} data-testid={`contact-${c}`} />
                <I size={18} weight={on ? "fill" : "light"} className={on ? "text-laterite" : "text-ink-muted"} aria-hidden />
                {CONTACT_LABEL[c]}
              </label>
            );
          })}
        </div>
        {errors.contact ? (
          <p role="alert" className="mt-2 text-xs text-danger">
            {errors.contact}
          </p>
        ) : (
          <p className="mt-2 text-xs text-ink-muted">{effectiveContact === "IN_APP" ? "Nothing is sent; check back here for updates." : "Updates and any price come to you there."}</p>
        )}
      </fieldset>

      {ctx.kind === "trip" && service && !quoted && !free && canFolio && canOnline ? (
        <fieldset>
          <legend className="kicker mb-3">Paying</legend>
          <div role="radiogroup" className="grid gap-2 sm:grid-cols-2" data-testid="pay-options">
            {(
              [
                ["FOLIO", "Add to my bill", Receipt],
                ["ONLINE", "Pay now online", CreditCard],
              ] as const
            ).map(([m, l, I]) => (
              <label
                key={m}
                className={`flex cursor-pointer items-center gap-3 rounded-sm border px-3.5 py-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laterite ${
                  payMethod === m ? "border-laterite bg-laterite/[0.06]" : "border-line-strong hover:border-ink-muted"
                }`}
              >
                <input type="radio" className="sr-only" name={`${uid}-pay`} checked={payMethod === m} onChange={() => setPay(m)} data-testid={`concierge-pay-${m}`} />
                <I size={18} weight={payMethod === m ? "fill" : "light"} className={payMethod === m ? "text-laterite" : "text-ink-muted"} aria-hidden />
                {l}
              </label>
            ))}
          </div>
          {errors.pay ? (
            <p role="alert" className="mt-2 text-xs text-danger">
              {errors.pay}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      <div className="border-t border-line pt-5">
        <div className="flex items-baseline justify-between gap-4" aria-live="polite">
          <span className="text-sm text-ink-muted">{quoted ? "Price" : free ? "Price" : "Before any tax"}</span>
          <span className="num text-lg" data-testid="concierge-estimate">
            {!service ? "Priced for you" : quoted ? priceLine(priceNow!) : estimate === 0 ? "Complimentary" : estimate === null ? "Choose above" : formatNaira(estimate)}
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
          {quoted
            ? "You will get an exact price to accept before anything is booked or charged."
            : free
              ? "Nothing to pay. Confirmed when the time is free."
              : ctx.kind === "draft"
                ? "The concierge confirms it before you arrive; you pay for it separately from the room, online or on your bill."
                : payMethod === "FOLIO"
                  ? "Confirmed straight away when the time is free, and charged to your bill once it is done."
                  : "Confirmed as soon as it is paid. Taxes, if any, are added on the next page."}
        </p>
        {problem ? (
          <p role="alert" className="mt-4 text-sm text-danger" data-testid="concierge-problem">
            {problem}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {onCancel ? (
            <button type="button" className="btn btn-outline" onClick={onCancel}>
              {ctx.kind === "draft" && initial ? "Keep as it was" : "Not now"}
            </button>
          ) : null}
          <button type="submit" className="btn btn-primary" disabled={busy} data-testid="concierge-submit">
            {busy ? "Sending" : ctx.kind === "draft" ? (initial ? "Save changes" : "Add to my stay") : quoted ? "Ask for a price" : "Request it"}
          </button>
        </div>
      </div>
    </form>
  );
}

/** For "something else": any half hour from morning to late evening. */
const FREE_SLOTS = Array.from({ length: 31 }, (_, i) => `${String(7 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

function SlotPicker({
  days,
  today,
  day,
  setDay,
  slots,
  unavailable,
  loading,
  time,
  setTime,
  lead,
}: {
  days: ISODate[];
  today: ISODate;
  day: ISODate | null;
  setDay: (d: ISODate) => void;
  slots: string[];
  unavailable: Set<string>;
  loading: boolean;
  time: string | null;
  setTime: (t: string) => void;
  lead: number;
}) {
  if (!days.length) return <p className="text-sm text-ink-muted">No times are left during your stay. The concierge may still be able to help: ask for something else.</p>;
  const parts = [
    ["Morning", slots.filter((s) => s < "12:00")],
    ["Afternoon", slots.filter((s) => s >= "12:00" && s < "17:00")],
    ["Evening", slots.filter((s) => s >= "17:00")],
  ] as const;
  return (
    <div data-testid="slot-picker">
      <div role="radiogroup" aria-label="Day" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((d) => {
          const on = d === day;
          const [w, n, m] = dayWords(d).split(" ");
          const rel = dayWords(d, today);
          return (
            <label
              key={d}
              className={`flex min-w-[4.25rem] shrink-0 cursor-pointer flex-col items-center rounded-sm border px-2 py-2 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laterite ${
                on ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink-muted"
              }`}
              data-testid={`day-${d}`}
            >
              <input type="radio" className="sr-only" name="concierge-day" checked={on} onChange={() => setDay(d)} aria-label={`${rel === w ? "" : `${rel}, `}${w} ${n} ${m}`} />
              <span className={`text-[11px] uppercase tracking-[0.12em] ${on ? "text-paper/75" : "text-ink-muted"}`}>{rel === "Today" || rel === "Tomorrow" ? rel.slice(0, 3) : w}</span>
              <span className="num text-lg leading-tight">{n}</span>
              <span className={`text-[11px] ${on ? "text-paper/75" : "text-ink-muted"}`}>{m}</span>
            </label>
          );
        })}
      </div>
      {day ? (
        loading ? (
          <div className="mt-4 flex flex-wrap gap-1.5" aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="skeleton h-8 w-16 rounded-xs" />
            ))}
          </div>
        ) : slots.some((s) => !unavailable.has(s)) ? (
          <div className="mt-4 space-y-3" role="radiogroup" aria-label="Time">
            {parts.map(([label, list]) =>
              list.length ? (
                <div key={label} className="grid grid-cols-[5.5rem_1fr] items-start gap-3">
                  <span className="pt-2 text-xs text-ink-muted">{label}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((t) => {
                      const taken = unavailable.has(t);
                      return (
                        <label
                          key={t}
                          className={`num rounded-xs border px-2.5 py-1.5 text-[13px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laterite ${
                            taken ? "cursor-not-allowed border-line text-ink-muted/60 line-through" : t === time ? "cursor-pointer border-laterite bg-laterite text-laterite-ink" : "cursor-pointer border-line hover:border-ink-muted"
                          }`}
                          data-testid={`slot-${t}`}
                        >
                          <input type="radio" className="sr-only" name="concierge-time" disabled={taken} checked={t === time} onChange={() => setTime(t)} aria-label={`${clock12(t)}${taken ? ", taken" : ""}`} />
                          {clock12(t).replace(":00", "")}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null,
            )}
            {lead ? <p className="text-xs text-ink-muted">Needs {lead === 1 ? "an hour" : `${lead} hours`} notice; later times only.</p> : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">Nothing is free that day. Try another.</p>
        )
      ) : null}
    </div>
  );
}

function SentState({ request, payment, onClose }: { request: ConciergeRequestView; payment: PaymentLink | null; onClose?: () => void }) {
  const w = statusWords(request);
  const confirmed = request.status === "CONFIRMED" || request.status === "SCHEDULED";
  const toPay = payment?.authorizationUrl ?? (request.payment.status === "PENDING" ? request.payment.authorizationUrl : null);
  return (
    <div role="status" className="py-4" data-testid="concierge-sent" data-status={request.status}>
      <CheckCircle size={36} weight="light" className={confirmed ? "text-palm" : "text-laterite"} aria-hidden />
      <h3 className="display-sm mt-3 text-2xl">{confirmed ? "Confirmed" : toPay ? "One step left" : request.serviceId ? "Request received" : "Thank you"}</h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">
        {confirmed ? "It is arranged. You will find it with your booking." : toPay ? "Pay to confirm it. The time is held while you do." : w.line}
        {request.discreet ? " It is private: only the concierge team can see it." : ""}
      </p>
      {request.number ? <p className="num mt-4 text-sm">{request.number}</p> : null}
      <div className="mt-6 flex flex-wrap gap-3">
        {toPay ? (
          <a href={toPay} className="btn btn-primary" data-testid="concierge-pay">
            Pay {formatNaira(payment?.amountKobo ?? request.price?.totalKobo ?? null)} <ArrowRight size={15} aria-hidden />
          </a>
        ) : null}
        {onClose ? (
          <button type="button" className={`btn ${toPay ? "btn-outline" : "btn-ink"}`} onClick={onClose}>
            {toPay ? "Pay later" : "Done"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
