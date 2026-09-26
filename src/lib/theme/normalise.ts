/**
 * M7: turns whatever the API sends for a site theme into a `SiteTheme`, filling gaps from the
 * template's defaults. Tolerant on purpose: a field the API renames or leaves out never breaks a
 * hotel's page, it falls back to the template's own choice.
 */
import { brandVars, contrastOf } from "../brand";
import { fontHref, safeFamily } from "../white-label";
import type { FontChoice } from "../types";
import { FONT_PAIRINGS, pairingById, TEMPLATE_FONTS } from "./fonts";
import { isTemplateId, TEMPLATES } from "./registry";
import type {
  AppliedColours,
  ColourMode,
  FaqItem,
  FontPairing,
  PickupKind,
  PickupPoint,
  SectionItem,
  SectionKey,
  SectionOptions,
  SiteTheme,
  TemplateId,
  ThemeSection,
} from "./types";
import { SECTION_KEYS } from "./types";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v: unknown) => {
  const s = str(v);
  if (!s) return null;
  const full = /^#?[0-9a-f]{3}$/i.test(s) ? `#${s.replace("#", "").split("").map((c) => c + c).join("")}` : s.startsWith("#") ? s : `#${s}`;
  return HEX.test(full) ? full.toLowerCase() : null;
};
/** Only http(s) and same-site paths for images the page will load. */
const url = (v: unknown) => {
  const s = str(v);
  if (!s) return null;
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
};

function items(v: unknown): SectionItem[] {
  return arr(v)
    .map(obj)
    .map((i) => ({
      title: str(i.title) ?? str(i.name) ?? str(i.label) ?? "",
      body: str(i.body) ?? str(i.description) ?? str(i.text),
      imageUrl: url(i.imageUrl) ?? url(i.image) ?? url(obj(i.image).url),
      meta: str(i.meta) ?? str(i.detail) ?? str(i.capacity) ?? str(i.hours) ?? str(i.price),
    }))
    .filter((i) => i.title)
    .slice(0, 12);
}

/**
 * API-M7 1.1 option names: hero { headline, subheadline, imageUrl, ctaLabel }, highlights { items[title, text] },
 * experiences / dining / meetings { title, intro, items }, custom-text { title, body }, getting-here { intro },
 * location-map { note }. `resolved` (1.9) is kept in `raw` for the sections that use it.
 */
function options(v: unknown, resolved?: unknown): SectionOptions {
  const o = obj(v);
  return {
    title: str(o.title) ?? str(o.headline) ?? str(o.heading),
    subtitle: str(o.subtitle) ?? str(o.kicker),
    body: str(o.body) ?? str(o.intro) ?? str(o.subheadline) ?? str(o.note) ?? str(o.text),
    items: items(o.items ?? o.cards ?? o.entries),
    imageUrl: url(o.imageUrl) ?? url(o.image),
    layout: str(o.layout) ?? str(o.variant),
    raw: { ...o, ...(resolved ? { resolved: obj(resolved) } : {}) },
  };
}

const emptyOptions = (): SectionOptions => ({ title: null, subtitle: null, body: null, items: [], imageUrl: null, layout: null, raw: {} });

function sectionKey(v: unknown): SectionKey | null {
  const k = str(v)?.toLowerCase().replace(/_/g, "-");
  if (!k) return null;
  if (/^custom-text(-\d+)?$/.test(k) || k === "custom" || k === "text") return "custom-text";
  if (k === "location" || k === "map") return "location-map";
  if (k === "rates" || k === "calendar") return "rates-calendar";
  return (SECTION_KEYS as readonly string[]).includes(k) ? (k as SectionKey) : null;
}

/** The template's own sections, in its order, for a hotel with no theme (or a new template). */
export function defaultSections(templateId: TemplateId): ThemeSection[] {
  return TEMPLATES[templateId].sections.map((s, i) => ({ key: s.key, id: s.key, enabled: s.on, order: i, options: emptyOptions() }));
}

