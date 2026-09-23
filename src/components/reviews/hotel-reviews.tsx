"use client";

import { CaretDown, SealCheck, Star } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import type { PublicReview, ReviewPage, ReviewSummary, TravellerType } from "@/lib/booking-types";
import { call, humanError } from "@/lib/client-api";
import { ReviewItem, SUBSCORES, TRAVELLER_LABEL, type ReviewView } from "./review-parts";
import { Stars } from "./stars";

const toView = (r: PublicReview): ReviewView => ({ ...r, hotelReply: r.hotelReply?.body ?? null, hotelRepliedAt: r.hotelReply?.repliedAt ?? null });

type Sort = "recent" | "highest" | "lowest";
const PAGE = 6;

/**
 * The guest book: the aggregate with subscore bars on the left, and the reviews themselves with a
 * traveller-type filter. Only verified stays can write here, which the page says plainly.
 */
export function HotelReviews({ slug, hotelName, initial }: { slug: string; hotelName: string; initial: ReviewPage }) {
  const summary = initial.summary;
  const [filter, setFilter] = useState<TravellerType | "ALL">("ALL");
  const [sort, setSort] = useState<Sort>("recent");
  const [items, setItems] = useState<PublicReview[]>(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  async function load(next: { filter: TravellerType | "ALL"; sort: Sort; page: number }) {
    const id = ++seq.current;
    setBusy(true);
    setError(null);
    try {
      const res = await call<ReviewPage>(`public/hotels/${encodeURIComponent(slug)}/reviews`, {
        query: { travellerType: next.filter === "ALL" ? undefined : next.filter, sort: next.sort, page: next.page, pageSize: PAGE },
      });
      if (id !== seq.current) return;
      setItems((cur) => (next.page === 1 ? res.items : [...cur, ...res.items]));
      setTotal(res.total);
      setPage(next.page);
    } catch (e) {
      if (id === seq.current) setError(humanError(e, "Reviews did not load."));
    } finally {
      if (id === seq.current) setBusy(false);
    }
  }

  if (!summary.count) {
    return (
      <div className="grid gap-4 rounded-sm border border-dashed border-line-strong px-6 py-10 text-center">
        <SealCheck size={30} weight="thin" className="mx-auto text-palm" aria-hidden />
        <p className="display-sm text-xl">No reviews yet</p>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-ink-muted">
          Reviews here come only from guests who stayed, and only after they check out. {hotelName} has not had its first one yet.
        </p>
      </div>
    );
  }

  const types = (Object.keys(TRAVELLER_LABEL) as TravellerType[]).filter((t) => (summary.byTravellerType?.[t] ?? 0) > 0);

  return (
    <div className="grid gap-10 lg:grid-cols-[15rem_1fr] lg:gap-12">
      <Aggregate summary={summary} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="-mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Traveller type">
            {(["ALL", ...types] as const).map((t) => {
              const on = filter === t;
              const count = t === "ALL" ? summary.count : summary.byTravellerType[t];
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setFilter(t);
                    load({ filter: t, sort, page: 1 });
                  }}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                    on ? "border-ink bg-ink text-paper" : "border-line-strong text-ink-muted hover:border-ink-muted hover:text-ink"
                  }`}
                >
                  {t === "ALL" ? "All stays" : TRAVELLER_LABEL[t]} <span className={`num text-[11px] ${on ? "opacity-70" : ""}`}>{count}</span>
                </button>
              );
            })}
          </div>
          <label className="relative inline-flex items-center text-[13px] text-ink-muted">
            <span className="sr-only">Sort reviews</span>
            <select
              value={sort}
              onChange={(e) => {
                const s = e.target.value as Sort;
                setSort(s);
                load({ filter, sort: s, page: 1 });
              }}
              className="appearance-none rounded-sm border border-line-strong bg-surface py-1.5 pl-3 pr-8 text-ink"
            >
              <option value="recent">Most recent</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
            <CaretDown size={13} className="pointer-events-none absolute right-2.5" aria-hidden />
          </label>
        </div>
        <div className={`divide-y divide-line transition-opacity ${busy && page === 1 ? "opacity-50" : ""}`} aria-busy={busy} aria-live="polite">
          {items.length ? (
            items.map((r) => <ReviewItem key={r.id} review={toView(r)} hotelName={hotelName} stacked />)
          ) : (
            <p className="py-10 text-sm text-ink-muted">No reviews from this kind of trip yet.</p>
          )}
        </div>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-ochre">
            {error}{" "}
            <button type="button" className="link-static font-medium" onClick={() => load({ filter, sort, page: items.length ? page + 1 : 1 })}>
              Try again
            </button>
          </p>
        ) : null}
        {items.length < total ? (
          <button type="button" disabled={busy} onClick={() => load({ filter, sort, page: page + 1 })} className="btn btn-outline mt-4 w-full sm:w-auto">
            {busy ? "Loading" : `Show more reviews`} <span className="num text-xs text-ink-muted">{total - items.length}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Aggregate({ summary }: { summary: ReviewSummary }) {
  const max = Math.max(1, ...Object.values(summary.distribution ?? {}));
  return (
    <div className="self-start lg:sticky lg:top-24">
      <p className="flex items-baseline gap-2">
        <span className="display text-[4.5rem] leading-none">{summary.rating?.toFixed(1) ?? "—"}</span>
        <span className="num text-sm text-ink-muted">/ 5</span>
      </p>
      {summary.rating ? <Stars value={summary.rating} size={16} className="mt-3" /> : null}
      <p className="mt-2 text-sm text-ink-muted">
        From <span className="num text-ink">{summary.count}</span> verified {summary.count === 1 ? "stay" : "stays"}
      </p>
      <dl className="mt-6 space-y-3">
        {SUBSCORES.map(([k, label]) => {
          const v = summary.subscores?.[k] ?? null;
          return (
            <div key={k}>
              <div className="flex items-baseline justify-between text-[13px]">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="num">{v?.toFixed(1) ?? "—"}</dd>
              </div>
              <div className="mt-1.5 h-[3px] rounded-full bg-line" aria-hidden>
                <div className="h-full rounded-full bg-brass" style={{ width: `${((v ?? 0) / 5) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </dl>
      <div className="mt-7 space-y-1.5 border-t border-line pt-5" aria-label="How guests scored their stay">
        {(["5", "4", "3", "2", "1"] as const).map((n) => (
          <div key={n} className="grid grid-cols-[1.5rem_1fr_2rem] items-center gap-2 text-[12px]">
            <span className="num inline-flex items-center gap-0.5 text-ink-muted">
              {n}
              <Star size={9} weight="fill" aria-hidden />
            </span>
            <span className="h-2 overflow-hidden rounded-[1px] bg-surface-2" aria-hidden>
              <span className="block h-full bg-ink/70" style={{ width: `${((summary.distribution?.[n] ?? 0) / max) * 100}%` }} />
            </span>
            <span className="num text-right text-ink-muted">{summary.distribution?.[n] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
