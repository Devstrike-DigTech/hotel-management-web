"use client";

import { List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface NavData {
  guides: { href: string; label: string }[];
  groups: { slug: string; name: string; operations: { id: string; method: string; summary: string }[] }[];
}

function NavTree({ data, onNavigate }: { data: NavData; onNavigate?: () => void }) {
  const pathname = usePathname();
  const current = (href: string) => pathname === href;
  return (
    <nav aria-label="Developer docs" className="text-[0.9375rem]">
      <p className="kicker mb-2 !text-[10px]">Guides</p>
      <ol className="space-y-px">
        <li>
          <Link
            href="/developers"
            onClick={onNavigate}
            aria-current={current("/developers") ? "page" : undefined}
            className="docs-nav-link"
          >
            <span className="num w-5 text-[10px] text-ink-muted">00</span> Overview
          </Link>
        </li>
        {data.guides.map((g, i) => (
          <li key={g.href}>
            <Link href={g.href} onClick={onNavigate} aria-current={current(g.href) ? "page" : undefined} className="docs-nav-link">
              <span className="num w-5 text-[10px] text-ink-muted">{String(i + 1).padStart(2, "0")}</span> {g.label}
            </Link>
          </li>
        ))}
      </ol>

      <p className="kicker mb-2 mt-8 !text-[10px]">API reference</p>
      <ul className="space-y-px">
        <li>
          <Link
            href="/developers/reference"
            onClick={onNavigate}
            aria-current={current("/developers/reference") ? "page" : undefined}
            className="docs-nav-link"
          >
            All endpoints
          </Link>
        </li>
        {data.groups.map((g) => {
          const href = `/developers/reference/${g.slug}`;
          const open = pathname === href;
          return (
            <li key={g.slug}>
              <Link href={href} onClick={onNavigate} aria-current={open ? "page" : undefined} className="docs-nav-link">
                {g.name}
                <span className="num ml-auto text-[10px] text-ink-muted">{g.operations.length}</span>
              </Link>
              {open ? (
                <ul className="mb-2 ml-3 mt-1 border-l border-line pl-2">
                  {g.operations.map((op) => (
                    <li key={op.id}>
                      <a href={`${href}#${op.id}`} onClick={onNavigate} className="flex items-center gap-2 rounded-xs px-2 py-1.5 text-sm text-ink-muted hover:bg-surface-2 hover:text-ink">
                        <span className={`method method-sm method-${op.method}`}>{op.method.toUpperCase()}</span>
                        <span className="truncate">{op.summary}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The sticky sidebar on wide screens. */
export function DocsSidebar({ data }: { data: NavData }) {
  return <NavTree data={data} />;
}

/** On phones: a "Contents" button that opens the same tree in a full-height sheet. */
export function DocsMobileNav({ data }: { data: NavData }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const [last, setLast] = useState(pathname);
  if (pathname !== last) {
    setLast(pathname);
    if (open) setOpen(false);
  }
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-sm px-2.5 text-sm hover:bg-surface-2 lg:hidden"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="docs-contents-button"
      >
        <List size={20} weight="light" aria-hidden />
        <span className="max-sm:sr-only">Contents</span>
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        aria-label="Contents"
        className="m-0 h-dvh max-h-none w-[min(22rem,88vw)] max-w-none border-r border-line bg-paper p-0 text-ink backdrop:bg-ink/40 open:flex open:flex-col"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
          <span className="kicker">Contents</span>
          <button type="button" onClick={() => setOpen(false)} className="inline-grid size-10 place-items-center rounded-sm hover:bg-surface-2" aria-label="Close contents">
            <X size={20} weight="light" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <NavTree data={data} onNavigate={() => setOpen(false)} />
        </div>
      </dialog>
    </>
  );
}
