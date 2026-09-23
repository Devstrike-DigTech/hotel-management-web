"use client";

import { ArrowLeft, CheckCircle, DeviceMobile, EnvelopeSimple, Key, SuitcaseRolling } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { call, humanError } from "@/lib/client-api";
import { PhoneSignIn } from "./phone-sign-in";

/** Only same-site paths are allowed as a post-sign-in destination. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/trips";
}

export function SignInView({ devMode }: { devMode: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [byEmail, setByEmail] = useState(false);

  return (
    <div className="container-page grid gap-12 pb-10 pt-10 lg:grid-cols-12 lg:gap-16 lg:pt-16">
      <div className="lg:col-span-6 lg:pt-6">
        <p className="kicker">Your trips</p>
        <h1 className="display-md mt-4 text-[clamp(2.6rem,6vw,4.8rem)]">
          Every booking, <em className="accent">one number.</em>
        </h1>
        <p className="mt-6 max-w-md text-[1.0625rem] leading-relaxed text-ink-muted">
          Sign in with the mobile number you book with. Your stays at every hotel on here, even ones booked before you had an account, show up
          in one place.
        </p>
        <ul className="mt-10 max-w-md divide-y divide-line border-y border-line">
          {[
            [DeviceMobile, "No password", "A six-digit code by SMS or WhatsApp, every time."],
            [SuitcaseRolling, "Trips in one place", "Upcoming and past stays, receipts and invoices."],
            [Key, "Manage it yourself", "Cancel within the hotel's policy and see the refund before you decide."],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof Key;
            return (
              <li key={title as string} className="flex gap-4 py-4">
                <I size={22} weight="light" className="mt-0.5 shrink-0 text-laterite" aria-hidden />
                <p className="text-sm leading-relaxed">
                  <span className="font-medium">{title as string}.</span> <span className="text-ink-muted">{body as string}</span>
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="lg:col-span-5 lg:col-start-8">
        <div className="relative overflow-hidden rounded-md border border-line-strong bg-surface p-6 sm:p-8">
          <span aria-hidden className="adire-rule absolute inset-x-0 top-0 -mt-[10px] text-line-strong" />
          {byEmail ? (
            <EmailLink onBack={() => setByEmail(false)} />
          ) : (
            <>
              <h2 className="display-sm text-2xl">Sign in or create an account</h2>
              <p className="mt-2 text-sm text-ink-muted">New here? The same code creates your account.</p>
              <div className="mt-7">
                <PhoneSignIn
                  devMode={devMode}
                  compact
                  onSignedIn={(g, isNew) => {
                    router.replace(isNew && !g.profileComplete ? `/account?welcome=1&next=${encodeURIComponent(next)}` : next);
                    router.refresh();
                  }}
                />
              </div>
              <button type="button" onClick={() => setByEmail(true)} className="mt-6 inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
                <EnvelopeSimple size={16} aria-hidden /> No signal? Get a sign-in link by email instead
              </button>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted">
          Booked without an account? The link in your confirmation message opens that booking directly.
        </p>
      </div>
    </div>
  );
}

function EmailLink({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter the email address on your account.");
    setBusy(true);
    setError(null);
    try {
      await call("public/auth/email/start", { method: "POST", body: { email: email.trim() } });
      setSent(true);
    } catch (err) {
      setError(humanError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button type="button" onClick={onBack} className="kicker inline-flex items-center gap-1.5 hover:text-ink">
        <ArrowLeft size={12} aria-hidden /> Use my phone
      </button>
      {sent ? (
        <div className="mt-6" role="status">
          <CheckCircle size={30} weight="light" className="text-palm" aria-hidden />
          <h2 className="display-sm mt-3 text-2xl">Check your inbox</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            If an account uses <span className="text-ink">{email}</span>, a sign-in link is on its way. It works once, for fifteen minutes.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mt-6">
          <h2 className="display-sm text-2xl">A link by email</h2>
          <p className="mt-2 text-sm text-ink-muted">For accounts that already have an email address.</p>
          <label htmlFor="signin-email" className="mb-2 mt-6 block text-sm font-medium">
            Email
          </label>
          <input id="signin-email" type="email" inputMode="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
          <button type="submit" disabled={busy} className="btn btn-primary mt-6 w-full">
            {busy ? "Sending" : "Email me a link"}
          </button>
        </form>
      )}
    </div>
  );
}
