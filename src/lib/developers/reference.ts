/**
 * Turns the partner API's OpenAPI document into the view model the reference pages render:
 * endpoint groups, operations with resolved parameters, request and response schemas as trees,
 * and example payloads. Pure functions, so the same model feeds pages, samples and search.
 */
import {
  METHODS,
  type HttpMethod,
  type MediaType,
  type OpenApiDoc,
  type Operation,
  type Parameter,
  type Ref,
  type RequestBody,
  type Response,
  type Schema,
} from "./openapi-types";

export interface SchemaNode {
  /** "object", "string", "array of Reservation", "integer | null"... */
  label: string;
  /** Component name when this node came from a $ref. */
  refName?: string;
  description?: string;
  format?: string;
  enum?: string[];
  nullable?: boolean;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  defaultValue?: string;
  constraints: string[];
  properties?: PropertyNode[];
  /** Map values (additionalProperties). */
  values?: SchemaNode;
  items?: SchemaNode;
  variants?: { label: string; node: SchemaNode }[];
  variantKind?: "oneOf" | "anyOf";
  /** A cycle or depth limit stopped expansion here. */
  truncated?: boolean;
}

export interface PropertyNode {
  name: string;
  required: boolean;
  node: SchemaNode;
}

export interface ParamView {
  name: string;
  in: Parameter["in"];
  required: boolean;
  description?: string;
  node: SchemaNode;
  example?: unknown;
}

export interface ResponseView {
  status: string;
  description: string;
  node: SchemaNode | null;
  example: unknown;
  headers: { name: string; description?: string; label: string }[];
}

export interface OperationView {
  id: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description?: string;
  deprecated: boolean;
  group: string;
  scopes: string[];
  idempotency: "required" | "optional" | null;
  params: { path: ParamView[]; query: ParamView[]; header: ParamView[] };
  body: { required: boolean; contentType: string; description?: string; node: SchemaNode; example: unknown } | null;
  responses: ResponseView[];
}

export interface GroupView {
  slug: string;
  name: string;
  description?: string;
  operations: OperationView[];
}

export interface EventView {
  type: string;
  summary: string;
  /** The event's `data.object`, when the spec describes it. */
  object: SchemaNode | null;
  objectName?: string;
  example: unknown;
}

export interface ReferenceModel {
  events: EventView[];
  changelog: { date: string; changes: string[] }[];
  title: string;
  version: string;
  description?: string;
  baseUrl: string;
  groups: GroupView[];
  schemaCount: number;
}

export const slugify = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isRef = (x: unknown): x is Ref => !!x && typeof x === "object" && "$ref" in (x as object);

