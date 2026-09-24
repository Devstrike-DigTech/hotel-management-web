import type { Metadata } from "next";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/ssr";
import { CodeBlock } from "@/components/developers/code-block";
import { CodeSamples } from "@/components/developers/code-samples";
import { H2, H3, Note } from "@/components/developers/doc-parts";
import { GuideFrame } from "@/components/developers/guide-frame";
import { SchemaTree } from "@/components/developers/schema-tree";
import {
  ADMIN_WEBHOOKS_URL,
  DELIVERY_TIMEOUT_SECONDS,
  EVENTS,
  RETRY_SCHEDULE,
  SIGNATURE_HEADER,
  WEBHOOK_TOLERANCE_SECONDS,
} from "@/lib/developers/constants";
import { loadSpec } from "@/lib/developers/spec";
import { APP_NAME } from "@/lib/env";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Webhooks",
  description: "Events, payloads, signature verification in Node, PHP and Python, retries and replay.",
  alternates: { canonical: "/developers/webhooks" },
};

const VERIFY = {
  node: `import crypto from "node:crypto";
import express from "express";

const app = express();
const SECRET = process.env.WEBHOOK_SECRET; // whsec_..., shown once when the endpoint was made
const TOLERANCE = ${WEBHOOK_TOLERANCE_SECONDS}; // seconds

// Verify against the raw bytes: parsing and re-serialising JSON changes them.
app.post("/hooks/hotel", express.raw({ type: "application/json" }), (req, res) => {
  const header = req.get("${SIGNATURE_HEADER}") ?? "";
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);

  if (!t || Math.abs(Date.now() / 1000 - t) > TOLERANCE) return res.sendStatus(400);

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(\`\${t}.\${req.body.toString("utf8")}\`)
    .digest("hex");
  const valid = signatures.some(
    (s) => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)),
  );
  if (!valid) return res.sendStatus(400);

  const event = JSON.parse(req.body);
  res.sendStatus(200); // answer quickly, then do the work
  queue.add(event.type, event); // your own job queue, keyed by event.id
});`,
  php: `<?php
// Laravel, Slim or plain PHP: what matters is reading the raw body.
$secret    = getenv('WEBHOOK_SECRET'); // whsec_..., shown once when the endpoint was made
$tolerance = ${WEBHOOK_TOLERANCE_SECONDS};
$payload   = file_get_contents('php://input');
$header    = $_SERVER['HTTP_X_SIGNATURE'] ?? '';

$t = null;
$signatures = [];
foreach (explode(',', $header) as $part) {
    [$k, $v] = array_pad(explode('=', trim($part), 2), 2, '');
    if ($k === 't') $t = (int) $v;
    if ($k === 'v1') $signatures[] = $v;
}

if (!$t || abs(time() - $t) > $tolerance) {
    http_response_code(400);
    exit;
}

$expected = hash_hmac('sha256', $t . '.' . $payload, $secret);
$valid = false;
foreach ($signatures as $sig) {
    if (hash_equals($expected, $sig)) $valid = true;
}
if (!$valid) {
    http_response_code(400);
    exit;
}

$event = json_decode($payload, true);
http_response_code(200);
// hand $event to a queue, keyed by $event['id']`,
  python: `import hashlib, hmac, json, os, time
from flask import Flask, abort, request

app = Flask(__name__)
SECRET = os.environ["WEBHOOK_SECRET"].encode()  # whsec_..., shown once
TOLERANCE = ${WEBHOOK_TOLERANCE_SECONDS}  # seconds

@app.post("/hooks/hotel")
def hotel_webhook():
    payload = request.get_data()  # the raw bytes, before any JSON parsing
    parts = [p.strip().split("=", 1) for p in request.headers.get("${SIGNATURE_HEADER}", "").split(",")]
    t = next((v for k, v in parts if k == "t"), None)
    signatures = [v for k, v in parts if k == "v1"]

    if not t or abs(time.time() - int(t)) > TOLERANCE:
        abort(400)

    expected = hmac.new(SECRET, f"{t}.".encode() + payload, hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected, s) for s in signatures):
        abort(400)

    event = json.loads(payload)
    enqueue(event)  # your own job queue, keyed by event["id"]
    return "", 200`,
};

