import type { Metadata } from "next";
import { H2 } from "@/components/developers/doc-parts";
import { GuideFrame } from "@/components/developers/guide-frame";
import { formatFullDay } from "@/lib/dates";
import { loadSpec } from "@/lib/developers/spec";

export const revalidate = 300;
export const metadata: Metadata = { title: "Changelog", alternates: { canonical: "/developers/changelog" } };

function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((p, i) => (p.startsWith("`") && p.endsWith("`") ? <code key={i}>{p.slice(1, -1)}</code> : p))}
    </>
  );
}

export default async function Changelog() {
  const { model, specVersion } = await loadSpec();
  return (
    <GuideFrame slug="changelog">
      <H2 id="versioning">Versioning policy</H2>
      <p>
        The version is in the path: <code>/api/partner/v1</code>. Within v1 we only add: new endpoints, new optional parameters, new
        fields in responses and new event types. Nothing you rely on is renamed or removed. Write your code to ignore fields it does
        not know.
      </p>
      <p>
        Anything that would break an integration waits for v2, which will run beside v1 for at least twelve months, with the change
        announced to every hotel owner whose keys call the affected endpoints. The specification this site is built from carries a
        date version (currently <code>{specVersion}</code>), and every webhook payload says which one it was built with in{" "}
        <code>apiVersion</code>.
      </p>

      <H2 id="releases">Releases</H2>
      {model.changelog.length ? (
        <ol className="!list-none !pl-0" data-testid="changelog">
          {model.changelog.map((c) => (
            <li key={c.date} className="grid gap-x-8 gap-y-2 border-t border-line py-6 before:!hidden sm:grid-cols-[10rem_minmax(0,1fr)]">
              <p className="!mt-0">
                <time dateTime={c.date} className="font-display text-lg">
                  {formatFullDay(c.date)}
                </time>
                <span className="kicker mt-1 block !text-[10px]">{c.date}</span>
              </p>
              <ul className="!mt-0">
                {c.changes.map((ch, i) => (
                  <li key={i}>
                    <Inline text={ch} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-ink-muted">No releases are recorded in the specification yet.</p>
      )}
    </GuideFrame>
  );
}
