"use client";

import { ArrowLeft, ArrowRight, BellSimple, ChatCircleDots, LockSimple, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { byCategory, CATEGORY_NAME, serviceDuration, priceLine, type ConciergeCategory, type ConciergeRequestView, type ConciergeService, type ContactPreference } from "@/lib/concierge";
import { CategoryIcon } from "./category-icon";
import { RequestForm, type DraftRequest, type RequestContext } from "./request-form";

/**
 * The concierge as a sheet: from the bottom on a phone, from the side on a computer. It opens on
 * the catalogue (by kind) or straight on one service, and ends on the request's first status.
 */
export function ConciergeSheet({
  services,
  freeForm,
  contactChannels,
  neutralLabel,
  ctx,
  start,
  editing,
  onClose,
  onSent,
  onDraft,
  title = "Arrange something",
}: {
  services: ConciergeService[];
  freeForm: boolean;
  contactChannels: ContactPreference[];
  neutralLabel?: string | null;
  ctx: RequestContext;
  /** A service id to open on, "free" for "Ask for something else", or null for the catalogue. */
  start: string | null;
  editing?: DraftRequest | null;
  onClose: () => void;
  onSent?: (r: ConciergeRequestView) => void;
  onDraft?: (d: DraftRequest) => void;
  title?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<string | null>(start);
  const [cat, setCat] = useState<ConciergeCategory | "ALL">("ALL");
  const groups = byCategory(services);
  const service = view && view !== "free" ? (services.find((s) => s.id === view) ?? null) : null;
  const inForm = view === "free" || !!service;

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[data-sheet-body]")?.scrollTo({ top: 0 });
  }, [view]);

  const close = () => {
    ref.current?.close();
  };
  const shown = cat === "ALL" ? services : services.filter((s) => s.category === cat);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="concierge-sheet-title"
      className="concierge-sheet m-0 flex max-h-none max-w-none flex-col border-line-strong bg-surface p-0 text-ink shadow-[var(--shadow-float)] backdrop:bg-ink/45 backdrop:backdrop-blur-[2px]"
      data-testid="concierge-sheet"
    >
      <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-7 sm:py-5">
        <div className="min-w-0">
          {inForm && start === null ? (
            <button type="button" onClick={() => setView(null)} className="kicker inline-flex items-center gap-1.5 hover:text-ink">
              <ArrowLeft size={12} aria-hidden /> All services
            </button>
          ) : (
            <p className="kicker">The concierge</p>
          )}
          <h2 id="concierge-sheet-title" className="display-sm mt-1.5 truncate text-[1.6rem]">
            {service ? service.name : view === "free" ? "Ask for something else" : title}
          </h2>
        </div>
        <button type="button" onClick={close} className="-mr-2 inline-grid size-10 shrink-0 place-items-center rounded-sm text-ink-muted hover:bg-surface-2 hover:text-ink" aria-label="Close">
          <X size={18} />
        </button>
      </header>

      <div data-sheet-body className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">
        {inForm ? (
          <>
            {service?.description ? <p className="mb-6 text-[0.9375rem] leading-relaxed text-ink-muted">{service.description}</p> : null}
            {view === "free" ? (
              <p className="mb-6 text-[0.9375rem] leading-relaxed text-ink-muted">
                Not on the list? Tell us, and a member of the concierge team will see what can be done and come back to you.
              </p>
            ) : null}
            <RequestForm
              key={view}
              service={service}
              ctx={ctx}
              contactChannels={contactChannels}
              neutralLabel={neutralLabel}
              initial={editing}
              onSent={onSent}
              onDraft={(d) => {
                onDraft?.(d);
                close();
              }}
              onCancel={start === null && !editing ? () => setView(null) : close}
            />
          </>
        ) : (
          <>
            <p className="max-w-prose text-[0.9375rem] leading-relaxed text-ink-muted">
              {ctx.kind === "draft" ? "Added to your booking and confirmed by the concierge before you arrive." : "For your stay. Prices are shown before you ask; anything quoted needs your yes first."}
            </p>
            {groups.length > 1 ? (
              <div role="tablist" aria-label="Kinds of service" className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-7 sm:px-7">
                {(["ALL", ...groups.map((g) => g.category)] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="tab"
                    aria-selected={cat === c}
                    onClick={() => setCat(c)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-3 py-1.5 text-sm transition-colors ${cat === c ? "border-ink bg-ink text-paper" : "border-line-strong text-ink-muted hover:text-ink"}`}
                  >
                    {c === "ALL" ? null : <CategoryIcon category={c} size={15} />}
                    {c === "ALL" ? "Everything" : CATEGORY_NAME[c]}
                  </button>
                ))}
              </div>
            ) : null}
            <ul className="mt-5 divide-y divide-line border-y border-line" data-testid="concierge-list">
              {shown.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => setView(s.id)} className="group flex w-full items-center gap-4 py-4 text-left" data-testid={`service-${s.id}`}>
                    <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-surface-2 text-laterite">
                      <CategoryIcon category={s.category} size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-medium group-hover:text-laterite">
                        {s.name}
                        {s.discreetEligible ? <LockSimple size={13} className="text-ink-muted" aria-label="Can be kept private" /> : null}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-ink-muted">{[serviceDuration(s), s.description].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="num shrink-0 text-sm">{priceLine(s)}</span>
                    <ArrowRight size={15} aria-hidden className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" />
                  </button>
                </li>
              ))}
            </ul>
            {!services.length ? (
              <p className="flex items-center gap-2 py-6 text-sm text-ink-muted">
                <BellSimple size={18} weight="light" aria-hidden /> Nothing can be added before arrival just now.
              </p>
            ) : null}
            {freeForm ? (
              <button type="button" onClick={() => setView("free")} className="group mt-6 flex w-full items-center gap-4 rounded-md border border-dashed border-line-strong p-4 text-left hover:border-ink-muted" data-testid="ask-something-else">
                <ChatCircleDots size={24} weight="light" className="shrink-0 text-laterite" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">Ask for something else</span>
                  <span className="block text-sm text-ink-muted">In your own words. A person reads it.</span>
                </span>
                <ArrowRight size={15} aria-hidden className="shrink-0 text-ink-muted" />
              </button>
            ) : null}
          </>
        )}
      </div>
    </dialog>
  );
}
