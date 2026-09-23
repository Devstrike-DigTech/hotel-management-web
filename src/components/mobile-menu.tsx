"use client";

import { List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function MobileMenu({ nav, adminUrl }: { nav: { href: string; label: string }[]; adminUrl: string }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  // Close when the route changes.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="inline-grid size-10 place-items-center rounded-sm hover:bg-surface-2 md:hidden"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <List size={22} weight="light" />
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-paper p-0 text-ink backdrop:bg-ink/40 open:flex open:flex-col"
        aria-label="Menu"
      >
        <div className="container-page flex h-16 items-center justify-between border-b border-line">
          <span className="kicker">Menu</span>
          <button
            type="button"
            className="inline-grid size-10 place-items-center rounded-sm hover:bg-surface-2"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X size={22} weight="light" />
          </button>
        </div>
        <nav aria-label="Mobile" className="container-page flex-1 py-6">
          <ol className="divide-y divide-line border-y border-line">
            {nav.map((n, i) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="flex items-baseline gap-4 py-5 hover:text-laterite"
                >
                  <span className="num text-xs text-ink-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span className="display-md text-4xl">{n.label}</span>
                </Link>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col gap-3">
            <Link href="/for-hotels" onClick={() => setOpen(false)} className="btn btn-primary">
              List your hotel
            </Link>
            <a href={`${adminUrl}/login`} className="btn btn-outline">
              Hotel sign in
            </a>
          </div>
        </nav>
      </dialog>
    </>
  );
}
