import type { Lang } from "@/lib/developers/highlight";
import { CopyButton } from "./copy-button";
import { Highlighted } from "./highlighted";

const LANG_LABEL: Record<Lang, string> = {
  bash: "Shell",
  node: "Node",
  python: "Python",
  php: "PHP",
  json: "JSON",
  http: "HTTP",
  text: "Text",
};

/** A single code sample on an ink plate, with its language and a copy button. */
export function CodeBlock({
  code,
  lang,
  title,
  className = "",
  compact = false,
}: {
  code: string;
  lang: Lang;
  title?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <figure className={`code-plate ${className}`}>
      <figcaption className="code-bar">
        <span className="code-title">{title ?? LANG_LABEL[lang]}</span>
        <CopyButton text={code} label={`Copy ${title ?? LANG_LABEL[lang]} code`} />
      </figcaption>
      <pre className={compact ? "code-pre code-pre-compact" : "code-pre"} tabIndex={0}>
        <Highlighted code={code} lang={lang} />
      </pre>
    </figure>
  );
}
