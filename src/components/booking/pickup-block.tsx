"use client";

import { AirplaneLanding, Boat, Bus, Check, MapPin, Minus, Plus, Suitcase, Train } from "@phosphor-icons/react";
import { useId, useMemo, useState } from "react";
import { addDays, formatShort, formatWeekday } from "@/lib/dates";
import type { FormField, PickupAnswer, TrainRoute, TransportCompany } from "@/lib/booking-form";
import { lagosISO, lagosParts } from "@/lib/booking-form";
import { formatNaira, formatPhone } from "@/lib/format";
import { KIND_LABEL, transferPrice } from "@/lib/pickup";
import type { PickupKind, PickupPoint } from "@/lib/theme/types";

const KIND_ICON = { AIRPORT: AirplaneLanding, MOTOR_PARK: Bus, TRAIN_STATION: Train, JETTY: Boat, OTHER: MapPin } as const;
const HOW: Record<PickupKind, string> = {
  AIRPORT: "By air",
  MOTOR_PARK: "By road, on a bus",
  TRAIN_STATION: "By train",
  JETTY: "By boat",
  OTHER: "Somewhere else",
};
const AIRLINES = ["Air Peace", "Arik Air", "Ibom Air", "United Nigeria Airlines", "Overland Airways", "ValueJet", "Max Air", "Rano Air", "Green Africa", "Enugu Air", "British Airways", "Virgin Atlantic", "Emirates", "Qatar Airways", "Turkish Airlines", "KLM", "Air France", "Ethiopian Airlines", "Kenya Airways", "RwandAir", "Africa World Airlines", "ASKY Airlines", "Delta Air Lines"];
const CITIES = ["Abuja", "Lagos", "Ibadan", "Benin City", "Enugu", "Onitsha", "Owerri", "Aba", "Port Harcourt", "Warri", "Asaba", "Kaduna", "Kano", "Jos", "Ilorin", "Akure", "Abeokuta", "Calabar", "Uyo", "Makurdi", "Lokoja", "Oshogbo", "Ado-Ekiti", "Accra", "Cotonou", "Lome"];

export interface PickupContext {
  arrivalDate: string | null;
  departureDate: string | null;
  checkOutTime: string | null;
  guestPhone: string;
  party: number;
  hotelPhone: string | null;
}

/** Problems with a pickup answer, keyed by the same sub-paths the server uses ("details.flightNumber"). */
export function checkPickup(a: PickupAnswer | undefined, points: PickupPoint[], ctx: PickupContext, now = Date.now()): Record<string, string> {
  const e: Record<string, string> = {};
  if (!a?.wanted) return e;
  const p = points.find((x) => x.id === a.pickupPointId);
  if (!p) {
    e.pickupPointId = "Choose where we should meet you.";
    return e;
  }
  const d = a.details ?? {};
  if (p.kind === "AIRPORT") {
    if (!d.airline || d.airline.trim().length < 2) e["details.airline"] = "Which airline are you flying with?";
    if (!d.flightNumber || !/^[A-Z0-9]{2}\s?\d{1,4}[A-Z]?$/i.test(d.flightNumber.trim())) e["details.flightNumber"] = "Enter the flight number, for example P4 7121.";
  } else if (p.kind === "MOTOR_PARK") {
    if (!d.transportCompanyId && !d.transportCompanyOther?.trim()) e["details.transportCompanyId"] = "Which bus company are you travelling with?";
    if (!d.departureCity || d.departureCity.trim().length < 2) e["details.departureCity"] = "Where does your bus leave from?";
  } else if (p.kind === "TRAIN_STATION") {
    if (!d.trainRouteId && !d.routeOther?.trim()) e["details.trainRouteId"] = "Which train are you taking?";
  } else if (!d.details || d.details.trim().length < 3) e["details.details"] = "Tell us where exactly to meet you.";
  if (!a.scheduledAt) e.scheduledAt = p.kind === "AIRPORT" ? "When does the flight land?" : "Roughly when do you get in?";
  else {
    const msg = timeProblem(p, a.scheduledAt, ctx, now, "ARRIVAL");
    if (msg) e.scheduledAt = msg;
  }
  const vehicle = p.vehicleOptions.find((v) => v.id === a.vehicleOptionId) ?? null;
  if (p.vehicleOptions.length && !vehicle) e.vehicleOptionId = "Choose a car.";
  const max = vehicle?.maxPassengers ?? (p.vehicleOptions.length ? 60 : 4);
  if ((a.passengers ?? 1) > max) e.passengers = `A ${vehicle?.name ?? "standard car"} takes up to ${max} passengers.${p.vehicleOptions.some((v) => v.maxPassengers > max) ? " Choose a bigger vehicle." : ""}`;
  if (a.departure?.wanted) {
    if (!a.departure.scheduledAt) e["departure.scheduledAt"] = "What time should we collect you from the hotel?";
    else {
      const dp = a.departure.sameAsArrival ? p : (points.find((x) => x.id === a.departure?.pickupPointId) ?? p);
      const msg = timeProblem(dp, a.departure.scheduledAt, ctx, now, "DEPARTURE");
      if (msg) e["departure.scheduledAt"] = msg;
    }
  }
  return e;
}

