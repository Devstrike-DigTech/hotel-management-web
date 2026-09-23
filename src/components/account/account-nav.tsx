import { SuitcaseRolling, UserCircle } from "@phosphor-icons/react";
import Link from "next/link";

/** Heading and the two account tabs: Trips and Profile. */
export function AccountNav({ current, name }: { current: "trips" | "profile"; name?: string | null }) {
  const first = name?.trim().split(/\s+/)[0];
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink pb-5">
      <div>
        <p className="kicker">Your account</p>
        <h1 className="display-md mt-3 text-[clamp(2.4rem,5vw,4rem)]">
          {current === "trips" ? (
            <>
              {first ? `${first}'s` : "Your"} <em className="accent">trips</em>
            </>
          ) : (
            <>
              Your <em className="accent">profile</em>
            </>
          )}
        </h1>
      </div>
      <nav aria-label="Account" className="flex gap-1 rounded-sm border border-line-strong p-1 text-sm">
        {(
          [
            ["trips", "/trips", "Trips", SuitcaseRolling],
            ["profile", "/account", "Profile", UserCircle],
          ] as const
        ).map(([k, href, label, Icon]) => (
          <Link
            key={k}
            href={href}
            aria-current={current === k ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-xs px-3.5 py-2 transition-colors ${current === k ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"}`}
          >
            <Icon size={16} weight={current === k ? "regular" : "light"} aria-hidden /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
