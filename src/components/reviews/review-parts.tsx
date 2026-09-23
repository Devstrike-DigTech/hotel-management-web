import { SealCheck } from "@phosphor-icons/react/ssr";
import { formatStayMonth } from "@/lib/time";

export type TravellerType = "BUSINESS" | "COUPLE" | "FAMILY" | "SOLO" | "FRIENDS";

export const TRAVELLER_LABEL: Record<TravellerType, string> = {
  BUSINESS: "Business",
  COUPLE: "Couple",
  FAMILY: "Family",
  SOLO: "Solo",
  FRIENDS: "Friends",
};

export const SUBSCORES = [
  ["cleanliness", "Cleanliness"],
  ["service", "Service"],
  ["location", "Location"],
  ["value", "Value"],
] as const;

export type SubscoreKey = (typeof SUBSCORES)[number][0];

export interface ReviewView {
  id: string;
  overall: number;
  cleanliness?: number | null;
  service?: number | null;
  location?: number | null;
  value?: number | null;
  title: string | null;
  body: string;
  stayMonth: string;
  travellerType: TravellerType;
  displayName: string;
  createdAt?: string;
  hotelReply: string | null;
  hotelRepliedAt?: string | null;
}

/** A pip row for a 1-5 score, used in the compact subscore line under a review. */
function Pips({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-[3px]" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-[5px] w-2.5 rounded-[1px] ${i <= n ? "bg-brass" : "bg-line-strong"}`} />
      ))}
    </span>
  );
}

/** One review, as a column in a printed guest book: score, title, words, and the hotel's reply. */
export function ReviewItem({
  review,
  hotelName,
  preview = false,
  stacked = false,
}: {
  review: ReviewView;
  hotelName: string;
  preview?: boolean;
  /** Score and name in a row above the text, for narrow columns. */
  stacked?: boolean;
}) {
  const subs = SUBSCORES.filter(([k]) => typeof review[k] === "number" && review[k]! > 0);
  return (
    <article className={`grid gap-4 py-8 ${stacked ? "" : "sm:grid-cols-[10rem_1fr] sm:gap-8"}`} data-testid="review-item">
      <header className={`flex items-center gap-4 ${stacked ? "" : "sm:block"}`}>
        <p className="flex items-baseline gap-1">
          <span className="display text-[2.6rem] leading-none">{review.overall}</span>
          <span className="num text-xs text-ink-muted">/5</span>
        </p>
        <div className={`min-w-0 text-sm ${stacked ? "flex-1 border-l border-line pl-4" : "sm:mt-3"}`}>
          <p className="font-medium">{review.displayName}</p>
          <p className="text-ink-muted">
            {TRAVELLER_LABEL[review.travellerType] ?? review.travellerType}, {formatStayMonth(review.stayMonth)}
          </p>
          <p className="kicker mt-1.5 inline-flex items-center gap-1 !text-[10px] !text-palm">
            <SealCheck size={13} weight="fill" aria-hidden /> {preview ? "Verified stay (after you post)" : "Verified stay"}
          </p>
        </div>
      </header>
      <div className="min-w-0">
        {review.title ? <h3 className="display-sm text-xl">{review.title}</h3> : null}
        <p className={`${review.title ? "mt-2" : ""} max-w-[64ch] whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink/90`}>{review.body}</p>
        {subs.length ? (
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-muted">
            {subs.map(([k, label]) => (
              <li key={k} className="inline-flex items-center gap-2">
                {label} <Pips n={review[k] as number} />
                <span className="sr-only">{review[k]} out of 5</span>
              </li>
            ))}
          </ul>
        ) : null}
        {review.hotelReply ? (
          <div className="mt-5 border-l-2 border-laterite/70 pl-4">
            <p className="kicker !text-[10px]">Reply from {hotelName}</p>
            <p className="mt-1.5 max-w-[62ch] whitespace-pre-line text-sm leading-relaxed text-ink-muted">{review.hotelReply}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}