function timeProblem(p: PickupPoint, iso: string, ctx: PickupContext, now: number, direction: "ARRIVAL" | "DEPARTURE"): string | null {
  const t = new Date(iso).getTime();
  const { date, time } = lagosParts(iso);
  if (p.leadTimeHours > 0 && t < now + p.leadTimeHours * 3600_000) {
    const call = ctx.hotelPhone ? ` please call the hotel on ${formatPhone(ctx.hotelPhone)}` : " please call the hotel";
    return `Pickups from ${p.shortName ?? p.name} need ${p.leadTimeHours} ${p.leadTimeHours === 1 ? "hour's" : "hours'"} notice. For anything sooner,${call}.`;
  }
  if (p.operatingHours) {
    const { open, close } = p.operatingHours;
    const inside = open <= close ? time >= open && time <= close : time >= open || time <= close;
    if (!inside) return `Our drivers work at ${p.shortName ?? p.name} between ${open} and ${close}. Choose a time in that window or call the hotel.`;
  }
  if (direction === "ARRIVAL" && ctx.arrivalDate && (date < addDays(ctx.arrivalDate, -1) || date > ctx.arrivalDate))
    return `The pickup must be on your arrival day, ${formatWeekday(ctx.arrivalDate)} ${formatShort(ctx.arrivalDate)}, or the evening before.`;
  if (direction === "DEPARTURE" && ctx.departureDate && date !== ctx.departureDate) return `The drop-off must be on your check-out day, ${formatWeekday(ctx.departureDate)} ${formatShort(ctx.departureDate)}.`;
  return null;
}

/**
 * The arrival pickup (and departure drop-off) block of the booking form. The guest says how they
 * arrive, where we meet them, and what the driver needs to know for that kind of place: the flight
 * for an airport; the bus company, where it left from and roughly when it gets in for a motor park;
 * the route and service for a train; a description for a jetty or anywhere else.
 */