function lookup<T>(doc: OpenApiDoc, ref: string): T | undefined {
  if (!ref.startsWith("#/")) return undefined;
  let cur: unknown = doc;
  for (const raw of ref.slice(2).split("/")) {
    const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur as T | undefined;
}

function deref<T>(doc: OpenApiDoc, x: T | Ref | undefined): T | undefined {
  let cur: unknown = x;
  for (let i = 0; i < 8 && isRef(cur); i++) cur = lookup<T>(doc, (cur as Ref).$ref);
  return cur as T | undefined;
}

const refName = (ref: string) => ref.split("/").pop() ?? ref;

function typeList(s: Schema): string[] {
  if (Array.isArray(s.type)) return s.type;
  if (s.type) return [s.type];
  if (s.properties) return ["object"];
  if (s.items) return ["array"];
  return [];
}

function constraintsOf(s: Schema): string[] {
  const out: string[] = [];
  if (s.minimum !== undefined && s.maximum !== undefined) out.push(`${s.minimum} to ${s.maximum}`);
  else if (s.minimum !== undefined) out.push(`at least ${s.minimum}`);
  else if (s.maximum !== undefined) out.push(`at most ${s.maximum}`);
  if (s.minLength !== undefined && s.maxLength !== undefined) out.push(`${s.minLength} to ${s.maxLength} characters`);
  else if (s.maxLength !== undefined) out.push(`up to ${s.maxLength} characters`);
  else if (s.minLength !== undefined && s.minLength > 0) out.push(`at least ${s.minLength} characters`);
  if (s.minItems !== undefined && s.minItems > 0) out.push(`at least ${s.minItems} items`);
  if (s.maxItems !== undefined) out.push(`up to ${s.maxItems} items`);
  if (s.pattern) out.push(`matches ${s.pattern}`);
  return out;
}

const MAX_DEPTH = 7;

/** Flattens `allOf` into one object schema (properties and required merged). */
function mergeAllOf(doc: OpenApiDoc, s: Schema): Schema {
  if (!s.allOf?.length) return s;
  const merged: Schema = { ...s, allOf: undefined, properties: { ...(s.properties ?? {}) }, required: [...(s.required ?? [])] };
  for (const part of s.allOf) {
    const p = mergeAllOf(doc, deref<Schema>(doc, part) ?? {});
    Object.assign(merged.properties!, p.properties ?? {});
    merged.required!.push(...(p.required ?? []));
    if (!merged.type && p.type) merged.type = p.type;
    if (!merged.description && p.description) merged.description = p.description;
  }
  return merged;
}

export function schemaNode(doc: OpenApiDoc, input: Schema | Ref | undefined, seen: string[] = [], depth = 0): SchemaNode {
  let name: string | undefined;
  let raw: Schema | Ref | undefined = input;
  if (isRef(raw)) {
    name = refName(raw.$ref);
    if (seen.includes(raw.$ref) || depth > MAX_DEPTH) return { label: name, refName: name, constraints: [], truncated: true };
    seen = [...seen, raw.$ref];
    raw = deref<Schema>(doc, raw);
  }
  const s = mergeAllOf(doc, (raw as Schema) ?? {});
  const types = typeList(s);
  const nullable = s.nullable || types.includes("null");
  const base = types.filter((t) => t !== "null");

  const node: SchemaNode = {
    label: "",
    refName: name,
    description: s.description,
    format: s.format,
    enum: s.enum?.filter((v) => v !== null).map((v) => String(v)),
    nullable,
    deprecated: s.deprecated,
    readOnly: s.readOnly,
    writeOnly: s.writeOnly,
    defaultValue: s.default !== undefined ? JSON.stringify(s.default) : undefined,
    constraints: constraintsOf(s),
  };

  const variants = s.oneOf ?? s.anyOf;
  if (variants?.length) {
    const nonNull = variants.filter((v) => !(!isRef(v) && (v as Schema).type === "null"));
    if (nonNull.length !== variants.length) node.nullable = true;
    if (nonNull.length === 1) {
      const only = schemaNode(doc, nonNull[0], seen, depth);
      return { ...only, nullable: true, description: s.description ?? only.description };
    }
    node.variantKind = s.oneOf ? "oneOf" : "anyOf";
    node.variants = nonNull.map((v) => {
      const n = schemaNode(doc, v, seen, depth + 1);
      return { label: n.refName ?? n.label, node: n };
    });
    node.label = `${node.variantKind === "oneOf" ? "one of" : "any of"} ${node.variants.length} shapes`;
    return node;
  }

  if (base.includes("array") || s.items) {
    node.items = schemaNode(doc, s.items, seen, depth + 1);
    node.label = `array of ${node.items.refName ?? node.items.label}`;
  } else if (base.includes("object") || s.properties) {
    const required = new Set(s.required ?? []);
    if (s.properties && depth <= MAX_DEPTH) {
      node.properties = Object.entries(s.properties).map(([key, value]) => ({
        name: key,
        required: required.has(key),
        node: schemaNode(doc, value, seen, depth + 1),
      }));
    }
    if (s.additionalProperties && typeof s.additionalProperties === "object") {
      node.values = schemaNode(doc, s.additionalProperties, seen, depth + 1);
      node.label = node.properties?.length ? "object" : `map of ${node.values.refName ?? node.values.label}`;
    } else node.label = "object";
  } else if (s.const !== undefined) {
    node.label = typeof s.const === "string" ? "string" : typeof s.const;
    node.enum = [String(s.const)];
  } else {
    node.label = base.join(" | ") || "any";
  }
  if (node.nullable && !node.label.endsWith("| null")) node.label += " | null";
  return node;
}

/* ------------------------------------------------------------------ *
 *  Examples
 * ------------------------------------------------------------------ */

function exampleByName(name: string, s: Schema): unknown {
  const n = name.toLowerCase();
  if (s.type === "integer" || s.type === "number") {
    if (n.endsWith("kobo")) return 4_500_000;
    if (n.includes("limit") || n.includes("pagesize")) return 20;
    if (n.includes("count") || n.includes("nights")) return 2;
    if (n.includes("adults")) return 2;
    if (n.includes("children")) return 0;
    return 1;
  }
  if (s.type !== "string" && s.type !== undefined) return undefined;
  if (s.format === "date-time") return "2026-10-02T13:00:00.000Z";
  if (s.format === "date" || n.endsWith("date") || n === "checkin" || n === "checkout" || n === "from" || n === "to") return "2026-10-02";
  if (s.format === "email" || n.includes("email")) return "adaeze.okafor@example.ng";
  if (s.format === "uri" || s.format === "url" || n.endsWith("url")) return "https://example.ng/hooks/hotel";
  if (s.format === "uuid") return "0b7f7d4e-2f5c-4c55-9d7e-3b1f8a6c2e10";
  if (n.includes("phone")) return "+2348031234567";
  if (n === "cursor" || n.endsWith("cursor")) return "eyJpZCI6InJlc18wMUoifQ";
  if (n === "code" || n.endsWith("reference")) return "HMS-7K3Q9";
  if (n.endsWith("id")) return `${n.replace(/id$/, "") || "obj"}_01J9ZK4T8Q`;
  if (n.includes("name")) return n.includes("full") || n.includes("guest") ? "Adaeze Okafor" : "Deluxe King";
  if (n.includes("currency")) return "NGN";
  return "string";
}

export function exampleOf(doc: OpenApiDoc, input: Schema | Ref | undefined, name = "", seen: string[] = [], depth = 0): unknown {
  if (isRef(input)) {
    if (seen.includes(input.$ref) || depth > MAX_DEPTH) return {};
    seen = [...seen, input.$ref];
  }
  const s = mergeAllOf(doc, deref<Schema>(doc, input) ?? {});
  if (s.example !== undefined) return s.example;
  if (s.examples?.length) return s.examples[0];
  if (s.const !== undefined) return s.const;
  if (s.enum?.length) return s.enum.find((v) => v !== null) ?? null;
  if (s.default !== undefined) return s.default;
  const variants = s.oneOf ?? s.anyOf;
  if (variants?.length) {
    const first = variants.find((v) => isRef(v) || (v as Schema).type !== "null");
    return exampleOf(doc, first, name, seen, depth + 1);
  }
  const types = typeList(s).filter((t) => t !== "null");
  const t = types[0];
  if (t === "array" || s.items) return [exampleOf(doc, s.items, name.replace(/s$/, ""), seen, depth + 1)];
  if (t === "object" || s.properties) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(s.properties ?? {})) {
      const prop = deref<Schema>(doc, v);
      if (prop?.writeOnly) continue;
      out[k] = exampleOf(doc, v, k, seen, depth + 1);
    }
    return out;
  }
  if (t === "boolean") return true;
  return exampleByName(name, { ...s, type: t });
}

