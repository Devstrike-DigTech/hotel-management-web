import { PreviewSignal } from "./preview-signal";

type Problem = "EXPIRED" | "NOT_FOUND" | "UNAVAILABLE" | null;

const WHY: Record<Exclude<Problem, null>, string> = {
  EXPIRED: "This preview link has expired, so this is the published site. Reopen the preview from the admin to see your draft.",
  NOT_FOUND: "This preview link is for another hotel, or for the booking form only, so this is the published site.",
  UNAVAILABLE: "The draft could not be fetched just now, so this is the published site. Reload in a moment.",
};

/**
 * Shown on every page rendered through a preview token (the admin's Brand Studio and Form Builder
 * frames): a plain ink band that cannot be mistaken for the live site. The page is also noindex.
 * When the token shows no draft, the band says why, and the frame tells the admin (postMessage) so it
 * can fetch a fresh token.
 */
export function PreviewBanner({ draft, problem = null }: { draft: boolean; problem?: Problem }) {
  const text = draft ? "Unpublished changes. Guests still see the published site." : WHY[problem ?? "UNAVAILABLE"];
  return (
    <div role="status" className="preview-banner night relative z-50 border-b border-line" data-testid="preview-banner" data-preview-state={draft ? "DRAFT" : (problem ?? "UNAVAILABLE")}>
      <div className="container-page flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5 text-[12.5px]">
        <p className="flex items-center gap-2.5">
          <span aria-hidden className={`preview-dot size-2 rounded-full ${draft ? "bg-brass" : "bg-ochre"}`} />
          <span className="kicker !text-[11px] !text-ink">Draft preview</span>
          <span className="text-ink-muted max-sm:sr-only">{text}</span>
        </p>
        <a href="?preview=off" className="text-ink-muted underline decoration-1 underline-offset-2 hover:text-ink">
          Leave preview
        </a>
      </div>
      <PreviewSignal state={draft ? "DRAFT" : (problem ?? "UNAVAILABLE")} />
    </div>
  );
}
