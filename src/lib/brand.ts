/**
 * Re-tints the laterite accent with a hotel's own brand colour. We derive a lighter
 * variant for dark mode and pick an ink colour for text on the accent that meets contrast.
 */

type RGB = [number, number, number];

function parseHex(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

const toHex = (rgb: RGB) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

function luminance([r, g, b]: RGB) {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

const contrast = (a: RGB, b: RGB) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;

const LIGHT_INK: RGB = [255, 246, 239];
const DARK_INK: RGB = [27, 13, 8];
const PAPER: RGB = [244, 239, 230];
const DARK_PAPER: RGB = [19, 17, 14];

export interface BrandVars {
  light: string;
  lightInk: string;
  dark: string;
  darkInk: string;
}

export function brandVars(accent: string | null | undefined): BrandVars | null {
  if (!accent) return null;
  let rgb = parseHex(accent);
  if (!rgb) return null;
  // Keep the accent legible as text on paper: darken until it reaches 4.5:1.
  let guard = 0;
  while (contrast(rgb, PAPER) < 4.5 && guard++ < 20) rgb = mix(rgb, [0, 0, 0], 0.08);
  let dark = mix(rgb, [255, 255, 255], 0.28);
  guard = 0;
  while (contrast(dark, DARK_PAPER) < 4.5 && guard++ < 20) dark = mix(dark, [255, 255, 255], 0.08);
  const inkFor = (c: RGB) => (contrast(c, LIGHT_INK) >= contrast(c, DARK_INK) ? toHex(LIGHT_INK) : toHex(DARK_INK));
  return { light: toHex(rgb), lightInk: inkFor(rgb), dark: toHex(dark), darkInk: inkFor(dark) };
}

/** CSS custom properties for a `.brand-scope` wrapper (see globals.css). */
export function brandStyle(accent: string | null | undefined): React.CSSProperties | undefined {
  const v = brandVars(accent);
  if (!v) return undefined;
  return {
    "--brand": v.light,
    "--brand-ink": v.lightInk,
    "--brand-dark": v.dark,
    "--brand-dark-ink": v.darkInk,
  } as React.CSSProperties;
}
