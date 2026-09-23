"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="container-page py-24">
      <p className="kicker text-laterite">Something went wrong</p>
      <h1 className="display-md mt-5 max-w-3xl text-[clamp(2.4rem,6vw,4.8rem)]">
        The lights flickered. <em className="accent">Give it a moment.</em>
      </h1>
      <p className="mt-6 max-w-lg leading-relaxed text-ink-muted">
        We could not load this page. It is on our side, not yours.
        {error.digest ? (
          <>
            {" "}
            Reference <span className="num text-ink">{error.digest}</span>.
          </>
        ) : null}
      </p>
      <div className="mt-8 flex gap-3">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn btn-outline">
          Back to the lobby
        </Link>
      </div>
    </main>
  );
}
