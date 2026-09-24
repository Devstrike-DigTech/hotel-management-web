import type { Metadata } from "next";
import { CodeBlock } from "@/components/developers/code-block";
import { H2, Ledger, Note } from "@/components/developers/doc-parts";
import { GuideFrame } from "@/components/developers/guide-frame";

export const metadata: Metadata = { title: "Test and live keys", alternates: { canonical: "/developers/test-and-live" } };

export default function TestAndLive() {
  return (
    <GuideFrame slug="test-and-live">
      <H2 id="two-modes">Two modes, one API</H2>
      <p>
        There is no separate sandbox host. Test and live keys call the same base URL against the same hotel. The difference is what
        happens to a write.
      </p>

      <H2 id="what-test-mode-does">What test mode does</H2>
      <Ledger
        mono={[]}
        head={["", "Test key (hk_test_)", "Live key (hk_live_)"]}
        rows={[
          ["Reads", "Real data", "Real data"],
          ["Writes", "Fully validated, including availability and database rules, then rolled back", "Saved"],
          ["Response", <span key="r">What live would return, plus <code>&quot;dryRun&quot;: true</code></span>, "The saved record"],
          ["Guests messaged, cards charged", "Never", "As the hotel has set up"],
          ["Webhooks", "Not sent for dry runs", "Sent"],
          ["Rate limits and idempotency", "The same", "The same"],
        ]}
      />
      <CodeBlock
        lang="json"
        title="201 Created, test key"
        code={JSON.stringify({ data: { id: "res_01J9ZK4T8Q", code: "HHA-7K3Q9", status: "CONFIRMED", source: "API", arrivalDate: "2026-10-02", departureDate: "2026-10-04" }, dryRun: true }, null, 2)}
      />
      <Note>
        Because a dry run is rolled back, the id in its response does not exist afterwards. Do not store it, and do not expect to
        read it back with <code>GET /reservations/:id</code>.
      </Note>

      <H2 id="telling-them-apart">Telling them apart</H2>
      <ul>
        <li>
          The key itself: <code>hk_test_</code> or <code>hk_live_</code>.
        </li>
        <li>
          <code>GET /me</code> returns <code>environment: &quot;TEST&quot;</code> or <code>&quot;LIVE&quot;</code>.
        </li>
        <li>
          Webhook payloads carry <code>livemode</code>.
        </li>
      </ul>

      <H2 id="going-live">Going live</H2>
      <ol>
        <li>Ask the hotel for a live key with the same scopes as your test key.</li>
        <li>Swap the environment variable. Nothing else changes: same URL, same shapes.</li>
        <li>
          Watch the first writes in the hotel admin&rsquo;s key usage page, and check that your code no longer sees{" "}
          <code>dryRun</code>.
        </li>
      </ol>
    </GuideFrame>
  );
}