export default async function Webhooks() {
  const { model } = await loadSpec();
  // The catalogue comes from the spec's webhooks when it has them; descriptions fill in from our own list.
  const described = new Map(EVENTS.map((e) => [e.type, e]));
  const events = model.events.length
    ? model.events.map((e) => ({ type: e.type, when: described.get(e.type)?.when ?? e.summary, object: e.object, objectName: e.objectName ?? described.get(e.type)?.object }))
    : EVENTS.map((e) => ({ type: e.type, when: e.when, object: null, objectName: e.object }));
  const sample = model.events.find((e) => e.type === "reservation.created")?.example;

  return (
    <GuideFrame slug="webhooks">
      <H2 id="overview">How delivery works</H2>
      <p>
        Add an endpoint in the hotel admin under{" "}
        <a href={ADMIN_WEBHOOKS_URL} className="text-ink">
          Settings, Webhooks
        </a>{" "}
        (or with the <Link href="/developers/reference/webhook-endpoints">webhook endpoints API</Link>), choose the events it should
        receive, and copy its signing secret, which is shown once. From then on each event is sent as a <code>POST</code> with a
        JSON body:
      </p>
      <CodeBlock
        lang="http"
        title="A delivery"
        code={`POST /hooks/hotel HTTP/1.1
Content-Type: application/json
User-Agent: ${APP_NAME}-Webhooks/1.0
X-Webhook-Id: whd_01J9ZMQ3RV
X-Event-Id: evt_01J9ZMQ3RT
X-Event-Type: reservation.created
${SIGNATURE_HEADER}: t=1790244000,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd`}
      />
      <ul>
        <li>
          Answer with any <code>2xx</code> within {DELIVERY_TIMEOUT_SECONDS} seconds. Anything else, a redirect or a timeout is a
          failure and will be retried.
        </li>
        <li>Endpoints must be public https addresses. Private, loopback and cloud metadata addresses are refused.</li>
        <li>
          Events can arrive more than once and out of order. Use <code>id</code> to ignore repeats and <code>updatedAt</code> on the
          object to keep the newest.
        </li>
      </ul>

      <H2 id="events">Event catalogue</H2>
      <p>Subscribe to the events you need, or to all of them with <code>*</code>. Open an event to see its object.</p>
      <ul className="!list-none !pl-0 border-t border-line" data-testid="event-catalogue">
        {events.map((e) => (
          <li key={e.type} className="border-b border-line !mt-0 before:!hidden">
            <details className="group">
              <summary className="grid cursor-pointer grid-cols-[1rem_minmax(0,1fr)] items-baseline gap-x-2 py-3 sm:grid-cols-[1rem_16rem_minmax(0,1fr)]">
                <CaretRight size={11} weight="bold" className="self-center text-ink-muted transition-transform group-open:rotate-90" aria-hidden />
                <code className="!bg-transparent !p-0 font-mono text-[0.8125rem] font-medium">{e.type}</code>
                <span className="col-start-2 text-[0.9375rem] leading-snug text-ink-muted sm:col-start-auto">{e.when}</span>
              </summary>
              <div className="pb-4 pl-6 text-sm">
                {e.object ? (
                  <>
                    <p className="text-ink-muted">
                      <code>data.object</code> is a{" "}
                      {e.objectName ? <code>{e.objectName}</code> : "record"}:
                    </p>
                    <SchemaTree node={e.object} />
                  </>
                ) : (
                  <p className="text-ink-muted">
                    {e.type === "webhook.ping" ? (
                      <>No object; it only proves the endpoint answers and verifies signatures.</>
                    ) : (
                      <>
                        <code>data.object</code> is a <code>{e.objectName}</code>, the same shape the API returns.
                      </>
                    )}
                  </p>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>

      <H2 id="payload">The payload</H2>
      <p>Every event has the same envelope. The changed record, in the API&rsquo;s own shape, is in <code>data.object</code>.</p>
      <CodeBlock
        lang="json"
        title="reservation.created"
        compact
        code={JSON.stringify(
          sample ?? {
            id: "evt_01J9ZMQ3RT",
            type: "reservation.created",
            createdAt: "2026-09-24T10:00:00.000Z",
            apiVersion: model.changelog[0]?.date ?? "2026-09-24",
            livemode: true,
            tenantId: "tnt_01J9ZK",
            propertyId: "prp_01J9ZK4T8Q",
            data: { object: { id: "res_01J9ZK4T8Q", code: "HHA-7K3Q9", status: "CONFIRMED" } },
          },
          null,
          2,
        )}
      />

      <H2 id="verify">Verifying signatures</H2>
      <p>
        Anyone can post to a public URL, so check every delivery before trusting it. The <code>{SIGNATURE_HEADER}</code> header
        holds a timestamp and one or more signatures:
      </p>
      <CodeBlock lang="text" code={`${SIGNATURE_HEADER}: t=<unix seconds>,v1=<hex HMAC-SHA256>[,v1=<during rotation>]`} />
      <ol>
        <li>
          Take <code>t</code> and every <code>v1</code> from the header.
        </li>
        <li>
          Reject the delivery if <code>t</code> is more than {WEBHOOK_TOLERANCE_SECONDS / 60} minutes from your clock. That stops
          replays of an old, captured delivery.
        </li>
        <li>
          Compute <code>HMAC-SHA256(secret, t + &quot;.&quot; + raw body)</code> as lowercase hex.
        </li>
        <li>
          Accept if it equals any <code>v1</code>, compared in constant time. While a secret is being rotated (24 hours), a second{" "}
          <code>v1</code> signed with the old secret is included, so both old and new secrets verify.
        </li>
      </ol>
      <CodeSamples samples={VERIFY} title="Verify a delivery" />
      <Note tone="warn" title="Use the raw body">
        Verify the bytes exactly as they arrived. A framework that parses JSON first and hands you an object will produce a different
        string when you serialise it again, and every signature will fail.
      </Note>

      <H2 id="retries">Retries and auto-disable</H2>
      <p>A failed delivery is tried again with growing gaps, eight attempts in all over a day:</p>
      <ol className="!list-none !pl-0 relative mt-6 grid grid-cols-4 gap-y-6 sm:grid-cols-8" aria-label="Delivery attempts">
        <span aria-hidden className="absolute left-0 right-0 top-[5px] h-px bg-line-strong" />
        {RETRY_SCHEDULE.map((when, i) => (
          <li key={when} className="relative !mt-0 pr-2">
            <span aria-hidden className={`block size-[11px] rounded-full border-2 ${i === 0 ? "border-laterite bg-laterite" : "border-ink-muted bg-paper"}`} />
            <span className="mt-2 block font-mono text-[10px] uppercase tracking-wider text-ink-muted">Attempt {i + 1}</span>
            <span className="block text-sm">{when}</span>
          </li>
        ))}
      </ol>
      <ul className="mt-6">
        <li>After the eighth attempt the delivery is marked failed. You can still replay it.</li>
        <li>
          An endpoint that has not succeeded once in 24 hours, with at least ten failed attempts, is <strong>disabled</strong> and the
          hotel&rsquo;s owner is emailed. Re-enabling it in the admin resumes the deliveries that were waiting.
        </li>
      </ul>

      <H2 id="replay">Replay and test pings</H2>
      <p>
        The hotel admin keeps a delivery log for each endpoint: every attempt with the request we sent, your response (status,
        headers and the first 2 KB of the body) and how long it took.
      </p>
      <H3 id="replay-a-delivery">Replay a delivery</H3>
      <p>
        <strong>Replay</strong> sends the same event again as a new delivery, with the same <code>id</code> in the body, a fresh
        timestamp and signature. Useful after fixing a bug in your handler. Your repeat check on <code>id</code> decides whether to
        process it again.
      </p>
      <H3 id="test-ping">Send a test ping</H3>
      <p>
        <strong>Send test</strong> delivers a <code>webhook.ping</code> event straight away and shows the outcome on the spot. Use it
        when setting up, and to check your signature code before real events arrive.
      </p>
    </GuideFrame>
  );
}
