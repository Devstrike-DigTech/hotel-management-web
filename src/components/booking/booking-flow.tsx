"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bed,
  CalendarBlank,
  Check,
  Clock,
  CloudSlash,
  Info,
  Moon,
  Ruler,
  SealCheck,
  SignOut,
  Sun,
  UsersThree,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BookingChannel, GuestAccount, HotelBookingInfo, Quote, RoomTypeAvailability } from "@/lib/booking-types";
import { call, draft } from "@/lib/client-api";
import { addDays, diffDays, formatMonthShort, formatShort, formatWeekday, type ISODate } from "@/lib/dates";
import { formatClock, formatNaira, formatPhone, toE164Digits } from "@/lib/format";
import type { RoomTypePublic } from "@/lib/types";
import { useOnline } from "@/lib/use-online";
import { notifySession, useGuestHint } from "../account/account-link";
import { PhoneSignIn } from "../account/phone-sign-in";
import { GuestsStepper } from "../search/guests-stepper";
import { RangeCalendar, type Range } from "../search/range-calendar";
import { useMedia } from "../search/use-dismiss";
import { FieldError, Notice } from "../ui/field";
import { Plate } from "../ui/plate";
import { BookingReview, type Held } from "./booking-review";
import { BookingSummary } from "./booking-summary";
import { PlanChoice } from "./rate-plans";
import { useAvailability, type AvailabilityQuery } from "./use-availability";
import { usePriceCalendar } from "./use-price-calendar";
import { plansFor, planTitle, type PlanOffer } from "@/lib/rates";
import {
  answerFields,
  checkField,
  groupBySection,
  GUEST_KEYS,
  isAddOnField,
  isVisible,
  issueTarget,
  transfersFor,
  type Answers,
  type AnswerValue,
  type ExtraSelection,
  type FormField,
  type PickupAnswer,
  type PublicBookingForm,
  type PublicExtra,
  type ValidationIssue,
} from "@/lib/booking-form";
import { ExtrasPicker } from "./extras-picker";
import { FormFieldInput } from "./form-fields";
import { checkPickup, PickupBlock, type PickupContext } from "./pickup-block";
import type { ConciergeCatalogue } from "@/lib/concierge";
import { ArrangedSummary, ArrangeStep, sendDrafts } from "../concierge/arrange-step";
import type { DraftRequest } from "../concierge/request-form";

export interface BookingHotel {
  slug: string;
  name: string;
  area: string;
  city: string;
  address: string;
  phone: string | null;
  email: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  coverImageUrl: string | null;
  roomTypes: RoomTypePublic[];
  booking: HotelBookingInfo | null;
  /** M5: the hotel group's name, for "points with The Palmwine House". */
  groupName?: string | null;
}

export interface BookingSite {
  channel: BookingChannel;
  /** Path of the confirmation page on this site, e.g. "/booking/confirmation" or "/h/slug/booking/confirmation". */
  confirmPath: string;
  /** Absolute origin + path Paystack should return to; computed in the browser when omitted. */
  hotelHref: string;
  devMode: boolean;
  /** The platform's name, or null on a white-labelled hotel's own domain. */
  appName: string | null;
}

export type StayKind = "overnight" | "dayuse";
export interface DayUse {
  date: ISODate;
  from: string;
  hours: number;
}
export interface GuestForm {
  fullName: string;
  phone: string;
  email: string;
}

type StepKey = "stay" | "details" | "addons" | "arrange" | "review";
const STEP_LABEL: Record<StepKey, string> = { stay: "Your stay", details: "Your details", addons: "Extras and getting here", arrange: "For your stay", review: "Review and pay" };
const WORDS = ["one", "two", "three", "four", "five"];

interface Draft {
  v: 3;
  guest: GuestForm;
  answers: Answers;
  extras: ExtraSelection[];
  /** M8: requests for the concierge, sent once the booking exists. */
  arranged?: DraftRequest[];
  held: (Held & { roomId: string; planId?: string; kind: StayKind; range: Range; dayUse: DayUse; adults: number; children: number }) | null;
}

/** Errors on the form, keyed by field key (and "fieldKey.sub" for parts of the pickup block, "extra:<id>" for extras). */
type FormErrors = Record<string, string>;

