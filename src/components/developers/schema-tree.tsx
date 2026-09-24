import { CaretRight } from "@phosphor-icons/react/ssr";
import type { ParamView, PropertyNode, SchemaNode } from "@/lib/developers/reference";

/** The fields of an object node, or of an array's items when they are objects. */
function childFields(node: SchemaNode): { fields: PropertyNode[]; via: "object" | "items" | "values" } | null {
  if (node.properties?.length) return { fields: node.properties, via: "object" };
  if (node.items?.properties?.length) return { fields: node.items.properties, via: "items" };
  if (node.values?.properties?.length) return { fields: node.values.properties, via: "values" };
  return null;
}

function Inline({ text }: { text: string }) {
  // Descriptions use `backticks` for identifiers; render them as code, everything else as text.
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("`") && p.endsWith("`") ? (
          <code key={i} className="rounded-xs bg-surface-2 px-1 py-px font-mono text-[0.86em] text-ink">
            {p.slice(1, -1)}
          </code>
        ) : (
          p
        ),
      )}
    </>
  );
}

function Facts({ node }: { node: SchemaNode }) {
  const variantNode = node.items ?? node;
  const enumValues = variantNode.enum ?? node.enum;
  return (
    <>
      {node.description ? (
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          <Inline text={node.description} />
        </p>
      ) : null}
      {enumValues?.length ? (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-ink-muted">{node.items ? "Each one of" : "One of"}</span>
          {enumValues.map((v) => (
            <code key={v} className="rounded-xs border border-line px-1.5 py-px font-mono text-[11px] text-ink">
              {v}
            </code>
          ))}
        </p>
      ) : null}
      {node.constraints.length || node.defaultValue !== undefined || node.format ? (
        <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-ink-muted">
          {node.format ? <span>format {node.format}</span> : null}
          {node.constraints.map((c) => (
            <span key={c}>{c}</span>
          ))}
          {node.defaultValue !== undefined ? <span>default {node.defaultValue}</span> : null}
        </p>
      ) : null}
    </>
  );
}

function Row({ name, node, required, depth }: { name: string; node: SchemaNode; required: boolean; depth: number }) {
  const children = childFields(node);
  const variants = node.variants ?? node.items?.variants;
  return (
    <li className="border-b border-line py-3 last:border-b-0" data-field={name}>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <code className="font-mono text-[0.8125rem] font-medium text-ink">{name}</code>
        <span className="font-mono text-[11px] text-ink-muted">{node.label}</span>
        {required ? <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-laterite">required</span> : null}
        {node.readOnly ? <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">read-only</span> : null}
        {node.deprecated ? <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ochre">deprecated</span> : null}
      </div>
      <Facts node={node} />
      {children && depth < 6 ? (
        <details className="schema-nest group mt-2.5">
          <summary className="inline-flex cursor-pointer select-none items-center gap-1.5 rounded-xs border border-line px-2 py-1 text-xs text-ink-muted hover:border-ink-muted hover:text-ink">
            <CaretRight size={11} weight="bold" className="transition-transform group-open:rotate-90" aria-hidden />
            <span className="group-open:hidden">
              Show {children.fields.length} {children.fields.length === 1 ? "field" : "fields"}
              {children.via === "items" ? " of each item" : ""}
            </span>
            <span className="hidden group-open:inline">Hide fields</span>
          </summary>
          <FieldList fields={children.fields} depth={depth + 1} nested />
        </details>
      ) : null}
      {variants?.length && depth < 6 ? (
        <div className="mt-2.5 space-y-2">
          {variants.map((v, i) => (
            <details key={i} className="schema-nest group">
              <summary className="inline-flex cursor-pointer select-none items-center gap-1.5 rounded-xs border border-line px-2 py-1 text-xs text-ink-muted hover:border-ink-muted hover:text-ink">
                <CaretRight size={11} weight="bold" className="transition-transform group-open:rotate-90" aria-hidden />
                {i === 0 ? "Either" : "Or"} <span className="font-mono">{v.label}</span>
              </summary>
              {childFields(v.node) ? <FieldList fields={childFields(v.node)!.fields} depth={depth + 1} nested /> : <Facts node={v.node} />}
            </details>
          ))}
        </div>
      ) : null}
      {node.truncated ? <p className="mt-1 text-xs text-ink-muted">Same shape as {node.refName} above.</p> : null}
    </li>
  );
}

function FieldList({ fields, depth, nested = false }: { fields: PropertyNode[]; depth: number; nested?: boolean }) {
  return (
    <ul className={nested ? "mt-2 border-l border-line-strong pl-4" : ""}>
      {fields.map((f) => (
        <Row key={f.name} name={f.name} node={f.node} required={f.required} depth={depth} />
      ))}
    </ul>
  );
}

/** A request or response schema as a tree of fields; nested objects open on demand. */
export function SchemaTree({ node }: { node: SchemaNode }) {
  const children = childFields(node);
  if (children) {
    return (
      <>
        {node.items ? <p className="mb-1 text-sm text-ink-muted">An array. Each item:</p> : null}
        <FieldList fields={children.fields} depth={0} />
      </>
    );
  }
  return (
    <div className="py-2">
      <span className="font-mono text-xs text-ink-muted">{node.label}</span>
      <Facts node={node} />
    </div>
  );
}

export function ParamList({ params }: { params: ParamView[] }) {
  return (
    <ul>
      {params.map((p) => (
        <Row key={`${p.in}-${p.name}`} name={p.name} node={{ ...p.node, description: p.description ?? p.node.description }} required={p.required} depth={0} />
      ))}
    </ul>
  );
}
