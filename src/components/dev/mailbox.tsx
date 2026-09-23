"use client";

import {
  ArrowLeft,
  ArrowsClockwise,
  ChatText,
  Check,
  Copy,
  EnvelopeSimple,
  Pause,
  Play,
  Tray,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { call, humanError } from "@/lib/client-api";
import { formatLagosClock, relativeDay } from "@/lib/time";

type Channel = "EMAIL" | "SMS" | "WHATSAPP";

export interface OutboxMessage {
  id: string;
  channel: Channel;
  to: string;
  subject: string | null;
  text: string;
  html: string | null;
  createdAt: string;
  template: string | null;
  otpCode: string | null;
}

/** Accepts the outbox entry in whichever reasonable shape the API uses. */
function normalise(raw: Record<string, unknown>, i: number): OutboxMessage {
  const s = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : null);
  const channel = String(raw.channel ?? raw.kind ?? "EMAIL").toUpperCase() as Channel;
  return {
    id: s("id") ?? String(i),
    channel: channel === "SMS" || channel === "WHATSAPP" ? channel : "EMAIL",
    to: s("to") ?? s("recipient") ?? s("address") ?? "",
    subject: s("subject"),
    text: s("text") ?? s("body") ?? s("message") ?? "",
    html: s("html"),
    createdAt: s("createdAt") ?? s("sentAt") ?? new Date().toISOString(),
    template: s("template") ?? s("templateKey"),
    otpCode: typeof (raw.meta as { otpCode?: unknown } | undefined)?.otpCode === "string" ? ((raw.meta as { otpCode: string }).otpCode) : null,
  };
}

const OTP_RE = /\b(\d{6})\b/;
/** The sign-in code in a message: the outbox's own field, else six digits in an OTP message. */
export const findOtp = (m: Pick<OutboxMessage, "text" | "template" | "otpCode">) =>
  m.otpCode ?? (m.template === "OTP" ? (OTP_RE.exec(m.text)?.[1] ?? null) : null);

const ICON = { EMAIL: EnvelopeSimple, SMS: ChatText, WHATSAPP: WhatsappLogo } as const;
const LABEL = { EMAIL: "Email", SMS: "SMS", WHATSAPP: "WhatsApp" } as const;

