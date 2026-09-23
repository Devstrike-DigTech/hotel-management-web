"use client";

import { ArrowRight, ChatText, EnvelopeOpen, PencilSimple, WhatsappLogo } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { GuestAccount, OtpChallenge } from "@/lib/booking-types";
import { call, ClientApiError, humanError } from "@/lib/client-api";
import { toE164Digits } from "@/lib/format";
import { formatLagosClock } from "@/lib/time";
import { notifySession } from "./account-link";
import { OtpInput, ResendTimer } from "./otp-input";

type Channel = "SMS" | "WHATSAPP";

export const validNigerianMobile = (phone: string) => /^234[789][01]\d{8}$/.test(toE164Digits(phone));

/**
 * Phone sign-in in two short steps: the number (and SMS or WhatsApp), then the six-digit code.
 * No passwords. The first successful code creates the account and links earlier bookings made
 * with that number.
 */
export function PhoneSignIn({
  onSignedIn,
  initialPhone = "",
  devMode = false,
  compact = false,
  mailboxHref = "/dev/mailbox",
}: {
  onSignedIn: (guest: GuestAccount, isNew: boolean) => void;
  initialPhone?: string;
  devMode?: boolean;
  compact?: boolean;
  mailboxHref?: string;
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [channel, setChannel] = useState<Channel>("SMS");
  const [challenge, setChallenge] = useState<(OtpChallenge & { sentAt: number }) | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  async function start(e?: React.FormEvent) {
    e?.preventDefault();
    if (!validNigerianMobile(phone)) {
      setPhoneError("Enter a Nigerian mobile number, for example 0803 123 4567.");
      return;
    }
    setPhoneError(null);
    setBusy(true);
    setError(null);
    try {
      const c = await call<OtpChallenge>("public/auth/otp/start", {
        method: "POST",
        body: { phone: `+${toE164Digits(phone)}`, channel },
      });
      setChallenge({ ...c, sentAt: Date.now() });
      setCode("");
      setInvalid(false);
    } catch (err) {
      if (err instanceof ClientApiError && err.code === "OTP_RESEND_TOO_SOON") {
        const s = Number((err.details as { retryAfterSec?: number })?.retryAfterSec ?? 60);
        setError(`A code was sent a moment ago. You can ask for another in ${s} seconds.`);
      } else if (err instanceof ClientApiError && err.code === "OTP_LOCKED") {
        const until = (err.details as { lockedUntil?: string })?.lockedUntil;
        setError(`Too many wrong codes. For your safety this number is paused${until ? ` until ${formatLagosClock(until)}` : " for 15 minutes"}.`);
      } else if (err instanceof ClientApiError && err.code === "VALIDATION_ERROR") {
        setPhoneError("That number does not look right. Check it and try again.");
      } else setError(humanError(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(value: string) {
    if (!challenge || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await call<{ guest: GuestAccount; isNew: boolean }>("public/auth/otp/verify", {
        method: "POST",
        body: { challengeId: challenge.challengeId, code: value },
      });
      notifySession();
      onSignedIn(res.guest, res.isNew);
    } catch (err) {
      setCode("");
      if (err instanceof ClientApiError && err.code === "OTP_INVALID") {
        const left = (err.details as { attemptsLeft?: number })?.attemptsLeft;
        setInvalid(true);
        setError(`That code is not right.${typeof left === "number" ? ` ${left} ${left === 1 ? "try" : "tries"} left.` : ""}`);
      } else if (err instanceof ClientApiError && err.code === "OTP_EXPIRED") {
        setError("That code has expired. Send a new one; it takes a few seconds.");
      } else if (err instanceof ClientApiError && err.code === "OTP_LOCKED") {
        setChallenge(null);
        setError("Too many wrong codes, so we have paused this number for 15 minutes. Nothing about your bookings has changed.");
      } else setError(humanError(err));
    } finally {
      setBusy(false);
    }
  }

  // Clear the red state as soon as the guest starts typing again.
  useEffect(() => {
    if (code.length > 0 && invalid) {
      const t = setTimeout(() => setInvalid(false), 0);
      return () => clearTimeout(t);
    }
  }, [code, invalid]);

  if (!challenge) {
    return (
      <form onSubmit={start} noValidate className={compact ? "" : "max-w-md"}>
        <label htmlFor="signin-phone" className="mb-2 block text-sm font-medium">
          Mobile number
        </label>
        <div className="flex">
          <span className="num inline-flex items-center rounded-l-sm border border-r-0 border-line-strong bg-surface-2 px-3 text-sm text-ink-muted">+234</span>
          <input
            id="signin-phone"
            className="field !rounded-l-none"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="0803 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={!!phoneError}
            aria-describedby="signin-phone-hint"
            data-testid="signin-phone"
          />
        </div>
        <p id="signin-phone-hint" className={`mt-1.5 text-xs ${phoneError ? "text-danger" : "text-ink-muted"}`}>
          {phoneError ?? "We will send a six-digit code. No password to remember."}
        </p>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium">Send the code by</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["SMS", "Text message", ChatText],
                ["WHATSAPP", "WhatsApp", WhatsappLogo],
              ] as const
            ).map(([c, label, Icon]) => (
              <label
                key={c}
                className={`flex cursor-pointer items-center gap-2.5 rounded-sm border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-laterite ${
                  channel === c ? "border-laterite bg-laterite/[0.05]" : "border-line-strong hover:border-ink-muted"
                }`}
              >
                <input type="radio" name="otp-channel" className="sr-only" checked={channel === c} onChange={() => setChannel(c)} />
                <Icon size={18} weight={channel === c ? "regular" : "light"} className={channel === c ? "text-laterite" : "text-ink-muted"} aria-hidden />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-ochre">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary group mt-6 w-full" disabled={busy} data-testid="signin-send">
          {busy ? "Sending the code" : "Send my code"}
          <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </form>
    );
  }

  return (
    <div className={compact ? "" : "max-w-md"}>
      <p className="text-[0.9375rem] leading-relaxed">
        We sent a code by {challenge.channel === "WHATSAPP" ? "WhatsApp" : "text message"} to{" "}
        <span className="num whitespace-nowrap font-medium">{challenge.maskedPhone}</span>.{" "}
        <button type="button" className="link-static inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink" onClick={() => setChallenge(null)}>
          <PencilSimple size={13} aria-hidden /> Change
        </button>
      </p>
      <div className="mt-5">
        <OtpInput
          length={challenge.codeLength || 6}
          value={code}
          onChange={(v) => {
            setCode(v);
            if (error && !invalid) setError(null);
          }}
          onComplete={verify}
          disabled={busy}
          invalid={invalid}
        />
      </div>
      <p className="mt-3 min-h-5 text-sm" aria-live="assertive">
        {busy ? <span className="text-ink-muted">Checking the code</span> : error ? <span className={invalid ? "text-danger" : "text-ochre"}>{error}</span> : null}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <ResendTimer key={challenge.sentAt} startedAt={challenge.sentAt} seconds={challenge.resendAfterSec || 60} onResend={() => start()} busy={busy}>
          <button
            type="button"
            className="link-static text-sm text-ink-muted hover:text-ink"
            onClick={() => {
              setChannel(challenge.channel === "SMS" ? "WHATSAPP" : "SMS");
              setChallenge(null);
            }}
          >
            Use {challenge.channel === "SMS" ? "WhatsApp" : "a text message"} instead
          </button>
        </ResendTimer>
        {devMode ? (
          <a href={mailboxHref} target="_blank" rel="noopener noreferrer" className="kicker inline-flex items-center gap-1.5 !text-ochre hover:underline">
            <EnvelopeOpen size={13} aria-hidden /> Dev mailbox
          </a>
        ) : null}
      </div>
      <p className="mt-5 text-xs text-ink-muted">
        The code works for five minutes, until <span className="num">{formatLagosClock(challenge.expiresAt)}</span>.
      </p>
    </div>
  );
}