function sections(v: unknown, templateId: TemplateId): ThemeSection[] {
  const raw = arr(v).map(obj);
  if (!raw.length) return defaultSections(templateId);
  const seen = new Map<string, number>();
  const out: ThemeSection[] = [];
  raw.forEach((r, i) => {
    const key = sectionKey(r.key ?? r.type);
    if (!key) return;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (key === "custom-text" ? n > 3 : n > 1) return; // at most three custom blocks, one of anything else
    out.push({
      key,
      id: key === "custom-text" ? str(r.id) ?? `custom-text-${n}` : key,
      enabled: r.enabled !== false,
      order: num(r.order) ?? i,
      options: options(r.options, r.resolved),
    });
  });
  out.sort((a, b) => a.order - b.order);
  return withConcierge(out, templateId);
}

/**
 * M8: a theme published before the concierge existed has no section for it. It goes in where the
 * template puts it by default (after the section before it in the registry), switched on; it only
 * shows when the hotel has live services. A theme that lists the section keeps the hotel's choice.
 */
function withConcierge(list: ThemeSection[], templateId: TemplateId): ThemeSection[] {
  if (list.some((s) => s.key === "concierge")) return list;
  const reg = TEMPLATES[templateId].sections.map((s) => s.key);
  const at = reg.indexOf("concierge");
  if (at < 0) return list;
  const before = reg
    .slice(0, at)
    .reverse()
    .find((k) => list.some((s) => s.key === k));
  const firstBody = list.findIndex((s) => s.key !== "hero");
  const idx = before ? list.findIndex((s) => s.key === before) + 1 : firstBody < 0 ? list.length : firstBody;
  const out = [...list];
  out.splice(idx, 0, { key: "concierge", id: "concierge", enabled: true, order: 0, options: emptyOptions() });
  return out.map((s, i) => ({ ...s, order: i }));
}

function fontChoice(v: unknown): FontChoice | null {
  const o = obj(v);
  const family = str(o.family);
  if (!family) return null;
  const cat = str(o.category);
  const weights = arr(o.weights).filter((w): w is number => typeof w === "number");
  const italicWeights = Array.isArray(o.italicWeights) ? arr(o.italicWeights).filter((w): w is number => typeof w === "number") : undefined;
  return {
    family,
    category: cat === "serif" || cat === "sans" || cat === "display" ? cat : cat === "system" ? "sans" : "serif",
    weights: weights.length ? weights : [400, 500],
    italicWeights,
    googleFontsUrl: str(o.googleFontsUrl) ?? str(o.url) ?? "",
  };
}

function pairing(brand: Obj, raw: Obj, templateId: TemplateId): FontPairing {
  const p = obj(brand.fontPairing ?? raw.fontPairing ?? raw.font);
  const id = str(brand.fontPairingId) ?? str(raw.fontPairingId) ?? str(p.id);
  const known = pairingById(id);
  const heading = fontChoice(p.heading ?? p.headingFont);
  const body = fontChoice(p.body ?? p.bodyFont);
  const system = str(obj(p.heading).category) === "system" || id === "system-stack";
  if (system) return pairingById("system-stack")!;
  if (heading && body && safeFamily(heading) && safeFamily(body)) {
    const builtIn = known?.builtIn ?? (p.isHouseDefault === true ? "house" : undefined);
    return { id: id ?? `${heading.family}-${body.family}`, name: str(p.name) ?? `${heading.family} + ${body.family}`, heading, body, builtIn, googleFontsUrl: str(p.googleFontsUrl) };
  }
  return known ?? pairingById(TEMPLATE_FONTS[templateId]) ?? FONT_PAIRINGS[0];
}

function applied(v: unknown): AppliedColours | null {
  const o = obj(v);
  const primary = hex(o.primary);
  if (!primary) return null;
  return {
    primary,
    onPrimary: hex(o.onPrimary) ?? "#ffffff",
    primaryText: hex(o.primaryText) ?? primary,
    secondary: hex(o.secondary),
    secondaryText: hex(o.secondaryText) ?? hex(o.secondary),
  };
}

const KINDS: PickupKind[] = ["AIRPORT", "MOTOR_PARK", "TRAIN_STATION", "JETTY", "OTHER"];

