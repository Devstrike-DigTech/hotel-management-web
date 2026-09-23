"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { GuestMembership } from "@/lib/booking-types";
import { call, ClientApiError, humanError } from "@/lib/client-api";
import { groupLabel } from "@/lib/format";
import { membershipView, statementView } from "@/lib/loyalty";
import { Notice } from "../ui/field";
import { PointsCard } from "../loyalty/points-card";
import { PointsStatement } from "../loyalty/statement";
import { AccountNav } from "./account-nav";
import { useGuest } from "./use-guest";

type Load = { status: "loading" } | { status: "ready"; memberships: GuestMembership[] } | { status: "error"; message: string };

/**
 * Points and tier per hotel group. A group runs one programme across its hotels, so each membership
 * is one card, with its latest statement lines beneath.
 */
export function PointsView() {
  const { state } = useGuest({ required: true, next: "/account/points" });
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const signedIn = state.status === "signed-in";

  useEffect(() => {
    if (!signedIn) return;
    const ctl = new AbortController();
    call<{ memberships: GuestMembership[] }>("guest/loyalty", { signal: ctl.signal })
      .then((r) => setLoad({ status: "ready", memberships: r.memberships ?? [] }))
      .catch((e) => {
        if (ctl.signal.aborted) return;
        // An API from before M5 has no loyalty: nothing to show rather than an error.
        if (e instanceof ClientApiError && e.status === 404) setLoad({ status: "ready", memberships: [] });
        else setLoad({ status: "error", message: humanError(e) });
      });
    return () => ctl.abort();
  }, [signedIn, attempt]);

  const name = state.status === "signed-in" ? state.guest.fullName : null;

  return (
    <div className="container-page pb-10 pt-10 lg:pt-14">
      <AccountNav current="points" name={name} />
      {load.status === "loading" || !signedIn ? (
        <div className="mt-10 grid gap-8 lg:grid-cols-2" aria-busy="true">
          <div className="skeleton h-80 rounded-md" />
          <div className="skeleton h-80 rounded-md" />
        </div>
      ) : load.status === "error" ? (
        <div className="mt-10 max-w-xl">
          <Notice tone="warn" title="Your points did not load" action={<button className="btn btn-outline !min-h-9 text-sm" onClick={() => setAttempt((n) => n + 1)}>Try again</button>}>
            {load.message}
          </Notice>
        </div>
      ) : load.memberships.length ? (
        <div className="mt-10 space-y-16" data-testid="memberships">
          {load.memberships.map((m) => {
            const view = membershipView(m);
            return (
              <section key={m.group.slug} aria-label={`${m.programme}, ${m.group.name}`} className="grid gap-8 lg:grid-cols-12 lg:gap-12">
                <div className="lg:col-span-5">
                  <PointsCard m={view} />
                </div>
                <div className="min-w-0 lg:col-span-7">
                  <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-3">
                    <h2 className="display-sm text-[1.6rem]">Statement</h2>
                    <span className="kicker">Latest {m.recent.length || ""}</span>
                  </div>
                  <div className="mt-2">
                    <PointsStatement entries={m.recent.map(statementView)} programmeName={m.programme} />
                  </div>
                  <p className="mt-5 text-sm text-ink-muted">
                    Use your points on a stay at any hotel of {groupLabel(m.group.name)}: book while signed in, and the review step offers them.
                  </p>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-12 grid items-center gap-10 md:grid-cols-[14rem_1fr]" data-testid="memberships-empty">
          <EmptyCard />
          <div>
            <p className="kicker text-laterite">No memberships yet</p>
            <h2 className="display-md mt-3 text-4xl">Points collect here, hotel group by hotel group.</h2>
            <p className="mt-4 max-w-lg leading-relaxed text-ink-muted">
              Some hotels run a guest programme across all their houses. Join at the front desk when you check in, or from a booking&rsquo;s page; the nights and
              points then gather here, with what they are worth.
            </p>
            <Link href="/trips" className="btn btn-outline mt-6">
              Your trips <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** An unfilled members' card, drawn in hairlines. */
function EmptyCard() {
  return (
    <svg viewBox="0 0 220 140" className="mx-auto w-48 text-ink md:w-full" aria-hidden>
      <rect x="1" y="1" width="218" height="138" rx="6" fill="none" stroke="currentColor" strokeOpacity=".35" />
      <path d="M1 7a6 6 0 0 1 6-6h206a6 6 0 0 1 6 6" fill="none" stroke="var(--brass)" strokeWidth="3" />
      <path d="M18 26h60M18 38h90" stroke="currentColor" strokeOpacity=".35" />
      <path d="M170 20l10 10-10 10-10-10z" fill="none" stroke="var(--brass)" />
      <text x="18" y="86" fill="currentColor" fillOpacity=".5" style={{ font: "500 30px var(--font-plex-mono), monospace" }}>
        0
      </text>
      <g stroke="currentColor" strokeOpacity=".3" strokeWidth="2" strokeLinecap="round">
        {Array.from({ length: 10 }, (_, i) => (
          <path key={i} d={`M${20 + i * 8 + Math.floor(i / 5) * 8} 110v12`} />
        ))}
      </g>
    </svg>
  );
}
