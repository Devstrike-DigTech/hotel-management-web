import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import { ADMIN_URL, APP_NAME } from "@/lib/env";
import { formatFullDay, todayInLagos } from "@/lib/dates";
import { ThemeToggle } from "./ui/theme-toggle";
import { Wordmark } from "./ui/wordmark";
import { MobileMenu } from "./mobile-menu";
import { AccountLink } from "./account/account-link";

export const NAV = [
  { href: "/stays", label: "Stays" },
  { href: "/#cities", label: "Cities" },
  { href: "/for-hotels", label: "For hotels" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteHeader() {
  return (
    <>
      {/* Dateline: a masthead detail, like the top of a printed page. */}
      <div className="hidden border-b border-line md:block print:hidden">
        <div className="container-page flex h-8 items-center justify-between">
          <p className="kicker !text-[10px]">
            {formatFullDay(todayInLagos())} <span className="mx-2 text-line-strong">/</span> Lagos edition
          </p>
          <p className="kicker !text-[10px]">
            Independent hotels <span className="mx-2 text-line-strong">/</span> Six cities{" "}
            <span className="mx-2 text-line-strong">/</span> Prices in naira, VAT shown
          </p>
        </div>
      </div>
      <header className="sticky top-0 z-40 print:hidden border-b border-line bg-paper/92 backdrop-blur-[6px] supports-[backdrop-filter]:bg-paper/85">
        <div className="container-page flex h-16 items-center justify-between gap-6">
          <Link href="/" className="-m-1 rounded-sm p-1" aria-label={`${APP_NAME} home`}>
            <Wordmark />
          </Link>
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-8 text-[0.9375rem]">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="link py-1 text-ink/85 hover:text-ink">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <AccountLink className="max-sm:px-2.5 max-sm:[&>span:not(.sr-only)]:sr-only" />
            <Link href="/for-hotels" className="btn btn-outline ml-1 hidden !min-h-10 !px-4 sm:inline-flex">
              List your hotel <ArrowUpRight size={15} aria-hidden />
            </Link>
            <MobileMenu nav={NAV} adminUrl={ADMIN_URL} />
          </div>
        </div>
      </header>
    </>
  );
}