export function pickupPoints(v: unknown): PickupPoint[] {
  return arr(v)
    .map(obj)
    .filter((p) => str(p.id) && str(p.name) && p.active !== false)
    .map((p) => {
      const kind = str(p.kind)?.toUpperCase() as PickupKind | undefined;
      const hours = obj(p.operatingHours);
      const open = str(hours.open) ?? str(hours.from);
      const close = str(hours.close) ?? str(hours.to);
      return {
        id: str(p.id)!,
        name: str(p.name)!,
        shortName: str(p.shortName),
        kind: kind && KINDS.includes(kind) ? kind : "OTHER",
        city: str(p.city) ?? "",
        address: str(p.address),
        priceKobo: num(p.priceKobo) ?? 0,
        dropOffPriceKobo: num(p.dropOffPriceKobo),
        vehicleOptions: arr(p.vehicleOptions)
          .map(obj)
          .filter((o) => str(o.name))
          .map((o, i) => ({ id: str(o.id) ?? str(o.name) ?? String(i), name: str(o.name)!, maxPassengers: num(o.maxPassengers) ?? 4, priceKobo: num(o.priceKobo) })),
        leadTimeHours: num(p.leadTimeHours) ?? 0,
        operatingHours: open && close ? { open, close } : null,
        notes: str(p.notes) ?? str(p.guestNotes) ?? str(p.notesForGuest),
      };
    });
}

function faq(v: unknown): FaqItem[] {
  return arr(v)
    .map(obj)
    .map((f) => ({ q: str(f.q) ?? str(f.question) ?? "", a: str(f.a) ?? str(f.answer) ?? "" }))
    .filter((f) => f.q && f.a)
    .slice(0, 30);
}

const MODES: ColourMode[] = ["LIGHT", "DARK", "SYSTEM"];

/**
 * A theme from the API (hotel detail's `theme`, the preview endpoint, or a group's), or the
 * template's defaults when there is none. `fallbackTemplate` is used only when the payload names none.
 */
export function normaliseTheme(
  input: unknown,
  ctx: { accentColor?: string | null; logoUrl?: string | null; fallbackTemplate?: TemplateId; draft?: boolean } = {},
): SiteTheme {
  const raw = obj(input);
  const hasTheme = Object.keys(raw).length > 0;
  const tpl = obj(raw.template);
  const idCandidate = str(raw.templateId) ?? str(tpl.id) ?? str(raw.template);
  const templateId: TemplateId = isTemplateId(idCandidate?.toLowerCase()) ? (idCandidate!.toLowerCase() as TemplateId) : (ctx.fallbackTemplate ?? "editorial");
  const brand = obj(raw.brand);
  const colours = obj(raw.colours ?? raw.colors ?? brand.colours);
  const chosen = obj(colours.chosen);
  // PublicTheme.colours is AppliedColours ({ chosen, light, dark, ... }); staff ThemeContent calls it `applied`.
  const appliedRaw = obj(colours.light ? colours : (colours.applied ?? brand.applied ?? raw.applied));
  const light = applied(appliedRaw.light);
  const dark = applied(appliedRaw.dark);
  const mode = str(raw.colourMode ?? raw.colorMode)?.toUpperCase() as ColourMode | undefined;
  const merged = sections(raw.sections, templateId);
  const gettingHere = merged.find((s) => s.key === "getting-here");
  // Custom FAQ may live on the theme or inside the faq section's options.
  const faqSection = merged.find((s) => s.key === "faq");
  return {
    templateId,
    colourMode: mode && MODES.includes(mode) ? mode : "SYSTEM",
    logoUrl: url(brand.logoUrl) ?? url(raw.logoUrl) ?? url(obj(brand.logo).url) ?? ctx.logoUrl ?? null,
    faviconUrl: url(brand.faviconUrl) ?? url(raw.faviconUrl) ?? url(obj(brand.favicon).url),
    colours: {
      primary: hex(brand.primary) ?? hex(chosen.primary) ?? hex(raw.primary) ?? hex(ctx.accentColor),
      secondary: hex(brand.secondary) ?? hex(chosen.secondary) ?? hex(raw.secondary),
      applied: light && dark ? { light, dark } : null,
    },
    font: pairing(brand, { ...raw, fontPairing: raw.fontPairing ?? obj(raw.theme).fontPairing }, templateId),
    sections: merged,
    faq: faq(raw.faq ?? faqSection?.options.raw.items ?? faqSection?.options.raw.questions),
    pickupPoints: pickupPoints(raw.pickupPoints ?? obj(gettingHere?.options.raw.resolved).pickupPoints),
    draft: ctx.draft ?? (raw.preview === true || raw.draft === true),
    fallback: !hasTheme,
    publishedAt: str(raw.publishedAt),
  };
}

