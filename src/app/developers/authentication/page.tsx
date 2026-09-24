import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/developers/code-block";
import { H2, Ledger, Note } from "@/components/developers/doc-parts";
import { GuideFrame } from "@/components/developers/guide-frame";
import { ALT_KEY_HEADER, SCOPES } from "@/lib/developers/constants";
import { KEY_ENV } from "@/lib/developers/samples";
import { loadSpec } from "@/lib/developers/spec";

export const revalidate = 300;
export const metadata: Metadata = { title: "Authentication and scopes", alternates: { canonical: "/developers/authentication" } };

export default async function Authentication() {
  const { model } = await loadSpec();
  return (
    <GuideFrame slug="authentication">
      <H2 id="bearer-keys">Bearer keys</H2>
      <p>
        Send the key in the <code>Authorization</code> header on every request. Where a tool cannot set that header, the same key
        also works in <code>{ALT_KEY_HEADER}</code>. Keys never go in the URL, where they would end up in logs.
      </p>
      <CodeBlock code={`curl ${model.baseUrl}/me \\\n  -H "Authorization: Bearer $${KEY_ENV}"`} lang="bash" />
      <p>
        A missing, malformed, unknown, revoked or expired key is answered with <code>401 INVALID_API_KEY</code>. The response never
        says which of those it was.
      </p>

      <H2 id="key-anatomy">Anatomy of a key</H2>
      <figure className="not-prose overflow-x-auto rounded-md border border-line bg-surface p-5">
        <p className="whitespace-nowrap font-mono text-[0.95rem] sm:text-lg">
          <span className="text-ink-muted">hk_</span>
          <span className="text-laterite">live</span>
          <span className="text-ink-muted">_</span>
          <span className="text-adire">8f3k2q7m1a</span>
          <span className="text-ink-muted">_</span>
          <span>4tXv9Lw2bRk7PzQm1sY6cHn0aJd3eFg5hT8uWx2Z</span>
        </p>
        <figcaption className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <span>
            <span className="kicker block !text-[10px] !text-laterite">Mode</span>
            <code>live</code> or <code>test</code>. See <Link href="/developers/test-and-live">test and live keys</Link>.
          </span>
          <span>
            <span className="kicker block !text-[10px] !text-adire">Prefix</span>
            Ten characters that identify the key in the admin and in logs. Safe to show.
          </span>
          <span>
            <span className="kicker block !text-[10px]">Secret</span>
            Forty characters, shown once. Only a SHA-256 hash is stored; nobody can show it to you again.
          </span>
        </figcaption>
      </figure>

      <H2 id="scopes">Scopes</H2>
      <p>
        Each key carries a list of scopes chosen when it is made. A call outside them is refused with{" "}
        <code>403 INSUFFICIENT_SCOPE</code>, and <code>details.required</code> names the scope it needed. Properties, room types and{" "}
        <code>/me</code> need no scope. Each endpoint in the <Link href="/developers/reference">reference</Link> states its scope.
      </p>
      <Ledger head={["Scope", "Allows"]} rows={SCOPES.map((s) => [s.scope, s.grants])} />

      <H2 id="restrictions">Property and IP restrictions</H2>
      <ul>
        <li>
          <strong>Properties.</strong> A key can be limited to some of a group&rsquo;s hotels. Lists then contain only those; asking for
          another property&rsquo;s records gives <code>403 PROPERTY_ACCESS_DENIED</code>.
        </li>
        <li>
          <strong>IP allowlist.</strong> A key can be limited to addresses or CIDR ranges (<code>102.89.0.0/16</code>). Calls from
          anywhere else get <code>403 IP_NOT_ALLOWED</code> with the address we saw in <code>details.ip</code>.
        </li>
        <li>
          <strong>Expiry.</strong> A key can be given an end date, after which it behaves as revoked.
        </li>
      </ul>

      <H2 id="rotation">Rotating and revoking</H2>
      <p>
        <strong>Rotate</strong> issues a new secret for the same key, with the same prefix, scopes and restrictions. The old secret
        keeps working for 24 hours, so you can deploy the new one without a gap. <strong>Revoke</strong> stops the key and any
        rotation secret at once.
      </p>
      <Note tone="warn" title="If a key leaks">
        Revoke it in the admin straight away, then make a new one. Revoking is immediate; rotating is not, because the old secret
        lives on for a day.
      </Note>

      <H2 id="keeping-keys-safe">Keeping keys safe</H2>
      <ul>
        <li>Call the API from your server only. A key in a browser or mobile app is a key anyone can read.</li>
        <li>One key per integration, with the fewest scopes that work. It makes the audit trail readable and a leak smaller.</li>
        <li>
          Every write is recorded in the hotel&rsquo;s audit log as <code>API key &lt;name&gt;</code>, so name keys for what uses them.
        </li>
        <li>Use a test key everywhere except production.</li>
      </ul>
    </GuideFrame>
  );
}
