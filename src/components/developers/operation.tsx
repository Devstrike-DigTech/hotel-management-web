import { CaretRight, Key, LinkSimple, ShieldCheck } from "@phosphor-icons/react/ssr";
import type { OperationView, ResponseView } from "@/lib/developers/reference";
import { samplesFor } from "@/lib/developers/samples";
import { CodeBlock } from "./code-block";
import { CodeSamples } from "./code-samples";
import { MethodStamp } from "./doc-parts";
import { ParamList, SchemaTree } from "./schema-tree";

/** "/reservations/{id}/cancel" with the parameter set apart. */
export function PathText({ path }: { path: string }) {
  return (
    <>
      {path.split(/(\{[^}]+\})/g).map((part, i) =>
        part.startsWith("{") ? (
          <span key={i} className="text-laterite">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

function statusTone(status: string) {
  if (status.startsWith("2")) return "text-palm border-palm/50";
  if (status.startsWith("4")) return "text-ochre border-ochre/50";
  if (status.startsWith("5")) return "text-danger border-danger/50";
  return "text-ink-muted border-line-strong";
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h3 className="kicker border-b border-ink pb-2 !text-[10px] !text-ink">{title}</h3>
      {children}
    </section>
  );
}

function ResponseItem({ r, open }: { r: ResponseView; open: boolean }) {
  return (
    <li className="border-b border-line last:border-b-0">
      <details className="group" open={open}>
        <summary className="flex cursor-pointer items-center gap-3 py-3 hover:text-ink">
          <CaretRight size={11} weight="bold" className="shrink-0 text-ink-muted transition-transform group-open:rotate-90" aria-hidden />
          <span className={`num rounded-xs border px-1.5 py-px text-[11px] ${statusTone(r.status)}`}>{r.status}</span>
          <span className="text-sm text-ink-muted">{r.description}</span>
        </summary>
        <div className="pb-4 pl-6">
          {r.headers.length ? (
            <p className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
              Headers:
              {r.headers.map((h) => (
                <code key={h.name} className="font-mono text-ink" title={h.description}>
                  {h.name}
                </code>
              ))}
            </p>
          ) : null}
          {r.node ? <SchemaTree node={r.node} /> : <p className="text-sm text-ink-muted">No body.</p>}
        </div>
      </details>
    </li>
  );
}

/** One endpoint: what it does, what it takes, what it returns, and the request in three languages. */
export function Operation({ op, baseUrl }: { op: OperationView; baseUrl: string }) {
  const samples = samplesFor(op, baseUrl);
  const success = op.responses.find((r) => r.status.startsWith("2"));
  const example = success?.example;

  return (
    <section id={op.id} aria-labelledby={`${op.id}-title`} className="op-target scroll-mt-20 border-t border-line py-12 first:border-t-0">
      <div className="grid gap-x-10 gap-y-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
        <div className="min-w-0">
          <h2 id={`${op.id}-title`} className="display-sm text-[1.75rem]">
            {op.summary}
            <a href={`#${op.id}`} className="anchor" aria-label={`Link to ${op.summary}`}>
              <LinkSimple size={17} aria-hidden />
            </a>
          </h2>
          <p className="mt-3 flex min-w-0 items-center gap-2.5">
            <MethodStamp method={op.method} />
            <code className="min-w-0 break-all font-mono text-[0.875rem] text-ink" data-testid="op-path">
              <PathText path={op.path} />
            </code>
          </p>
          {op.deprecated ? <p className="mt-3 text-sm text-ochre">Deprecated. It keeps working in v1; prefer the replacement named below.</p> : null}
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <dt className="flex items-center gap-1.5 text-ink-muted">
                <ShieldCheck size={15} aria-hidden /> Scope
              </dt>
              <dd className="flex flex-wrap gap-1">
                {op.scopes.length ? (
                  op.scopes.map((s) => (
                    <code key={s} className="rounded-xs bg-surface-2 px-1.5 py-px font-mono text-xs">
                      {s}
                    </code>
                  ))
                ) : (
                  <span className="text-ink-muted">any key</span>
                )}
              </dd>
            </div>
            {op.idempotency ? (
              <div className="flex items-center gap-2">
                <dt className="flex items-center gap-1.5 text-ink-muted">
                  <Key size={15} aria-hidden /> Idempotency-Key
                </dt>
                <dd className={op.idempotency === "required" ? "text-laterite" : "text-ink-muted"}>{op.idempotency}</dd>
              </div>
            ) : null}
          </dl>
          {op.description ? (
            <div className="mt-5 max-w-2xl space-y-3 text-[0.9375rem] leading-relaxed text-ink-muted">
              {op.description.split(/\n{2,}/).map((p, i) => (
                <p key={i}>
                  {p.split(/(`[^`]+`)/g).map((part, j) =>
                    part.startsWith("`") && part.endsWith("`") ? (
                      <code key={j} className="rounded-xs bg-surface-2 px-1 font-mono text-[0.86em] text-ink">
                        {part.slice(1, -1)}
                      </code>
                    ) : (
                      part
                    ),
                  )}
                </p>
              ))}
            </div>
          ) : null}

          {op.params.path.length ? (
            <Block title="Path parameters">
              <ParamList params={op.params.path} />
            </Block>
          ) : null}
          {op.params.query.length ? (
            <Block title="Query parameters">
              <ParamList params={op.params.query} />
            </Block>
          ) : null}
          {op.params.header.length ? (
            <Block title="Headers">
              <ParamList params={op.params.header} />
            </Block>
          ) : null}
          {op.body ? (
            <Block title={`Request body${op.body.required ? "" : ", optional"}`}>
              {op.body.description ? <p className="mt-2 text-sm text-ink-muted">{op.body.description}</p> : null}
              <SchemaTree node={op.body.node} />
            </Block>
          ) : null}
          <Block title="Responses">
            <ul>
              {op.responses.map((r) => (
                <ResponseItem key={r.status} r={r} open={r === success} />
              ))}
            </ul>
          </Block>
        </div>

        <div className="min-w-0 space-y-4 self-start xl:sticky xl:top-20">
          <CodeSamples samples={samples} title="Request" />
          {example !== undefined ? (
            <CodeBlock code={JSON.stringify(example, null, 2)} lang="json" title={`Response ${success?.status ?? ""}`} compact />
          ) : null}
        </div>
      </div>
    </section>
  );
}
