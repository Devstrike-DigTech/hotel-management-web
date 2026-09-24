import { Info, LinkSimple, WarningDiamond } from "@phosphor-icons/react/ssr";

/** A guide heading with its own link. The id must match the guide's section list in guides.ts. */
export function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24">
      {children}
      <a href={`#${id}`} className="anchor" aria-label="Link to this section">
        <LinkSimple size={18} aria-hidden />
      </a>
    </h2>
  );
}

export function H3({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-24">
      {children}
      <a href={`#${id}`} className="anchor" aria-label="Link to this section">
        <LinkSimple size={15} aria-hidden />
      </a>
    </h3>
  );
}

/** A marginal note: a coloured rule and a small label, never a filled box. */
export function Note({ tone = "info", title, children }: { tone?: "info" | "warn"; title?: string; children: React.ReactNode }) {
  const colour = tone === "warn" ? "text-ochre" : "text-adire";
  const Icon = tone === "warn" ? WarningDiamond : Info;
  return (
    <aside className={`relative border-l-2 ${tone === "warn" ? "border-ochre" : "border-adire"} bg-surface py-3.5 pl-4 pr-4 sm:pl-5`}>
      <p className={`kicker flex items-center gap-1.5 !text-[10px] ${colour}`}>
        <Icon size={14} weight="bold" aria-hidden /> {title ?? (tone === "warn" ? "Take care" : "Note")}
      </p>
      <div className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink [&_code]:font-mono [&_code]:text-[0.86em]">{children}</div>
    </aside>
  );
}

/** Numbered steps with large Fraunces numerals in the margin. */
export function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="!list-none !pl-0 [counter-reset:step]">{children}</ol>;
}

export function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="relative border-t border-line pb-2 pl-14 pt-5 [counter-increment:step] before:absolute before:left-0 before:top-3 before:font-display before:text-[2.4rem] before:leading-none before:text-laterite before:[content:counter(step,decimal-leading-zero)] before:[font-variation-settings:'opsz'_144,'SOFT'_100] sm:pl-16">
      <p className="font-display text-lg [font-variation-settings:'opsz'_36]">{title}</p>
      <div className="mt-2 space-y-3 text-ink-muted [&_strong]:text-ink">{children}</div>
    </li>
  );
}

/** A plain ledger table for reference facts (codes, headers, scopes). */
export function Ledger({ head, rows, mono = [0] }: { head: string[]; rows: React.ReactNode[][]; mono?: number[] }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[34rem] border-collapse text-left text-[0.9375rem]">
        <thead>
          <tr className="border-b border-ink">
            {head.map((h) => (
              <th key={h} scope="col" className="kicker py-2 pr-4 font-medium first:pl-4 sm:first:pl-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line align-top">
              {r.map((c, j) => (
                <td
                  key={j}
                  className={`py-2.5 pr-4 first:pl-4 sm:first:pl-0 ${mono.includes(j) ? "whitespace-nowrap font-mono text-[0.8125rem] text-ink" : "leading-relaxed text-ink-muted"}`}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MethodStamp({ method, small = false }: { method: string; small?: boolean }) {
  return <span className={`method method-${method.toLowerCase()} ${small ? "method-sm" : ""}`}>{method.toUpperCase()}</span>;
}
