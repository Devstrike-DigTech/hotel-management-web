import type { Metadata } from "next";
import { CodeBlock } from "@/components/developers/code-block";
import { CodeSamples } from "@/components/developers/code-samples";
import { H2, Note } from "@/components/developers/doc-parts";
import { GuideFrame } from "@/components/developers/guide-frame";
import { IDEMPOTENCY_HOURS } from "@/lib/developers/constants";
import { KEY_ENV } from "@/lib/developers/samples";
import { loadSpec } from "@/lib/developers/spec";

export const revalidate = 300;
export const metadata: Metadata = { title: "Idempotency", alternates: { canonical: "/developers/idempotency" } };

export default async function Idempotency() {
  const { model } = await loadSpec();
  const url = `${model.baseUrl}/reservations/HHA-7K3Q9/cancel`;
  const samples = {
    curl: `KEY=$(uuidgen)   # make it once, reuse it on every retry
curl -X POST "${url}" \\
  -H "Authorization: Bearer $${KEY_ENV}" \\
  -H "Idempotency-Key: $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "reason": "Guest changed plans" }'`,
    node: `import { randomUUID } from "node:crypto";

// One key per logical action, made before the first attempt and kept for every retry.
const idempotencyKey = randomUUID();

for (let attempt = 0; attempt < 4; attempt++) {
  try {
    const res = await fetch("${url}", {
      method: "POST",
      headers: {
        Authorization: \`Bearer \${process.env.${KEY_ENV}}\`,
        "Idempotency-Key": idempotencyKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "Guest changed plans" }),
    });
    if (res.status < 500 && res.status !== 429) break;
  } catch {
    // network error: the request may or may not have arrived, so retry with the same key
  }
  await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
}`,
    python: `import os, time, uuid
import requests

# One key per logical action, made before the first attempt and kept for every retry.
idempotency_key = str(uuid.uuid4())

for attempt in range(4):
    try:
        res = requests.post(
            "${url}",
            headers={
                "Authorization": f"Bearer {os.environ['${KEY_ENV}']}",
                "Idempotency-Key": idempotency_key,
            },
            json={"reason": "Guest changed plans"},
            timeout=10,
        )
        if res.status_code < 500 and res.status_code != 429:
            break
    except requests.ConnectionError:
        pass  # it may or may not have arrived: retry with the same key
    time.sleep(2 ** attempt * 0.5)`,
  };
  return (
    <GuideFrame slug="idempotency">
      <H2 id="why">Why it matters here</H2>
      <p>
        Connections drop, especially on the networks many hotels and their partners run on. When a <code>POST</code> times out you
        cannot tell whether the booking was made. Without idempotency, retrying could book the room twice; with it, the retry
        returns the first booking.
      </p>

      <H2 id="how-it-works">How it works</H2>
      <p>
        Every write (<code>POST</code>, <code>PUT</code>, <code>PATCH</code>, <code>DELETE</code>) must carry an{" "}
        <code>Idempotency-Key</code> header: any unique string up to 255 characters, a UUID is ideal. Without one the API answers{" "}
        <code>400 IDEMPOTENCY_KEY_REQUIRED</code>.
      </p>
      <CodeSamples samples={samples} title="Cancel, safely retried" />
      <p>The first request with a key is carried out and its response stored. A later request with the same key:</p>
      <ul>
        <li>
          with the same method, path and body gets the stored response again, with the header{" "}
          <code>Idempotent-Replayed: true</code>, and nothing is done twice;
        </li>
        <li>
          with a different body gets <code>422 IDEMPOTENCY_CONFLICT</code>, because it is a different action wearing an old key.
        </li>
      </ul>
      <CodeBlock lang="http" title="A replayed response" code={`HTTP/1.1 200 OK\nIdempotent-Replayed: true\nX-Request-Id: req_01J9ZMF5N2`} />

      <H2 id="rules">The rules</H2>
      <ul>
        <li>Make the key once per logical action, before the first attempt, and keep it for every retry of that action.</li>
        <li>Never reuse a key for a different action, even an identical-looking one a minute later (a second, real booking).</li>
        <li>Keys are remembered for {IDEMPOTENCY_HOURS} hours per API key. After that the same key starts a new action.</li>
        <li>The key is saved in the same transaction as the write, so a replay is never half an action.</li>
      </ul>
      <Note>
        Validation errors (<code>400</code>) are not stored, so you can fix the body and try again with the same key.
      </Note>
    </GuideFrame>
  );
}
