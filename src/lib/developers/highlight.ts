/**
 * A small, dependency-free highlighter for the handful of languages the docs show. It only needs
 * to be right about comments, strings, keywords and numbers; everything else stays plain ink.
 */

export type Lang = "bash" | "node" | "python" | "php" | "json" | "http" | "text";

export type TokenKind = "plain" | "comment" | "string" | "keyword" | "number" | "key" | "fn" | "var" | "flag" | "punct" | "method";

export interface Token {
  kind: TokenKind;
  text: string;
}

interface Rule {
  kind: TokenKind;
  re: RegExp;
}

const KW: Record<string, string[]> = {
  node: "const let var function return if else for of in new await async import from export default try catch throw class extends typeof true false null undefined require".split(" "),
  python: "def return if elif else for in import from as with try except raise class not and or is None True False lambda pass async await".split(" "),
  php: "function return if else foreach as new use namespace echo true false null throw try catch fn".split(" "),
  bash: "export if then fi for do done in echo".split(" "),
};

const STR_DQ = /"(?:[^"\\\n]|\\.)*"/y;
const STR_SQ = /'(?:[^'\\\n]|\\.)*'/y;
const STR_BT = /`(?:[^`\\]|\\.)*`/y;
const NUM = /\b\d+(?:\.\d+)?\b/y;
const IDENT = /[A-Za-z_$][\w$]*/y;
const SPACE = /\s+/y;

function rulesFor(lang: Lang): Rule[] {
  switch (lang) {
    case "bash":
      return [
        { kind: "comment", re: /#[^\n]*/y },
        { kind: "fn", re: /\b(?:curl|openssl|jq)\b/y },
        { kind: "string", re: STR_DQ },
        { kind: "string", re: STR_SQ },
        { kind: "var", re: /\$\{?[A-Za-z_][\w]*\}?/y },
        { kind: "flag", re: /(?<=\s)--?[A-Za-z][\w-]*/y },
        { kind: "punct", re: /\\\n|[|&;]/y },
      ];
    case "node":
      return [
        { kind: "comment", re: /\/\/[^\n]*/y },
        { kind: "comment", re: /\/\*[\s\S]*?\*\//y },
        { kind: "string", re: STR_BT },
        { kind: "string", re: STR_DQ },
        { kind: "string", re: STR_SQ },
        { kind: "number", re: NUM },
      ];
    case "python":
      return [
        { kind: "comment", re: /#[^\n]*/y },
        { kind: "string", re: /[rbf]?"""[\s\S]*?"""/y },
        { kind: "string", re: /[rbf]?"(?:[^"\\\n]|\\.)*"/y },
        { kind: "string", re: /[rbf]?'(?:[^'\\\n]|\\.)*'/y },
        { kind: "number", re: NUM },
      ];
    case "php":
      return [
        { kind: "comment", re: /\/\/[^\n]*/y },
        { kind: "comment", re: /#[^\n]*/y },
        { kind: "keyword", re: /<\?php/y },
        { kind: "string", re: STR_DQ },
        { kind: "string", re: STR_SQ },
        { kind: "var", re: /\$[A-Za-z_]\w*/y },
        { kind: "number", re: NUM },
      ];
    case "json":
      return [
        { kind: "key", re: /"(?:[^"\\\n]|\\.)*"(?=\s*:)/y },
        { kind: "string", re: STR_DQ },
        { kind: "number", re: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y },
        { kind: "keyword", re: /\b(?:true|false|null)\b/y },
        { kind: "punct", re: /[{}[\],:]/y },
      ];
    case "http":
      return [
        { kind: "method", re: /^(?:GET|POST|PUT|PATCH|DELETE|HTTP\/[\d.]+)\b/my },
        { kind: "key", re: /^[A-Za-z][\w-]*(?=:)/my },
        { kind: "number", re: NUM },
      ];
    default:
      return [];
  }
}

export function tokenize(code: string, lang: Lang): Token[] {
  const rules = rulesFor(lang);
  const keywords = new Set(KW[lang] ?? []);
  const out: Token[] = [];
  const push = (kind: TokenKind, text: string) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ kind, text });
  };
  let i = 0;
  outer: while (i < code.length) {
    for (const { kind, re } of rules) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (m && m.index === i && m[0].length) {
        push(kind, m[0]);
        i += m[0].length;
        continue outer;
      }
    }
    if (lang !== "text" && lang !== "http" && lang !== "json") {
      IDENT.lastIndex = i;
      const id = IDENT.exec(code);
      if (id && id.index === i) {
        const word = id[0];
        const after = code[i + word.length];
        if (keywords.has(word)) push("keyword", word);
        else if (after === "(") push("fn", word);
        else push("plain", word);
        i += word.length;
        continue;
      }
    }
    SPACE.lastIndex = i;
    const sp = SPACE.exec(code);
    if (sp && sp.index === i) {
      push("plain", sp[0]);
      i += sp[0].length;
      continue;
    }
    push("plain", code[i]);
    i++;
  }
  return out;
}
