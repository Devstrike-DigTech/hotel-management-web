"use client";

import { ArrowRight, LockSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { call, humanError, newKey } from "@/lib/client-api";
import { preferredWords, statusWords, type ConciergeRequestView } from "@/lib/concierge";
import { formatNaira } from "@/lib/format";
import { StarInput, Stars } from "../reviews/stars";
import { CategoryIcon } from "./category-icon";

const TONE: Record<ReturnType<typeof statusWords>["tone"], string> = {
  neutral: "!text-ink border-line-strong",
  brass: "!text-brass border-brass/50",
  palm: "!text-palm border-palm/45",
  adire: "!text-adire border-adire/45",
  muted: "!text-ink-muted border-line-strong",
};

export function RequestStatusChip({ request }: { request: Pick<ConciergeRequestView, "status" | "statusLabel" | "payment"> }) {
  const w = statusWords(request);
  return (
    <span className={`kicker inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 !text-[10px] ${TONE[w.tone]}`} data-testid="request-status">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {w.label}
    </span>
  );
}

/** Where a waiting quote is answered: this site's quote page, by the quote's signed token. */
export function quoteHref(r: ConciergeRequestView, base: string): string | null {
  const q = r.quote;
  if (!q || q.expired) return null;
  if (q.token) return `${base}/concierge/q/${encodeURIComponent(q.token)}`;
  if (q.url) {
    try {
      const u = new URL(q.url);
      return `${base}${u.pathname}${u.search}`;
    } catch {
      return q.url;
    }
  }
  return null;
}

/** One request on the trip page: what, when, its state in words, and what the guest can do next. */
export function RequestCard({
  request: r,
  code,
  token,
  base,
  onChanged,
}: {
  request: ConciergeRequestView;
  code: string;
  token: string;
  base: string;
  onChanged: () => void;
}) {
  const w = statusWords(r);
  const when = preferredWords(r.preferredAt, r.preferredWindow);
  const waiting = r.status === "QUOTED" && !!r.quote;
  const href = waiting ? quoteHref(r, base) : null;
  const payUrl = r.status === "AWAITING_GUEST" && r.payment.status === "PENDING" ? r.payment.authorizationUrl : null;
  const amount = r.quote?.totalKobo ?? r.price?.totalKobo ?? null;
  return (
    <li className="py-5" data-testid="concierge-request" data-request-id={r.id} data-status={r.status}>
      <div className="flex items-start gap-4">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-sm bg-surface-2 text-laterite">
          <CategoryIcon category={r.category} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <p className="flex items-center gap-2 font-medium">
              {r.title}
              {r.discreet ? (
                <span className="inline-flex items-center gap-1 text-xs font-normal text-adire" title="Only the concierge team sees this">
                  <LockSimple size={12} weight="fill" aria-hidden /> Private
                </span>
              ) : null}
            </p>
            <RequestStatusChip request={r} />
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {[when, r.partySize ? `${r.partySize} ${r.partySize === 1 ? "person" : "people"}` : null, r.number].filter(Boolean).join(" · ")}
          </p>
          {r.requestText && !r.serviceId ? <p className="mt-1.5 line-clamp-2 text-sm italic text-ink-muted">&ldquo;{r.requestText}&rdquo;</p> : null}
          <p className="mt-2 text-sm" data-testid="request-line">
            {w.line}
            {amount && r.status !== "DECLINED" && r.status !== "CANCELLED" ? <span className="num ml-2 text-ink-muted">{formatNaira(amount)}</span> : null}
          </p>
          {r.quote?.note && waiting ? <p className="mt-2 border-l-2 border-brass/60 pl-3 text-sm italic text-ink-muted">{r.quote.note}</p> : null}
          {href ? (
            <Link href={href} className="btn btn-primary mt-3 !min-h-10 text-sm" data-testid="see-quote">
              See the price and accept <ArrowRight size={14} aria-hidden />
            </Link>
          ) : payUrl ? (
            <a href={payUrl} className="btn btn-primary mt-3 !min-h-10 text-sm" data-testid="request-pay">
              Pay {formatNaira(amount)} to confirm <ArrowRight size={14} aria-hidden />
            </a>
          ) : null}
          {r.status === "COMPLETED" ? r.rating ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted" data-testid="request-rated">
              <Stars value={r.rating.score} /> Thank you for rating it.
            </p>
          ) : r.canRate ? (
            <RateRequest request={r} code={code} token={token} onDone={onChanged} />
          ) : null : null}
          {r.canCancel ? <CancelRequest request={r} code={code} token={token} onDone={onChanged} /> : null}
        </div>
      </div>
    </li>
  );
}

function RateRequest({ request, code, token, onDone }: { request: ConciergeRequestView; code: string; token: string; onDone: () => void }) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send() {
    if (!score) return setError("Choose a score first.");
    setBusy(true);
    setError(null);
    try {
      await call(`public/trips/${encodeURIComponent(code)}/concierge/requests/${encodeURIComponent(request.id)}/rating`, {
        method: "POST",
        query: { t: token },
        body: { rating: score, ...(comment.trim() ? { comment: comment.trim() } : {}) },
        idempotencyKey: newKey(),
      });
      onDone();
    } catch (e) {
      setError(humanError(e));
      setBusy(false);
    }
  }
  return (
    <div className="mt-4 rounded-md border border-brass/40 bg-brass/[0.05] p-4" data-testid="rate-request">
      <StarInput label="How was it?" value={score} onChange={setScore} size={24} name={`rate-${request.id}`} error={error ?? undefined} />
      <label className="mt-3 block text-sm">
        <span className="sr-only">A word for the concierge</span>
        <input className="field" value={comment} maxLength={500} onChange={(e) => setComment(e.target.value)} placeholder="A word for the concierge (optional)" />
      </label>
      <button type="button" className="btn btn-ink mt-3 !min-h-10 text-sm" disabled={busy} onClick={send} data-testid="rate-send">
        {busy ? "Sending" : "Send"}
      </button>
    </div>
  );
}

function CancelRequest({ request, code, token, onDone }: { request: ConciergeRequestView; code: string; token: string; onDone: () => void }) {
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!sure)
    return (
      <button type="button" className="link-static mt-3 block text-sm text-ink-muted" onClick={() => setSure(true)} data-testid="request-cancel">
        Cancel this request
      </button>
    );
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
      <span>Cancel {request.title.toLowerCase()}?</span>
      <button
        type="button"
        className="link-static text-danger"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await call(`public/trips/${encodeURIComponent(code)}/concierge/requests/${encodeURIComponent(request.id)}/cancel`, { method: "POST", query: { t: token }, body: {}, idempotencyKey: newKey() });
            onDone();
          } catch (e) {
            setError(humanError(e));
            setBusy(false);
          }
        }}
      >
        Yes, cancel it
      </button>
      <button type="button" className="link-static text-ink-muted" onClick={() => setSure(false)}>
        Keep it
      </button>
      {error ? <p className="w-full text-xs text-danger">{error}</p> : null}
    </div>
  );
}
