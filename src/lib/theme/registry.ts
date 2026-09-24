/**
 * M7: the web's side of the template registry. The backend holds the authoritative registry (plan
 * availability, preview images); this holds what the layouts need: each template's sections in
 * their default order, and which of them start switched on.
 */
import type { SectionKey, TemplateId } from "./types";

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  /** One line, as the Brand Studio gallery says it. */
  description: string;
  /** Sections this template can show, in default order; `on` says whether a fresh theme shows it. */
  sections: { key: SectionKey; on: boolean }[];
}

const s = (spec: string): TemplateInfo["sections"] =>
  spec
    .trim()
    .split(/\s+/)
    .map((k) => ({ key: k.replace(/^-/, "") as SectionKey, on: !k.startsWith("-") }));

export const TEMPLATES: Record<TemplateId, TemplateInfo> = {
  editorial: {
    id: "editorial",
    name: "Editorial",
    description: "A printed travel magazine: big serif display, numbered sections, a drop cap.",
    sections: s("hero highlights amenities rooms -rates-calendar reviews -experiences -dining -meetings -gallery policies location-map getting-here faq -contact -custom-text"),
  },
  boutique: {
    id: "boutique",
    name: "Boutique",
    description: "Image-led: a full-bleed photograph, few words, a great deal of air.",
    sections: s("hero highlights rooms gallery dining -experiences reviews getting-here location-map faq -policies -amenities -rates-calendar -meetings contact -custom-text"),
  },
  business: {
    id: "business",
    name: "Business",
    description: "Availability and rates above the fold, dense and quick, with corporate rates and meeting rooms.",
    sections: s("hero rates-calendar rooms meetings amenities highlights getting-here reviews policies location-map faq contact -dining -gallery -experiences -custom-text"),
  },
  resort: {
    id: "resort",
    name: "Resort",
    description: "An immersive gallery, then the pool, the table and the things to do. Softer and rounder.",
    sections: s("hero highlights experiences rooms dining gallery amenities reviews getting-here location-map policies faq -meetings -rates-calendar -contact -custom-text"),
  },
  heritage: {
    id: "heritage",
    name: "Heritage",
    description: "Formal and classical: a crest, ornamental rules, centred type set with care.",
    sections: s("hero highlights rooms gallery dining reviews policies getting-here location-map faq contact -amenities -experiences -meetings -rates-calendar -custom-text"),
  },
  essentials: {
    id: "essentials",
    name: "Essentials",
    description: "Text first and very light, for guesthouses and patchy networks. Fast on 3G and small phones.",
    sections: s("hero rates-calendar rooms amenities getting-here reviews location-map policies faq contact -highlights -gallery -dining -experiences -meetings -custom-text"),
  },
};

export const isTemplateId = (v: unknown): v is TemplateId => typeof v === "string" && v in TEMPLATES;
