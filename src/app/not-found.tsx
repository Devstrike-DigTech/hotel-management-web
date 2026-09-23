import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { Fob404 } from "@/components/marketing/illustrations";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Room not found" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="container-page outline-none">
        <div className="grid items-center gap-10 py-16 md:grid-cols-[1fr_16rem] md:py-24 lg:grid-cols-[1fr_20rem]">
          <div>
            <p className="kicker text-laterite">Error 404 / Front desk</p>
            <h1 className="display mt-6 text-[clamp(2.8rem,8vw,7rem)]">
              <span className="reveal-line">
                <span>We checked</span>
              </span>
              <span className="reveal-line">
                <span style={{ "--d": "120ms" } as React.CSSProperties}>
                  every <em className="accent">floor.</em>
                </span>
              </span>
            </h1>
            <p className="fade-up mt-8 max-w-lg text-[1.1rem] leading-relaxed text-ink-muted [--d:300ms]">
              Room 404 is not on the register. The link may be old, or the hotel may have changed its address. The
              porter suggests starting again from the lobby.
            </p>
            <div className="fade-up mt-9 flex flex-col gap-3 [--d:400ms] sm:flex-row">
              <Link href="/" className="btn btn-primary">
                Back to the lobby <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/stays" className="btn btn-outline">
                Browse every stay
              </Link>
            </div>
          </div>
          <div className="fade-up mx-auto w-40 origin-top [--d:200ms] md:w-full">
            <div className="animate-[swing_4s_ease-in-out_infinite] origin-[50%_6%] motion-reduce:animate-none">
              <Fob404 className="w-full text-ink" />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
