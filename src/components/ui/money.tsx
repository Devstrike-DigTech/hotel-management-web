import { formatNaira } from "@/lib/format";

/** Money is always set in Plex Mono with tabular figures (the grotesk has no naira sign). */
export function Money({ kobo, className = "" }: { kobo: number | null | undefined; className?: string }) {
  return <span className={`num whitespace-nowrap ${className}`}>{formatNaira(kobo)}</span>;
}
