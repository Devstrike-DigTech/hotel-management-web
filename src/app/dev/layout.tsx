import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Wrench } from "@phosphor-icons/react/ssr";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Wordmark } from "@/components/ui/wordmark";

export const metadata: Metadata = { title: "Developer tools", robots: { index: false, follow: false } };

/** Local-only tools. Every route under /dev is a 404 in production builds. */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-paper">
        <div className="container-page flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="-m-1 rounded-sm p-1">
              <Wordmark />
            </Link>
            <span className="kicker inline-flex items-center gap-1.5 rounded-xs border border-ochre/50 px-2 py-0.5 !text-ochre">
              <Wrench size={12} aria-hidden /> Development only
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
