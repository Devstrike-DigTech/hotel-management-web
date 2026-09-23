"use client";

import { Info } from "@phosphor-icons/react";
import { useId } from "react";

/** A labelled form field whose hint line turns into the error message when there is one. */
export function Field({
  label,
  hint,
  error,
  className = "",
  optional,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  optional?: boolean;
  children: (id: string, describedBy: string) => React.ReactNode;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 flex items-baseline justify-between gap-3 text-sm font-medium">
        {label}
        {optional ? <span className="text-xs font-normal text-ink-muted">Optional</span> : null}
      </label>
      {children(id, `${id}-hint`)}
      <p id={`${id}-hint`} className={`mt-1.5 text-xs ${error ? "text-danger" : "text-ink-muted"}`}>
        {error ?? hint}
      </p>
    </div>
  );
}

export function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-danger">
      <Info size={16} className="mt-0.5 shrink-0" aria-hidden /> <span>{children}</span>
    </p>
  );
}

/** A calm notice: info (adire), warning (ochre) or success (palm). */
export function Notice({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: "info" | "warn" | "ok";
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const c = tone === "warn" ? "border-ochre/45 bg-ochre/[0.06]" : tone === "ok" ? "border-palm/40 bg-palm/[0.06]" : "border-adire/30 bg-adire/[0.05]";
  const t = tone === "warn" ? "text-ochre" : tone === "ok" ? "text-palm" : "text-adire";
  return (
    <div role={tone === "warn" ? "alert" : "status"} className={`flex flex-wrap items-start justify-between gap-x-6 gap-y-3 rounded-sm border px-4 py-3.5 ${c}`}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Info size={18} weight="fill" className={`mt-0.5 shrink-0 ${t}`} aria-hidden />
        <div className="min-w-0 text-sm leading-relaxed">
          {title ? <p className="font-medium text-ink">{title}</p> : null}
          {children ? <div className="text-ink-muted">{children}</div> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
