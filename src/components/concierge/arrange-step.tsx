"use client";

import { ChatCircleDots, Check, LockSimple, PencilSimpleLine, Plus, X } from "@phosphor-icons/react";
import { useState } from "react";
import { call, newKey } from "@/lib/client-api";
import { byCategory, CATEGORY_NAME, preferredWords, priceLine, type ConciergeCatalogue } from "@/lib/concierge";
import { formatNaira } from "@/lib/format";
import { CategoryIcon } from "./category-icon";
import { draftBody, type DraftRequest, type RequestContext } from "./request-form";
import { ConciergeSheet } from "./sheet";

/**
 * Booking, optional step: "Anything we can arrange for your stay?" Only services the hotel offers
 * before arrival. Choices are kept with the booking draft and sent to the concierge the moment the
 * booking exists (API-M8 15.1); they are priced and paid separately from the room.
 */
export function ArrangeStep({
  catalogue,
  drafts,
  setDrafts,
  ctx,
  title,
  initialOpen = null,
}: {
  catalogue: ConciergeCatalogue;
  drafts: DraftRequest[];
  setDrafts: (d: DraftRequest[]) => void;
  ctx: Extract<RequestContext, { kind: "draft" }>;
  title: React.ReactNode;
  initialOpen?: string | null;
}) {
  const services = catalogue.services.filter((s) => s.preArrival);
  const [sheet, setSheet] = useState<{ start: string | null; editing: DraftRequest | null } | null>(
    initialOpen && services.some((s) => s.id === initialOpen) && !drafts.some((d) => d.serviceId === initialOpen) ? { start: initialOpen, editing: null } : null,
  );
  const groups = byCategory(services);
  const upsert = (d: DraftRequest) => setDrafts(drafts.some((x) => x.key === d.key) ? drafts.map((x) => (x.key === d.key ? d : x)) : [...drafts, d]);

  return (
    <div data-testid="step-arrange">
      {title}
      <p className="-mt-4 mb-8 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted">
        Optional. Tell us now and the concierge has it ready when you arrive. Each is confirmed by the concierge and paid separately from the room; you can change your mind from your booking.
      </p>

      {drafts.length ? (
        <section aria-labelledby="arranged-title" className="mb-10 rounded-md border border-palm/40 bg-palm/[0.05]" data-testid="arranged-list">
          <h3 id="arranged-title" className="kicker border-b border-palm/25 px-5 py-3 !text-palm">
            Added to your stay
          </h3>
          <ul className="divide-y divide-line">
            {drafts.map((d) => (
              <li key={d.key} className="flex items-start gap-3 px-5 py-3.5">
                <Check size={16} weight="bold" className="mt-1 shrink-0 text-palm" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    {d.title}
                    {d.discreet ? <LockSimple size={13} weight="fill" className="text-adire" aria-label="Private" /> : null}
                  </p>
                  <p className="text-sm text-ink-muted">{[preferredWords(d.preferredAt, null) ?? "Time to be agreed", d.partySize ? `${d.partySize} ${d.partySize === 1 ? "person" : "people"}` : null].filter(Boolean).join(" · ")}</p>
                </div>
                <span className="num shrink-0 text-sm">{d.estimateKobo !== null ? (d.estimateKobo ? formatNaira(d.estimateKobo) : "Complimentary") : d.priceLine}</span>
                <span className="flex shrink-0 gap-1">
                  <button type="button" className="grid size-8 place-items-center rounded-sm text-ink-muted hover:bg-surface-2 hover:text-ink" aria-label={`Change ${d.title}`} onClick={() => setSheet({ start: d.serviceId ?? "free", editing: d })}>
                    <PencilSimpleLine size={15} />
                  </button>
                  <button type="button" className="grid size-8 place-items-center rounded-sm text-ink-muted hover:bg-surface-2 hover:text-danger" aria-label={`Remove ${d.title}`} onClick={() => setDrafts(drafts.filter((x) => x.key !== d.key))} data-testid="arranged-remove">
                    <X size={15} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.category} aria-label={CATEGORY_NAME[g.category]}>
            <h3 className="kicker mb-2 flex items-center gap-2">
              <CategoryIcon category={g.category} size={15} className="text-laterite" /> {g.services[0].categoryLabel}
            </h3>
            <ul className="divide-y divide-line border-y border-line">
              {g.services.map((s) => {
                const added = drafts.find((d) => d.serviceId === s.id);
                return (
                  <li key={s.id} className="flex items-center gap-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{s.name}</p>
                      {s.description ? <p className="line-clamp-1 text-sm text-ink-muted">{s.description}</p> : null}
                    </div>
                    <span className="num shrink-0 text-sm text-ink-muted max-xs:hidden">{priceLine(s)}</span>
                    {added ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-sm text-palm">
                        <Check size={14} weight="bold" aria-hidden /> Added
                      </span>
                    ) : (
                      <button type="button" className="btn btn-outline !min-h-9 shrink-0 !px-3 text-sm" onClick={() => setSheet({ start: s.id, editing: null })} data-testid={`arrange-add-${s.id}`} aria-label={`Add ${s.name}`}>
                        <Plus size={14} aria-hidden /> Add
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {catalogue.freeForm ? (
        <button type="button" onClick={() => setSheet({ start: "free", editing: null })} className="mt-8 flex w-full items-center gap-4 rounded-md border border-dashed border-line-strong p-4 text-left hover:border-ink-muted">
          <ChatCircleDots size={24} weight="light" className="shrink-0 text-laterite" aria-hidden />
          <span>
            <span className="block font-medium">Something else?</span>
            <span className="block text-sm text-ink-muted">Ask in your own words; the concierge will come back to you.</span>
          </span>
        </button>
      ) : null}

      {sheet ? (
        <ConciergeSheet
          services={services}
          freeForm={catalogue.freeForm}
          contactChannels={catalogue.contactChannels}
          ctx={ctx}
          start={sheet.start}
          editing={sheet.editing}
          title="For your stay"
          onClose={() => setSheet(null)}
          onDraft={upsert}
        />
      ) : null}
    </div>
  );
}

/** The review step's short list of what goes to the concierge after booking. */
export function ArrangedSummary({ drafts, onEdit }: { drafts: DraftRequest[]; onEdit?: () => void }) {
  if (!drafts.length) return null;
  return (
    <section aria-labelledby="arranged-review" className="mt-8 rounded-sm border border-line" data-testid="review-arranged">
      <div className="flex items-baseline justify-between gap-4 border-b border-line px-4 py-2.5">
        <h3 id="arranged-review" className="kicker">
          For the concierge
        </h3>
        {onEdit ? (
          <button type="button" className="link-static text-sm" onClick={onEdit}>
            Change
          </button>
        ) : null}
      </div>
      <ul className="divide-y divide-line text-sm">
        {drafts.map((d) => (
          <li key={d.key} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <span className="inline-flex items-center gap-2">
              {d.title}
              {d.discreet ? <LockSimple size={12} weight="fill" className="text-adire" aria-label="Private" /> : null}
            </span>
            <span className="num text-ink-muted">{d.estimateKobo !== null ? (d.estimateKobo ? formatNaira(d.estimateKobo) : "Complimentary") : d.priceLine}</span>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-4 py-2.5 text-xs leading-relaxed text-ink-muted">Not in the room total. Sent to the concierge as soon as you book; each is confirmed and paid on its own.</p>
    </section>
  );
}

/** Sends the drafts to the concierge for a booking just made. Returns how many could not be sent. */
export async function sendDrafts(code: string, token: string, drafts: DraftRequest[]): Promise<number> {
  let failed = 0;
  for (const d of drafts) {
    try {
      await call(`public/trips/${encodeURIComponent(code)}/concierge/requests`, {
        method: "POST",
        query: { t: token },
        body: draftBody(d),
        idempotencyKey: d.key || newKey(),
        timeoutMs: 20_000,
      });
    } catch {
      failed++;
    }
  }
  return failed;
}
