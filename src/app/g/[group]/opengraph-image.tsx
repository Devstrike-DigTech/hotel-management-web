import { ImageResponse } from "next/og";
import { api } from "@/lib/api";
import { APP_NAME } from "@/lib/env";
import { OG, OgAdire, OgFob, ogFonts } from "@/lib/og";

export const alt = "The hotel group's booking site";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** A group's social card: the group's name, then its hotels as a numbered register. */
export default async function Image({ params }: { params: Promise<{ group: string }> }) {
  const { group: slug } = await params;
  const [group, fonts] = await Promise.all([api.group(slug).catch(() => null), ogFonts()]);
  const accent = group?.branding.accentColor ?? OG.laterite;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: OG.paper, padding: "56px 64px", fontFamily: "Schibsted", fontWeight: 500 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "Plex", fontSize: 17, letterSpacing: 3, color: OG.muted }}>
          <div style={{ width: 10, height: 10, background: accent, transform: "rotate(45deg)" }} />
          {`${group?.properties.length ?? 0} HOTELS`}
        </div>
        <div style={{ display: "flex", marginTop: 36, fontFamily: "Fraunces", fontSize: 92, lineHeight: 1, letterSpacing: -3, color: OG.ink }}>{group?.name ?? APP_NAME}</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 36, gap: 14 }}>
          {(group?.properties ?? []).slice(0, 4).map((p, i) => (
            <div key={p.slug} style={{ display: "flex", alignItems: "baseline", gap: 18, fontSize: 30, color: OG.ink }}>
              <span style={{ fontFamily: "Fraunces", fontStyle: "italic", color: accent, width: 48 }}>{ROMAN[i]}.</span>
              <span>{p.name}</span>
              <span style={{ fontFamily: "Plex", fontSize: 18, letterSpacing: 2, color: OG.muted }}>{`${p.area} / ${p.city}`.toUpperCase()}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: "auto", justifyContent: "flex-end", alignItems: "center", gap: 10, fontSize: 20, color: OG.muted }}>
          <OgFob size={28} />
          <span>{`Powered by ${APP_NAME}`}</span>
        </div>
        <div style={{ position: "absolute", left: 64, bottom: 18, display: "flex" }}>
          <OgAdire width={1072} />
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
