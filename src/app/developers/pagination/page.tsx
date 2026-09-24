import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/developers/code-block";
import { CodeSamples } from "@/components/developers/code-samples";
import { H2, Note } from "@/components/developers/doc-parts";
import { GuideFrame } from "@/components/developers/guide-frame";
import { PAGE_LIMIT } from "@/lib/developers/constants";
import { KEY_ENV } from "@/lib/developers/samples";
import { loadSpec } from "@/lib/developers/spec";

export const revalidate = 300;
export const metadata: Metadata = { title: "Pagination", alternates: { canonical: "/developers/pagination" } };

export default async function Pagination() {
  const { model } = await loadSpec();
  const url = `${model.baseUrl}/reservations`;
  const walk = {
    node: `async function* reservations(params = {}) {
  let cursor = null;
  do {
    const qs = new URLSearchParams({ ...params, limit: "200", ...(cursor ? { cursor } : {}) });
    const res = await fetch(\`${url}?\${qs}\`, {
      headers: { Authorization: \`Bearer \${process.env.${KEY_ENV}}\` },
    });
    if (!res.ok) throw new Error((await res.json()).code);
    const { data, pagination } = await res.json();
    yield* data;
    cursor = pagination.nextCursor;
  } while (cursor);
}

for await (const r of reservations({ arrivalFrom: "2026-10-01" })) {
  console.log(r.code, r.arrivalDate, r.status);
}`,
    python: `import os
import requests

def reservations(**params):
    cursor = None
    while True:
        query = {**params, "limit": 200, **({"cursor": cursor} if cursor else {})}
        res = requests.get(
            "${url}",
            params=query,
            headers={"Authorization": f"Bearer {os.environ['${KEY_ENV}']}"},
            timeout=10,
        )
        res.raise_for_status()
        body = res.json()
        yield from body["data"]
        cursor = body["pagination"]["nextCursor"]
        if not cursor:
            break

for r in reservations(arrivalFrom="2026-10-01"):
    print(r["code"], r["arrivalDate"], r["status"])`,
    curl: `curl "${url}?limit=200" -H "Authorization: Bearer $${KEY_ENV}"
# then, with the nextCursor from that page:
curl "${url}?limit=200&cursor=eyJpZCI6InJlc18wMUoifQ" -H "Authorization: Bearer $${KEY_ENV}"`,
  };
  return (
    <GuideFrame slug="pagination">
      <H2 id="cursors">Cursors, not pages</H2>
      <p>
        Every list returns <code>data</code> and <code>pagination</code>. Ask for up to {PAGE_LIMIT.max} items with{" "}
        <code>limit</code> (the default is {PAGE_LIMIT.default}); when there are more, <code>pagination.nextCursor</code> is a string
        you send back as <code>cursor</code>. On the last page it is <code>null</code>.
      </p>
      <CodeBlock lang="json" title="A page" code={JSON.stringify({ data: ["…"], pagination: { nextCursor: "eyJpZCI6InJlc18wMUoifQ", limit: 50 } }, null, 2)} />
      <p>
        Lists are ordered by when records were created, oldest first, with the id as a tie-break. A cursor marks a position in that
        order, so a booking made while you are paging never shifts a page and nothing is seen twice.
      </p>
      <Note>Treat cursors as opaque. Their format can change without notice; only their meaning is stable.</Note>

      <H2 id="walking-a-list">Walking a list</H2>
      <CodeSamples samples={walk} title="Every page" />

      <H2 id="syncing">Keeping a copy in sync</H2>
      <p>
        Reservations and guests take <code>updatedSince</code>. Store the time you started your last sync, and next time ask only for
        what changed since then:
      </p>
      <ol>
        <li>Note the current time before you start.</li>
        <li>
          Walk <code>GET /reservations?updatedSince=&lt;last start&gt;</code> to the end.
        </li>
        <li>Save the time from step 1 as the new starting point.</li>
      </ol>
      <p>
        Starting from the time before the walk, not after, means a change made during the walk is picked up next time rather than
        missed. Pair it with <Link href="/developers/webhooks">webhooks</Link> for changes within seconds and use the sync as a nightly
        safety net.
      </p>
    </GuideFrame>
  );
}
