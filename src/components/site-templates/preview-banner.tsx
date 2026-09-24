/**
 * Shown on every page rendered through a preview token (the admin's Brand Studio and Form Builder
 * frames): a plain ink band that cannot be mistaken for the live site. The page is also noindex.
 */
export function PreviewBanner({ draft }: { draft: boolean }) {
  return (
    <div role="status" className="preview-banner night relative z-50 border-b border-line" data-testid="preview-banner">
      <div className="container-page flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5 text-[12.5px]">
        <p className="flex items-center gap-2.5">
          <span aria-hidden className="preview-dot size-2 rounded-full bg-brass" />
          <span className="kicker !text-[11px] !text-ink">Draft preview</span>
          <span className="text-ink-muted max-sm:hidden">
            {draft ? "Unpublished changes. Guests still see the published site." : "This preview link shows the published site; the draft could not be loaded."}
          </span>
        </p>
        <a href="?preview=off" className="text-ink-muted underline decoration-1 underline-offset-2 hover:text-ink">
          Leave preview
        </a>
      </div>
    </div>
  );
}
