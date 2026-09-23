import { APP_NAME } from "@/lib/env";

/** The brass key fob: the product's only pictorial mark. */
export function KeyFob({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 20 30"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d="M10 1.2 18.6 8v14L10 28.8 1.4 22V8z" fill="currentColor" />
      <circle cx="10" cy="6.6" r="2" fill="var(--paper)" />
      <path d="M5.5 13.5h9M5.5 17h9M5.5 20.5h6" stroke="var(--paper)" strokeWidth="1" opacity=".55" />
    </svg>
  );
}

export function Wordmark({ name = APP_NAME, className = "", size = "md" }: { name?: string; className?: string; size?: "md" | "lg" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <KeyFob className={size === "lg" ? "h-8 w-auto text-laterite" : "h-[22px] w-auto text-laterite"} />
      <span
        className={`font-display leading-none tracking-[-0.03em] ${size === "lg" ? "text-3xl" : "text-[1.35rem]"}`}
        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 20', fontWeight: 520 }}
      >
        {name}
      </span>
    </span>
  );
}
