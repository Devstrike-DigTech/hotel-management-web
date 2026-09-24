import snapshot from "@/content/developers/partner-openapi.snapshot.json";
import { SPEC_URL } from "@/lib/developers/spec";

export const revalidate = 300;

/** The spec the reference was rendered from, for importing into Postman, Insomnia or a code generator. */
export async function GET() {
  try {
    const res = await fetch(SPEC_URL, { signal: AbortSignal.timeout(6000), next: { revalidate: 300, tags: ["partner-openapi"] } });
    if (res.ok) return new Response(await res.text(), { headers: { "content-type": "application/json; charset=utf-8" } });
  } catch {
    /* fall through to the snapshot */
  }
  return Response.json(snapshot);
}