/** Request examples leave out read-only fields. */
function requestExampleOf(doc: OpenApiDoc, input: Schema | Ref | undefined): unknown {
  const s = mergeAllOf(doc, deref<Schema>(doc, input) ?? {});
  if (s.example !== undefined) return s.example;
  if (!s.properties) return exampleOf(doc, input);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s.properties)) {
    const prop = deref<Schema>(doc, v);
    if (prop?.readOnly) continue;
    out[k] = exampleOf(doc, v, k);
  }
  return out;
}

function mediaExample(doc: OpenApiDoc, media: MediaType | undefined, request: boolean): unknown {
  if (!media) return undefined;
  if (media.example !== undefined) return media.example;
  const first = media.examples && Object.values(media.examples)[0];
  if (first?.value !== undefined) return first.value;
  return request ? requestExampleOf(doc, media.schema) : exampleOf(doc, media.schema);
}

/* ------------------------------------------------------------------ *
 *  Operations and groups
 * ------------------------------------------------------------------ */

function paramView(doc: OpenApiDoc, p: Parameter): ParamView {
  const schema = deref<Schema>(doc, p.schema);
  return {
    name: p.name,
    in: p.in,
    required: !!p.required || p.in === "path",
    description: p.description,
    node: schemaNode(doc, p.schema),
    example: p.example ?? schema?.example ?? exampleOf(doc, p.schema, p.name),
  };
}

function jsonMedia(content: Record<string, MediaType> | undefined): [string, MediaType] | null {
  if (!content) return null;
  const entries = Object.entries(content);
  return entries.find(([k]) => k.includes("json")) ?? entries[0] ?? null;
}

function scopesOf(doc: OpenApiDoc, op: Operation): string[] {
  const direct = op["x-required-scopes"] ?? op["x-scopes"];
  if (direct?.length) return direct;
  const sec = op.security ?? doc.security ?? [];
  return [...new Set(sec.flatMap((r) => Object.values(r).flat()))];
}

function operationId(method: string, path: string, op: Operation) {
  if (op.operationId) return slugify(op.operationId.replace(/^[A-Za-z]+Controller_/, ""));
  return slugify(`${method} ${path.replace(/[{}]/g, "")}`);
}

