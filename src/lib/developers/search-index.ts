import { GUIDES } from "./guides";
import { operationHref, type ReferenceModel } from "./reference";

export interface SearchEntry {
  kind: "guide" | "section" | "group" | "endpoint";
  title: string;
  /** Where it sits: the guide for a section, the group for an endpoint. */
  parent?: string;
  href: string;
  method?: string;
  path?: string;
  keywords?: string;
}

/** Everything the Ctrl/Cmd+K search can find: guides, their sections, endpoint groups and endpoints. */
export function buildSearchIndex(model: ReferenceModel): SearchEntry[] {
  const out: SearchEntry[] = [
    { kind: "guide", title: "Overview", href: "/developers", keywords: "introduction base url home" },
    { kind: "guide", title: "API reference", href: "/developers/reference", keywords: "endpoints all operations" },
  ];
  for (const g of GUIDES) {
    out.push({ kind: "guide", title: g.title, href: `/developers/${g.slug}`, keywords: `${g.summary} ${g.keywords ?? ""}` });
    for (const s of g.sections) out.push({ kind: "section", title: s.title, parent: g.title, href: `/developers/${g.slug}#${s.id}` });
  }
  for (const grp of model.groups) {
    out.push({ kind: "group", title: grp.name, parent: "Reference", href: `/developers/reference/${grp.slug}`, keywords: grp.description });
    for (const op of grp.operations) {
      out.push({
        kind: "endpoint",
        title: op.summary,
        parent: grp.name,
        href: operationHref(op),
        method: op.method.toUpperCase(),
        path: op.path,
        keywords: op.scopes.join(" "),
      });
    }
  }
  return out;
}
