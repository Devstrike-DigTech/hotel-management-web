import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/developers/code-block";
import { H2, Ledger, Note } from "@/components/developers/doc-parts";
import { GuideFrame } from "@/components/developers/guide-frame";

export const metadata: Metadata = { title: "Errors", alternates: { canonical: "/developers/errors" } };

const CODES: [string, string, string][] = [
  ["400", "IDEMPOTENCY_KEY_REQUIRED", "A write came without an Idempotency-Key header."],
  ["400", "VALIDATION_ERROR", "A parameter or field is wrong. details.fields maps each field to its messages."],
  ["401", "INVALID_API_KEY", "The key is missing, malformed, unknown, revoked or expired."],
  ["402", "SUBSCRIPTION_READ_ONLY", "The hotel's subscription is read-only; reads still work, writes do not."],
  ["403", "INSUFFICIENT_SCOPE", "The key lacks the scope in details.required."],
  ["403", "PROPERTY_ACCESS_DENIED", "The key is restricted to other properties."],
  ["403", "IP_NOT_ALLOWED", "The call came from outside the key's IP allowlist (details.ip)."],
  ["403", "FEATURE_LOCKED", "The hotel's plan no longer includes API access."],
  ["404", "NOT_FOUND", "No such record, or not one this key can see."],
  ["409", "ROOM_UNAVAILABLE", "No room of that type is free for every night asked for."],
  ["409", "STAY_RESTRICTED", "The hotel's restrictions forbid the stay (closed to arrival, minimum nights)."],
  ["409", "TENANT_MIGRATING", "A few seconds of maintenance on the hotel's database. Retry after details.retryAfterSec."],
  ["422", "IDEMPOTENCY_CONFLICT", "The Idempotency-Key was used before with a different request."],
  ["429", "RATE_LIMITED", "Too many requests. Wait details.retryAfterSec (also in Retry-After)."],
  ["500", "INTERNAL_ERROR", "Our fault. Safe to retry a write with the same Idempotency-Key."],
];

export default function Errors() {
  return (
    <GuideFrame slug="errors">
      <H2 id="envelope">The error envelope</H2>
      <p>Every error, from every endpoint, has the same shape:</p>
      <CodeBlock
        lang="json"
        title="409 Conflict"
        code={JSON.stringify(
          { statusCode: 409, code: "ROOM_UNAVAILABLE", message: "No Executive King is free on 2026-10-03.", details: { roomTypeId: "rmt_01J9ZK4T8Q", dates: ["2026-10-03"] }, requestId: "req_01J9ZMB2K7" },
          null,
          2,
        )}
      />
      <ul>
        <li>
          <code>code</code> is stable: branch on it. It never changes within a version.
        </li>
        <li>
          <code>message</code> is for people and may be reworded. Do not parse it.
        </li>
        <li>
          <code>details</code> is there when there is more to say, and its shape is fixed per code.
        </li>
        <li>
          <code>requestId</code> matches the <code>X-Request-Id</code> header. You can also send your own <code>X-Request-Id</code>{" "}
          (8 to 128 letters, digits, dashes and underscores) and it is echoed back.
        </li>
      </ul>

      <H2 id="status-codes">Status codes</H2>
      <Ledger
        head={["Status", "Means"]}
        rows={[
          ["2xx", "It worked. 201 when something was created."],
          ["400", "The request was malformed or failed validation. Fix it before retrying."],
          ["401", "The key was not accepted."],
          ["402", "The hotel's account is read-only; only reads work."],
          ["403", "The key is fine but may not do this."],
          ["404", "Not found, or not visible to this key."],
          ["409", "The request conflicts with the hotel's current state."],
          ["422", "Understood, but refused (for example, an idempotency key reused)."],
          ["429", "Slow down."],
          ["5xx", "Something failed on our side. Retry with backoff."],
        ]}
      />

      <H2 id="error-codes">Error codes</H2>
      <Ledger head={["Status", "Code", "When"]} mono={[0, 1]} rows={CODES} />

      <H2 id="handling">Handling errors well</H2>
      <ul>
        <li>
          Retry only what can succeed on retry: <code>429</code>, <code>409 TENANT_MIGRATING</code> and <code>5xx</code>, with
          exponential backoff and jitter. Never retry a <code>400</code>, <code>401</code> or <code>403</code> unchanged.
        </li>
        <li>
          Retry writes with the <strong>same</strong> <code>Idempotency-Key</code>. See <Link href="/developers/idempotency">Idempotency</Link>.
        </li>
        <li>
          For <code>VALIDATION_ERROR</code>, show <code>details.fields</code> next to the fields in your own UI.
        </li>
      </ul>
      <Note>Log the requestId with every failure. Support can find a request by it in seconds; without it, in hours.</Note>
    </GuideFrame>
  );
}
