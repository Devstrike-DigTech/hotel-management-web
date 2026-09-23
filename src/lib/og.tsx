import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Brand fonts for next/og (static TTFs; Satori cannot read variable fonts or WOFF2). */
export async function ogFonts() {
  const dir = join(process.cwd(), "src/assets/og");
  const [display, italic, sans, mono] = await Promise.all([
    readFile(join(dir, "Fraunces-Medium.ttf")),
    readFile(join(dir, "Fraunces-Italic.ttf")),
    readFile(join(dir, "SchibstedGrotesk-Medium.ttf")),
    readFile(join(dir, "IBMPlexMono-Medium.ttf")),
  ]);
  return [
    { name: "Fraunces", data: display, style: "normal" as const, weight: 500 as const },
    { name: "Fraunces", data: italic, style: "italic" as const, weight: 500 as const },
    { name: "Schibsted", data: sans, style: "normal" as const, weight: 500 as const },
    { name: "Plex", data: mono, style: "normal" as const, weight: 500 as const },
  ];
}

export const OG = {
  paper: "#F4EFE6",
  surface: "#FBF8F2",
  ink: "#1B1A17",
  muted: "#6B645A",
  line: "#D9CEBC",
  laterite: "#B4452A",
  brass: "#B98A2E",
};

/** The key fob mark, as an inline SVG element for Satori. */
export function OgFob({ size = 56, color = OG.laterite, hole = OG.paper }: { size?: number; color?: string; hole?: string }) {
  return (
    <svg width={(size * 20) / 30} height={size} viewBox="0 0 20 30">
      <path d="M10 1.2 18.6 8v14L10 28.8 1.4 22V8z" fill={color} />
      <circle cx="10" cy="6.6" r="2" fill={hole} />
    </svg>
  );
}

/** A strip of the adire rule, drawn as SVG for Satori. */
export function OgAdire({ width = 1200, color = OG.line }: { width?: number; color?: string }) {
  const tiles = Math.ceil(width / 64);
  return (
    <svg width={width} height={20} viewBox={`0 0 ${tiles * 64} 20`} fill="none" stroke={color} strokeWidth="1.2">
      {Array.from({ length: tiles }, (_, i) => (
        <g key={i} transform={`translate(${i * 64} 0)`}>
          <path d="M0 10h7.5M20.5 10h14.5M49 10h15" />
          <circle cx="14" cy="10" r="6" />
          <circle cx="14" cy="10" r="2.25" fill={color} stroke="none" />
          <path d="M42 3l7 7-7 7-7-7z" />
          <path d="M42 7l3 3-3 3-3-3z" />
        </g>
      ))}
    </svg>
  );
}
