import { Star } from "@phosphor-icons/react/ssr";

export function Rating({
  rating,
  reviewCount,
  compact = false,
  className = "",
}: {
  rating: number | null;
  reviewCount: number;
  compact?: boolean;
  className?: string;
}) {
  if (rating === null || reviewCount === 0) {
    return (
      <span className={`kicker inline-flex items-center gap-1.5 !text-brass ${className}`}>
        <span aria-hidden className="size-1.5 rotate-45 bg-brass" />
        New listing
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      <Star size={14} weight="fill" className="text-brass" aria-hidden />
      <span className="num font-medium text-ink">{rating.toFixed(1)}</span>
      <span className="sr-only">out of 5</span>
      {!compact ? (
        <span className="text-ink-muted">
          <span className="num">({reviewCount}</span> verified {reviewCount === 1 ? "stay" : "stays"})
        </span>
      ) : (
        <span className="num text-ink-muted">({reviewCount})</span>
      )}
    </span>
  );
}