export function buildReference(doc: OpenApiDoc, fallbackBase: string): ReferenceModel {
  const tagMeta = new Map((doc.tags ?? []).map((t) => [t.name, t]));
  const groups = new Map<string, GroupView>();
  const order = (doc.tags ?? []).map((t) => t.name);
  const usedIds = new Set<string>();

  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    const shared = (item.parameters ?? []).map((p) => deref<Parameter>(doc, p)).filter(Boolean) as Parameter[];
    for (const method of METHODS) {
      const op = item[method];
      if (!op) continue;
      const tag = op.tags?.[0] ?? "General";
      if (!groups.has(tag)) {
        const meta = tagMeta.get(tag);
        groups.set(tag, { slug: slugify(tag), name: meta?.["x-displayName"] ?? tag, description: meta?.description, operations: [] });
        if (!order.includes(tag)) order.push(tag);
      }
      const own = (op.parameters ?? []).map((p) => deref<Parameter>(doc, p)).filter(Boolean) as Parameter[];
      const byKey = new Map<string, Parameter>();
      for (const p of [...shared, ...own]) byKey.set(`${p.in}:${p.name}`, p);
      const params = [...byKey.values()].map((p) => paramView(doc, p));

      const body = deref<RequestBody>(doc, op.requestBody);
      const bodyMedia = jsonMedia(body?.content);

      const responses: ResponseView[] = Object.entries(op.responses ?? {}).map(([status, r]) => {
        const res = deref<Response>(doc, r) ?? {};
        const m = jsonMedia(res.content);
        return {
          status,
          description: res.description ?? "",
          node: m?.[1].schema ? schemaNode(doc, m[1].schema) : null,
          example: m ? mediaExample(doc, m[1], false) : undefined,
          headers: Object.entries(res.headers ?? {}).map(([name, h]) => {
            const header = deref<{ description?: string; schema?: Schema | Ref }>(doc, h) ?? {};
            return { name, description: header.description, label: schemaNode(doc, header.schema).label };
          }),
        };
      });
      responses.sort((a, b) => a.status.localeCompare(b.status));

      const idem = op["x-idempotency-key"] ?? (op["x-idempotent"] ? "required" : null);
      const idemHeader = params.find((p) => p.in === "header" && p.name.toLowerCase() === "idempotency-key");
      let id = operationId(method, path, op);
      while (usedIds.has(id)) id += "-2";
      usedIds.add(id);

      groups.get(tag)!.operations.push({
        id,
        method,
        path,
        summary: op.summary ?? `${method.toUpperCase()} ${path}`,
        description: op.description,
        deprecated: !!op.deprecated,
        group: slugify(tag),
        scopes: scopesOf(doc, op),
        idempotency: idem ?? (idemHeader ? (idemHeader.required ? "required" : "optional") : null),
        params: {
          path: params.filter((p) => p.in === "path"),
          query: params.filter((p) => p.in === "query"),
          header: params.filter((p) => p.in === "header" && p.name.toLowerCase() !== "authorization"),
        },
        body: bodyMedia?.[1].schema
          ? {
              required: !!body?.required,
              contentType: bodyMedia[0],
              description: body?.description,
              node: schemaNode(doc, bodyMedia[1].schema),
              example: mediaExample(doc, bodyMedia[1], true),
            }
          : null,
        responses,
      });
    }
  }

  const events: EventView[] = Object.entries(doc.webhooks ?? {}).map(([type, item]) => {
    const op = item.post ?? Object.values(item).find((v) => v && typeof v === "object" && "requestBody" in v) as Operation | undefined;
    const media = jsonMedia(deref<RequestBody>(doc, op?.requestBody)?.content);
    const envelope = media?.[1].schema ? schemaNode(doc, media[1].schema) : null;
    const dataNode = envelope?.properties?.find((p) => p.name === "data")?.node;
    const objectNode = dataNode?.properties?.find((p) => p.name === "object")?.node ?? null;
    return {
      type,
      summary: op?.summary ?? op?.description ?? "",
      object: objectNode?.properties?.length ? objectNode : null,
      objectName: objectNode?.refName,
      example: media ? mediaExample(doc, media[1], false) : undefined,
    };
  });
  const changelog = [...(doc["x-changelog"] ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  const server = doc.servers?.[0]?.url;
  const baseUrl = server && /^https?:\/\//.test(server) ? server.replace(/\/$/, "") : fallbackBase;
  return {
    events,
    changelog,
    title: doc.info?.title ?? "Partner API",
    version: doc.info?.version ?? "1",
    description: doc.info?.description,
    baseUrl,
    groups: order.map((t) => groups.get(t)).filter((g): g is GroupView => !!g && g.operations.length > 0),
    schemaCount: Object.keys(doc.components?.schemas ?? {}).length,
  };
}

export const operationHref = (op: Pick<OperationView, "group" | "id">) => `/developers/reference/${op.group}#${op.id}`;
