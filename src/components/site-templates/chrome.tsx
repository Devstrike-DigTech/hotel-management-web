import Link from "next/link";
import { Phone } from "@phosphor-icons/react/ssr";
import { FooterLinks, PoweredBy } from "@/components/site/brand-kit";
import { SiteLogo } from "@/components/site/site-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { formatClock, formatPhone, toE164Digits } from "@/lib/format";
import type { TemplateId } from "@/lib/theme/types";
import type { PublicWhiteLabel } from "@/lib/types";
import { Crest, Ornament } from "./ornaments";
import { LiteThemeToggle } from "./lite";

export interface ChromeProps {
  template: TemplateId;
  name: string;
  tagline: string;
  area: string;
  city: string;
  state: string;
  address: string;
  phone: string | null;
  email: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  logo: string | null;
  base: string;
  home: string;
  group: { name: string; propertyCount: number; href: string } | null;
  wl: PublicWhiteLabel | null;
  hidePlatform: boolean;
  brandName: string;
  /** Anchors that exist on the home page for this template's sections. */
  nav: { label: string; id: string }[];
  /** The header's call to action, when it is not the booking page (a group root: "Choose a hotel"). */
  book?: { href: string; label: string };
}

const anchor = (p: ChromeProps, id: string) => (p.base ? `${p.base}#${id}` : `/#${id}`);

function Logo({ p, className }: { p: ChromeProps; className?: string }) {
  if (p.template === "essentials") {
    // A plain image (or nothing): the client-side fallback in SiteLogo needs JavaScript.
    return p.logo ? (
      // eslint-disable-next-line @next/next/no-img-element -- hotel logos live on arbitrary hosts
      <img src={p.logo} alt="" width={40} height={40} className={`h-9 w-auto max-w-[6rem] object-contain ${className ?? ""}`} data-testid="site-logo" />
    ) : null;
  }
  return <SiteLogo src={p.logo} name={p.name} />;
}

