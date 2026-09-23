import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Phone } from "@phosphor-icons/react/ssr";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { KeyFob } from "@/components/ui/wordmark";
import { brandStyle } from "@/lib/brand";
import { APP_NAME, SITE_URL } from "@/lib/env";
import { formatPhone, toE164Digits } from "@/lib/format";
import { getHotel, siteBase, siteOrigin } from "@/lib/site";

export async function generateMetadata({ params }: LayoutProps<"/h/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const hotel = await getHotel(slug).catch(() => null);
  if (!hotel) return { title: "Hotel not found" };
  const origin = await siteOrigin(slug);
  return {
    metadataBase: new URL(origin.replace(/\/h\/[^/]+$/, "") || SITE_URL),
    title: { default: `${hotel.name}, ${hotel.area}`, template: `%s — ${hotel.name}` },
    description: `${hotel.tagline}. Book direct with ${hotel.name} in ${hotel.area}, ${hotel.city}.`,
    applicationName: hotel.name,
    openGraph: { siteName: hotel.name, title: hotel.name, description: hotel.tagline, type: "website", locale: "en_NG" },
  };
}

function Monogram({ name }: { name: string }) {
  const letters = name
    .replace(/^the\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-laterite text-laterite">
      <span className="font-display text-[15px] italic" style={{ fontVariationSettings: '"opsz" 36, "SOFT" 100, "WONK" 1' }}>
        {letters}
      </span>
    </span>
  );
}

export default async function MicrositeLayout({ children, params }: LayoutProps<"/h/[slug]">) {
  const { slug } = await params;
  const hotel = await getHotel(slug);
  if (!hotel) notFound();
  const base = await siteBase(slug);
  const home = base || "/";
  const anchor = (id: string) => (base ? `${base}#${id}` : `/#${id}`);
  const phone = hotel.phone ? toE164Digits(hotel.phone) : null;

  return (
    <div className="brand-scope flex min-h-dvh flex-col" style={brandStyle(hotel.branding.accentColor)}>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-[6px]">
        <div className="container-page flex h-[4.5rem] items-center justify-between gap-4">
          <Link href={home} className="-m-1 flex min-w-0 items-center gap-3 rounded-sm p-1">
            {hotel.branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- hotel logos live on arbitrary hosts
              <img src={hotel.branding.logoUrl} alt="" className="h-10 w-auto max-w-[8rem] object-contain" />
            ) : (
              <Monogram name={hotel.name} />
            )}
            <span className="min-w-0">
              <span className="display-sm block truncate text-lg leading-tight">{hotel.name}</span>
              <span className="kicker block truncate !text-[10px]">
                {hotel.area}, {hotel.city}
              </span>
            </span>
          </Link>
          <nav aria-label="Hotel" className="hidden md:block">
            <ul className="flex items-center gap-7 text-[0.9375rem]">
              <li>
                <Link href={anchor("about")} className="link text-ink/85 hover:text-ink">
                  The house
                </Link>
              </li>
              <li>
                <Link href={anchor("rooms")} className="link text-ink/85 hover:text-ink">
                  Rooms
                </Link>
              </li>
              <li>
                <Link href={anchor("location")} className="link text-ink/85 hover:text-ink">
                  Finding us
                </Link>
              </li>
            </ul>
          </nav>
          <div className="flex items-center gap-1">
            {phone ? (
              <a href={`tel:+${phone}`} className="hidden items-center gap-2 px-3 text-sm text-ink-muted hover:text-ink lg:flex">
                <Phone size={16} aria-hidden /> <span className="num">{formatPhone(hotel.phone!)}</span>
              </a>
            ) : null}
            <ThemeToggle />
            <Link href={`${base}/book`} className="btn btn-primary ml-1 !min-h-10 !px-4 text-sm">
              Book a room
            </Link>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>

      <footer className="mt-24 border-t border-line bg-surface">
        <div className="container-page">
          <span aria-hidden className="adire-rule -mt-[10px] text-line-strong" />
          <div className="grid gap-10 py-12 md:grid-cols-3">
            <div>
              <p className="display-sm text-2xl">{hotel.name}</p>
              <p className="mt-2 font-display italic text-ink-muted">{hotel.tagline}</p>
            </div>
            <address className="text-[0.9375rem] not-italic leading-relaxed text-ink-muted">
              {hotel.address || `${hotel.area}, ${hotel.city}`}
              <br />
              {hotel.city}, {hotel.state}
            </address>
            <ul className="space-y-1.5 text-[0.9375rem]">
              {hotel.phone ? (
                <li>
                  <a className="link num" href={`tel:+${phone}`}>
                    {formatPhone(hotel.phone)}
                  </a>
                </li>
              ) : null}
              {hotel.email ? (
                <li>
                  <a className="link" href={`mailto:${hotel.email}`}>
                    {hotel.email}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
        <div className="border-t border-line">
          <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              <span className="num">&copy; {new Date().getFullYear()}</span> {hotel.name}
            </p>
            <a href={SITE_URL} className="group inline-flex items-center gap-2 hover:text-ink">
              <KeyFob className="h-4 w-auto text-ink-muted group-hover:text-laterite" />
              Powered by <span className="font-medium text-ink">{APP_NAME}</span>
              <ArrowUpRight size={12} aria-hidden />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
