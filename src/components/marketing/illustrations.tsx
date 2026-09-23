/** Thin-line illustrations drawn for the product. They take currentColor and the laterite token. */

/** A key rack with every hook empty: in a hotel, no keys on the board means no vacancy. */
export function EmptyRack({ className = "" }: { className?: string }) {
  const hooks = [
    [40, 62, "101"],
    [90, 62, "102"],
    [140, 62, "103"],
    [40, 132, "201"],
    [90, 132, "202"],
    [140, 132, "203"],
  ] as const;
  return (
    <svg viewBox="0 0 180 200" className={className} fill="none" stroke="currentColor" strokeWidth="1" aria-hidden>
      <rect x="12" y="20" width="156" height="164" rx="3" />
      <rect x="18" y="26" width="144" height="152" rx="2" opacity=".35" />
      <circle cx="90" cy="12" r="3" />
      <path d="M90 15v5" />
      {hooks.map(([x, y, n]) => (
        <g key={n}>
          <rect x={x - 14} y={y - 24} width="28" height="11" rx="1" opacity=".6" />
          <text x={x} y={y - 16} textAnchor="middle" fontSize="7" fill="currentColor" stroke="none" style={{ fontFamily: "var(--font-mono)" }}>
            {n}
          </text>
          <path d={`M${x} ${y - 8}v10a5 5 0 0 0 10 0`} strokeLinecap="round" />
          <circle cx={x} cy={y - 8} r="1.6" fill="currentColor" />
        </g>
      ))}
      {/* one fob, fallen and lying at the foot of the board */}
      <g transform="translate(118 190) rotate(-72)" stroke="var(--laterite)">
        <path d="M0 -12 6 -7v11L0 9l-6-5V-7z" fill="color-mix(in oklab, var(--laterite) 14%, transparent)" />
        <circle cx="0" cy="-8" r="1.3" />
      </g>
      <path d="M4 196h172" opacity=".4" />
    </svg>
  );
}

/** A brass key fob engraved 404. */
export function Fob404({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 420" className={className} fill="none" aria-hidden>
      <circle cx="110" cy="36" r="26" stroke="currentColor" strokeWidth="1.5" opacity=".7" />
      <path d="M110 62v24" stroke="currentColor" strokeWidth="1.5" opacity=".7" />
      <path d="M110 84l78 58v176l-78 76-78-76V142z" fill="var(--brass)" />
      <path d="M110 96l66 50v166l-66 64-66-64V146z" stroke="var(--paper)" strokeOpacity=".45" strokeWidth="1" />
      <circle cx="110" cy="124" r="9" fill="var(--paper)" />
      <text
        x="110"
        y="258"
        textAnchor="middle"
        fontSize="64"
        fill="var(--paper)"
        fillOpacity=".92"
        style={{ fontFamily: "var(--font-fraunces)", fontStyle: "italic", fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 1' }}
      >
        404
      </text>
      <path d="M70 286h80M82 300h56" stroke="var(--paper)" strokeOpacity=".45" />
    </svg>
  );
}