export function BookingFlow({
  hotel,
  site,
  today,
  initial,
  form,
  preview = null,
  concierge = null,
}: {
  hotel: BookingHotel;
  site: BookingSite;
  today: ISODate;
  initial: { room: string | null; plan?: string | null; checkIn: ISODate | null; checkOut: ISODate | null; guests: number; arrange?: string | null };
  /** M8: the concierge services the hotel offers while booking (channel BOOKING_FLOW), or null. */
  concierge?: ConciergeCatalogue | null;
  /** M7: the hotel's published booking form for this channel (or the draft in preview). */
  form: PublicBookingForm;
  /** M7: the preview token when the admin is previewing a draft form (booking is switched off). */
  preview?: string | null;
}) {
  const rooms = useMemo(() => [...hotel.roomTypes].sort((a, b) => a.basePriceKobo - b.basePriceKobo), [hotel.roomTypes]);
  const draftKey = `booking:${hotel.slug}:${site.channel}`;
  const [step, setStep] = useState(0);
  // M7: the form decides whether extras and the pickup get a step of their own.
  const guestFields = useMemo(() => answerFields(form), [form]);
  const hasAddOns = guestFields.some((f) => isAddOnField(f));
  // M8: "Anything we can arrange for your stay?" when the hotel offers services before arrival.
  const hasArrange = !!concierge?.services.some((s) => s.preArrival);
  const steps: StepKey[] = ["stay", "details", ...(hasAddOns ? (["addons"] as const) : []), ...(hasArrange ? (["arrange"] as const) : []), "review"];
  const stepKey: StepKey = step < 0 ? "review" : steps[Math.min(step, steps.length - 1)];
  const reviewIndex = steps.length - 1;
  const [roomId, setRoomId] = useState<string | undefined>(rooms.some((r) => r.id === initial.room) ? initial.room! : undefined);
  const [kind, setKind] = useState<StayKind>("overnight");
  const [planPick, setPlanPick] = useState<string | undefined>(initial.plan ?? undefined);
  const [range, setRange] = useState<Range>({ checkIn: initial.checkIn, checkOut: initial.checkOut });
  const [dayUse, setDayUse] = useState<DayUse>({ date: today, from: "12:00", hours: 3 });
  const [adults, setAdults] = useState(Math.max(1, Math.min(initial.guests, 10)));
  const [children, setChildren] = useState(0);
  const [guest, setGuest] = useState<GuestForm>({ fullName: "", phone: "", email: "" });
  const [answers, setAnswers] = useState<Answers>({});
  const [extras, setExtras] = useState<ExtraSelection[]>([]);
  const [arranged, setArranged] = useState<DraftRequest[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [errors, setErrors] = useState<Partial<Record<keyof GuestForm | "dates" | "room" | "plan", string>>>({});
  const [held, setHeld] = useState<Held | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [account, setAccount] = useState<GuestAccount | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const wide = useMedia("(min-width: 40rem)", true);
  const online = useOnline();
  const hint = useGuestHint();

  const room = rooms.find((r) => r.id === roomId);
  const dayUseAllowed = !!hotel.booking?.dayUseAvailable;
  const canDayUse = dayUseAllowed && !!room?.hourlyPriceKobo;
  const effectiveKind: StayKind = canDayUse ? kind : "overnight";
  const nights = range.checkIn && range.checkOut ? diffDays(range.checkIn, range.checkOut) : 0;
  const onlineOff = hotel.booking ? !hotel.booking.onlineBookingEnabled : false;

  const query: AvailabilityQuery | null =
    effectiveKind === "dayuse"
      ? { stayType: "DAY_USE", date: dayUse.date, startTime: dayUse.from, hours: dayUse.hours, adults, children, channel: site.channel }
      : range.checkIn && range.checkOut
        ? { stayType: "NIGHTLY", checkIn: range.checkIn, checkOut: range.checkOut, adults, children, channel: site.channel }
        : null;
  const availability = useAvailability(hotel.slug, query);
  const liveFor = (id: string): RoomTypeAvailability | null => availability.data?.roomTypes.find((r) => r.roomType.id === id) ?? null;
  const live = roomId ? liveFor(roomId) : null;
  const plansOf = (r: RoomTypePublic) => (effectiveKind === "overnight" ? plansFor(r, liveFor(r.id)) : []);
  const plans: PlanOffer[] = room ? plansOf(room) : [];
  // The guest's pick when it is on offer for this room, else the first rate that can be booked.
  const plan = plans.find((p) => p.id === planPick && (p.bookable || !p.quote)) ?? plans.find((p) => p.bookable) ?? plans[0];
  const calendar = usePriceCalendar(hotel.slug, adults, children, effectiveKind === "overnight");

  /* Restore: guest details always; a room hold only while it is still running (back from Paystack). */
  useEffect(() => {
    const d = draft.get<Draft>(draftKey);
    if (!d || d.v !== 3) return;
    const t = setTimeout(() => {
      setGuest((g) => ({ ...g, ...d.guest }));
      setAnswers((a) => ({ ...d.answers, ...a }));
      setExtras((x) => (x.length ? x : (d.extras ?? [])));
      setArranged((x) => (x.length ? x : (d.arranged ?? [])));
      if (d.held && new Date(d.held.holdExpiresAt).getTime() > Date.now()) {
        setRoomId(d.held.roomId);
        if (d.held.planId) setPlanPick(d.held.planId);
        setKind(d.held.kind);
        setRange(d.held.range);
        setDayUse(d.held.dayUse);
        setAdults(d.held.adults);
        setChildren(d.held.children);
        setHeld({ ...d.held, restored: true });
        setStep(Number.MAX_SAFE_INTEGER);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [draftKey]);

  useEffect(() => {
    draft.set(draftKey, {
      v: 3,
      guest,
      answers,
      extras,
      arranged,
      held: held && roomId ? { ...held, roomId, planId: plan?.id, kind: effectiveKind, range, dayUse, adults, children } : null,
    } satisfies Draft);
  }, [draftKey, guest, answers, extras, arranged, held, roomId, plan?.id, effectiveKind, range, dayUse, adults, children]);

  /* A signed-in guest: fetch the account and fill in what we know. */
  useEffect(() => {
    if (!hint) return;
    const ctl = new AbortController();
    call<GuestAccount>("guest/me", { signal: ctl.signal })
      .then((me) => {
        setAccount(me);
        setGuest((g) => ({
          ...g,
          fullName: g.fullName || me.fullName || "",
          phone: g.phone || (me.phone ? `0${toE164Digits(me.phone).slice(3)}` : ""),
          email: g.email || me.email || "",
        }));
      })
      .catch(() => undefined);
    return () => ctl.abort();
  }, [hint]);

  const shownStep = useRef(step);
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    topRef.current?.focus({ preventScroll: true });
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const cond = useMemo(() => ({ answers, adults, children }), [answers, adults, children]);
  const visible = useCallback((f: FormField) => isVisible(f, form, cond), [form, cond]);
  const detailFields = guestFields.filter((f) => !isAddOnField(f) && visible(f));
  const addOnFields = guestFields.filter((f) => isAddOnField(f) && visible(f));
  const pickupField = addOnFields.find((f) => f.type === "PICKUP") ?? null;
  const extraField = addOnFields.find((f) => f.type === "EXTRA") ?? null;
  const pickupAnswer = pickupField ? (answers[pickupField.key] as PickupAnswer | undefined) : undefined;
  const persons = adults + children;
  const pickupCtx: PickupContext = {
    arrivalDate: effectiveKind === "dayuse" ? dayUse.date : range.checkIn,
    departureDate: effectiveKind === "dayuse" ? dayUse.date : range.checkOut,
    checkOutTime: hotel.checkOutTime,
    guestPhone: guest.phone,
    party: persons,
    hotelPhone: hotel.phone,
  };

  /* M7: extras priced for the chosen dates and party (the form's own list is the fallback). */
  const [liveExtras, setLiveExtras] = useState<{ key: string; list: PublicExtra[] } | null>(null);
  const extrasKey = extraField && stepKey === "addons" ? JSON.stringify([effectiveKind, range, dayUse, adults, children]) : null;
  useEffect(() => {
    if (!extrasKey) return;
    const ctl = new AbortController();
    const query =
      effectiveKind === "dayuse"
        ? { channel: site.channel, date: dayUse.date, startTime: dayUse.from, hours: dayUse.hours, adults, children }
        : { channel: site.channel, checkIn: range.checkIn, checkOut: range.checkOut, adults, children };
    call<PublicExtra[]>(`public/hotels/${encodeURIComponent(hotel.slug)}/extras`, { query, signal: ctl.signal })
      .then((list) => setLiveExtras({ key: extrasKey, list: Array.isArray(list) ? list : [] }))
      .catch(() => undefined);
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extrasKey]);
  const extrasList = (liveExtras?.key === extrasKey && liveExtras.list.length ? liveExtras.list : form.extras).filter(
    (e) => !extraField?.extra?.categories || extraField.extra.categories.includes(e.category),
  );

  const setAnswer = (key: string, v: AnswerValue) => {
    setAnswers((a) => ({ ...a, [key]: v }));
    setFormErrors((e) => {
      if (!Object.keys(e).some((k) => k === key || k.startsWith(`${key}.`))) return e;
      const next = { ...e };
      for (const k of Object.keys(next)) if (k === key || k.startsWith(`${key}.`)) delete next[k];
      return next;
    });
  };
  const guestValue = (key: string) => (key === "fullName" ? guest.fullName : key === "phone" ? guest.phone : guest.email);
  const valueOf = (f: FormField): AnswerValue | undefined => (GUEST_KEYS.has(f.key) ? guestValue(f.key) : answers[f.key]);

  /** Checks one step's fields; returns the errors (empty when it may continue). */
  function checkStep(key: StepKey): FormErrors {
    const e: FormErrors = {};
    const fields = key === "details" ? detailFields : key === "addons" ? addOnFields : [];
    for (const f of fields) {
      if (f.type === "PICKUP") {
        for (const [k, m] of Object.entries(checkPickup(answers[f.key] as PickupAnswer | undefined, form.pickup?.points ?? [], pickupCtx))) e[`${f.key}.${k}`] = m;
        continue;
      }
      // Email is only required to pay online; that is asked at review, once the guest has chosen.
      const m = checkField(f, valueOf(f), { emailRequired: false });
      if (m) e[f.key] = m;
    }
    return e;
  }

  function next() {
    const e: typeof errors = {};
    if (stepKey === "stay") {
      if (!room) e.room = "Choose a room type.";
      else if (live && !live.bookable)
        e.room =
          live.unavailableReason === "CAPACITY"
            ? `The ${room.name} sleeps ${room.capacity}. Choose a larger room or fewer guests.`
            : "That room type is full for these dates. Choose another, or change the dates.";
      if (effectiveKind === "overnight" && !nights) e.dates = "Choose your check-in and check-out days.";
      else if (plan && !e.room) {
        if (plan.quote && !plan.bookable) e.plan = plan.reason ?? `The ${planTitle(plan)} rate is not available for these dates. Choose another rate.`;
        else if (plan.minNights && nights < plan.minNights) e.plan = `The ${planTitle(plan)} rate needs at least ${plan.minNights} nights; your stay is ${nights}.`;
      }
    }
    setErrors(e);
    const fe = checkStep(stepKey);
    setFormErrors(fe);
    if (Object.keys(e).length || Object.keys(fe).length) {
      // Take the guest to the first problem.
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus?.(), 50);
      return;
    }
    setFlash(null);
    setStep((s) => Math.min(s + 1, reviewIndex));
  }

  /** Server issues (quote or booking): back to the step that holds the first one, each under its field. */
  const showIssues = (issues: ValidationIssue[], message?: string) => {
      const fe: FormErrors = {};
      const ge: typeof errors = {};
      let target: StepKey = "review";
      const rank = (k: StepKey) => steps.indexOf(k);
      const want = (k: StepKey) => {
        if (rank(k) >= 0 && rank(k) < rank(target)) target = k;
      };
      for (const i of issues) {
        const t = issueTarget(i.path);
        if (!t) continue;
        if (t.kind === "guest") {
          if (t.key === "email") {
            fe.email = i.message;
            continue; // shown at review, beside the payment choice
          }
          fe[t.key] = i.message;
          want("details");
        } else if (t.kind === "answer") {
          fe[t.sub ? `${t.key}.${t.sub}` : t.key] = i.message;
          const f = form.fields.find((x) => x.key === t.key);
          want(f && isAddOnField(f) ? "addons" : "details");
        } else if (t.kind === "extras") {
          const sel = extras[t.index];
          if (sel) fe[`extra:${sel.extraId}`] = i.message;
          want("addons");
        } else if (t.kind === "transfers" && pickupField) {
          const sub = t.sub === "scheduledAt" ? (transfersFor(pickupAnswer)[t.index]?.direction === "DEPARTURE" ? "departure.scheduledAt" : "scheduledAt") : (t.sub ?? "pickupPointId");
          fe[`${pickupField.key}.${sub}`] = i.message;
          want("addons");
        }
      }
      setFormErrors(fe);
      setErrors(ge);
      setHeld(null);
      setFlash(message ?? (target === "review" ? null : "Please check the highlighted answers."));
      setStep(rank(target));
  };

  async function signOut() {
    try {
      await fetch("/api/session/logout", { method: "POST" });
    } catch {}
    notifySession();
    setAccount(null);
  }

  const transfers = transfersFor(pickupAnswer && pickupField && visible(pickupField) ? pickupAnswer : null);
  const chosenExtras = extraField ? extras.filter((x) => extrasList.some((e) => e.id === x.extraId && e.available !== false)) : [];
  const quoteRequest = room
    ? {
        hotelSlug: hotel.slug,
        roomTypeId: room.id,
        ...(plan && effectiveKind === "overnight" ? { ratePlanId: plan.id } : {}),
        channel: site.channel,
        ...(effectiveKind === "dayuse"
          ? { stayType: "DAY_USE" as const, date: dayUse.date, startTime: dayUse.from, hours: dayUse.hours }
          : { stayType: "NIGHTLY" as const, checkIn: range.checkIn!, checkOut: range.checkOut! }),
        adults,
        children,
        ...(chosenExtras.length ? { extras: chosenExtras } : {}),
        ...(transfers.length ? { transfers } : {}),
      }
    : null;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
      <div className="min-w-0">
        <Stepper labels={steps.map((k) => (k === "addons" && steps.length > 4 ? "Extras" : STEP_LABEL[k]))} step={steps.indexOf(stepKey)} locked={!!held} onStep={(i) => i < steps.indexOf(stepKey) && !held && setStep(i)} />
        {preview ? (
          <div className="mt-6">
            <Notice tone="info" title="Draft preview of the booking form">
              This is how guests will see your unpublished form. Everything works except the final booking.
            </Notice>
          </div>
        ) : null}
        {!online ? (
          <div className="mt-6">
            <Notice tone="warn" title="You are offline">
              <span className="inline-flex items-center gap-1.5">
                <CloudSlash size={15} aria-hidden /> Everything you have typed is kept on this phone. Carry on when the connection is back.
              </span>
            </Notice>
          </div>
        ) : null}
        {onlineOff ? (
          <div className="mt-6">
            <Notice tone="warn" title="This hotel is taking bookings by phone for now">
              {hotel.phone ? (
                <>
                  Call the front desk on <a className="num link-static text-ink" href={`tel:+${toE164Digits(hotel.phone)}`}>{formatPhone(hotel.phone)}</a>.
                </>
              ) : (
                "Please contact the hotel directly."
              )}
            </Notice>
          </div>
        ) : null}
        <div ref={topRef} tabIndex={-1} className="scroll-mt-28 pt-10 outline-none">
          {flash ? (
            <div className="mb-8">
              <Notice tone="warn" title={flash} />
            </div>
          ) : null}
          {stepKey === "stay" ? (
            <StepStay
              total={steps.length}
              rooms={rooms}
              roomId={roomId}
              setRoomId={setRoomId}
              kind={effectiveKind}
              setKind={setKind}
              canDayUse={canDayUse}
              range={range}
              setRange={setRange}
              dayUse={dayUse}
              setDayUse={setDayUse}
              adults={adults}
              setAdults={setAdults}
              kids={children}
              setKids={setChildren}
              today={today}
              errors={errors}
              wide={wide}
              hotel={hotel}
              liveFor={liveFor}
              availability={availability}
              nights={nights}
              plansOf={plansOf}
              plans={plans}
              plan={plan}
              setPlan={setPlanPick}
              calendar={calendar}
            />
          ) : null}
          {stepKey === "details" ? (
            <StepGuest
              n={1}
              total={steps.length}
              guest={guest}
              setGuest={(g) => {
                setGuest(g);
                setFormErrors((e) => {
                  const next = { ...e };
                  for (const k of GUEST_KEYS) if (g[k as keyof GuestForm] !== guest[k as keyof GuestForm]) delete next[k];
                  return next;
                });
              }}
              errors={formErrors}
              account={account}
              signingIn={signingIn}
              setSigningIn={setSigningIn}
              devMode={site.devMode}
              onSignedIn={(g) => {
                setAccount(g);
                setSigningIn(false);
                setGuest((cur) => ({
                  ...cur,
                  fullName: g.fullName || cur.fullName,
                  phone: g.phone ? `0${toE164Digits(g.phone).slice(3)}` : cur.phone,
                  email: g.email || cur.email,
                }));
              }}
              onSignOut={signOut}
              fields={detailFields}
              answers={answers}
              setAnswer={setAnswer}
              emailOptional={!form.rules.emailRequiredFor.includes("PAY_AT_HOTEL") && form.fields.find((f) => f.key === "email")?.required !== "REQUIRED"}
              upload={{ slug: hotel.slug, channel: site.channel, preview, maxFileMB: form.uploads.maxFileMB }}
            />
          ) : null}
          {stepKey === "addons" ? (
            <div data-testid="step-addons">
              <StepTitle n={2} total={steps.length}>
                Extras and <em className="accent">getting here</em>
              </StepTitle>
              <div className="space-y-12">
                {groupBySection(addOnFields).map((g) => (
                  <section key={g.name} aria-label={g.name} className="space-y-6">
                    <h3 className="kicker">{g.name}</h3>
                    {g.fields.map((f) =>
                      f.type === "PICKUP" ? (
                        <PickupBlock
                          key={f.key}
                          field={f}
                          points={form.pickup?.points ?? []}
                          companies={form.pickup?.transportCompanies ?? []}
                          routes={form.pickup?.trainRoutes ?? []}
                          value={answers[f.key] as PickupAnswer | undefined}
                          onChange={(v) => setAnswer(f.key, v)}
                          ctx={pickupCtx}
                          errors={Object.fromEntries(Object.entries(formErrors).filter(([k]) => k.startsWith(`${f.key}.`)).map(([k, v]) => [k.slice(f.key.length + 1), v]))}
                        />
                      ) : f.type === "EXTRA" ? (
                        <div key={f.key}>
                          {f.label ? <p className="mb-4 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">{f.helpText ?? "Add something to your stay. Priced for your dates and party; the exact total with tax is on the next page."}</p> : null}
                          {extrasList.length ? (
                            <ExtrasPicker
                              extras={extrasList}
                              value={extras}
                              onChange={setExtras}
                              persons={persons}
                              nights={effectiveKind === "dayuse" ? 1 : nights}
                              errors={Object.fromEntries(Object.entries(formErrors).filter(([k]) => k.startsWith("extra:")).map(([k, v]) => [k.slice(6), v]))}
                              loading={!!extrasKey && liveExtras?.key !== extrasKey}
                            />
                          ) : (
                            <p className="text-sm text-ink-muted">No extras are on offer for these dates.</p>
                          )}
                        </div>
                      ) : (
                        <FormFieldInput
                          key={f.key}
                          field={f}
                          value={answers[f.key]}
                          onChange={(v) => setAnswer(f.key, v)}
                          error={formErrors[f.key]}
                          required={f.required === "REQUIRED"}
                          upload={{ slug: hotel.slug, channel: site.channel, preview, maxFileMB: form.uploads.maxFileMB }}
                        />
                      ),
                    )}
                  </section>
                ))}
              </div>
            </div>
          ) : null}
          {stepKey === "arrange" && concierge ? (
            <ArrangeStep
              catalogue={concierge}
              drafts={arranged}
              setDrafts={setArranged}
              initialOpen={initial.arrange ?? null}
              ctx={{
                kind: "draft",
                arrivalDate: effectiveKind === "dayuse" ? dayUse.date : (range.checkIn ?? today),
                departureDate: effectiveKind === "dayuse" ? dayUse.date : (range.checkOut ?? range.checkIn ?? today),
                party: adults + children,
                hotelSlug: hotel.slug,
                today,
                hasEmail: !!guest.email.trim(),
              }}
              title={
                <StepTitle n={steps.indexOf("arrange")} total={steps.length}>
                  Anything we can <em className="accent">arrange</em> for your stay?
                </StepTitle>
              }
            />
          ) : null}
          {stepKey === "review" && quoteRequest ? (
            <BookingReview
              hotel={hotel}
              site={site}
              request={quoteRequest}
              guest={guest}
              setGuestEmail={(email) => {
                setGuest((g) => ({ ...g, email }));
                setFormErrors((e) => {
                  const { email: _drop, ...rest } = e;
                  void _drop;
                  return rest;
                });
              }}
              emailError={formErrors.email ?? null}
              form={form}
              answers={answers}
              cond={cond}
              stepOf={[steps.length - 1, steps.length]}
              preview={preview}
              plan={plans.length > 1 ? plan : undefined}
              held={held}
              setHeld={setHeld}
              onQuote={setQuote}
              onIssues={showIssues}
              onBack={(to, message) => {
                setHeld(null);
                setFlash(message ?? null);
                setStep(to === 0 ? 0 : steps.indexOf("details"));
              }}
              onEdit={(k) => setStep(steps.indexOf(k))}
              onDone={() => draft.set(draftKey, { v: 3, guest, answers: {}, extras: [], arranged: [], held: null } satisfies Draft)}
              arranged={<ArrangedSummary drafts={arranged} onEdit={held ? undefined : () => setStep(steps.indexOf("arrange"))} />}
              afterBooking={
                arranged.length && !preview
                  ? async (code, token) => {
                      const failed = await sendDrafts(code, token, arranged);
                      if (failed) draft.set(`concierge:failed:${code}`, failed);
                    }
                  : undefined
              }
            />
          ) : null}

          {stepKey !== "review" ? (
            <div className="mt-10 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              {step > 0 ? (
                <button type="button" className="btn btn-outline" onClick={() => setStep((s) => Math.max(0, Math.min(s, reviewIndex) - 1))}>
                  <ArrowLeft size={16} aria-hidden /> Back
                </button>
              ) : (
                <Link href={site.hotelHref} className="btn btn-outline">
                  <ArrowLeft size={16} aria-hidden /> Back to the hotel
                </Link>
              )}
              <button type="button" className="btn btn-primary group" onClick={next} disabled={onlineOff} data-testid="booking-next">
                {stepKey === "arrange" && !arranged.length ? "Nothing for now, continue" : `Continue to ${STEP_LABEL[steps[steps.indexOf(stepKey) + 1]].toLowerCase()}`}
                <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <aside aria-label="Booking summary" className={`lg:pt-2 ${stepKey === "review" ? "max-lg:hidden" : ""}`}>
        <div className="lg:sticky lg:top-24">
          <BookingSummary
            hotel={hotel}
            room={room}
            kind={effectiveKind}
            range={range}
            nights={nights}
            dayUse={dayUse}
            adults={adults}
            kids={children}
            estimate={plan?.quote ?? live?.quote ?? null}
            planName={plans.length > 1 && plan ? planTitle(plan) : null}
            quote={stepKey === "review" ? quote : null}
            addOns={{ extras: chosenExtras, extrasList, transfers, points: form.pickup?.points ?? [], persons, nights: effectiveKind === "dayuse" ? 1 : nights }}
            loading={availability.status === "loading"}
          />
        </div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ Stepper */

const NUMERALS = ["i", "ii", "iii", "iv", "v"];

function Stepper({ labels, step, onStep, locked }: { labels: string[]; step: number; onStep: (i: number) => void; locked: boolean }) {
  return (
    <>
    <ol className={`grid border-b border-line ${labels.length === 5 ? "grid-cols-5" : labels.length === 4 ? "grid-cols-4" : "grid-cols-3"}`} aria-label="Booking steps">
      {labels.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={label} className="relative">
            <button
              type="button"
              onClick={() => onStep(i)}
              disabled={!done || locked}
              aria-current={current ? "step" : undefined}
              className={`flex w-full items-baseline gap-2.5 pb-3 text-left ${done && !locked ? "cursor-pointer hover:text-laterite" : "cursor-default"}`}
            >
              <span className={`font-display text-lg italic ${current || done ? "text-laterite" : "text-ink-muted"}`}>{NUMERALS[i]}.</span>
              <span className={`text-sm max-sm:sr-only ${current ? "text-ink" : "text-ink-muted"}`}>{label}</span>
              {done ? <Check size={13} className="text-laterite max-sm:hidden" aria-hidden /> : null}
            </button>
            <span aria-hidden className={`absolute -bottom-px left-0 h-[2px] transition-all duration-500 ${i <= step ? "w-full bg-laterite" : "w-0"}`} />
          </li>
        );
      })}
    </ol>
    {/* Phones: the numerals above, the current step's name spelled out once below. */}
    <p aria-hidden className="mt-2 text-sm text-ink sm:hidden">{labels[step]}</p>
    </>
  );
}

export function StepTitle({ n, total = 3, children }: { n: number; total?: number; children: React.ReactNode }) {
  return (
    <header className="mb-8">
      <p className="kicker">
        Step {WORDS[n]} of {WORDS[total - 1]}
      </p>
      <h2 className="display-md mt-3 text-[clamp(2rem,4vw,3rem)]">{children}</h2>
    </header>
  );
}

/* ------------------------------------------------------------------ Step 1: the stay */

function StepStay(props: {
  total: number;
  rooms: RoomTypePublic[];
  roomId?: string;
  setRoomId: (id: string) => void;
  kind: StayKind;
  setKind: (k: StayKind) => void;
  canDayUse: boolean;
  range: Range;
  setRange: (r: Range) => void;
  dayUse: DayUse;
  setDayUse: (d: DayUse) => void;
  adults: number;
  setAdults: (n: number) => void;
  kids: number;
  setKids: (n: number) => void;
  today: ISODate;
  errors: Record<string, string | undefined>;
  wide: boolean;
  hotel: BookingHotel;
  liveFor: (id: string) => RoomTypeAvailability | null;
  availability: ReturnType<typeof useAvailability>;
  nights: number;
  plansOf: (r: RoomTypePublic) => PlanOffer[];
  plans: PlanOffer[];
  plan: PlanOffer | undefined;
  setPlan: (id: string) => void;
  calendar: ReturnType<typeof usePriceCalendar>;
}) {
  const { rooms, roomId, setRoomId, kind, setKind, canDayUse, range, setRange, dayUse, setDayUse, today, errors, wide, liveFor, availability, nights, plans, plan, calendar } = props;
  const room = rooms.find((r) => r.id === roomId);
  const dated = kind === "dayuse" || !!nights;
  const party = props.adults + props.kids;
  return (
    <div className="space-y-12">
      <StepTitle n={0} total={props.total}>
        Choose your <em className="accent">room</em>
      </StepTitle>

      {canDayUse ? (
        <fieldset>
          <legend className="kicker mb-4">How long</legend>
          <div className="inline-grid grid-cols-2 rounded-sm border border-line-strong p-1" role="radiogroup">
            {(
              [
                ["overnight", "Overnight", Moon],
                ["dayuse", "Day use", Sun],
              ] as const
            ).map(([k, label, Icon]) => (
              <label
                key={k}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xs px-4 py-2.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laterite ${
                  kind === k ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
                }`}
              >
                <input type="radio" name="kind" className="sr-only" checked={kind === k} onChange={() => setKind(k)} />
                <Icon size={16} aria-hidden /> {label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {kind === "overnight" ? (
        <fieldset>
          <legend className="kicker mb-4 flex items-center gap-2">
            <CalendarBlank size={15} aria-hidden /> Dates
          </legend>
          <div className="rounded-sm border border-line-strong bg-surface p-4 sm:p-6">
            <RangeCalendar
              value={range}
              onChange={setRange}
              today={today}
              months={wide ? 2 : 1}
              max={addDays(today, 365)}
              prices={calendar.prices}
              onVisibleChange={calendar.onVisibleChange}
            />
          </div>
          <p className="mt-3 text-sm text-ink-muted" aria-live="polite">
            {range.checkIn && range.checkOut ? (
              <>
                <span className="num text-ink">{formatShort(range.checkIn)}</span> from {formatClock(props.hotel.checkInTime)} to{" "}
                <span className="num text-ink">{formatShort(range.checkOut)}</span> by {formatClock(props.hotel.checkOutTime)},{" "}
                {nights} {nights === 1 ? "night" : "nights"}
              </>
            ) : range.checkIn ? (
              "Now choose the day you check out."
            ) : (
              "Choose the day you arrive."
            )}
          </p>
          {nights > 30 ? <FieldError>Online bookings are up to 30 nights. For longer stays, call the hotel.</FieldError> : null}
          {errors.dates ? <FieldError>{errors.dates}</FieldError> : null}
        </fieldset>
      ) : (
        <DayUsePicker today={today} value={dayUse} onChange={setDayUse} />
      )}

      <fieldset>
        <legend className="kicker mb-4">Guests</legend>
        <div className="grid max-w-xl gap-2 sm:grid-cols-2">
          <div className="rounded-sm border border-line-strong bg-surface px-4 py-3">
            <GuestsStepper value={props.adults} onChange={props.setAdults} label="Adults" layout="row" min={1} max={10} />
          </div>
          <div className="rounded-sm border border-line-strong bg-surface px-4 py-3">
            <GuestsStepper value={props.kids} onChange={props.setKids} label="Children under 12" layout="row" min={0} max={10} />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="kicker mb-4 flex w-full items-center justify-between gap-3">
          <span>Room type</span>
          {dated ? (
            <span className="normal-case tracking-normal" aria-live="polite">
              {availability.status === "loading" ? (
                <span className="inline-flex items-center gap-2 text-ink-muted">
                  <span className="size-1.5 animate-pulse rounded-full bg-brass" aria-hidden /> Checking live availability
                </span>
              ) : availability.status === "error" ? (
                <button type="button" onClick={availability.retry} className="link-static text-ochre">
                  Live prices did not load. Try again
                </button>
              ) : availability.status === "ready" ? (
                <span className="inline-flex items-center gap-1.5 !text-palm">
                  <SealCheck size={14} weight="fill" aria-hidden /> Live from the front desk
                </span>
              ) : null}
            </span>
          ) : null}
        </legend>
        <div className="grid gap-3" role="radiogroup" aria-label="Room type">
          {rooms.map((r) => {
            const on = r.id === roomId;
            const lr = dated ? liveFor(r.id) : null;
            const out = !!lr && !lr.bookable;
            const tooSmall = party > r.capacity;
            const rPlans = props.plansOf(r);
            const quoted = rPlans.filter((p) => p.bookable && p.quote).map((p) => p.quote!.totalKobo);
            const cheapest = quoted.length ? Math.min(...quoted) : (lr?.quote?.totalKobo ?? null);
            const several = rPlans.length > 1;
            return (
              <label
                key={r.id}
                className={`relative grid cursor-pointer grid-cols-[4.5rem_1fr_auto] items-center gap-4 rounded-sm border p-3 pr-4 transition-colors sm:grid-cols-[6rem_1fr_auto] ${
                  on ? "border-laterite bg-laterite/[0.05]" : "border-line-strong hover:border-ink-muted"
                } ${out ? "cursor-not-allowed opacity-55" : ""}`}
                data-testid="room-option"
              >
                <input type="radio" name="room" value={r.id} checked={on} disabled={out} onChange={() => setRoomId(r.id)} className="peer sr-only" />
                <Plate src={r.images[0]?.url} alt={r.images[0]?.alt ?? r.name} sizes="96px" caption={false} className="aspect-[4/3] rounded-xs" />
                <span className="min-w-0">
                  <span className="display-sm block text-lg">{r.name}</span>
                  <span className="num mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-ink-muted">
                    <span className={`inline-flex items-center gap-1 ${tooSmall ? "text-ochre" : ""}`}>
                      <UsersThree size={13} aria-hidden /> Sleeps {r.capacity}
                    </span>
                    {r.bedType ? (
                      <span className="inline-flex items-center gap-1">
                        <Bed size={13} aria-hidden /> {r.bedType}
                      </span>
                    ) : null}
                    {r.sizeSqm ? (
                      <span className="hidden items-center gap-1 sm:inline-flex">
                        <Ruler size={13} aria-hidden /> {r.sizeSqm} m&sup2;
                      </span>
                    ) : null}
                  </span>
                  {lr ? (
                    <span className={`kicker mt-1.5 block !text-[10px] ${out ? "" : lr.lowAvailability ? "!text-laterite" : "!text-palm"}`}>
                      {out
                        ? lr.unavailableReason === "CAPACITY"
                          ? "Too small for your group"
                          : lr.unavailableReason === "NO_HOURLY_RATE"
                            ? "No day use for this room"
                            : "Full on your dates"
                        : lr.lowAvailability
                          ? `Only ${lr.available} left`
                          : "Free for your dates"}
                    </span>
                  ) : null}
                </span>
                <span className="text-right">
                  {lr?.quote && lr.bookable ? (
                    <>
                      {several ? <span className="block text-[11px] text-ink-muted">from</span> : null}
                      <span className="num block font-medium">{formatNaira(cheapest)}</span>
                      <span className="text-xs text-ink-muted">{kind === "dayuse" ? `${lr.quote.units} hours` : `${lr.quote.units} ${lr.quote.units === 1 ? "night" : "nights"}`}, all in</span>
                    </>
                  ) : (
                    <>
                      {kind === "overnight" && (several || r.fromKobo) ? <span className="block text-[11px] text-ink-muted">from</span> : null}
                      <span className="num block font-medium">
                        {formatNaira(kind === "dayuse" && r.hourlyPriceKobo ? r.hourlyPriceKobo : fromNightly(r, rPlans))}
                      </span>
                      <span className="text-xs text-ink-muted">{kind === "dayuse" ? "an hour" : "a night"}</span>
                    </>
                  )}
                </span>
                <span
                  aria-hidden
                  className={`absolute -left-px -top-px grid size-5 place-items-center rounded-br-sm rounded-tl-sm transition-opacity ${on ? "bg-laterite text-laterite-ink opacity-100" : "opacity-0"}`}
                >
                  <Check size={12} weight="bold" />
                </span>
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-laterite" />
              </label>
            );
          })}
        </div>
        {errors.room ? <FieldError>{errors.room}</FieldError> : null}
        {room && party > room.capacity ? (
          <p className="mt-3 flex max-w-md items-start gap-2 text-sm text-ochre">
            <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
            The {room.name} sleeps {room.capacity}. Choose a larger room, or ask the hotel about an extra bed.
          </p>
        ) : null}
      </fieldset>

      {room && plans.length > 1 ? (
        <fieldset>
          <legend className="kicker mb-4">Rate for the {room.name}</legend>
          <PlanChoice
            plans={plans}
            value={plan?.id}
            onChange={props.setPlan}
            nights={nights}
            fallbackPolicy={props.hotel.booking?.cancellationPolicy ?? availability.data?.cancellationPolicy ?? null}
            freeUntil={availability.data?.freeCancellationUntil ?? null}
            loading={availability.status === "loading"}
          />
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
            The difference is what happens if your plans change. The flexible rate can be cancelled free until the date shown; the non-refundable rate costs less
            because it cannot.
          </p>
          {errors.plan ? <FieldError>{errors.plan}</FieldError> : null}
        </fieldset>
      ) : null}
    </div>
  );
}

function DayUsePicker({ today, value, onChange }: { today: ISODate; value: DayUse; onChange: (v: DayUse) => void }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const times = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);
  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="kicker mb-3">Day</legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {days.map((d) => {
            const on = d === value.date;
            return (
              <label
                key={d}
                className={`flex w-16 shrink-0 cursor-pointer flex-col items-center rounded-sm border py-2.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laterite ${
                  on ? "border-laterite bg-laterite text-laterite-ink" : "border-line-strong hover:border-ink-muted"
                }`}
              >
                <input type="radio" name="dayuse-date" className="sr-only" checked={on} onChange={() => onChange({ ...value, date: d })} />
                <span className="kicker !text-[9.5px] !text-current opacity-80">{formatWeekday(d)}</span>
                <span className="num text-lg">{Number(d.slice(8))}</span>
                <span className="text-[10.5px] opacity-75">{formatMonthShort(d)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-8 sm:grid-cols-[1fr_auto]">
        <fieldset>
          <legend className="kicker mb-3 flex items-center gap-2">
            <Clock size={14} aria-hidden /> Arriving at
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {times.map((t) => (
              <label
                key={t}
                className={`num cursor-pointer rounded-xs border px-2.5 py-1.5 text-[13px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laterite ${
                  t === value.from ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink-muted"
                }`}
              >
                <input type="radio" name="dayuse-from" className="sr-only" checked={t === value.from} onChange={() => onChange({ ...value, from: t })} />
                {t}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="kicker mb-3">For</legend>
          <div className="rounded-sm border border-line-strong bg-surface px-4 py-2.5">
            <GuestsStepper value={value.hours} onChange={(h) => onChange({ ...value, hours: h })} min={2} max={12} label="Hours" layout="row" className="gap-5" />
          </div>
        </fieldset>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Step 2: guest */

function StepGuest({
  n,
  total,
  guest,
  setGuest,
  errors,
  account,
  signingIn,
  setSigningIn,
  onSignedIn,
  onSignOut,
  devMode,
  fields,
  answers,
  setAnswer,
  emailOptional,
  upload,
}: {
  n: number;
  total: number;
  guest: GuestForm;
  setGuest: (g: GuestForm) => void;
  errors: Record<string, string | undefined>;
  account: GuestAccount | null;
  signingIn: boolean;
  setSigningIn: (b: boolean) => void;
  onSignedIn: (g: GuestAccount) => void;
  onSignOut: () => void;
  devMode: boolean;
  /** The form's fields for this step, visible ones only, in order (M7). */
  fields: FormField[];
  answers: Answers;
  setAnswer: (key: string, v: AnswerValue) => void;
  /** Email is asked for only when paying online (the form's rule), unless the hotel always wants it. */
  emailOptional: boolean;
  upload: { slug: string; channel: string; preview: string | null; maxFileMB: number };
}) {
  const TESTID: Record<string, string> = { fullName: "guest-name", phone: "guest-phone", email: "guest-email" };
  const HINT: Record<string, string> = {
    fullName: "As it appears on your ID",
    phone: "For the confirmation SMS; the hotel may call or WhatsApp you",
    email: emailOptional ? "Needed only if you pay online, for the receipt. Pay at the hotel and you can leave it out." : "For your confirmation and receipt",
  };
  const groups = groupBySection(fields);
  return (
    <div>
      <StepTitle n={n} total={total}>
        Who is <em className="accent">checking in?</em>
      </StepTitle>

      {account ? (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-palm/35 bg-palm/[0.05] px-4 py-3">
          <p className="flex items-center gap-2.5 text-sm">
            <SealCheck size={18} weight="fill" className="text-palm" aria-hidden />
            <span>
              Signed in as <span className="font-medium">{account.fullName || "a guest"}</span>{" "}
              <span className="num text-ink-muted">{formatPhone(account.phone)}</span>. This booking will appear in your trips.
            </span>
          </p>
          <button type="button" onClick={onSignOut} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
            <SignOut size={15} aria-hidden /> Not you?
          </button>
        </div>
      ) : (
        <div className="mb-8 overflow-hidden rounded-sm border border-line-strong">
          <button
            type="button"
            onClick={() => setSigningIn(!signingIn)}
            aria-expanded={signingIn}
            className="flex w-full items-center justify-between gap-4 bg-surface px-4 py-3.5 text-left transition-colors hover:bg-surface-2"
          >
            <span className="text-sm">
              <span className="font-medium">Booked with us before?</span>{" "}
              <span className="text-ink-muted">Sign in with your phone and we will fill this in. Optional.</span>
            </span>
            <ArrowRight size={16} className={`shrink-0 transition-transform ${signingIn ? "rotate-90" : ""}`} aria-hidden />
          </button>
          {signingIn ? (
            <div className="border-t border-line bg-paper px-4 py-6 sm:px-6">
              <PhoneSignIn onSignedIn={onSignedIn} initialPhone={guest.phone} devMode={devMode} compact />
            </div>
          ) : null}
        </div>
      )}

      <div className="space-y-10">
        {groups.map((g, gi) => (
          <section key={g.name} aria-label={g.name}>
            {groups.length > 1 || gi > 0 ? <h3 className="kicker mb-5">{g.name}</h3> : null}
            <div className="grid gap-6 sm:grid-cols-2">
              {g.fields.map((f) => {
                const guestKey = GUEST_KEYS.has(f.key) ? (f.key as keyof GuestForm) : null;
                const wide = f.key === "fullName" || f.type === "LONG_TEXT" || f.type === "MULTI_SELECT" || f.type === "CHECKBOX" || f.type === "FILE" || (f.type === "SELECT" && f.options.length <= 4);
                return (
                  <div key={f.key} className={wide ? "sm:col-span-2" : ""}>
                    <FormFieldInput
                      field={f}
                      value={guestKey ? guest[guestKey] : answers[f.key]}
                      onChange={(v) => (guestKey ? setGuest({ ...guest, [guestKey]: typeof v === "string" ? v : "" }) : setAnswer(f.key, v))}
                      error={errors[f.key] ?? null}
                      required={f.key === "email" ? !emailOptional : f.key === "fullName" || f.key === "phone" || f.required === "REQUIRED"}
                      testId={TESTID[f.key]}
                      hintOverride={f.guestPurpose ?? f.helpText ?? HINT[f.key] ?? null}
                      upload={upload}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Folds the arrival time and requests into the free-text requests an API without M7 forms stores. */
export function composeRequests(answers: Answers) {
  const arrival = typeof answers.estimatedArrivalTime === "string" ? answers.estimatedArrivalTime : "";
  const requests = typeof answers.specialRequests === "string" ? answers.specialRequests.trim() : "";
  return [arrival ? `Arriving around ${arrival}.` : "", requests].filter(Boolean).join(" ").slice(0, 500);
}

export type { Quote };

/** The nightly "from" price without dates: the cheapest rate the hotel publishes for the room. */
function fromNightly(r: RoomTypePublic, plans: PlanOffer[]) {
  const candidates = [r.fromKobo, ...plans.map((p) => p.fromKobo)].filter((n): n is number => typeof n === "number" && n > 0);
  return candidates.length ? Math.min(...candidates) : r.basePriceKobo;
}
