import "server-only";
import { cache } from "react";
import snapshot from "@/content/developers/partner-openapi.snapshot.json";
import { API_URL } from "@/lib/env";
import { PARTNER_BASE_URL } from "./constants";
import type { OpenApiDoc } from "./openapi-types";
import { buildReference, type ReferenceModel } from "./reference";

/** How often the reference re-reads the live spec (seconds). */
export const SPEC_REVALIDATE = 300;

export const SPEC_URL = `${API_URL}/api/partner/v1/openapi.json`;

export interface LoadedSpec {
  model: ReferenceModel;
  /** "live": read from the API at build or revalidate time; "snapshot": the copy committed with the app. */
  source: "live" | "snapshot";
  specVersion: string;
}

/**
 * The partner API's OpenAPI document, read from the backend at build time and again every
 * five minutes (ISR). If the API cannot be reached the committed snapshot is used, so the docs
 * never go blank because of a backend deploy.
 */
export const loadSpec = cache(async (): Promise<LoadedSpec> => {
  let doc: OpenApiDoc | null = null;
  try {
    const res = await fetch(SPEC_URL, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: SPEC_REVALIDATE, tags: ["partner-openapi"] },
    });
    if (res.ok) {
      const json = (await res.json()) as OpenApiDoc;
      if (json && typeof json === "object" && json.paths) doc = json;
    }
  } catch {
    /* fall back to the snapshot */
  }
  const source = doc ? "live" : "snapshot";
  const used = doc ?? (snapshot as unknown as OpenApiDoc);
  return { model: buildReference(used, PARTNER_BASE_URL), source, specVersion: used.info?.version ?? "1" };
});