export function Mailbox() {
  const [items, setItems] = useState<OutboxMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Channel | "ALL">("ALL");
  const [live, setLive] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await call<unknown>("public/dev/outbox", { retries: 0, timeoutMs: 8000 });
      const list = Array.isArray(res) ? res : ((res as { items?: unknown[] })?.items ?? []);
      const next = (list as Record<string, unknown>[]).map(normalise).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setItems(next);
      setError(null);
    } catch (e) {
      setError(humanError(e, "The dev outbox could not be read. Is the backend running in development mode?"));
      setItems((cur) => cur ?? []);
    }
  }, []);

  useEffect(() => {
    // Initial load, then poll while live.
    const first = setTimeout(load, 0);
    if (!live) return () => clearTimeout(first);
    const t = setInterval(load, 3000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [live, load]);

  const shown = useMemo(
    () =>
      (items ?? []).filter(
        (m) =>
          (filter === "ALL" || m.channel === filter) &&
          (!q || `${m.to} ${m.subject ?? ""} ${m.text}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [items, filter, q],
  );
  const current = shown.find((m) => m.id === selected) ?? (selected ? (items ?? []).find((m) => m.id === selected) : undefined);
  const counts = useMemo(() => {
    const c = { ALL: 0, EMAIL: 0, SMS: 0, WHATSAPP: 0 };
    for (const m of items ?? []) {
      c.ALL++;
      c[m.channel]++;
    }
    return c;
  }, [items]);

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Dev outbox</p>
          <h1 className="display-md mt-2 text-[clamp(2rem,4vw,3rem)]">
            The <em className="accent">mailbox</em>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            Every email, SMS and WhatsApp message the backend would have sent, newest first. Codes are picked out so you can sign in
            without a phone.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setLive((l) => !l)} className="btn btn-outline !min-h-10 text-sm" aria-pressed={live}>
            {live ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
            {live ? "Pause" : "Resume"}
          </button>
          <button type="button" onClick={load} className="btn btn-outline !min-h-10 text-sm">
            <ArrowsClockwise size={15} aria-hidden /> Refresh
          </button>
          <span className="kicker ml-1 inline-flex items-center gap-2" aria-live="polite">
            <span className={`size-1.5 rounded-full ${live ? "animate-pulse bg-palm" : "bg-line-strong"}`} aria-hidden />
            {live ? "Live" : "Paused"}
          </span>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-6 rounded-sm border border-ochre/50 bg-ochre/[0.06] px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}

      <div className="mt-8 grid overflow-hidden rounded-md border border-line-strong bg-surface lg:h-[calc(100dvh-15rem)] lg:min-h-[32rem] lg:grid-cols-[24rem_1fr]">
        {/* List */}
        <div className={`flex min-h-0 flex-col border-line lg:border-r ${current ? "max-lg:hidden" : ""}`}>
          <div className="space-y-3 border-b border-line p-3">
            <div className="grid grid-cols-4 gap-1 rounded-sm bg-surface-2 p-1 text-[13px]" role="tablist" aria-label="Channel">
              {(["ALL", "EMAIL", "SMS", "WHATSAPP"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={filter === c}
                  onClick={() => setFilter(c)}
                  className={`rounded-xs px-2 py-1.5 transition-colors ${filter === c ? "bg-surface text-ink shadow-[0_1px_0_var(--line)]" : "text-ink-muted hover:text-ink"}`}
                >
                  {c === "ALL" ? "All" : LABEL[c]} <span className="num text-[11px] text-ink-muted">{counts[c]}</span>
                </button>
              ))}
            </div>
            <input value={q} onChange={(e) => setQ(e.target.value)} className="field !min-h-10 text-sm" placeholder="Search recipient or text" aria-label="Search messages" />
          </div>
          <ol className="min-h-0 flex-1 divide-y divide-line overflow-y-auto" aria-label="Messages" data-testid="mailbox-list">
            {items === null ? (
              Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="space-y-2 px-4 py-4">
                  <div className="skeleton h-3 w-1/3 rounded-xs" />
                  <div className="skeleton h-3 w-3/4 rounded-xs" />
                </li>
              ))
            ) : shown.length ? (
              shown.map((m) => {
                const Icon = ICON[m.channel];
                const otp = findOtp(m);
                const on = current?.id === m.id;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(m.id)}
                      className={`grid w-full grid-cols-[1.5rem_1fr_auto] gap-x-3 px-4 py-3.5 text-left transition-colors ${on ? "bg-laterite/[0.07]" : "hover:bg-surface-2"}`}
                      aria-current={on || undefined}
                    >
                      <Icon size={18} weight="light" className={`mt-0.5 ${on ? "text-laterite" : "text-ink-muted"}`} aria-hidden />
                      <span className="min-w-0">
                        <span className="num block truncate text-[12.5px] text-ink-muted">{m.to}</span>
                        <span className="mt-0.5 block truncate text-sm">{m.subject ?? m.text.split("\n")[0]}</span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <span className="num text-[11px] text-ink-muted">{formatLagosClock(m.createdAt)}</span>
                        {otp ? (
                          <span className="num rounded-xs bg-brass/15 px-1.5 py-0.5 text-[11px] font-medium tracking-wider text-ink" data-testid="mailbox-otp">
                            {otp}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="grid place-items-center px-6 py-16 text-center text-sm text-ink-muted">
                <Tray size={34} weight="thin" className="mb-3 text-line-strong" aria-hidden />
                Nothing here yet. Request a sign-in code or make a booking and it will appear within a few seconds.
              </li>
            )}
          </ol>
        </div>

        {/* Reader */}
        <div className={`flex min-h-[28rem] min-w-0 flex-col ${current ? "" : "max-lg:hidden"}`}>
          {current ? <Reader m={current} onBack={() => setSelected(null)} /> : (
            <div className="grid flex-1 place-items-center p-10 text-center text-sm text-ink-muted">
              <div>
                <EnvelopeSimple size={40} weight="thin" className="mx-auto mb-3 text-line-strong" aria-hidden />
                Choose a message to read it here.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Reader({ m, onBack }: { m: OutboxMessage; onBack: () => void }) {
  const [view, setView] = useState<"html" | "text">(m.html ? "html" : "text");
  const [copied, setCopied] = useState(false);
  const otp = findOtp(m);
  const Icon = ICON[m.channel];
  const mode = m.html ? view : "text";
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <button type="button" onClick={onBack} className="kicker mb-2 inline-flex items-center gap-1.5 hover:text-ink lg:hidden">
            <ArrowLeft size={12} aria-hidden /> All messages
          </button>
          <p className="kicker inline-flex items-center gap-1.5">
            <Icon size={13} aria-hidden /> {LABEL[m.channel]}
            {m.template ? <span className="text-line-strong">/</span> : null}
            {m.template ? <span>{m.template}</span> : null}
          </p>
          <h2 className="display-sm mt-1 truncate text-xl">{m.subject ?? `${LABEL[m.channel]} to ${m.to}`}</h2>
          <p className="num mt-1 text-[12.5px] text-ink-muted">
            To {m.to} &middot; {relativeDay(m.createdAt)}, {formatLagosClock(m.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {otp ? (
            <button
              type="button"
              className="btn btn-ink !min-h-9 !px-3 text-sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(otp);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {}
              }}
            >
              {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
              <span className="num tracking-wider">{otp}</span>
            </button>
          ) : null}
          {m.html ? (
            <div className="grid grid-cols-2 rounded-sm border border-line-strong p-0.5 text-[13px]" role="tablist" aria-label="Format">
              {(["html", "text"] as const).map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-xs px-2.5 py-1 ${view === v ? "bg-ink text-paper" : "text-ink-muted"}`}>
                  {v === "html" ? "HTML" : "Text"}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-surface-2/60">
        {mode === "html" && m.html ? (
          // Sandboxed with no permissions: no scripts, no forms, no top navigation.
          <iframe title={m.subject ?? "Email"} sandbox="" srcDoc={m.html} className="h-full min-h-[36rem] w-full border-0 bg-white" />
        ) : m.channel === "EMAIL" ? (
          <pre className="num whitespace-pre-wrap p-6 text-[13px] leading-relaxed">{m.text}</pre>
        ) : (
          <div className="p-6 sm:p-10">
            <div className="max-w-sm">
              <div className={`relative rounded-lg rounded-bl-xs px-4 py-3 text-[0.9375rem] leading-relaxed shadow-[0_1px_0_var(--line)] ${m.channel === "WHATSAPP" ? "bg-palm/15" : "bg-surface"}`}>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className="num mt-1.5 text-right text-[11px] text-ink-muted">{formatLagosClock(m.createdAt)}</p>
              </div>
              <p className="num mt-2 text-[11px] text-ink-muted">
                {m.text.length} characters{m.channel === "SMS" ? `, ${Math.max(1, Math.ceil(m.text.length / 160))} SMS` : ""}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
