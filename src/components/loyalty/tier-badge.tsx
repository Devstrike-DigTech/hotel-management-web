import type { TierColor } from "@/lib/loyalty";

const TONE: Record<TierColor, string> = {
  palm: "border-palm/60 text-palm",
  adire: "border-adire/60 text-adire",
  ochre: "border-ochre/60 text-ochre",
  laterite: "border-laterite/60 text-laterite",
  // Brass is the design's colour for anything premium, so a brass tier is set solid.
  brass: "border-brass bg-brass text-[#1b1a17]",
};

/** A loyalty tier as a small status chip, in the colour the hotel gave the tier. */
export function TierBadge({ name, color, size = "sm" }: { name: string; color: TierColor | null; size?: "sm" | "md" }) {
  const tone = color ? TONE[color] : "border-line-strong text-ink-muted";
  const pad = size === "md" ? "px-2.5 py-1 !text-[11px]" : "px-2 py-0.5 !text-[10px]";
  return (
    <span className={`kicker inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border ${pad} ${tone}`} data-testid="tier-badge">
      <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
        <path d="M5 0.8 9.2 5 5 9.2 0.8 5Z" fill={color === "brass" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.1" />
        {color && color !== "brass" ? <path d="M5 3.2 6.8 5 5 6.8 3.2 5Z" fill="currentColor" /> : null}
      </svg>
      {name}
    </span>
  );
}
