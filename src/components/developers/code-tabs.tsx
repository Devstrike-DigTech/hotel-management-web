"use client";

import { useId, useRef } from "react";
import { CopyButton } from "./copy-button";
import { setPreferredLang, usePreferredLang } from "./lang-store";

export interface CodePane {
  id: string;
  label: string;
  code: string;
  /** The highlighted code, rendered on the server. */
  node: React.ReactNode;
}

/**
 * Code in several languages behind tabs. Choosing a language switches every sample on the page
 * and is remembered for next time; a sample without the chosen language shows its first one.
 */
export function CodeTabs({ panes, title, className = "" }: { panes: CodePane[]; title?: string; className?: string }) {
  const preferred = usePreferredLang();
  const active = panes.find((p) => p.id === preferred) ?? panes[0];
  const base = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: React.KeyboardEvent, i: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % panes.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + panes.length) % panes.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = panes.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setPreferredLang(panes[next].id);
    tabs.current[next]?.focus();
  }

  return (
    <figure className={`code-plate ${className}`} data-lang={active.id}>
      <div className="code-bar">
        <div role="tablist" aria-label={title ? `${title}: language` : "Language"} className="flex min-w-0 items-center gap-1">
          {title ? <span className="code-title mr-2 hidden sm:inline">{title}</span> : null}
          {panes.map((p, i) => (
            <button
              key={p.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${p.id}`}
              aria-selected={p.id === active.id}
              aria-controls={`${base}-panel`}
              tabIndex={p.id === active.id ? 0 : -1}
              onClick={() => setPreferredLang(p.id)}
              onKeyDown={(e) => onKey(e, i)}
              className="code-tab"
              data-testid={`lang-${p.id}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <CopyButton text={active.code} label={`Copy ${active.label} code`} />
      </div>
      <pre id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${active.id}`} className="code-pre" tabIndex={0}>
        {active.node}
      </pre>
    </figure>
  );
}
