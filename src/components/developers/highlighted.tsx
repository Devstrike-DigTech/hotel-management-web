import { tokenize, type Lang } from "@/lib/developers/highlight";

/** Syntax-coloured code. Pure, so it renders on the server and inside client tabs alike. */
export function Highlighted({ code, lang }: { code: string; lang: Lang }) {
  const tokens = tokenize(code, lang);
  return (
    <code className="code-text">
      {tokens.map((t, i) =>
        t.kind === "plain" ? (
          t.text
        ) : (
          <span key={i} className={`tk-${t.kind}`}>
            {t.text}
          </span>
        ),
      )}
    </code>
  );
}
