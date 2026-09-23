/** A hotel's or group's italic monogram, used when it has no logo. */
export function Monogram({ name, className = "size-10 text-[15px]" }: { name: string; className?: string }) {
  const letters = name
    .replace(/^the\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span className={`grid shrink-0 place-items-center rounded-full border border-laterite text-laterite ${className}`}>
      <span className="font-display italic" style={{ fontVariationSettings: '"opsz" 36, "SOFT" 100, "WONK" 1' }}>
        {letters}
      </span>
    </span>
  );
}
