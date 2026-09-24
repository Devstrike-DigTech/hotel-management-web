/**
 * The slice of OpenAPI 3.1 the developer reference reads. Anything else in the document is ignored,
 * so a richer spec never breaks the page.
 */

export interface OpenApiDoc {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: { url: string; description?: string }[];
  tags?: { name: string; description?: string; "x-displayName"?: string }[];
  paths: Record<string, PathItem>;
  /** OpenAPI 3.1 webhooks: the events the API sends, keyed by event type. */
  webhooks?: Record<string, PathItem>;
  "x-changelog"?: { date: string; changes: string[] }[];
  components?: {
    schemas?: Record<string, Schema>;
    parameters?: Record<string, Parameter>;
    responses?: Record<string, Response>;
    requestBodies?: Record<string, RequestBody>;
    securitySchemes?: Record<string, SecurityScheme>;
    headers?: Record<string, Header>;
  };
  security?: Record<string, string[]>[];
}

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
export const METHODS: HttpMethod[] = ["get", "post", "put", "patch", "delete"];

export type PathItem = Partial<Record<HttpMethod, Operation>> & { parameters?: (Parameter | Ref)[] };

export interface Ref {
  $ref: string;
}

export interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: (Parameter | Ref)[];
  requestBody?: RequestBody | Ref;
  responses?: Record<string, Response | Ref>;
  security?: Record<string, string[]>[];
  deprecated?: boolean;
  /** Scopes the key needs, when the spec states them outside `security`. */
  "x-scopes"?: string[];
  "x-required-scopes"?: string[];
  "x-idempotent"?: boolean;
  "x-idempotency-key"?: "required" | "optional";
}

export interface Parameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: Schema | Ref;
  example?: unknown;
}

export interface Header {
  description?: string;
  schema?: Schema | Ref;
}

export interface MediaType {
  schema?: Schema | Ref;
  example?: unknown;
  examples?: Record<string, { value?: unknown; summary?: string }>;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, MediaType>;
}

export interface Response {
  description?: string;
  headers?: Record<string, Header | Ref>;
  content?: Record<string, MediaType>;
}

export interface SecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
  name?: string;
  in?: string;
  description?: string;
}

export interface Schema {
  $ref?: string;
  type?: string | string[];
  format?: string;
  title?: string;
  description?: string;
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  example?: unknown;
  examples?: unknown[];
  nullable?: boolean;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  properties?: Record<string, Schema | Ref>;
  required?: string[];
  additionalProperties?: boolean | Schema | Ref;
  items?: Schema | Ref;
  oneOf?: (Schema | Ref)[];
  anyOf?: (Schema | Ref)[];
  allOf?: (Schema | Ref)[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
}
