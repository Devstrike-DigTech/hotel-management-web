"use client";

import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { call, humanError } from "@/lib/client-api";
import { formatPoints } from "@/lib/loyalty";
import type { HotelLoyalty } from "@/lib/types";

/**
 * Joining a hotel group's programme from a booking, for a signed-in guest who is not a member yet
 * (M5 `POST /guest/loyalty/enrol`). Shows the balance instead for members; nothing without a programme.
 */
export function JoinProgramme({ hotelSlug, hotelName }: { hotelSlug: string; hotelName: string }) {
  const [info, setInfo] = useState<HotelLoyalty | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const ctl = new AbortController();
    call<HotelLoyalty>(`public/hotels/${encodeURIComponent(hotelSlug)}/loyalty`, { signal: ctl.signal })
      .then(setInfo)
      .catch(() => setInfo(null));
    return () => ctl.abort();
  }, [hotelSlug]);

  const p = info?.programme;
  if (!p) return null;

  if (info.member || joined)
    return (
      <p className="flex items-start gap-2.5 rounded-md border border-line bg-surface p-4 text-sm" data-testid="programme-member">
        <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-palm" aria-hidden />
        <span>
          {joined ? <>You are in {p.name}. Points from this stay come to you after check-out. </> : <>{p.name} member{info.member?.tier ? `, ${info.member.tier}` : ""}: </>}
          {info.member ? (
            <>
              <span className="num">{formatPoints(info.member.points)}</span> points.{" "}
            </>
          ) : null}
          <Link href="/account/points" className="link-static text-ink">
            Your points
          </Link>
        </span>
      </p>
    );

  if (!p.enrolOnline) return null;

  async function join() {
    setBusy(true);
    setError(null);
    try {
      await call("guest/loyalty/enrol", { method: "POST", body: { hotelSlug } });
      setJoined(true);
    } catch (e) {
      setError(humanError(e, "We could not add you just now."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-md border border-brass/50 bg-brass/[0.05] p-5" data-testid="programme-join">
      <p className="kicker flex items-center gap-2 !text-ink">
        <span aria-hidden className="size-1.5 rotate-45 bg-brass" />
        {p.name}
      </p>
      <h2 className="display-sm mt-2 text-xl">Collect points at {hotelName}</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        <span className="num text-ink">{p.earnPointsPer1000}</span> points for every <span className="num">₦1,000</span>, to use off a later stay at any of the group&rsquo;s hotels. Free to join.
      </p>
      <button type="button" onClick={join} disabled={busy} className="btn btn-ink mt-4 w-full" data-testid="programme-join-submit">
        {busy ? "Joining" : `Join ${p.name}`} {!busy ? <ArrowRight size={15} aria-hidden /> : null}
      </button>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
    </section>
  );
}