export function PickupBlock({
  field,
  points: allPoints,
  companies,
  routes,
  value,
  onChange,
  ctx,
  errors,
}: {
  field: FormField;
  points: PickupPoint[];
  companies: TransportCompany[];
  routes: TrainRoute[];
  value: PickupAnswer | undefined;
  onChange: (v: PickupAnswer) => void;
  ctx: PickupContext;
  errors: Record<string, string>;
}) {
  const id = useId();
  const points = useMemo(() => {
    const only = field.pickup?.pickupPointIds;
    return only ? allPoints.filter((p) => only.includes(p.id)) : allPoints;
  }, [allPoints, field.pickup?.pickupPointIds]);
  const allowDeparture = !field.pickup?.directions || field.pickup.directions.includes("DEPARTURE");
  const a: PickupAnswer = value ?? { wanted: false };
  const point = points.find((p) => p.id === a.pickupPointId) ?? null;
  const kinds = [...new Set(points.map((p) => p.kind))];
  const [kind, setKind] = useState<PickupKind | null>(point?.kind ?? (kinds.length === 1 ? kinds[0] : null));
  const shown = kind ? points.filter((p) => p.kind === kind) : [];
  const vehicle = point?.vehicleOptions.find((v) => v.id === a.vehicleOptionId) ?? null;
  const cheapest = points.length ? Math.min(...points.map((p) => Math.min(p.priceKobo, ...p.vehicleOptions.map((v) => v.priceKobo ?? p.priceKobo)))) : null;

  // Date and time are typed separately; the answer carries the instant once both are there.
  const initial = lagosParts(a.scheduledAt);
  const [typed, setWhen] = useState({ date: initial.date, time: initial.time });
  // Until the guest picks a day, the arrival day of the stay (which may change in step one).
  const when = { date: typed.date || (ctx.arrivalDate ?? ""), time: typed.time };
  const dep = lagosParts(a.departure?.scheduledAt);
  const [depTime, setDepTime] = useState(dep.time || "10:00");

  const patch = (p: Partial<PickupAnswer>) => onChange({ ...a, ...p });
  const detail = (k: string, v: string | null) => patch({ details: { ...(a.details ?? {}), [k]: v } });

  const setTime = (next: { date: string; time: string }) => {
    setWhen(next);
    patch({ scheduledAt: next.date && next.time ? lagosISO(next.date, next.time) : undefined });
  };

  const choosePoint = (p: PickupPoint) => {
    const v = p.vehicleOptions.find((o) => o.maxPassengers >= ctx.party) ?? p.vehicleOptions[0] ?? null;
    onChange({
      ...a,
      pickupPointId: p.id,
      vehicleOptionId: v?.id ?? null,
      passengers: a.passengers ?? Math.max(1, ctx.party),
      contactPhone: a.contactPhone ?? (ctx.guestPhone || null),
      details: p.kind === point?.kind ? a.details : {},
      scheduledAt: when.date && when.time ? lagosISO(when.date, when.time) : undefined,
    });
  };

  const err = (k: string) => errors[k];
  const priceArrive = point ? transferPrice(point, "ARRIVAL", vehicle) : null;
  const priceDepart = point && a.departure?.wanted ? transferPrice(point, "DEPARTURE", a.departure.sameAsArrival ? vehicle : null) : null;

  return (
    <div className="pickup-block" data-testid="pickup-block">
      <label
        className={`flex cursor-pointer items-start gap-4 rounded-sm border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-laterite ${
          a.wanted ? "border-laterite bg-laterite/[0.05]" : "border-line-strong hover:border-ink-muted"
        }`}
      >
        <input
          type="checkbox"
          role="switch"
          className="sr-only"
          checked={a.wanted}
          onChange={(e) => onChange(e.target.checked ? { ...a, wanted: true, passengers: a.passengers ?? Math.max(1, ctx.party), contactPhone: a.contactPhone ?? (ctx.guestPhone || null) } : { wanted: false })}
          data-testid="pickup-toggle"
        />
        <span aria-hidden className={`relative mt-0.5 inline-flex h-6 w-10 shrink-0 rounded-full border transition-colors ${a.wanted ? "border-laterite bg-laterite" : "border-line-strong bg-surface-2"}`}>
          <span className={`absolute top-0.5 size-[18px] rounded-full bg-surface shadow-sm transition-transform ${a.wanted ? "translate-x-[18px]" : "translate-x-0.5"}`} />
        </span>
        <span className="min-w-0">
          <span className="block font-medium">{field.label || "I'd like a pickup when I arrive"}</span>
          <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-muted">
            {field.helpText ?? "From the airport, a motor park, the train station or the jetty. Our driver meets you and brings you to the hotel."}
            {cheapest !== null ? <> From <span className="num text-ink">{formatNaira(cheapest)}</span> one way.</> : null}
          </span>
        </span>
      </label>

      {a.wanted ? (
        <div className="mt-6 space-y-8 border-l-2 border-laterite/30 pl-4 sm:pl-6">
          {kinds.length > 1 ? (
            <fieldset>
              <legend className="kicker mb-3">How are you arriving?</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup">
                {kinds.map((k) => {
                  const Icon = KIND_ICON[k];
                  const on = kind === k;
                  return (
                    <label
                      key={k}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-sm border px-3.5 py-2.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laterite ${
                        on ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink-muted"
                      }`}
                      data-testid={`pickup-kind-${k}`}
                    >
                      <input type="radio" name={`${id}-kind`} className="sr-only" checked={on} onChange={() => setKind(k)} />
                      <Icon size={17} weight="light" aria-hidden /> {HOW[k]}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {kind ? (
            <fieldset>
              <legend className="kicker mb-3">Where should we meet you?</legend>
              <div className="grid gap-2" role="radiogroup">
                {shown.map((p) => {
                  const on = p.id === a.pickupPointId;
                  return (
                    <label
                      key={p.id}
                      className={`grid cursor-pointer grid-cols-[1.25rem_1fr_auto] items-start gap-3 rounded-sm border px-4 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laterite ${
                        on ? "border-laterite bg-laterite/[0.05]" : "border-line-strong hover:border-ink-muted"
                      }`}
                      data-testid="pickup-point"
                    >
                      <input type="radio" name={`${id}-point`} className="sr-only" checked={on} onChange={() => choosePoint(p)} />
                      <span aria-hidden className={`mt-0.5 grid size-5 place-items-center rounded-full border ${on ? "border-laterite" : "border-line-strong"}`}>
                        <span className={`size-2.5 rounded-full bg-laterite transition-transform ${on ? "scale-100" : "scale-0"}`} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium leading-snug">{p.name}</span>
                        <span className="block text-[12.5px] text-ink-muted">
                          {[p.address || p.city, p.leadTimeHours ? `${p.leadTimeHours}h notice` : null, p.operatingHours ? `${p.operatingHours.open} to ${p.operatingHours.close}` : null].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="num text-right text-sm">{formatNaira(p.priceKobo)}</span>
                    </label>
                  );
                })}
              </div>
              {err("pickupPointId") ? <FieldMsg>{err("pickupPointId")}</FieldMsg> : null}
              {point?.notes ? <p className="mt-3 text-[13px] italic leading-relaxed text-ink-muted">{point.notes}</p> : null}
            </fieldset>
          ) : err("pickupPointId") ? (
            <FieldMsg>{err("pickupPointId")}</FieldMsg>
          ) : null}

          {point ? (
            <>
              <fieldset className="grid gap-5 sm:grid-cols-2">
                <legend className="kicker mb-3 sm:col-span-2">{point.kind === "AIRPORT" ? "Your flight" : point.kind === "MOTOR_PARK" ? "Your bus" : point.kind === "TRAIN_STATION" ? "Your train" : "Your arrival"}</legend>
                {point.kind === "AIRPORT" ? (
                  <>
                    <Text label="Airline" value={a.details?.airline ?? ""} onChange={(v) => detail("airline", v)} error={err("details.airline")} list={`${id}-airlines`} testId="pickup-airline" autoComplete="off" />
                    <datalist id={`${id}-airlines`}>
                      {AIRLINES.map((x) => (
                        <option key={x} value={x} />
                      ))}
                    </datalist>
                    <Text label="Flight number" value={a.details?.flightNumber ?? ""} onChange={(v) => detail("flightNumber", v.toUpperCase())} error={err("details.flightNumber")} placeholder="P4 7121" testId="pickup-flight" />
                    <Text label="Terminal" optional value={a.details?.terminal ?? ""} onChange={(v) => detail("terminal", v || null)} error={err("details.terminal")} placeholder="Terminal 1" />
                  </>
                ) : point.kind === "MOTOR_PARK" ? (
                  <>
                    <Select
                      label="Bus company"
                      value={a.details?.transportCompanyId ?? (a.details?.transportCompanyOther != null ? "__other" : "")}
                      onChange={(v) =>
                        patch({ details: { ...(a.details ?? {}), transportCompanyId: v && v !== "__other" ? v : null, transportCompanyOther: v === "__other" ? (a.details?.transportCompanyOther ?? "") : null } })
                      }
                      error={err("details.transportCompanyId") ?? err("details.transportCompanyOther")}
                      testId="pickup-company"
                    >
                      <option value="">Choose the company</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      <option value="__other">Another company</option>
                    </Select>
                    {a.details?.transportCompanyOther != null ? (
                      <Text label="Company name" value={a.details.transportCompanyOther} onChange={(v) => detail("transportCompanyOther", v)} testId="pickup-company-other" />
                    ) : null}
                    <Text label="Travelling from" value={a.details?.departureCity ?? ""} onChange={(v) => detail("departureCity", v)} error={err("details.departureCity")} list={`${id}-cities`} placeholder="Abuja" testId="pickup-from-city" autoComplete="off" />
                    <datalist id={`${id}-cities`}>
                      {CITIES.map((x) => (
                        <option key={x} value={x} />
                      ))}
                    </datalist>
                    <Text label="Ticket or booking reference" optional value={a.details?.ticketReference ?? ""} onChange={(v) => detail("ticketReference", v || null)} placeholder="GIG-44821" testId="pickup-ticket" />
                    <Text label="The bus, if you know it" optional value={a.details?.vehicleDescription ?? ""} onChange={(v) => detail("vehicleDescription", v || null)} placeholder="White Toyota Hiace, 18 seats" testId="pickup-bus" />
                  </>
                ) : point.kind === "TRAIN_STATION" ? (
                  <>
                    <Select
                      label="Route"
                      value={a.details?.trainRouteId ?? (a.details?.routeOther != null ? "__other" : "")}
                      onChange={(v) => patch({ details: { ...(a.details ?? {}), trainRouteId: v && v !== "__other" ? v : null, routeOther: v === "__other" ? (a.details?.routeOther ?? "") : null, trainService: null } })}
                      error={err("details.trainRouteId")}
                      testId="pickup-route"
                    >
                      <option value="">Choose the route</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                      <option value="__other">Another route</option>
                    </Select>
                    {a.details?.routeOther != null ? <Text label="Route" value={a.details.routeOther} onChange={(v) => detail("routeOther", v)} /> : null}
                    {(() => {
                      const services = routes.find((r) => r.id === a.details?.trainRouteId)?.services ?? [];
                      return services.length ? (
                        <Select label="Service" optional value={a.details?.trainService ?? ""} onChange={(v) => detail("trainService", v || null)}>
                          <option value="">I am not sure</option>
                          {services.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Text label="Train or service" optional value={a.details?.trainService ?? ""} onChange={(v) => detail("trainService", v || null)} placeholder="08:00 departure" />
                      );
                    })()}
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <Text label="Where exactly should we meet you?" multiline value={a.details?.details ?? ""} onChange={(v) => detail("details", v)} error={err("details.details")} placeholder="The ferry from Ikorodu, at the main pontoon" testId="pickup-details" />
                  </div>
                )}
                <div className="grid grid-cols-[1fr_8rem] gap-3 sm:col-span-2 sm:max-w-md">
                  <Text label={point.kind === "AIRPORT" ? "Landing on" : "Getting in on"} type="date" value={when.date} onChange={(v) => setTime({ ...when, date: v })} testId="pickup-date" />
                  <Text label="At about" type="time" value={when.time} onChange={(v) => setTime({ ...when, time: v })} testId="pickup-time" />
                  {err("scheduledAt") ? (
                    <div className="col-span-2 -mt-1">
                      <FieldMsg>{err("scheduledAt")}</FieldMsg>
                    </div>
                  ) : (
                    <p className="col-span-2 -mt-1 text-xs leading-relaxed text-ink-muted">
                      {point.kind === "MOTOR_PARK"
                        ? "Buses run late; that is fine. Your best guess is enough, and the driver will call you on the way."
                        : point.kind === "AIRPORT"
                          ? "The scheduled time on your ticket. We watch for delays."
                          : "Your best guess is enough; the driver will call you."}
                    </p>
                  )}
                </div>
              </fieldset>

              {point.vehicleOptions.length ? (
                <fieldset>
                  <legend className="kicker mb-3">Vehicle</legend>
                  <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
                    {point.vehicleOptions.map((v) => {
                      const on = v.id === a.vehicleOptionId;
                      const small = v.maxPassengers < (a.passengers ?? 1);
                      return (
                        <label
                          key={v.id}
                          className={`cursor-pointer rounded-sm border px-3.5 py-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-laterite ${
                            on ? "border-laterite bg-laterite/[0.05]" : "border-line-strong hover:border-ink-muted"
                          } ${small ? "opacity-60" : ""}`}
                          data-testid="pickup-vehicle"
                        >
                          <input type="radio" name={`${id}-veh`} className="sr-only" checked={on} onChange={() => patch({ vehicleOptionId: v.id })} />
                          <span className="flex items-center justify-between gap-2 font-medium">
                            {v.name} {on ? <Check size={14} weight="bold" className="text-laterite" aria-hidden /> : null}
                          </span>
                          <span className="mt-0.5 block text-[12.5px] text-ink-muted">Up to {v.maxPassengers}</span>
                          <span className="num mt-1 block">{formatNaira(v.priceKobo ?? point.priceKobo)}</span>
                        </label>
                      );
                    })}
                  </div>
                  {err("vehicleOptionId") ? <FieldMsg>{err("vehicleOptionId")}</FieldMsg> : null}
                </fieldset>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-3">
                <Counter label="Passengers" value={a.passengers ?? 1} min={1} max={60} onChange={(n) => patch({ passengers: n })} error={err("passengers")} testId="pickup-passengers" />
                <Counter label="Bags" optional icon value={a.luggage ?? 0} min={0} max={20} onChange={(n) => patch({ luggage: n })} testId="pickup-luggage" />
                <Text label="Phone on the day" value={a.contactPhone ?? ""} onChange={(v) => patch({ contactPhone: v || null })} type="tel" placeholder="0803 123 4567" hint="The driver calls this number" testId="pickup-phone" />
              </div>

              {allowDeparture ? (
                <fieldset className="rounded-sm border border-line p-4">
                  <legend className="sr-only">Departure drop-off</legend>
                  <label className="flex cursor-pointer items-start gap-3 text-[0.9375rem]">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-[18px] shrink-0 accent-[var(--laterite)]"
                      checked={!!a.departure?.wanted}
                      onChange={(e) =>
                        patch({
                          departure: e.target.checked
                            ? { wanted: true, sameAsArrival: true, scheduledAt: ctx.departureDate ? lagosISO(ctx.departureDate, depTime) : undefined }
                            : null,
                        })
                      }
                      data-testid="pickup-departure"
                    />
                    <span>
                      Take me back when I leave
                      <span className="block text-[13px] text-ink-muted">Same place and vehicle{point ? `, ${formatNaira(transferPrice(point, "DEPARTURE", vehicle))}` : ""}. We collect you at the hotel.</span>
                    </span>
                  </label>
                  {a.departure?.wanted ? (
                    <div className="mt-4 grid max-w-md grid-cols-[1fr_8rem] gap-3 pl-8">
                      <p className="self-end pb-3 text-sm text-ink-muted">
                        {ctx.departureDate ? (
                          <>
                            Leaving the hotel on <span className="num text-ink">{formatWeekday(ctx.departureDate)} {formatShort(ctx.departureDate)}</span> at
                          </>
                        ) : (
                          "On your check-out day at"
                        )}
                      </p>
                      <Text
                        label="Pickup time"
                        type="time"
                        value={depTime}
                        onChange={(v) => {
                          setDepTime(v);
                          patch({ departure: { ...a.departure!, scheduledAt: ctx.departureDate && v ? lagosISO(ctx.departureDate, v) : undefined } });
                        }}
                        testId="pickup-departure-time"
                      />
                      {err("departure.scheduledAt") ? (
                        <div className="col-span-2">
                          <FieldMsg>{err("departure.scheduledAt")}</FieldMsg>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </fieldset>
              ) : null}

              <p className="flex items-baseline justify-between gap-4 border-t border-line pt-4 text-sm" aria-live="polite" data-testid="pickup-price">
                <span className="text-ink-muted">
                  {KIND_LABEL[point.kind]} pickup{vehicle ? `, ${vehicle.name}` : ""}
                  {priceDepart !== null ? " and drop-off" : ""}
                  {point.leadTimeHours ? `. Booked at least ${point.leadTimeHours} hours ahead` : ""}
                </span>
                <span className="num font-medium">{formatNaira((priceArrive ?? 0) + (priceDepart ?? 0))}</span>
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FieldMsg({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-[12.5px] leading-relaxed text-danger" role="alert">
      {children}
    </p>
  );
}

function Text({
  label,
  value,
  onChange,
  error,
  optional,
  placeholder,
  type = "text",
  list,
  multiline,
  hint,
  testId,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  optional?: boolean;
  placeholder?: string;
  type?: string;
  list?: string;
  multiline?: boolean;
  hint?: string;
  testId?: string;
  autoComplete?: string;
}) {
  const id = useId();
  const described = error || hint ? `${id}-d` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-baseline justify-between gap-3 text-sm font-medium">
        {label}
        {optional ? <span className="text-xs font-normal text-ink-muted">Optional</span> : null}
      </label>
      {multiline ? (
        <textarea id={id} className="field min-h-24" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error || undefined} aria-describedby={described} data-testid={testId} maxLength={500} />
      ) : (
        <input
          id={id}
          className="field"
          type={type}
          list={list}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error || undefined}
          aria-describedby={described}
          data-testid={testId}
          {...(type === "tel" ? { inputMode: "tel" as const } : {})}
        />
      )}
      {error ? (
        <p id={described} className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={described} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Select({ label, value, onChange, error, optional, children, testId }: { label: string; value: string; onChange: (v: string) => void; error?: string; optional?: boolean; children: React.ReactNode; testId?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-baseline justify-between gap-3 text-sm font-medium">
        {label}
        {optional ? <span className="text-xs font-normal text-ink-muted">Optional</span> : null}
      </label>
      <select id={id} className="field appearance-none" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-e` : undefined} data-testid={testId}>
        {children}
      </select>
      {error ? (
        <p id={`${id}-e`} className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Counter({ label, value, min, max, onChange, error, optional, icon, testId }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; error?: string; optional?: boolean; icon?: boolean; testId?: string }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} data-testid={testId}>
      <p id={id} className="mb-2 flex items-baseline justify-between gap-3 text-sm font-medium">
        <span className="inline-flex items-center gap-1.5">
          {icon ? <Suitcase size={15} aria-hidden className="text-ink-muted" /> : null}
          {label}
        </span>
        {optional ? <span className="text-xs font-normal text-ink-muted">Optional</span> : null}
      </p>
      <div className="flex h-[2.875rem] items-center justify-between rounded-sm border border-line-strong bg-surface px-3">
        <button type="button" className="inline-grid size-8 place-items-center rounded-full border border-line-strong hover:border-ink disabled:opacity-35" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`${label}: one fewer`}>
          <Minus size={12} weight="bold" />
        </button>
        <output className="num" aria-live="polite">
          {value}
        </output>
        <button type="button" className="inline-grid size-8 place-items-center rounded-full border border-line-strong hover:border-ink disabled:opacity-35" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`${label}: one more`}>
          <Plus size={12} weight="bold" />
        </button>
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
