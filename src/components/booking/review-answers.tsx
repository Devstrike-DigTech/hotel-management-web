"use client";

import { PencilSimple } from "@phosphor-icons/react";
import { answerFields, isAddOnField, isVisible, lagosParts, type Answers, type AnswerValue, type ConditionContext, type FormField, type PickupAnswer, type PublicBookingForm } from "@/lib/booking-form";
import type { Quote } from "@/lib/booking-types";
import { formatShort, formatWeekday } from "@/lib/dates";
import { formatNaira } from "@/lib/format";
import { KIND_LABEL } from "@/lib/pickup";

/** An answer in words, as the hotel will read it. */
export function displayAnswer(f: FormField, v: AnswerValue | undefined, form: PublicBookingForm): string | null {
  if (v === undefined || v === null || v === "") return null;
  switch (f.type) {
    case "SELECT":
      return f.options.find((o) => o.value === v)?.label ?? String(v);
    case "MULTI_SELECT":
      return Array.isArray(v) && v.length ? v.map((x) => f.options.find((o) => o.value === x)?.label ?? x).join(", ") : null;
    case "YES_NO":
      return v === true ? "Yes" : v === false ? "No" : null;
    case "CHECKBOX":
      return v === true ? "Yes" : null;
    case "FILE":
      return typeof v === "object" && v && "name" in v ? String((v as { name?: string }).name ?? "Uploaded") : "Uploaded";
    case "PICKUP": {
      const a = v as PickupAnswer;
      if (!a.wanted) return "No pickup";
      const p = form.pickup?.points.find((x) => x.id === a.pickupPointId);
      const { date, time } = lagosParts(a.scheduledAt);
      const d = a.details ?? {};
      const company = form.pickup?.transportCompanies.find((c) => c.id === d.transportCompanyId)?.name ?? d.transportCompanyOther;
      const route = form.pickup?.trainRoutes.find((r) => r.id === d.trainRouteId)?.name ?? d.routeOther;
      const what =
        p?.kind === "AIRPORT"
          ? [d.airline, d.flightNumber].filter(Boolean).join(" ")
          : p?.kind === "MOTOR_PARK"
            ? [company, d.departureCity ? `from ${d.departureCity}` : null].filter(Boolean).join(" ")
            : p?.kind === "TRAIN_STATION"
              ? [route, d.trainService].filter(Boolean).join(", ")
              : d.details;
      return [p?.name ?? "Pickup", date ? `${formatWeekday(date)} ${formatShort(date)} at ${time}` : null, what, a.passengers ? `${a.passengers} ${a.passengers === 1 ? "passenger" : "passengers"}` : null]
        .filter(Boolean)
        .join(" · ");
    }
    default:
      return String(v);
  }
}

/**
 * The review step's "Your answers": what the guest told the hotel, and the extras and transfers the
 * quote has priced, each with a way back to change it.
 */
export function ReviewAnswers({
  form,
  answers,
  cond,
  quote,
  onEdit,
}: {
  form: PublicBookingForm;
  answers: Answers;
  cond: ConditionContext;
  quote: Quote | null;
  onEdit?: (step: "details" | "addons") => void;
}) {
  const rows = answerFields(form)
    .filter((f) => f.source !== "SYSTEM" && f.type !== "EXTRA" && f.type !== "PICKUP" && isVisible(f, form, cond))
    .map((f) => ({ f, text: displayAnswer(f, answers[f.key], form) }))
    .filter((r) => r.text);
  const extras = quote?.extras ?? [];
  const transfers = quote?.transfers ?? [];
  const addOnsEditable = form.fields.some((f) => isAddOnField(f));
  if (!rows.length && !extras.length && !transfers.length) return null;
  return (
    <section aria-labelledby="answers-title" className="mt-10" data-testid="review-answers">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 id="answers-title" className="kicker">
          What you told the hotel
        </h3>
      </div>
      <div className="divide-y divide-line rounded-sm border border-line">
        {rows.length ? (
          <div className="px-4 py-3">
            <dl className="grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-[minmax(8rem,auto)_1fr]">
              {rows.map(({ f, text }) => (
                <div key={f.key} className="contents" data-testid="review-answer">
                  <dt className="text-ink-muted">{f.label}</dt>
                  <dd className="min-w-0 break-words">{text}</dd>
                </div>
              ))}
            </dl>
            {onEdit ? (
              <button type="button" onClick={() => onEdit("details")} className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
                <PencilSimple size={13} aria-hidden /> Change your answers
              </button>
            ) : null}
          </div>
        ) : null}
        {transfers.length ? (
          <div className="px-4 py-3" data-testid="review-transfers">
            <p className="kicker mb-2 !text-[10px]">Getting here</p>
            <ul className="space-y-2 text-sm">
              {transfers.map((t) => {
                const { date, time } = lagosParts(t.scheduledAt);
                return (
                  <li key={t.direction} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span>
                      <span className="font-medium">{t.direction === "ARRIVAL" ? `${KIND_LABEL[t.kind]} pickup` : "Drop-off"}</span>, {t.pickupPointName}, {t.vehicleName}
                      <span className="num text-ink-muted">
                        {" "}
                        · {formatWeekday(date)} {formatShort(date)} {time}
                      </span>
                    </span>
                    <span className="num">{formatNaira(t.totalKobo)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        {extras.length ? (
          <div className="px-4 py-3" data-testid="review-extras">
            <p className="kicker mb-2 !text-[10px]">Extras</p>
            <ul className="space-y-1.5 text-sm">
              {extras.map((x) => (
                <li key={x.extraId} className="flex items-baseline justify-between gap-4">
                  <span>{x.description || x.name}</span>
                  <span className="num">{formatNaira(x.totalKobo)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {(extras.length || transfers.length) && onEdit && addOnsEditable ? (
          <div className="px-4 py-2.5">
            <button type="button" onClick={() => onEdit("addons")} className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink">
              <PencilSimple size={13} aria-hidden /> Change extras or pickup
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
