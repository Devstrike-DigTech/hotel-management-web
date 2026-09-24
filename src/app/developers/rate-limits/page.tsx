import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/developers/code-block";
import { CodeSamples } from "@/components/developers/code-samples";
import { H2, Ledger } from "@/components/developers/doc-parts";
import { GuideFrame } from "@/components/developers/guide-frame";
import { RATE_LIMIT } from "@/lib/developers/constants";

export const metadata: Metadata = { title: "Rate limits", alternates: { canonical: "/developers/rate-limits" } };

const backoff = {
  node: `async function call(url, init, attempt = 0) {
  const res = await fetch(url, init);
  if (res.status !== 429 || attempt >= 5) return res;
  // Retry-After is in seconds; add a little jitter so parallel workers spread out.
  const wait = Number(res.headers.get("Retry-After") ?? 1) * 1000 + Math.random() * 250;
  await new Promise((r) => setTimeout(r, wait));
  return call(url, init, attempt + 1);
}`,
  python: `import random, time
import requests

def call(method, url, attempt=0, **kwargs):
    res = requests.request(method, url, timeout=10, **kwargs)
    if res.status_code != 429 or attempt >= 5:
        return res
    # Retry-After is in seconds; add a little jitter so parallel workers spread out.
    time.sleep(float(res.headers.get("Retry-After", 1)) + random.random() / 4)
    return call(method, url, attempt + 1, **kwargs)`,
};

export default function RateLimits() {
  return (
    <GuideFrame slug="rate-limits">
      <H2 id="limits">The limits</H2>
      <p>Limits are counted per key, so two integrations for the same hotel never slow each other down.</p>
      <Ledger
        mono={[1, 2]}
        head={["Plan", "Per minute", "Burst"]}
        rows={[
          ["Enterprise", `${RATE_LIMIT.perMinute}`, `${RATE_LIMIT.burstPerSecond} a second`],
          ["Other plans with the API add-on", `${RATE_LIMIT.addonPerMinute}`, `${RATE_LIMIT.addonBurstPerSecond} a second`],
        ]}
      />
      <p>
        That is plenty for syncing a group of hotels every minute. If you find yourself polling hard, use{" "}
        <Link href="/developers/webhooks">webhooks</Link> and <code>updatedSince</code> instead.
      </p>

      <H2 id="headers">RateLimit headers</H2>
      <p>Every response, successful or not, says where you stand:</p>
      <CodeBlock
        lang="http"
        code={`HTTP/1.1 200 OK\nRateLimit-Limit: ${RATE_LIMIT.perMinute}\nRateLimit-Remaining: 587\nRateLimit-Reset: 42\nRateLimit-Policy: ${RATE_LIMIT.perMinute};w=60, ${RATE_LIMIT.burstPerSecond};w=1\nX-Request-Id: req_01J9ZMB2K7`}
      />
      <Ledger
        head={["Header", "Means"]}
        rows={[
          ["RateLimit-Limit", "Requests allowed in the one-minute window."],
          ["RateLimit-Remaining", "Requests left in this window."],
          ["RateLimit-Reset", "Seconds until the window starts again."],
          ["RateLimit-Policy", "The windows that apply: requests per 60 seconds, and the burst per second."],
        ]}
      />

      <H2 id="when-limited">When you are limited</H2>
      <p>
        Over the limit, the API answers <code>429 RATE_LIMITED</code> with <code>details.retryAfterSec</code> and a{" "}
        <code>Retry-After</code> header. Wait that long, then carry on. Nothing about the request was done, so retrying is safe (and
        writes keep their <code>Idempotency-Key</code> anyway).
      </p>
      <CodeSamples samples={backoff} title="Back off on 429" />
    </GuideFrame>
  );
}
