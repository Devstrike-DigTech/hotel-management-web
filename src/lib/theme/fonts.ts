/**
 * M7: the curated font pairings (Google Fonts, italics where the family has them). The backend's
 * registry is the authority; this copy lets a page render when the API sends only a pairing id, and
 * gives each template its default. No Inter, Geist or Roboto anywhere.
 */
import type { FontChoice } from "../types";
import type { FontPairing, TemplateId } from "./types";

const gf = (family: string, category: FontChoice["category"], weights: number[], italicWeights: number[] = []): FontChoice => ({
  family,
  category,
  weights,
  italicWeights,
  googleFontsUrl: `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weights.join(";")}&display=swap`,
});

export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: "fraunces-schibsted",
    name: "Fraunces + Schibsted Grotesk",
    heading: gf("Fraunces", "serif", [300, 400, 500], [300, 400]),
    body: gf("Schibsted Grotesk", "sans", [400, 500, 600]),
    builtIn: "house",
  },
  {
    id: "cormorant-manrope",
    name: "Cormorant + Manrope",
    heading: gf("Cormorant Garamond", "serif", [400, 500, 600], [400, 500]),
    body: gf("Manrope", "sans", [400, 500, 600]),
  },
  {
    id: "dmserif-dmsans",
    name: "DM Serif Display + DM Sans",
    heading: gf("DM Serif Display", "display", [400], [400]),
    body: gf("DM Sans", "sans", [400, 500, 600]),
  },
  {
    id: "playfair-worksans",
    name: "Playfair Display + Work Sans",
    heading: gf("Playfair Display", "serif", [400, 500, 600], [400, 500]),
    body: gf("Work Sans", "sans", [400, 500, 600]),
  },
  {
    id: "marcellus-karla",
    name: "Marcellus + Karla",
    heading: gf("Marcellus", "display", [400]),
    body: gf("Karla", "sans", [400, 500, 600], [400]),
  },
  {
    id: "youngserif-figtree",
    name: "Young Serif + Figtree",
    heading: gf("Young Serif", "serif", [400]),
    body: gf("Figtree", "sans", [400, 500, 600], [400]),
  },
  {
    id: "bricolage-instrument",
    name: "Bricolage Grotesque + Instrument Sans",
    heading: gf("Bricolage Grotesque", "display", [400, 500, 600]),
    body: gf("Instrument Sans", "sans", [400, 500, 600], [400]),
  },
  {
    id: "spacegrotesk-plexsans",
    name: "Space Grotesk + IBM Plex Sans",
    heading: gf("Space Grotesk", "sans", [400, 500, 600]),
    body: gf("IBM Plex Sans", "sans", [400, 500, 600], [400]),
  },
  {
    id: "baskerville-sourcesans",
    name: "Libre Baskerville + Source Sans 3",
    heading: gf("Libre Baskerville", "serif", [400, 700], [400]),
    body: gf("Source Sans 3", "sans", [400, 600], [400]),
  },
  {
    id: "system-stack",
    name: "System fonts (fastest)",
    heading: { family: "system-ui", category: "sans", weights: [], googleFontsUrl: "" },
    body: { family: "system-ui", category: "sans", weights: [], googleFontsUrl: "" },
    builtIn: "system",
  },
];

/** Each template's own pairing, used unless the hotel's plan lets it choose another. */
export const TEMPLATE_FONTS: Record<TemplateId, string> = {
  editorial: "fraunces-schibsted",
  boutique: "cormorant-manrope",
  business: "bricolage-instrument",
  resort: "playfair-worksans",
  heritage: "marcellus-karla",
  essentials: "system-stack",
};

export function pairingById(id: string | null | undefined): FontPairing | null {
  return FONT_PAIRINGS.find((p) => p.id === id) ?? null;
}
