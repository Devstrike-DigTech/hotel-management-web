"use client";

import { ArrowRight, CheckCircle, Info, Ticket, X } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import { formatNaira } from "@/lib/format";
import type { AppliedPromo } from "@/lib/rates";

export interface PromoProblem {
  code: string;
  /** The guest-facing explanation (see promoMessage). */
  message: string;
  /** A way forward, when there is one ("Add a night", "Choose the Flexible rate"). */
  hint?: string | null;
}

/**
 * The promo code line of the review step. Folded to one quiet link until the guest wants it; the
 * code is checked by re-pricing the stay, so what shows as saved is exactly what is charged.
 */
export function PromoField({
  applied,
  busy,
  problem,
  onApply,
  onRemove,
  disabled,
  initialOpen = false,
}: {
  applied: AppliedPromo | null;
  busy: boolean;
  problem: PromoProblem | null;
  onApply: (code: string) => void;
  onRemove: () => void;
  disabled?: boolean;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen || !!problem);
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const wasOpen = useRef(open);

  useEffect(() => {
    if (open && !wasOpen.current) inputRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  if (applied) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-sm border border-palm/40 bg-palm/[0.06] px-4 py-3" data-testid="promo-applied">
        <p className="flex min-w-0 items-start gap-2.5 text-sm">
          <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-palm" aria-hidden />
          <span className="min-w-0">
            <span className="num rounded-xs border border-palm/40 px-1.5 py-0.5 text-[12.5px] font-medium tracking-wide text-palm">{applied.code}</span>{" "}
            <span className="font-medium">applied.</span> You save <span className="num font-medium text-palm" data-testid="promo-saving">{formatNaira(applied.discountKobo)}</span>
            {applied.description ? <span className="mt-0.5 block text-[12.5px] text-ink-muted">{applied.description}</span> : null}
          </span>
        </p>
        <button type="button" onClick={onRemove} disabled={busy} className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink" data-testid="promo-remove">
          <X size={13} aria-hidden /> Remove
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
        aria-expanded={false}
        data-testid="promo-open"
      >
        <Ticket size={16} aria-hidden /> <span className="link-static">Have a promo code?</span>
      </button>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase().replace(/\s+/g, "");
    if (c) onApply(c);
  };

  return (
    <form onSubmit={submit} className="max-w-lg" noValidate data-testid="promo-form">
      <label htmlFor={id} className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Ticket size={16} aria-hidden /> Promo code
      </label>
      <div className="flex">
        <input
          ref={inputRef}
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="field num !rounded-r-none uppercase tracking-[0.08em] placeholder:normal-case placeholder:tracking-normal"
          placeholder="For example WELCOME10"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={32}
          aria-invalid={!!problem}
          aria-describedby={`${id}-msg`}
          disabled={disabled || busy}
          data-testid="promo-input"
        />
        <button type="submit" className="btn btn-ink !rounded-l-none !px-5" disabled={disabled || busy || !code.trim()} data-testid="promo-apply">
          {busy ? "Checking" : "Apply"}
          {!busy ? <ArrowRight size={15} aria-hidden /> : null}
        </button>
      </div>
      <div id={`${id}-msg`} aria-live="polite" className="mt-2 min-h-5">
        {problem ? (
          <p className="flex items-start gap-2 text-[13px] leading-relaxed" data-testid="promo-error" data-code={problem.code}>
            <Info size={15} weight="fill" className="mt-0.5 shrink-0 text-danger" aria-hidden />
            <span>
              <span className="text-ink">{problem.message}</span>
              {problem.hint ? <span className="block text-ink-muted">{problem.hint}</span> : null}
            </span>
          </p>
        ) : busy ? (
          <p className="text-[13px] text-ink-muted">Checking the code against your stay</p>
        ) : (
          <p className="text-[13px] text-ink-muted">The saving shows in the price below before you pay anything.</p>
        )}
      </div>
    </form>
  );
}
