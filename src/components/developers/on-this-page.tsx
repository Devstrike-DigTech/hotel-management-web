"use client";

import { useEffect, useState } from "react";

/** The page's own contents, with the section being read marked as you scroll. */
export function OnThisPage({ items, title = "On this page" }: { items: { id: string; title: string }[]; title?: string }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, [items]);

  if (!items.length) return null;
  return (
    <nav aria-label={title}>
      <p className="kicker mb-3 !text-[10px]">{title}</p>
      <ul className="space-y-0.5 border-l border-line text-sm">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? "location" : undefined}
              className="-ml-px block border-l border-transparent py-1 pl-3 text-ink-muted transition-colors hover:text-ink aria-[current]:border-laterite aria-[current]:text-ink"
            >
              {i.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
