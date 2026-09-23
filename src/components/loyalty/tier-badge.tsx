/**
 * A loyalty tier as a small status chip. The entry tier is a plain outline; each tier up gains
 * weight, and the top tiers are brass, the design's colour for anything premium.
 */
export function TierBadge({ name, rank, size = "sm" }: { name: string; rank: number; size?: "sm" | "md" }) {
  const tone =
    rank <= 0
      ? "border-line-strong text-ink-muted"
      : rank === 1
        ? "border-ink/50 text-ink"
        : "border-brass bg-brass text-[#1b1a17]"; // dark ink on brass passes AA in both themes
  const pad = size === "md" ? "px-2.5 py-1 !text-[11px]" : "px-2 py-0.5 !text-[10px]";
  return (
    <span className={`kicker inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border ${pad} ${tone}`} data-testid="tier-badge">
      <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
        {/* the adire diamond, filled once a tier is earned beyond the first */}
        <path d="M5 0.8 9.2 5 5 9.2 0.8 5Z" fill={rank > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.1" />
      </svg>
      {name}
    </span>
  );
}
