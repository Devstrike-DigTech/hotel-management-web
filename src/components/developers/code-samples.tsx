import type { Lang } from "@/lib/developers/highlight";
import { CodeTabs } from "./code-tabs";
import { Highlighted } from "./highlighted";

const LABELS: Record<string, string> = { curl: "curl", node: "Node", python: "Python", php: "PHP", bash: "Shell" };
const HIGHLIGHT: Record<string, Lang> = { curl: "bash", node: "node", python: "python", php: "php", bash: "bash" };

/** Server wrapper: highlights each language once, then hands the panes to the client tabs. */
export function CodeSamples({ samples, title, className }: { samples: Record<string, string>; title?: string; className?: string }) {
  const panes = Object.entries(samples).map(([id, code]) => ({
    id,
    label: LABELS[id] ?? id,
    code,
    node: <Highlighted code={code} lang={HIGHLIGHT[id] ?? "text"} />,
  }));
  return <CodeTabs panes={panes} title={title} className={className} />;
}