/** The enabled sections in order. Sections the template does not know are left out. */
export function visibleSections(theme: SiteTheme): ThemeSection[] {
  const supported = new Set(TEMPLATES[theme.templateId].sections.map((s) => s.key));
  return theme.sections.filter((s) => s.enabled && supported.has(s.key));
}

/** A section's options by key, or empty options when the theme does not configure it. */
export function sectionOptions(theme: SiteTheme, key: SectionKey): SectionOptions {
  return theme.sections.find((s) => s.key === key)?.options ?? emptyOptions();
}

const inkOn = (c: string) => (contrastOf(c, "#FFFFFF") >= contrastOf(c, "#1B1A17") ? "#FFFFFF" : "#1B1A17");

/** CSS custom properties for the site: colours (after the contrast guard) and fonts. */
export function themeStyle(theme: SiteTheme): { style: React.CSSProperties; fonts: string[] } {
  const style: Record<string, string> = {};
  const a = theme.colours.applied;
  if (a) {
    // Text and links take primaryText (4.5:1); buttons and other fills take primary with onPrimary on it.
    style["--brand"] = a.light.primaryText;
    style["--brand-ink"] = inkOn(a.light.primaryText);
    style["--brand-dark"] = a.dark.primaryText;
    style["--brand-dark-ink"] = inkOn(a.dark.primaryText);
    style["--brand-fill"] = a.light.primary;
    style["--brand-fill-ink"] = a.light.onPrimary;
    style["--brand-fill-dark"] = a.dark.primary;
    style["--brand-fill-dark-ink"] = a.dark.onPrimary;
    if (a.light.secondary && a.dark.secondary) {
      style["--brand-2"] = a.light.secondary;
      style["--brand-2-dark"] = a.dark.secondary;
    }
  } else {
    // The API did not send applied variants: work them out with the same guard it uses.
    const p = brandVars(theme.colours.primary, 4.5);
    if (p) {
      style["--brand"] = p.light;
      style["--brand-ink"] = p.lightInk;
      style["--brand-dark"] = p.dark;
      style["--brand-dark-ink"] = p.darkInk;
    }
    const s2 = brandVars(theme.colours.secondary, 3);
    if (s2) {
      style["--brand-2"] = s2.light;
      style["--brand-2-dark"] = s2.dark;
    }
  }
  const fonts: string[] = [];
  const f = theme.font;
  if (f.builtIn === "system") {
    const sys = 'system-ui, -apple-system, "Segoe UI", "Noto Sans", "Helvetica Neue", Arial, sans-serif';
    style["--font-fraunces"] = sys;
    style["--font-display"] = sys;
    style["--font-schibsted"] = sys;
    style["--font-sans"] = sys;
    style["--font-plex-mono"] = 'ui-monospace, "SFMono-Regular", "Roboto Mono", Menlo, Consolas, monospace';
  } else if (f.builtIn !== "house") {
    const headingFamily = safeFamily(f.heading);
    const bodyFamily = safeFamily(f.body);
    const fallback = (c: FontChoice["category"]) => (c === "sans" ? "ui-sans-serif, system-ui, sans-serif" : 'Georgia, "Times New Roman", serif');
    if (headingFamily) {
      const stack = `"${headingFamily}", ${f.heading.category === "sans" ? "var(--house-sans)" : "var(--house-display)"}, ${fallback(f.heading.category)}`;
      style["--font-fraunces"] = stack;
      style["--font-display"] = stack;
    }
    if (bodyFamily) {
      const stack = `"${bodyFamily}", var(--house-sans), ${fallback(f.body.category)}`;
      style["--font-schibsted"] = stack;
      style["--font-sans"] = stack;
    }
    const one = f.googleFontsUrl && /^https:\/\/fonts\.googleapis\.com\//.test(f.googleFontsUrl) ? f.googleFontsUrl : null;
    for (const href of one ? [one] : [headingFamily ? fontHref(f.heading, true) : null, bodyFamily ? fontHref(f.body, true) : null]) {
      if (href && !fonts.includes(href)) fonts.push(href);
    }
  }
  return { style: style as React.CSSProperties, fonts };
}
