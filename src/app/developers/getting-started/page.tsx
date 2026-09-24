import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/developers/code-block";
import { CodeSamples } from "@/components/developers/code-samples";
import { H2, Note, Step, Steps } from "@/components/developers/doc-parts";
import { GuideFrame } from "@/components/developers/guide-frame";
import { ADMIN_KEYS_URL, KEY_EXAMPLE } from "@/lib/developers/constants";
import { KEY_ENV } from "@/lib/developers/samples";
import { loadSpec } from "@/lib/developers/spec";
import { APP_NAME } from "@/lib/env";

export const revalidate = 300;
export const metadata: Metadata = { title: "Getting started", alternates: { canonical: "/developers/getting-started" } };

export default async function GettingStarted() {
  const { model } = await loadSpec();
  const base = model.baseUrl;
  const first = {
    curl: `curl ${base}/me \\\n  -H "Authorization: Bearer $${KEY_ENV}"`,
    node: `const res = await fetch("${base}/me", {\n  headers: { Authorization: \`Bearer \${process.env.${KEY_ENV}}\` },\n});\nconst { data } = await res.json();\nconsole.log(data.tenant.name, data.scopes);`,
    python: `import os\nimport requests\n\nres = requests.get(\n    "${base}/me",\n    headers={"Authorization": f"Bearer {os.environ['${KEY_ENV}']}"},\n    timeout=10,\n)\nres.raise_for_status()\nprint(res.json()["data"]["scopes"])`,
  };
  const props = {
    curl: `curl "${base}/properties?limit=10" \\\n  -H "Authorization: Bearer $${KEY_ENV}"`,
    node: `const res = await fetch("${base}/properties?limit=10", {\n  headers: { Authorization: \`Bearer \${process.env.${KEY_ENV}}\` },\n});\nconst { data, pagination } = await res.json();\nfor (const p of data) console.log(p.id, p.name, p.city);`,
    python: `res = requests.get(\n    "${base}/properties",\n    params={"limit": 10},\n    headers={"Authorization": f"Bearer {os.environ['${KEY_ENV}']}"},\n    timeout=10,\n)\nfor p in res.json()["data"]:\n    print(p["id"], p["name"], p["city"])`,
  };
  return (
    <GuideFrame slug="getting-started">
      <H2 id="before-you-start">Before you start</H2>
      <p>
        The partner API belongs to a hotel. Keys are made by the hotel&rsquo;s owner or manager, and a key can only ever see that
        hotel&rsquo;s own properties. You need:
      </p>
      <ul>
        <li>
          A hotel on the Enterprise plan (or with the API add-on), and a person there who can open <strong>Settings, API keys</strong> in
          the {APP_NAME} hotel admin.
        </li>
        <li>A terminal with curl, or Node 18 or later, or Python 3 with <code>requests</code>.</li>
      </ul>

      <H2 id="create-a-key">Create a key</H2>
      <Steps>
        <Step title="Open API keys in the hotel admin">
          <p>
            Sign in to the hotel admin and go to{" "}
            <a href={ADMIN_KEYS_URL} className="text-ink">
              Settings, API keys
            </a>
            . Choose <strong>New key</strong>.
          </p>
        </Step>
        <Step title="Name it, choose test or live, and pick scopes">
          <p>
            Name the key after what will use it (&ldquo;Channel sync&rdquo;, &ldquo;Finance export&rdquo;). Start with a{" "}
            <strong>test</strong> key: reads return real data and writes are checked, then rolled back. Give it only the scopes it needs;
            you can add more later.
          </p>
        </Step>
        <Step title="Copy the secret once">
          <p>
            The whole key is shown once, straight after you create it. Put it in your secret store or an environment variable. The
            admin keeps only its prefix and last four characters.
          </p>
        </Step>
      </Steps>
      <CodeBlock code={`export ${KEY_ENV}="${KEY_EXAMPLE.test}"`} lang="bash" title="Keep it in the environment" />

      <H2 id="first-request">Your first request</H2>
      <p>
        <code>GET /me</code> tells you which key you are using, its scopes and which hotel it belongs to. It needs no scope, so it
        is the right first call for any new integration.
      </p>
      <CodeSamples samples={first} title="GET /me" />
      <p>Then list the properties the key can see. You will need a property&rsquo;s id for most other calls.</p>
      <CodeSamples samples={props} title="GET /properties" />

      <H2 id="read-the-response">Read the response</H2>
      <p>
        One resource comes back as <code>{"{ data }"}</code>; a list as <code>{"{ data, pagination }"}</code>. Money is in kobo,
        business dates are <code>YYYY-MM-DD</code> in Lagos time, and timestamps are ISO 8601 in UTC.
      </p>
      <CodeBlock
        lang="json"
        title="200 OK"
        code={JSON.stringify(
          {
            data: [
              { id: "prp_01J9ZK4T8Q", name: "Harmattan Abuja", slug: "harmattan-abuja", city: "Abuja", area: "Maitama", timezone: "Africa/Lagos", currency: "NGN" },
            ],
            pagination: { nextCursor: null, limit: 10 },
          },
          null,
          2,
        )}
      />
      <p>
        Every response carries an <code>X-Request-Id</code> header and the <Link href="/developers/rate-limits">RateLimit headers</Link>.
        Log the request id with any error; it is the fastest way for support to find your call.
      </p>
      <Note title="Test keys">
        With an <code>hk_test_</code> key, writes answer exactly as a live key would, with <code>&quot;dryRun&quot;: true</code> beside{" "}
        <code>data</code>, and nothing is saved, charged or sent. See <Link href="/developers/test-and-live">Test and live keys</Link>.
      </Note>

      <H2 id="next-steps">Next steps</H2>
      <ul>
        <li>
          <Link href="/developers/authentication">Authentication and scopes</Link>: what each scope allows and how to rotate a key.
        </li>
        <li>
          <Link href="/developers/idempotency">Idempotency</Link>: every write needs an <code>Idempotency-Key</code>.
        </li>
        <li>
          <Link href="/developers/webhooks">Webhooks</Link>: hear about bookings as they happen instead of polling.
        </li>
        <li>
          <Link href="/developers/reference">The API reference</Link>: every endpoint with examples.
        </li>
      </ul>
    </GuideFrame>
  );
}