export function SiteHeader(p: ChromeProps) {
  const tel = p.phone ? `tel:+${toE164Digits(p.phone)}` : null;
  const book = p.book?.href ?? `${p.base}/book`;
  const groupLink = p.group ? (
    <li>
      <a href={p.group.href} className="link text-ink/85 hover:text-ink" data-testid="group-link">
        Our {p.group.propertyCount} hotels
      </a>
    </li>
  ) : null;

  switch (p.template) {
    case "boutique":
      return (
        <header className="site-header boutique-header z-40">
          <div className="container-page grid h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
            <nav aria-label="Hotel" className="hidden md:block">
              <ul className="flex items-center gap-7 text-[0.8125rem] uppercase tracking-[0.18em]">
                {p.nav.slice(0, 3).map((n) => (
                  <li key={n.id}>
                    <Link href={anchor(p, n.id)} className="link">
                      {n.label}
                    </Link>
                  </li>
                ))}
                {groupLink}
              </ul>
            </nav>
            <Link href={p.home} className="col-start-1 flex min-w-0 items-center gap-3 justify-self-start md:col-start-2 md:justify-self-center" aria-label={`${p.name}, home`}>
              {p.logo ? <SiteLogo src={p.logo} name={p.name} /> : null}
              <span className="display truncate text-[1.3rem] tracking-[0.02em] sm:text-[1.9rem]">{p.name}</span>
            </Link>
            <div className="flex items-center justify-end gap-1 md:col-start-3">
              <ThemeToggle className="!text-current max-sm:hidden" />
              <Link href={book} className="boutique-reserve ml-1 inline-flex h-10 items-center border border-current px-4 text-[0.75rem] uppercase tracking-[0.2em]">
                {p.book?.label ?? "Reserve"}
              </Link>
            </div>
          </div>
        </header>
      );
    case "business":
      return (
        <header className="site-header sticky top-0 z-40 border-b border-ink bg-paper">
          <div className="hidden border-b border-line bg-surface text-[12.5px] text-ink-muted sm:block">
            <div className="container-page flex h-8 items-center justify-between gap-4">
              <p className="truncate">
                {p.area}, {p.city} &middot; Check in {formatClock(p.checkInTime)} &middot; Check out {formatClock(p.checkOutTime)}
              </p>
              <div className="flex items-center gap-5">
                {tel ? (
                  <a href={tel} className="num hover:text-ink">
                    {formatPhone(p.phone!)}
                  </a>
                ) : null}
                {p.email ? (
                  <a href={`mailto:${p.email}?subject=${encodeURIComponent("Corporate rates")}`} className="hover:text-ink">
                    Corporate rates
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <div className="container-page flex h-14 items-center justify-between gap-4">
            <Link href={p.home} className="flex min-w-0 items-center gap-3">
              <Logo p={p} />
              <span className="truncate font-display text-lg font-medium tracking-[-0.01em]">{p.name}</span>
            </Link>
            <nav aria-label="Hotel" className="hidden md:block">
              <ul className="flex items-center gap-6 text-sm">
                {p.nav.map((n) => (
                  <li key={n.id}>
                    <Link href={anchor(p, n.id)} className="text-ink-muted hover:text-ink">
                      {n.label}
                    </Link>
                  </li>
                ))}
                {groupLink}
              </ul>
            </nav>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Link href={book} className="btn btn-primary ml-1 !min-h-9 !rounded-none !px-4 text-sm">
                {p.book?.label ?? "Book now"}
              </Link>
            </div>
          </div>
        </header>
      );
    case "resort":
      return (
        <header className="site-header sticky top-0 z-40 px-3 pt-3">
          <div className="container-page !px-0">
            <div className="resort-header flex h-16 items-center justify-between gap-4 rounded-full border border-line bg-paper/90 pl-3 pr-2 backdrop-blur-[8px]">
              <Link href={p.home} className="flex min-w-0 items-center gap-3 pl-1">
                <SiteLogo src={p.logo} name={p.name} />
                <span className="min-w-0">
                  <span className="display-sm block truncate text-lg leading-tight">{p.name}</span>
                  <span className="block truncate text-[11px] text-ink-muted">
                    {p.area}, {p.city}
                  </span>
                </span>
              </Link>
              <nav aria-label="Hotel" className="hidden lg:block">
                <ul className="flex items-center gap-1 text-[0.9375rem]">
                  {p.nav.map((n) => (
                    <li key={n.id}>
                      <Link href={anchor(p, n.id)} className="rounded-full px-3.5 py-2 text-ink/80 transition-colors hover:bg-surface-2 hover:text-ink">
                        {n.label}
                      </Link>
                    </li>
                  ))}
                  {p.group ? (
                    <li>
                      <a href={p.group.href} className="rounded-full px-3.5 py-2 text-ink/80 hover:bg-surface-2" data-testid="group-link">
                        Our {p.group.propertyCount} hotels
                      </a>
                    </li>
                  ) : null}
                </ul>
              </nav>
              <div className="flex items-center gap-1">
                <ThemeToggle className="!rounded-full max-sm:hidden" />
                <Link href={book} className="btn btn-primary !min-h-11 !rounded-full !px-5 text-sm">
                  {p.book?.label ?? "Book your stay"}
                </Link>
              </div>
            </div>
          </div>
        </header>
      );
    case "heritage":
      return (
        <header className="site-header heritage-header relative z-40 border-b border-line bg-paper">
          <div className="container-page flex flex-col items-center pb-3 pt-5">
            <div className="flex w-full items-center justify-between gap-4">
              <p className="hidden w-40 text-[12px] uppercase tracking-[0.2em] text-ink-muted sm:block">
                {p.city}
              </p>
              <Link href={p.home} className="flex min-w-0 flex-col items-center gap-2 text-center" aria-label={`${p.name}, home`}>
                {p.logo ? <SiteLogo src={p.logo} name={p.name} /> : <Crest name={p.name} place={p.city} className="size-14" />}
                <span className="heritage-name block max-w-[80vw] truncate text-[1.05rem] sm:text-[1.25rem]">{p.name}</span>
              </Link>
              <div className="flex w-40 items-center justify-end gap-1">
                <ThemeToggle />
              </div>
            </div>
            <div className="mt-3 flex w-full items-center gap-4">
              <Ornament className="hidden flex-1 text-brass sm:block" />
              <nav aria-label="Hotel">
                <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[12px] uppercase tracking-[0.22em]">
                  {p.nav.slice(0, 4).map((n) => (
                    <li key={n.id} className="hidden md:block">
                      <Link href={anchor(p, n.id)} className="link">
                        {n.label}
                      </Link>
                    </li>
                  ))}
                  {groupLink}
                  <li>
                    <Link href={book} className="heritage-book inline-flex h-9 items-center border border-laterite px-4 text-laterite transition-colors hover:bg-laterite hover:text-laterite-ink">
                      {p.book?.label ?? "Reservations"}
                    </Link>
                  </li>
                </ul>
              </nav>
              <Ornament className="hidden flex-1 text-brass sm:block" flip />
            </div>
          </div>
        </header>
      );
    case "essentials":
      return (
        <header className="site-header border-b border-line bg-paper">
          <div className="lite-page flex items-center justify-between gap-3 py-3">
            <a href={p.home} className="flex min-w-0 items-center gap-2.5">
              <Logo p={p} />
              <span className="min-w-0">
                <span className="block truncate text-[1.0625rem] font-semibold leading-tight">{p.name}</span>
                <span className="block truncate text-[12.5px] text-ink-muted">
                  {p.area}, {p.city}
                </span>
              </span>
            </a>
            <div className="flex shrink-0 items-center gap-1.5">
              <LiteThemeToggle />
              {tel ? (
                <a href={tel} className="lite-btn lite-btn-outline" aria-label={`Call ${p.name}`}>
                  <Phone size={16} aria-hidden /> <span className="max-sm:sr-only">Call</span>
                </a>
              ) : null}
              <a href={book} className="lite-btn lite-btn-primary">
                {p.book?.label ?? "Book"}
              </a>
            </div>
          </div>
        </header>
      );
    default:
      return (
        <header className="site-header sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-[6px]">
          <div className="container-page flex h-[4.5rem] items-center justify-between gap-4">
            <Link href={p.home} className="-m-1 flex min-w-0 items-center gap-3 rounded-sm p-1">
              <SiteLogo src={p.logo} name={p.name} />
              <span className="min-w-0">
                <span className="display-sm block truncate text-lg leading-tight">{p.name}</span>
                <span className="kicker block truncate !text-[10px]">
                  {p.area}, {p.city}
                </span>
              </span>
            </Link>
            <nav aria-label="Hotel" className="hidden md:block">
              <ul className="flex items-center gap-7 text-[0.9375rem]">
                {p.nav.map((n) => (
                  <li key={n.id}>
                    <Link href={anchor(p, n.id)} className="link text-ink/85 hover:text-ink">
                      {n.label}
                    </Link>
                  </li>
                ))}
                {groupLink}
              </ul>
            </nav>
            <div className="flex items-center gap-1">
              {tel ? (
                <a href={tel} className="hidden items-center gap-2 px-3 text-sm text-ink-muted hover:text-ink lg:flex">
                  <Phone size={16} aria-hidden /> <span className="num">{formatPhone(p.phone!)}</span>
                </a>
              ) : null}
              <ThemeToggle />
              <Link href={book} className="btn btn-primary ml-1 !min-h-10 !px-4 text-sm">
                {p.book?.label ?? "Book a room"}
              </Link>
            </div>
          </div>
        </header>
      );
  }
}

function Credits({ p, className = "" }: { p: ChromeProps; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <p>
        <span className="num">&copy; {new Date().getFullYear()}</span> {p.brandName}
      </p>
      {p.wl ? <FooterLinks wl={p.wl} /> : null}
      {p.hidePlatform ? null : <PoweredBy />}
    </div>
  );
}

function FooterContacts({ p }: { p: ChromeProps }) {
  const tel = p.phone ? `+${toE164Digits(p.phone)}` : null;
  return (
    <ul className="space-y-1.5 text-[0.9375rem]">
      {tel ? (
        <li>
          <a className="link num" href={`tel:${tel}`}>
            {formatPhone(p.phone!)}
          </a>
        </li>
      ) : null}
      {p.email ? (
        <li>
          <a className="link" href={`mailto:${p.email}`}>
            {p.email}
          </a>
        </li>
      ) : null}
    </ul>
  );
}

function GroupLine({ p }: { p: ChromeProps }) {
  if (!p.group) return null;
  return (
    <p className="mt-4 text-[0.9375rem] text-ink-muted">
      One of {p.group.propertyCount} hotels of {p.group.name}.{" "}
      <a href={p.group.href} className="link-static text-ink">
        See them all
      </a>
    </p>
  );
}

export function SiteFooter(p: ChromeProps) {
  const address = (
    <address className="text-[0.9375rem] not-italic leading-relaxed text-ink-muted">
      {p.address || `${p.area}, ${p.city}`}
      <br />
      {p.city}, {p.state}
    </address>
  );
  switch (p.template) {
    case "boutique":
      return (
        <footer className="mt-32 border-t border-line">
          <div className="container-page flex flex-col items-center py-20 text-center">
            <p className="display text-[clamp(2.4rem,6vw,4.5rem)]">{p.name}</p>
            <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">
              {p.address || `${p.area}, ${p.city}`}, {p.city}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 text-[0.8125rem] uppercase tracking-[0.18em]">
              {p.phone ? (
                <a className="link num" href={`tel:+${toE164Digits(p.phone)}`}>
                  {formatPhone(p.phone)}
                </a>
              ) : null}
              {p.email ? (
                <a className="link" href={`mailto:${p.email}`}>
                  Write to us
                </a>
              ) : null}
              {p.group ? (
                <a className="link" href={p.group.href}>
                  Our {p.group.propertyCount} hotels
                </a>
              ) : null}
            </div>
          </div>
          <div className="border-t border-line">
            <Credits p={p} className="container-page py-5" />
          </div>
        </footer>
      );
    case "business":
      return (
        <footer className="mt-20 border-t border-ink bg-surface">
          <div className="container-page grid gap-8 py-10 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-display text-lg font-medium">{p.name}</p>
              <p className="mt-1 text-ink-muted">{p.tagline}</p>
              <GroupLine p={p} />
            </div>
            <div>
              <p className="kicker mb-2">Address</p>
              {address}
            </div>
            <div>
              <p className="kicker mb-2">Front desk</p>
              <FooterContacts p={p} />
            </div>
            <div>
              <p className="kicker mb-2">Hours</p>
              <p className="num text-ink-muted">
                Check in {formatClock(p.checkInTime)}
                <br />
                Check out {formatClock(p.checkOutTime)}
              </p>
            </div>
          </div>
          <div className="border-t border-line">
            <Credits p={p} className="container-page py-4" />
          </div>
        </footer>
      );
    case "resort":
      return (
        <footer className="mt-24 px-3 pb-3">
          <div className="resort-footer container-page rounded-[28px] bg-surface-2 !px-6 py-12 sm:!px-12">
            <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
              <div>
                <p className="display-md text-[2.4rem]">{p.name}</p>
                <p className="mt-2 text-lg text-ink-muted">{p.tagline}</p>
                <GroupLine p={p} />
              </div>
              {address}
              <FooterContacts p={p} />
            </div>
            <Credits p={p} className="mt-12 border-t border-line pt-5" />
          </div>
        </footer>
      );
    case "heritage":
      return (
        <footer className="mt-28 border-t border-line bg-surface">
          <div className="container-page flex flex-col items-center py-14 text-center">
            {p.logo ? null : <Crest name={p.name} place={p.city} className="size-20" />}
            <p className="heritage-name mt-5 text-xl">{p.name}</p>
            <Ornament className="mt-5 w-56 text-brass" />
            <div className="mt-5 grid gap-6 sm:grid-cols-2 sm:gap-16 sm:text-left">
              {address}
              <FooterContacts p={p} />
            </div>
            <GroupLine p={p} />
          </div>
          <div className="border-t border-line">
            <Credits p={p} className="container-page py-5" />
          </div>
        </footer>
      );
    case "essentials":
      return (
        <footer className="mt-12 border-t border-line">
          <div className="lite-page space-y-3 py-8 text-[0.9375rem]">
            <p className="font-semibold">{p.name}</p>
            {address}
            <FooterContacts p={p} />
            {p.group ? (
              <p className="text-ink-muted">
                One of {p.group.propertyCount} hotels of {p.group.name}. <a className="link-static text-ink" href={p.group.href}>See them all</a>
              </p>
            ) : null}
            <Credits p={p} className="border-t border-line pt-4" />
          </div>
        </footer>
      );
    default:
      return (
        <footer className="mt-24 border-t border-line bg-surface">
          <div className="container-page">
            <span aria-hidden className="adire-rule -mt-[10px] text-line-strong" />
            <div className="grid gap-10 py-12 md:grid-cols-3">
              <div>
                <p className="display-sm text-2xl">{p.name}</p>
                <p className="mt-2 font-display italic text-ink-muted">{p.tagline}</p>
                <GroupLine p={p} />
              </div>
              {address}
              <FooterContacts p={p} />
            </div>
          </div>
          <div className="border-t border-line">
            <Credits p={p} className="container-page py-5" />
          </div>
        </footer>
      );
  }
}
