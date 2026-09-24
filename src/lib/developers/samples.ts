/**
 * Example requests for an operation in curl, Node and Python, generated from the reference model
 * so they always match the spec: the path with example ids, required query parameters, the
 * Idempotency-Key on writes and a request body built from the schema.
 */
import type { OperationView } from "./reference";

export type SampleLang = "curl" | "node" | "python";
export const SAMPLE_LANGS: { id: SampleLang; label: string }[] = [
  { id: "curl", label: "curl" },
  { id: "node", label: "Node" },
  { id: "python", label: "Python" },
];

export const KEY_ENV = "HOTEL_API_KEY";

function fillPath(op: OperationView) {
  let path = op.path;
  for (const p of op.params.path) {
    const v = p.example ?? `${p.name}_example`;
    path = path.replace(`{${p.name}}`, encodeURIComponent(String(v)));
  }
  return path;
}

function queryString(op: OperationView) {
  const q = op.params.query.filter((p) => p.required);
  if (!q.length) return "";
  const parts = q.map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(String(p.example ?? ""))}`);
  return `?${parts.join("&")}`;
}

const hasBody = (op: OperationView) => op.body !== null && op.body.example !== undefined;

const headerExtras = (op: OperationView) =>
  op.params.header.filter((h) => h.required && h.name.toLowerCase() !== "idempotency-key" && h.name.toLowerCase() !== "content-type");

function pyLiteral(value: unknown, indent: number): string {
  const pad = " ".repeat(indent);
  const inner = " ".repeat(indent + 4);
  if (value === null || value === undefined) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    return `[\n${value.map((v) => `${inner}${pyLiteral(v, indent + 4)}`).join(",\n")},\n${pad}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) return "{}";
  return `{\n${entries.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${pyLiteral(v, indent + 4)}`).join(",\n")},\n${pad}}`;
}

function indentJson(value: unknown, indent: number) {
  return JSON.stringify(value, null, 2)
    .split("\n")
    .map((l, i) => (i === 0 ? l : " ".repeat(indent) + l))
    .join("\n");
}

export function curlSample(op: OperationView, baseUrl: string) {
  const url = `${baseUrl}${fillPath(op)}${queryString(op)}`;
  const lines = [`curl ${op.method === "get" ? "" : `-X ${op.method.toUpperCase()} `}"${url}"`];
  lines.push(`  -H "Authorization: Bearer $${KEY_ENV}"`);
  if (op.idempotency) lines.push(`  -H "Idempotency-Key: $(uuidgen)"`);
  for (const h of headerExtras(op)) lines.push(`  -H "${h.name}: ${String(h.example ?? "")}"`);
  if (hasBody(op)) {
    lines.push(`  -H "Content-Type: application/json"`);
    lines.push(`  -d '${JSON.stringify(op.body!.example, null, 2).replace(/'/g, "'\\''").split("\n").join("\n  ")}'`);
  }
  return lines.join(" \\\n");
}

export function nodeSample(op: OperationView, baseUrl: string) {
  const url = `${baseUrl}${fillPath(op)}${queryString(op)}`;
  const headers = [`    Authorization: \`Bearer \${process.env.${KEY_ENV}}\`,`];
  if (op.idempotency) headers.push(`    "Idempotency-Key": crypto.randomUUID(),`);
  for (const h of headerExtras(op)) headers.push(`    ${JSON.stringify(h.name)}: ${JSON.stringify(String(h.example ?? ""))},`);
  if (hasBody(op)) headers.push(`    "Content-Type": "application/json",`);
  const opts = [`  method: "${op.method.toUpperCase()}",`, `  headers: {\n${headers.join("\n")}\n  },`];
  if (hasBody(op)) opts.push(`  body: JSON.stringify(${indentJson(op.body!.example, 2)}),`);
  return [
    `// Node 18 or later: fetch and crypto are built in.`,
    `const res = await fetch("${url}", {`,
    ...opts,
    `});`,
    `if (!res.ok) throw new Error(\`\${res.status}: \${(await res.json()).code}\`);`,
    `const data = await res.json();`,
  ].join("\n");
}

export function pythonSample(op: OperationView, baseUrl: string) {
  const url = `${baseUrl}${fillPath(op)}`;
  const imports = ["os", ...(op.idempotency ? ["uuid"] : [])];
  const headers = [`        "Authorization": f"Bearer {os.environ['${KEY_ENV}']}",`];
  if (op.idempotency) headers.push(`        "Idempotency-Key": str(uuid.uuid4()),`);
  for (const h of headerExtras(op)) headers.push(`        ${JSON.stringify(h.name)}: ${JSON.stringify(String(h.example ?? ""))},`);
  const args = [`    "${url}",`, `    headers={\n${headers.join("\n")}\n    },`];
  const q = op.params.query.filter((p) => p.required);
  if (q.length) args.push(`    params=${pyLiteral(Object.fromEntries(q.map((p) => [p.name, p.example ?? ""])), 4)},`);
  if (hasBody(op)) args.push(`    json=${pyLiteral(op.body!.example, 4)},`);
  args.push(`    timeout=10,`);
  return [
    `import ${imports.join(", ")}`,
    `import requests`,
    ``,
    `res = requests.${op.method}(`,
    ...args,
    `)`,
    `res.raise_for_status()`,
    `data = res.json()`,
  ].join("\n");
}

export function samplesFor(op: OperationView, baseUrl: string): Record<SampleLang, string> {
  return { curl: curlSample(op, baseUrl), node: nodeSample(op, baseUrl), python: pythonSample(op, baseUrl) };
}

export const LANG_TO_HIGHLIGHT = { curl: "bash", node: "node", python: "python" } as const;
