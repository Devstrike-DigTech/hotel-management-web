import { ImageResponse } from "next/og";
import { APP_DOMAIN, APP_NAME } from "@/lib/env";
import { OG, OgAdire, OgFob, ogFonts } from "@/lib/og";

export const alt = `${APP_NAME}: good rooms, from Lekki to Calabar`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: OG.paper, padding: "56px 72px", fontFamily: "Schibsted", fontWeight: 500 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <OgFob size={40} />
            <span style={{ fontFamily: "Fraunces", fontSize: 34, color: OG.ink, letterSpacing: -1 }}>{APP_NAME}</span>
          </div>
          <span style={{ fontFamily: "Plex", fontSize: 16, color: OG.muted, letterSpacing: 3 }}>{APP_DOMAIN.toUpperCase()}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 70, fontFamily: "Fraunces", fontSize: 118, lineHeight: 0.98, color: OG.ink, letterSpacing: -4 }}>
          <span>Good rooms,</span>
          <span style={{ display: "flex", gap: 26 }}>
            from <span style={{ fontStyle: "italic", color: OG.laterite }}>Lekki</span>
          </span>
          <span style={{ display: "flex", gap: 26 }}>
            to <span style={{ fontStyle: "italic", color: OG.laterite }}>Calabar.</span>
          </span>
        </div>
        <div style={{ display: "flex", marginTop: "auto" }}>
          <OgAdire width={1056} />
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
