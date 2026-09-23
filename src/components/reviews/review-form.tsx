"use client";

import { ArrowRight, Briefcase, CheckCircle, Eye, EyeSlash, Heart, User, Users, UsersThree } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { PublicReview, ReviewRequest, TravellerType } from "@/lib/booking-types";
import { call, ClientApiError, humanError, newKey } from "@/lib/client-api";
import { formatShort } from "@/lib/dates";
import { formatLagosDateTime, formatStayMonth } from "@/lib/time";
import { Notice } from "../ui/field";
import { Plate } from "../ui/plate";
import { ReviewItem, SUBSCORES, TRAVELLER_LABEL, type SubscoreKey } from "./review-parts";
import { StarInput } from "./stars";

const TYPES: [TravellerType, typeof User][] = [
  ["BUSINESS", Briefcase],
  ["COUPLE", Heart],
  ["FAMILY", UsersThree],
  ["SOLO", User],
  ["FRIENDS", Users],
];

const PROMPTS = ["The room and the bed", "Power and water through the night", "The staff at the desk", "Breakfast and the kitchen", "Getting there, and the area"];

type Scores = Record<"overall" | SubscoreKey, number>;

export function ReviewForm() {
  const token = useSearchParams().get("t");
  const [req, setReq] = useState<ReviewRequest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(token ? null : "This review link is incomplete.");
  const [scores, setScores] = useState<Scores>({ overall: 0, cleanliness: 0, service: 0, location: 0, value: 0 });
  const [type, setType] = useState<TravellerType | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<(PublicReview & { status: string }) | null>(null);
  const [key] = useState(newKey);

  useEffect(() => {
    if (!token) return;
    call<ReviewRequest>("public/reviews/request", { query: { t: token } })
      .then(setReq)
      .catch((e) =>
        setLoadError(
          e instanceof ClientApiError && (e.status === 404 || e.status === 410)
            ? "This review link has expired or is not valid. Links work for 30 days after check-out."
            : humanError(e),
        ),
      );
  }, [token]);

  const len = body.trim().length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    for (const [k, label] of [["overall", "Overall"], ...SUBSCORES] as const) if (!scores[k as keyof Scores]) errs[k] = `Rate ${label.toLowerCase()}`;
    if (!type) errs.type = "Choose who you travelled with.";
    if (len < 20) errs.body = `A few more words, please: at least 20 characters (${20 - len} to go).`;
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`field-${Object.keys(errs)[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    try {
      const r = await call<PublicReview & { status: string }>("public/reviews", {
        method: "POST",
        idempotencyKey: key,
        body: { token, ...scores, travellerType: type, title: title.trim() || undefined, body: body.trim() },
      });
      setDone(r);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err instanceof ClientApiError && err.code === "REVIEW_NOT_ALLOWED") {
        const reason = (err.details as { reason?: string })?.reason;
        setErrors({ form: reason === "ALREADY_REVIEWED" ? "You have already reviewed this stay. Thank you." : "This stay can no longer be reviewed." });
      } else if (err instanceof ClientApiError && err.code === "VALIDATION_ERROR") {
        setErrors({ form: Object.values(err.fields).flat().join(" ") || err.message });
      } else setErrors({ form: humanError(err) });
    } finally {
      setBusy(false);
    }
  }

  if (loadError)
    return (
      <div className="container-page max-w-xl py-20 text-center">
        <p className="kicker">Review</p>
        <h1 className="display-md mt-3 text-4xl">That link did not work</h1>
        <p className="mt-4 text-ink-muted">{loadError}</p>
        <Link href="/trips" className="btn btn-outline mt-8">
          Go to your trips
        </Link>
      </div>
    );
  if (!req)
    return (
      <div className="container-page pb-10 pt-12" aria-busy="true">
        <div className="skeleton h-4 w-48 rounded-xs" />
        <div className="skeleton mt-5 h-14 w-2/3 rounded-xs" />
        <div className="skeleton mt-10 h-96 max-w-2xl rounded-md" />
      </div>
    );

  const hotelHref = `/stays/${req.hotel.slug}`;

  if (done)
    return (
      <div className="container-page max-w-2xl pb-10 pt-16 text-center" data-testid="review-done">
        <CheckCircle size={44} weight="thin" className="mx-auto text-palm" aria-hidden />
        <p className="kicker mt-6">{done.status === "PUBLISHED" ? "Posted" : "Received"}</p>
        <h1 className="display-md mt-3 text-[clamp(2.4rem,5vw,3.6rem)]">
          Thank you, <em className="accent">{req.guestFirstName}.</em>
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-muted">
          {done.status === "PUBLISHED"
            ? `Your review is now on ${req.hotel.name}'s page, marked as a verified stay. The hotel may reply.`
            : "Your review mentions something that looks like contact details, so a person will check it before it appears. It is usually quick."}
        </p>
        <div className="mx-auto mt-10 max-w-xl border-y border-line text-left">
          <ReviewItem review={{ ...done, hotelReply: null }} hotelName={req.hotel.name} />
        </div>
        <Link href={`${hotelHref}#reviews`} className="btn btn-primary mt-10">
          See it on the hotel page <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    );

  if (!req.eligible)
    return (
      <div className="container-page max-w-xl py-20 text-center">
        <p className="kicker">{req.hotel.name}</p>
        <h1 className="display-md mt-3 text-4xl">
          {req.reason === "ALREADY_REVIEWED" ? "You have reviewed this stay" : req.reason === "WINDOW_CLOSED" ? "Reviews for this stay have closed" : "Not quite yet"}
        </h1>
        <p className="mt-4 text-ink-muted">
          {req.reason === "ALREADY_REVIEWED"
            ? "Thank you. One review per stay keeps the guest book fair."
            : req.reason === "WINDOW_CLOSED"
              ? "Reviews can be written for 30 days after check-out."
              : "You can review once you have checked out."}
        </p>
        <Link href={`${hotelHref}#reviews`} className="btn btn-outline mt-8">
          Read other guests&rsquo; reviews
        </Link>
      </div>
    );

  const draftReview = {
    id: "preview",
    ...scores,
    overall: scores.overall || 5,
    title: title.trim() || null,
    body: body.trim() || "Your words will appear here.",
    stayMonth: req.stay.stayMonth,
    travellerType: type ?? "COUPLE",
    displayName: req.displayName,
    hotelReply: null,
  };

  return (
    <div className="container-page pb-10 pt-8 lg:pt-12">
      <header className="max-w-3xl">
        <p className="kicker">
          Your stay, {formatStayMonth(req.stay.stayMonth)} <span className="mx-1.5 text-line-strong">/</span> <span className="num">{req.stay.code}</span>
        </p>
        <h1 className="display-md mt-4 text-[clamp(2.4rem,5.6vw,4.4rem)]">
          How was <em className="accent">{req.hotel.name}?</em>
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-ink-muted">
          Only guests who stayed can write here, so what you say carries weight. Be fair, be specific, and say what would help the next person decide.
        </p>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <form onSubmit={submit} noValidate className="lg:col-span-7" data-testid="review-form">
          <section id="field-overall" aria-label="Overall" className="rounded-md border border-line-strong bg-surface p-5 sm:p-6">
            <StarInput name="overall" label="Overall" hint="All things considered" value={scores.overall} onChange={(v) => setScores({ ...scores, overall: v })} size={38} error={errors.overall} />
          </section>

          <section aria-label="Details" className="mt-4 grid gap-px overflow-hidden rounded-md border border-line-strong bg-line sm:grid-cols-2">
            {SUBSCORES.map(([k, label]) => (
              <div key={k} id={`field-${k}`} className="bg-surface p-5">
                <StarInput name={k} label={label} value={scores[k]} onChange={(v) => setScores({ ...scores, [k]: v })} size={26} error={errors[k]} />
              </div>
            ))}
          </section>

          <fieldset id="field-type" className="mt-10">
            <legend className="mb-3 text-[0.9375rem] font-medium">Who did you travel with?</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {TYPES.map(([t, Icon]) => (
                <label
                  key={t}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-laterite ${
                    type === t ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink-muted"
                  }`}
                >
                  <input type="radio" name="travellerType" className="sr-only" checked={type === t} onChange={() => setType(t)} data-testid={`type-${t}`} />
                  <Icon size={16} weight={type === t ? "regular" : "light"} aria-hidden /> {TRAVELLER_LABEL[t]}
                </label>
              ))}
            </div>
            {errors.type ? <p className="mt-2 text-sm text-danger">{errors.type}</p> : null}
          </fieldset>

          <div className="mt-10">
            <label htmlFor="review-title" className="mb-2 flex justify-between text-[0.9375rem] font-medium">
              A headline <span className="text-xs font-normal text-ink-muted">Optional</span>
            </label>
            <input id="review-title" className="field" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiet rooms, and the best suya on the island" />
          </div>

          <div id="field-body" className="mt-8">
            <label htmlFor="review-body" className="mb-2 block text-[0.9375rem] font-medium">
              Your review
            </label>
            <p className="mb-3 text-sm text-ink-muted">Some things guests find useful:</p>
            <ul className="mb-3 flex flex-wrap gap-1.5" aria-label="Ideas">
              {PROMPTS.map((p) => (
                <li key={p} className="rounded-xs border border-line px-2 py-1 text-xs text-ink-muted">
                  {p}
                </li>
              ))}
            </ul>
            <textarea
              id="review-body"
              className="field min-h-44 resize-y leading-relaxed"
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              aria-invalid={!!errors.body}
              aria-describedby="review-body-hint"
              data-testid="review-body"
            />
            <p id="review-body-hint" className={`mt-1.5 flex justify-between gap-4 text-xs ${errors.body ? "text-danger" : "text-ink-muted"}`}>
              <span>{errors.body ?? "Please leave out phone numbers and emails; reviews with them are checked by a person first."}</span>
              <span className={`num shrink-0 ${len > 0 && len < 20 ? "text-ochre" : ""}`}>{len} / 2000</span>
            </p>
          </div>

          <button type="button" onClick={() => setPreview((p) => !p)} className="mt-8 inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink lg:hidden" aria-expanded={preview}>
            {preview ? <EyeSlash size={16} aria-hidden /> : <Eye size={16} aria-hidden />} {preview ? "Hide preview" : "Preview your review"}
          </button>
          {preview ? (
            <div className="mt-4 rounded-sm border border-dashed border-line-strong px-4 lg:hidden">
              <ReviewItem review={draftReview} hotelName={req.hotel.name} preview />
            </div>
          ) : null}

          {errors.form ? (
            <div className="mt-6">
              <Notice tone="warn" title={errors.form} />
            </div>
          ) : null}
          <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-ink-muted">
              Posted as <span className="text-ink">{req.displayName}</span>. Open until {formatLagosDateTime(req.deadline).split(",").slice(0, 2).join(",")}.
            </p>
            <button type="submit" className="btn btn-primary" disabled={busy} data-testid="review-submit">
              {busy ? "Posting" : "Post my review"} <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        </form>

        <aside className="hidden lg:col-span-4 lg:col-start-9 lg:block">
          <div className="sticky top-24 space-y-6">
            <div className="flex gap-4 rounded-md border border-line-strong bg-surface p-4">
              <Plate src={req.hotel.coverImageUrl} alt={req.hotel.name} caption={false} sizes="80px" className="size-20 shrink-0 rounded-xs" />
              <div className="min-w-0">
                <p className="display-sm text-lg">{req.hotel.name}</p>
                <p className="text-sm text-ink-muted">{req.stay.roomTypeName}</p>
                <p className="num mt-1 text-xs text-ink-muted">
                  {formatShort(req.stay.arrivalDate)} to {formatShort(req.stay.departureDate)}
                </p>
              </div>
            </div>
            <div>
              <p className="kicker">Preview</p>
              <div className="mt-2 rounded-sm border border-dashed border-line-strong px-5">
                <ReviewItem review={draftReview} hotelName={req.hotel.name} preview stacked />
              </div>
              <p className="mt-2 text-xs text-ink-muted">This is how it will look on the hotel&rsquo;s page.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
