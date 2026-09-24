/**
 * Heritage's ornaments, drawn as thin-line SVG so they take the brass role's colour: a crest for a
 * hotel without a logo (initials inside a double ring, the city set on the arc) and a rule with a
 * lozenge. No clip art.
 */
const initials = (name: string) =>
  name
    .replace(/^the\s+/i, "")
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export function Crest({ name, place, className = "" }: { name: string; place: string; className?: string }) {
  const id = `crest-${name.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
  // Ticks around the lower half of the ring; the city is set on the upper arc.
  const ticks = Array.from({ length: 9 }, (_, i) => 120 + i * 15);
  return (
    <svg viewBox="0 0 120 120" className={`crest text-laterite ${className}`} role="img" aria-label={`${name} crest`}>
      <defs>
        <path id={`${id}-arc`} d="M24 60a36 36 0 0 1 72 0" />
        <path id={`${id}-arc2`} d="M20 60a40 40 0 0 0 80 0" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="60" cy="60" r="53" fill="none" stroke="currentColor" strokeWidth="0.6" />
      <circle cx="60" cy="60" r="31" fill="none" stroke="currentColor" strokeWidth="0.8" />
      {ticks.map((a) => (
        <line key={a} x1="60" y1="33" x2="60" y2="36" stroke="currentColor" strokeWidth="0.8" transform={`rotate(${a} 60 60)`} />
      ))}
      <text fill="currentColor" textAnchor="middle" style={{ font: "400 8.5px var(--font-display), Georgia, serif", letterSpacing: "0.32em" }}>
        <textPath href={`#${id}-arc`} startOffset="50%">
          {place.toUpperCase()}
        </textPath>
      </text>
      <path d="M44 84h32M52 88h16" stroke="currentColor" strokeWidth="0.7" />
      <path d="M60 22l3 3-3 3-3-3z" fill="currentColor" />
      <text x="60" y="61" fill="currentColor" textAnchor="middle" dominantBaseline="central" style={{ font: "400 22px var(--font-display), Georgia, serif", letterSpacing: "0.06em" }}>
        {initials(name)}
      </text>
    </svg>
  );
}

export function Ornament({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 240 14" preserveAspectRatio="none" className={`h-3.5 ${className}`} aria-hidden style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M0 7h104" stroke="currentColor" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      <path d="M136 7h104" stroke="currentColor" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      <path d="M120 1l6 6-6 6-6-6z" fill="none" stroke="currentColor" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      <circle cx="120" cy="7" r="1.6" fill="currentColor" />
      <circle cx="109" cy="7" r="1.1" fill="currentColor" />
      <circle cx="131" cy="7" r="1.1" fill="currentColor" />
    </svg>
  );
}

/** A centred ornamental rule with a lozenge, the way Heritage opens a section. */
export function OrnamentRule({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-brass ${className}`} aria-hidden>
      <span className="h-px w-16 bg-current opacity-70" />
      <svg viewBox="0 0 20 20" className="size-3.5">
        <path d="M10 1l9 9-9 9-9-9z" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M10 6l4 4-4 4-4-4z" fill="currentColor" />
      </svg>
      <span className="h-px w-16 bg-current opacity-70" />
    </div>
  );
}
