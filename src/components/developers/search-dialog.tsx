"use client";

import { ArrowElbowDownLeft, BookOpenText, Hash, MagnifyingGlass, TreeStructure } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { SearchEntry } from "@/lib/developers/search-index";

const SUGGESTED = ["Getting started", "Authentication and scopes", "Verifying signatures", "Create a reservation", "Rate limits"];

function score(entry: SearchEntry, terms: string[]): number {
  const title = entry.title.toLowerCase();
  const path = (entry.path ?? "").toLowerCase();
  const hay = `${title} ${entry.parent ?? ""} ${path} ${entry.method ?? ""} ${entry.keywords ?? ""}`.toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (!hay.includes(t)) return 0;
    if (title.startsWith(t)) s += 6;
    else if (new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(title)) s += 4;
    else if (title.includes(t)) s += 3;
    else if (path.includes(t)) s += 2;
    else s += 1;
  }
  if (entry.kind === "guide") s += 1.5;
  if (entry.kind === "endpoint") s += 0.5;
  return s;
}

const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const noop = () => () => {};

function KindIcon({ entry }: { entry: SearchEntry }) {
  if (entry.kind === "endpoint")
    return <span className={`method method-sm method-${entry.method!.toLowerCase()}`}>{entry.method}</span>;
  const Icon = entry.kind === "guide" ? BookOpenText : entry.kind === "group" ? TreeStructure : Hash;
  return (
    <span className="inline-grid w-[2.6rem] place-items-center text-ink-muted">
      <Icon size={16} aria-hidden />
    </span>
  );
}

/** The docs search: a button in the header and Ctrl/Cmd+K anywhere, over one index of guides and endpoints. */
export function SearchDialog({ index, className = "" }: { index: SearchEntry[]; className?: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const mac = useSyncExternalStore(noop, isMac, () => false);

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return SUGGESTED.map((t) => index.find((e) => e.title === t)).filter((e): e is SearchEntry => !!e);
    return index
      .map((e) => ({ e, s: score(e, terms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map((x) => x.e);
  }, [index, query]);

  const open = useCallback(() => {
    const d = dialog.current;
    if (!d || d.open) return;
    setQuery("");
    setActive(0);
    d.showModal();
    requestAnimationFrame(() => input.current?.focus());
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else open();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function go(entry: SearchEntry | undefined) {
    if (!entry) return;
    dialog.current?.close();
    router.push(entry.href);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  }

  useEffect(() => {
    document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`group flex h-10 items-center gap-2.5 rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink ${className}`}
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        data-testid="docs-search-button"
      >
        <MagnifyingGlass size={16} aria-hidden />
        <span className="flex-1 text-left max-sm:sr-only">Search the docs</span>
        <kbd className="hidden rounded-xs border border-line px-1.5 py-0.5 font-mono text-[10px] tracking-wider sm:inline">
          {mac ? "Cmd" : "Ctrl"} K
        </kbd>
      </button>
      <dialog
        ref={dialog}
        aria-label="Search the developer docs"
        className="fixed inset-x-0 top-[10vh] mx-auto mt-0 w-[min(40rem,calc(100vw-2rem))] max-w-none rounded-md border border-line-strong bg-surface p-0 text-ink shadow-[var(--shadow-float)] backdrop:bg-ink/45 backdrop:backdrop-blur-[2px]"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <MagnifyingGlass size={18} className="shrink-0 text-ink-muted" aria-hidden />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Search guides and endpoints"
            className="h-14 w-full bg-transparent text-base outline-none placeholder:text-ink-muted/80"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results.length ? `${listId}-opt-${active}` : undefined}
            aria-autocomplete="list"
            data-testid="docs-search-input"
          />
          <kbd className="font-mono text-[10px] tracking-wider text-ink-muted">Esc</kbd>
        </div>
        <p className="kicker px-4 pb-1 pt-3 !text-[10px]">{query ? `${results.length} ${results.length === 1 ? "match" : "matches"}` : "Start here"}</p>
        <ul id={listId} role="listbox" aria-label="Results" className="max-h-[min(26rem,60vh)] overflow-y-auto px-2 pb-2">
          {results.map((r, i) => (
            <li
              key={`${r.href}-${i}`}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseMove={() => setActive(i)}
              onClick={() => go(r)}
              className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-2.5 aria-selected:bg-surface-2"
            >
              <KindIcon entry={r} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem]">{r.title}</span>
                <span className="block truncate text-xs text-ink-muted">
                  {r.path ? <span className="font-mono">{r.path}</span> : null}
                  {r.path && r.parent ? " / " : null}
                  {r.parent}
                </span>
              </span>
              {i === active ? <ArrowElbowDownLeft size={14} className="text-ink-muted" aria-hidden /> : null}
            </li>
          ))}
          {!results.length ? (
            <li className="px-2 py-8 text-center text-sm text-ink-muted">
              Nothing matches &ldquo;{query}&rdquo;. Try an endpoint path such as <span className="font-mono">/reservations</span>.
            </li>
          ) : null}
        </ul>
      </dialog>
    </>
  );
}
