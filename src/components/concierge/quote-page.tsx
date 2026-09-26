"use client";

import { ArrowRight, CheckCircle, Clock, CreditCard, HourglassMedium, LockSimple, Phone, Receipt, XCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { brandStyle } from "@/lib/brand";
import { call, ClientApiError, humanError, newKey } from "@/lib/client-api";
import { normaliseQuote, normaliseRequest, preferredWords, PRIVACY_NOTE, statusWords, type QuoteView } from "@/lib/concierge";
import { formatNaira, formatPhone, toE164Digits } from "@/lib/format";
import { formatLagosDateTime } from "@/lib/time";
import { Notice } from "../ui/field";
import { CategoryIcon } from "./category-icon";
import { RequestStatusChip } from "./request-card";

type Paying = { reference: string; state: "PENDING" | "SUCCESS" | "FAILED"; message: string | null };

/**
 * The price the concierge sent, by its signed link (API-M8 6.9): what it is for, the amount with
 * each tax, the concierge's note and how long it holds; then pay now or add it to the bill, or say
 * no thanks. Back from Paystack (?reference=) it waits for the payment and shows the confirmation.
 */
export function QuotePage({ token, branded = false }: { token: string; branded?: boolean }) {
  const params = useSearchParams();
  const returned = params.get("reference");
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [error, setError] = useState<{ message: string; gone?: boolean } | null>(null);
  const [method, setMethod] = useState<"ONLINE" | "FOLIO" | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<null | "accept" | "decline">(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [paying, setPaying] = useState<Paying | null>(returned ? { reference: returned, state: "PENDING", message: null } : null);
  const key = useRef(newKey());

  const load = useCallback(async () => {
    try {
      const q = normaliseQuote(await call<unknown>(`public/concierge/quotes/${encodeURIComponent(token)}`));
      if (!q) throw new ClientApiError(500, "BAD_RESPONSE", "We could not read this price.");
      setQuote(q);
      setError(null);
    } catch (e) {
      if (e instanceof ClientApiError && (e.status === 404 || e.status === 410 || e.status === 401 || e.status === 400))
        setError({ message: e.code === "QUOTE_EXPIRED" ? "This price has expired." : "This link does not open a price.", gone: true });
      else setError({ message: humanError(e) });
    }
  }, [token]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  // Back from Paystack: the webhook is the source of truth; ask until it says.
  useEffect(() => {
    if (!paying || paying.state !== "PENDING") return;
    let n = 0;
    let stop = false;
    const tick = async () => {
      try {
        const s = await call<{ state: Paying["state"]; message?: string }>(`public/concierge/payments/${encodeURIComponent(paying.reference)}/verify`);
        if (stop) return;
        if (s.state !== "PENDING") {
          setPaying({ reference: paying.reference, state: s.state, message: s.message ?? null });
          load();
          return;
        }
      } catch {
        /* keep asking */
      }
      if (!stop && ++n < 40) setTimeout(tick, n < 20 ? 2500 : 6000);
    };
    tick();
    return () => {
      stop = true;
    };
  }, [paying, load]);

  if (error)
    return (
      <div className="container-page max-w-xl py-20 text-center" data-testid="quote-error">
        <p className="kicker">The concierge</p>
        <h1 className="display-md mt-3 text-4xl">{error.message}</h1>
        <p className="mt-4 text-ink-muted">{error.gone ? "Ask the concierge for a new one, or open your booking to see your requests." : "Check your connection and try again."}</p>
        {!error.gone ? (
          <button type="button" onClick={load} className="btn btn-primary mt-8">
            Try again
          </button>
        ) : null}
      </div>
    );

  if (!quote)
    return (
      <div className="container-page max-w-2xl py-16" aria-busy="true">
        <div className="skeleton h-4 w-40 rounded-xs" />
        <div className="skeleton mt-5 h-12 w-3/4 rounded-xs" />
        <div className="skeleton mt-10 h-80 rounded-md" />
      </div>
    );

  const { request: r, hotel } = quote;
  const q = r.quote;
  const open = quote.state === "OPEN" && r.status === "QUOTED" && !!q && !q.expired;
  const options = quote.paymentOptions;
  const chosen = method ?? (options.folio ? "FOLIO" : options.online ? "ONLINE" : null);
  const when = preferredWords(r.preferredAt, r.preferredWindow);
  const tel = hotel.phone ? `+${toE164Digits(hotel.phone)}` : null;
  const w = statusWords(r);
  const confirmed = r.status === "CONFIRMED" || r.status === "SCHEDULED" || r.status === "IN_PROGRESS" || r.status === "COMPLETED";

  async function accept() {
    if (!chosen) return;
    setBusy("accept");
    setProblem(null);
    try {
      const res = await call<{ request: unknown; payment: { reference: string; authorizationUrl: string } | null }>(`public/concierge/quotes/${encodeURIComponent(token)}/accept`, {
        method: "POST",
        body: { paymentMethod: chosen, ...(chosen === "ONLINE" && email.trim() ? { email: email.trim() } : {}) },
        idempotencyKey: key.current,
        timeoutMs: 30_000,
      });
      if (res.payment?.authorizationUrl) {
        window.location.assign(res.payment.authorizationUrl);
        return;
      }
      const next = normaliseRequest(res.request);
      if (next) setQuote({ ...quote!, request: next, state: "ACCEPTED" });
      setBusy(null);
    } catch (e) {
      setBusy(null);
      key.current = newKey();
      if (e instanceof ClientApiError) {
        if (e.code === "QUOTE_EXPIRED") return setProblem("This price has just expired. The concierge can send you a new one.");
        if (e.code === "FOLIO_UNAVAILABLE") return setProblem("Your bill is closed, so this cannot go on it. Pay online instead.");
        if (e.code === "PAYMENT_UNAVAILABLE") return setProblem("Paying online is not available at this hotel just now. Add it to your bill, or call the front desk.");
        if (e.code === "INVALID_STATE") return void load();
        if (e.code === "VALIDATION_ERROR" && /email/i.test(JSON.stringify(e.details ?? {}))) return setProblem("Paying online needs an email address for the receipt.");
      }
      setProblem(humanError(e));
    }
  }

  async function decline() {
    setBusy("decline");
    setProblem(null);
    try {
      const res = await call<{ request: unknown }>(`public/concierge/quotes/${encodeURIComponent(token)}/decline`, {
        method: "POST",
        body: reason.trim() ? { reason: reason.trim() } : {},
        idempotencyKey: newKey(),
      });
      const next = normaliseRequest(res.request);
      if (next) setQuote({ ...quote!, request: next, state: "DECLINED" });
      setDeclining(false);
    } catch (e) {
      setProblem(humanError(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`container-page max-w-3xl pb-16 pt-8 lg:pt-12 ${branded ? "" : "brand-scope"}`} style={branded ? undefined : brandStyle(hotel.accentColor)} data-testid="quote-page" data-state={quote.state} data-status={r.status}>
      <p className="kicker">{hotel.name} · The concierge</p>
      <h1 className="display-md mt-3 text-[clamp(2.1rem,5vw,3.4rem)]">
        {confirmed ? (
          <>
            All <em className="accent">arranged</em>
          </>
        ) : quote.state === "DECLINED" || r.status === "CANCELLED" ? (
          "You said no thanks"
        ) : open ? (
          <>
            A price, <em className="accent">for you</em>
          </>
        ) : (
          "About your request"
        )}
      </h1>

      {paying?.state === "PENDING" ? (
        <div className="mt-8">
          <Notice tone="info" title="Checking your payment">
            <span className="inline-flex items-center gap-1.5">
              <HourglassMedium size={15} aria-hidden /> This takes a few seconds; transfers can take a minute. Please do not pay again.
            </span>
          </Notice>
        </div>
      ) : paying?.state === "FAILED" ? (
        <div className="mt-8">
          <Notice tone="warn" title="The payment did not go through">
            {paying.message ?? "Nothing was taken."} {r.payment.authorizationUrl ? "You can try again below." : ""}
          </Notice>
        </div>
      ) : null}

      <article className="mt-10 overflow-hidden rounded-md border border-line-strong bg-surface shadow-[var(--shadow-card)]" data-testid="quote-card">
        <header className="flex flex-col-reverse items-start justify-between gap-4 border-b border-line px-6 py-5 sm:flex-row sm:px-8">
          <div className="flex min-w-0 items-start gap-4">
            <span className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-sm bg-surface-2 text-laterite">
              <CategoryIcon category={r.category} size={22} />
            </span>
            <div className="min-w-0">
              <h2 className="display-sm text-2xl">{r.title}</h2>
              <p className="mt-1 text-sm text-ink-muted">{[r.variant, when, r.partySize ? `${r.partySize} ${r.partySize === 1 ? "person" : "people"}` : null, r.hours ? `${r.hours} hours` : null].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
            <RequestStatusChip request={r} />
            <span className="num text-xs text-ink-muted">{r.number}</span>
          </div>
        </header>

        <div className="px-6 py-6 sm:px-8">
          {r.requestText ? <p className="border-l-2 border-line-strong pl-4 text-[0.9375rem] leading-relaxed text-ink-muted">&ldquo;{r.requestText}&rdquo;</p> : null}
          {r.answers.length ? (
            <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              {r.answers.map((a) => (
                <div key={a.label} className="flex justify-between gap-3 border-b border-dotted border-line pb-1.5">
                  <dt className="text-ink-muted">{a.label}</dt>
                  <dd className="text-right">{a.display}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {q ? (
            <>
              {q.note ? (
                <figure className="mt-6 rounded-sm bg-surface-2/70 px-5 py-4">
                  <blockquote className="font-display text-lg italic leading-relaxed">{q.note}</blockquote>
                  <figcaption className="kicker mt-2">From the concierge</figcaption>
                </figure>
              ) : null}
              <dl className="num mt-6 space-y-2 text-sm" data-testid="quote-ledger">
                <div className="flex items-baseline gap-3">
                  <dt className="font-sans">{r.title}</dt>
                  <span aria-hidden className="leader" />
                  <dd>{formatNaira(q.netKobo)}</dd>
                </div>
                {q.taxes
                  .filter((t) => t.amountKobo)
                  .map((t) => (
                    <div key={t.code + t.label} className="flex items-baseline gap-3 text-ink-muted">
                      <dt className="font-sans">
                        {t.label}
                        {t.inclusive ? " (included)" : ""}
                      </dt>
                      <span aria-hidden className="leader" />
                      <dd>{formatNaira(t.amountKobo)}</dd>
                    </div>
                  ))}
                <div className="flex items-baseline justify-between gap-3 border-t border-ink pt-3 text-base">
                  <dt className="font-sans font-medium">Total</dt>
                  <dd className="text-2xl" data-testid="quote-total">
                    {formatNaira(q.totalKobo)}
                  </dd>
                </div>
              </dl>
              {q.validUntil && open ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                  <Clock size={13} aria-hidden /> Holds until {formatLagosDateTime(q.validUntil)}
                </p>
              ) : null}
            </>
          ) : null}

          {r.discreet ? (
            <p className="mt-6 flex items-start gap-2 rounded-sm border border-adire/35 bg-adire/[0.05] px-4 py-3 text-sm" data-testid="quote-private">
              <LockSimple size={16} weight="fill" className="mt-0.5 shrink-0 text-adire" aria-hidden />
              <span>
                {r.privacyNote ?? PRIVACY_NOTE} It never appears on shared screens, and your bill shows a neutral line instead of the service.
              </span>
            </p>
          ) : null}
        </div>

        {open ? (
          <footer className="border-t border-line bg-surface-2/40 px-6 py-6 sm:px-8" data-testid="quote-actions">
            {options.online || options.folio ? (
              <fieldset>
                <legend className="kicker mb-3">How would you like to pay?</legend>
                <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                  {options.online ? (
                    <PayOption on={chosen === "ONLINE"} onPick={() => setMethod("ONLINE")} icon={<CreditCard size={20} weight={chosen === "ONLINE" ? "fill" : "light"} aria-hidden />} title="Pay now" line="Card, transfer or USSD. Confirmed when paid." testId="quote-pay-online" />
                  ) : null}
                  {options.folio ? (
                    <PayOption
                      on={chosen === "FOLIO"}
                      onPick={() => setMethod("FOLIO")}
                      icon={<Receipt size={20} weight={chosen === "FOLIO" ? "fill" : "light"} aria-hidden />}
                      title="Add to my bill"
                      line={options.folioLabel ?? "Settle it with your stay. Confirmed now."}
                      testId="quote-pay-folio"
                    />
                  ) : null}
                </div>
              </fieldset>
            ) : (
              <p className="text-sm text-ink-muted">The front desk will take payment for this.</p>
            )}
            {chosen === "ONLINE" ? (
              <label className="mt-4 block max-w-sm text-sm">
                <span className="mb-1.5 flex justify-between font-medium">
                  Email for the receipt <span className="text-xs font-normal text-ink-muted">If not the one on your booking</span>
                </span>
                <input className="field" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </label>
            ) : null}
            {problem ? (
              <p role="alert" className="mt-4 text-sm text-danger" data-testid="quote-problem">
                {problem}
              </p>
            ) : null}
            {declining ? (
              <div className="mt-6 rounded-sm border border-line-strong bg-surface p-4">
                <label className="block text-sm">
                  <span className="mb-1.5 block font-medium">No thanks. Anything the concierge should know?</span>
                  <input className="field" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
                </label>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="button" className="btn btn-outline !min-h-10 text-sm" onClick={decline} disabled={!!busy} data-testid="quote-decline-confirm">
                    {busy === "decline" ? "Sending" : "Decline this price"}
                  </button>
                  <button type="button" className="link-static text-sm text-ink-muted" onClick={() => setDeclining(false)}>
                    Go back
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" className="link-static text-sm text-ink-muted" onClick={() => setDeclining(true)} data-testid="quote-decline">
                  No thanks
                </button>
                <button type="button" className="btn btn-primary" onClick={accept} disabled={!!busy || !chosen} data-testid="quote-accept">
                  {busy === "accept" ? (chosen === "ONLINE" ? "Opening the payment" : "Confirming") : chosen === "ONLINE" ? `Accept and pay ${formatNaira(q!.totalKobo)}` : "Accept"}
                  <ArrowRight size={16} aria-hidden />
                </button>
              </div>
            )}
          </footer>
        ) : (
          <footer className="flex items-start gap-3 border-t border-line bg-surface-2/40 px-6 py-5 sm:px-8" data-testid="quote-outcome">
            {confirmed ? (
              <CheckCircle size={24} weight="light" className="shrink-0 text-palm" aria-hidden />
            ) : quote.state === "EXPIRED" || quote.state === "REPLACED" || q?.expired ? (
              <Clock size={24} weight="light" className="shrink-0 text-ochre" aria-hidden />
            ) : (
              <XCircle size={24} weight="light" className="shrink-0 text-ink-muted" aria-hidden />
            )}
            <div className="text-[0.9375rem] leading-relaxed">
              <p className="font-medium" data-testid="quote-outcome-title">
                {confirmed
                  ? r.payment.status === "PAID"
                    ? "Paid and confirmed"
                    : "Confirmed; it will go on your bill"
                  : quote.state === "REPLACED"
                    ? "The concierge sent a newer price"
                    : quote.state === "EXPIRED" || q?.expired
                      ? "This price has expired"
                      : r.status === "AWAITING_GUEST" && r.payment.authorizationUrl
                        ? "Waiting for your payment"
                        : w.label}
              </p>
              <p className="text-ink-muted">
                {confirmed
                  ? "Nothing else to do. We will be in touch on the day."
                  : quote.state === "REPLACED"
                    ? "Use the link in the latest message, or open your booking."
                    : quote.state === "EXPIRED" || q?.expired
                      ? "Ask the concierge and they will send a fresh one."
                      : w.line}
              </p>
              {r.status === "AWAITING_GUEST" && r.payment.authorizationUrl && paying?.state !== "PENDING" ? (
                <a href={r.payment.authorizationUrl} className="btn btn-primary mt-4" data-testid="quote-pay-again">
                  Pay {formatNaira(q?.totalKobo ?? null)} <ArrowRight size={15} aria-hidden />
                </a>
              ) : null}
            </div>
          </footer>
        )}
      </article>

      {tel ? (
        <p className="mt-6 flex items-center gap-2 text-sm text-ink-muted">
          <Phone size={15} aria-hidden /> Questions? Call the front desk on{" "}
          <a href={`tel:${tel}`} className="num link-static whitespace-nowrap text-ink">
            {formatPhone(hotel.phone!)}
          </a>
        </p>
      ) : null}
      {hotel.slug && !branded ? (
        <p className="mt-2 text-sm">
          <Link href={`/stays/${hotel.slug}`} className="link-static text-ink-muted">
            About {hotel.name}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function PayOption({ on, onPick, icon, title, line, testId }: { on: boolean; onPick: () => void; icon: React.ReactNode; title: string; line: string; testId: string }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-sm border px-4 py-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-laterite ${
        on ? "border-laterite bg-laterite/[0.06]" : "border-line-strong bg-surface hover:border-ink-muted"
      }`}
    >
      <input type="radio" className="sr-only" name="quote-pay" checked={on} onChange={onPick} data-testid={testId} />
      <span className={on ? "text-laterite" : "text-ink-muted"}>{icon}</span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-ink-muted">{line}</span>
      </span>
    </label>
  );
}
