"use client";

import { ArrowRight, Check, DeviceMobile, SignOut, SuitcaseRolling } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { GuestAccount } from "@/lib/booking-types";
import { call, ClientApiError, humanError } from "@/lib/client-api";
import { formatPhone } from "@/lib/format";
import { formatLagosDateTime } from "@/lib/time";
import { Field, Notice } from "../ui/field";
import { notifySession } from "./account-link";
import { AccountNav } from "./account-nav";
import { useGuest } from "./use-guest";

export function ProfileView() {
  const params = useSearchParams();
  const welcome = params.get("welcome") === "1";
  const next = params.get("next");
  const { state, setState, signOut, retry } = useGuest({ required: true, next: "/account" });

  if (state.status === "loading" || state.status === "signed-out") return <Skeleton />;
  if (state.status === "error")
    return (
      <div className="container-page max-w-xl py-16">
        <Notice tone="warn" title="Your profile did not load" action={<button className="btn btn-outline !min-h-9 text-sm" onClick={retry}>Try again</button>}>
          {state.message}
        </Notice>
      </div>
    );

  const g = state.guest;
  return (
    <div className="container-page pb-10 pt-10 lg:pt-14">
      <AccountNav current="profile" name={g.fullName} />
      <div className="mt-10 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {welcome ? (
            <div className="mb-8">
              <Notice tone="ok" title="Welcome. Your account is ready.">
                Add your name so hotels know who is coming. Any bookings made with {formatPhone(g.phone)} are already in your trips.
              </Notice>
            </div>
          ) : null}
          <ProfileForm
            guest={g}
            onSaved={(u) => setState({ status: "signed-in", guest: u })}
            next={welcome && next && next.startsWith("/") && !next.startsWith("//") ? next : null}
          />
        </div>
        <aside className="lg:col-span-4 lg:col-start-9">
          <dl className="divide-y divide-line rounded-sm border border-line bg-surface text-sm">
            <div className="flex items-start gap-3 p-4">
              <DeviceMobile size={20} weight="light" className="mt-0.5 text-laterite" aria-hidden />
              <div>
                <dt className="kicker !text-[10px]">Signed in with</dt>
                <dd className="num mt-1">{formatPhone(g.phone)}</dd>
                <dd className="mt-1 text-xs text-ink-muted">Your number is your sign-in, so it cannot be changed here.</dd>
              </div>
            </div>
            <div className="p-4">
              <dt className="kicker !text-[10px]">Member since</dt>
              <dd className="num mt-1">{formatLagosDateTime(g.createdAt).split(",").slice(0, 2).join(",")}</dd>
            </div>
          </dl>
          <button type="button" onClick={signOut} className="btn btn-outline mt-4 w-full">
            <SignOut size={16} aria-hidden /> Sign out on this device
          </button>
        </aside>
      </div>
    </div>
  );
}

function ProfileForm({ guest, onSaved, next }: { guest: GuestAccount; onSaved: (g: GuestAccount) => void; next: string | null }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(guest.fullName ?? "");
  const [email, setEmail] = useState(guest.email ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; form?: string }>({});
  const dirty = fullName !== (guest.fullName ?? "") || email !== (guest.email ?? "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (fullName.trim().length < 2) errs.fullName = "Enter your name as on your ID.";
    if (email && !/^\S+@\S+\.\S+$/.test(email)) errs.email = "That email address does not look right.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const u = await call<GuestAccount>("guest/me", { method: "PATCH", body: { fullName: fullName.trim(), email: email.trim() || null } });
      onSaved(u);
      notifySession();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      if (next) router.push(next);
    } catch (err) {
      if (err instanceof ClientApiError && err.code === "VALIDATION_ERROR") {
        setErrors({ fullName: err.fields.fullName?.[0], email: err.fields.email?.[0], form: err.fields.fullName || err.fields.email ? undefined : err.message });
      } else setErrors({ form: humanError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="max-w-xl">
      <h2 className="display-sm text-2xl">Your details</h2>
      <p className="mt-2 text-sm text-ink-muted">Used to fill in bookings. Each hotel receives only what it needs for your stay.</p>
      <div className="mt-8 space-y-6">
        <Field label="Full name" hint="As it appears on your ID" error={errors.fullName}>
          {(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errors.fullName} className="field" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />}
        </Field>
        <Field label="Email" hint="For confirmations, receipts and sign-in links" error={errors.email} optional>
          {(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errors.email} className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
      </div>
      {errors.form ? <p className="mt-4 text-sm text-danger">{errors.form}</p> : null}
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={busy || (!dirty && !next)} className="btn btn-primary">
          {busy ? "Saving" : next ? "Save and continue" : "Save changes"}
        </button>
        <span className="inline-flex items-center gap-1.5 text-sm text-palm" aria-live="polite">
          {saved ? (
            <>
              <Check size={15} aria-hidden /> Saved
            </>
          ) : null}
        </span>
        {!next ? (
          <Link href="/trips" className="ml-auto inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
            <SuitcaseRolling size={16} aria-hidden /> Your trips <ArrowRight size={14} aria-hidden />
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function Skeleton() {
  return (
    <div className="container-page pb-10 pt-10 lg:pt-14" aria-busy="true">
      <div className="skeleton h-12 w-72 rounded-xs" />
      <div className="skeleton mt-12 h-64 max-w-xl rounded-sm" />
    </div>
  );
}
