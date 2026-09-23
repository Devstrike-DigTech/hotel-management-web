import Link from "next/link";
import { ADMIN_URL, APP_NAME, SUPPORT_EMAIL } from "@/lib/env";
import { KeyFob } from "./ui/wordmark";

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Calabar", "Ibadan", "Enugu"];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-line bg-surface print:hidden">
      <div className="container-page">
        <span aria-hidden className="adire-rule -mt-[10px] text-line-strong" />
        <div className="grid gap-12 py-14 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="display-sm max-w-sm text-2xl text-ink">
              Rooms kept by the people who run them, <em className="accent">from Lekki to Calabar.</em>
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
              Every hotel here runs its front desk on {APP_NAME}, so the rooms you see are the rooms that are free.
            </p>
          </div>
          <FooterCol title="Stay in">
            {CITIES.map((c) => (
              <li key={c}>
                <Link className="link" href={`/stays?city=${encodeURIComponent(c)}`}>
                  {c}
                </Link>
              </li>
            ))}
          </FooterCol>
          <FooterCol title="For hotels">
            <li>
              <Link className="link" href="/for-hotels">
                Why {APP_NAME}
              </Link>
            </li>
            <li>
              <Link className="link" href="/for-hotels#revenue-guard">
                Revenue Guard
              </Link>
            </li>
            <li>
              <Link className="link" href="/pricing">
                Pricing
              </Link>
            </li>
            <li>
              <a className="link" href={`${ADMIN_URL}/login`}>
                Hotel sign in
              </a>
            </li>
          </FooterCol>
          <FooterCol title="Talk to us">
            <li>
              <a className="link" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </li>
            <li className="text-ink-muted">Lagos, Nigeria</li>
          </FooterCol>
        </div>
      </div>
      {/* The masthead, set big: the wordmark comes from configuration, never hard-coded. */}
      <div className="overflow-hidden border-t border-line">
        <div className="container-page flex items-end gap-[2vw] pt-6">
          <KeyFob className="mb-[1.6vw] h-[9vw] max-h-32 w-auto shrink-0 text-laterite" />
          <p
            aria-hidden
            className="display -mb-[0.2em] truncate text-[clamp(4rem,17vw,15rem)] leading-none text-ink"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 20', fontWeight: 500 }}
          >
            {APP_NAME}
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="num">&copy; {year}</span> Devstrike Digital Limited. {APP_NAME} is a Devstrike product.
          </p>
          <p className="num uppercase tracking-[0.14em]">Made in Lagos &middot; Prices in NGN</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="md:col-span-2 [&:last-child]:md:col-span-3">
      <h2 className="kicker mb-4 font-sans">{title}</h2>
      <ul className="space-y-2.5 text-[0.9375rem]">{children}</ul>
    </div>
  );
}
