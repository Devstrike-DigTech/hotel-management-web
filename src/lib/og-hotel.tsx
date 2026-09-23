import { ImageResponse } from "next/og";
import { api } from "./api";
import { APP_NAME } from "./env";
import { formatNaira, placeName } from "./format";
import { OG, OgAdire, OgFob, ogFonts } from "./og";

export const ogSize = { width: 1200, height: 630 };

/** Fetches the cover as a data URL, or null if it cannot be reached quickly. */
async function coverData(url: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("unsplash.com")) {
      u.searchParams.set("w", "900");
      u.searchParams.set("q", "70");
      u.searchParams.set("fm", "jpg");
    }
    const res = await fetch(u, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!/image\/(jpe?g|png)/.test(type)) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

/** Social card for a hotel, in the brand's type: name, place, tagline and from-price. */
export async function hotelOgImage(slug: string, opts: { poweredBy?: boolean } = {}) {
  const hotel = await api.hotel(slug).catch(() => null);
  const fonts = await ogFonts();
  if (!hotel) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: OG.paper, fontFamily: "Fraunces", fontSize: 80, color: OG.ink }}>
        {APP_NAME}
      </div>,
      { ...ogSize, fonts },
    );
  }
  const cover = await coverData(hotel.coverImageUrl);
  const accent = hotel.branding.accentColor && opts.poweredBy ? hotel.branding.accentColor : OG.laterite;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: OG.paper, fontFamily: "Schibsted", fontWeight: 500 }}>
        <div style={{ display: "flex", flexDirection: "column", width: cover ? 700 : 1200, padding: "56px 64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "Plex", fontSize: 17, letterSpacing: 3, color: OG.muted }}>
            <div style={{ width: 10, height: 10, background: accent, transform: "rotate(45deg)" }} />
            {`${hotel.area} / ${placeName(hotel.city, hotel.state)}`.toUpperCase()}
          </div>
          <div style={{ display: "flex", marginTop: 40, fontFamily: "Fraunces", fontSize: hotel.name.length > 22 ? 76 : 92, lineHeight: 1, letterSpacing: -3, color: OG.ink }}>
            {hotel.name}
          </div>
          <div style={{ display: "flex", marginTop: 24, fontFamily: "Fraunces", fontStyle: "italic", fontSize: 34, lineHeight: 1.2, color: accent }}>
            {hotel.tagline}
          </div>
          <div style={{ display: "flex", marginTop: "auto", alignItems: "flex-end", justifyContent: "space-between" }}>
            {hotel.startingRateKobo ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontFamily: "Plex", fontSize: 15, letterSpacing: 3, color: OG.muted }}>FROM, PER NIGHT</span>
                <span style={{ fontFamily: "Plex", fontSize: 46, color: OG.ink, marginTop: 6 }}>{formatNaira(hotel.startingRateKobo)}</span>
              </div>
            ) : (
              <div />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 20, color: OG.muted }}>
              <OgFob size={28} />
              <span>{opts.poweredBy ? `Powered by ${APP_NAME}` : APP_NAME}</span>
            </div>
          </div>
        </div>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>
          <img src={cover} alt="" width={500} height={630} style={{ objectFit: "cover" }} />
        ) : null}
        <div style={{ position: "absolute", left: 64, bottom: 18, display: "flex" }}>
          <OgAdire width={cover ? 572 : 1072} />
        </div>
      </div>
    ),
    { ...ogSize, fonts },
  );
}
