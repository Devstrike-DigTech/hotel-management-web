"use client";

import { useEffect, useRef, useState } from "react";
import { brandVars } from "@/lib/brand";

/**
 * M7: a hotel's own mark on the marketplace, which otherwise keeps the platform's look: its logo on a
 * paper chip, or its initials in its brand colour (after the contrast guard) when it has no logo or
 * the logo cannot be loaded.
 */
export function HotelMark({ name, logoUrl, accent, className = "" }: { name: string; logoUrl?: string | null; accent?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, [logoUrl]);
  const colour = brandVars(accent)?.light ?? null;
  const letters = name
    .replace(/^the\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span className={`inline-flex h-9 items-center gap-2 rounded-xs bg-paper/95 px-2 shadow-[var(--shadow-float)] ${className}`} data-testid="hotel-mark" style={colour ? ({ "--mark": colour } as React.CSSProperties) : undefined}>
      {logoUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- hotel logos live on arbitrary hosts
        <img ref={img} src={logoUrl} alt={`${name} logo`} className="h-6 w-auto max-w-[6.5rem] object-contain" onError={() => setFailed(true)} />
      ) : (
        <span className="grid size-6 place-items-center rounded-full border text-[11px]" style={{ borderColor: "var(--mark, var(--laterite))", color: "var(--mark, var(--laterite))" }} aria-hidden>
          <span className="font-display italic">{letters}</span>
        </span>
      )}
      {colour ? <span aria-hidden className="h-3.5 w-[3px] rounded-full" style={{ background: "var(--mark)" }} /> : null}
    </span>
  );
}
