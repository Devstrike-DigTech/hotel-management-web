"use client";

import { useEffect, useRef, useState } from "react";
import { Monogram } from "../ui/monogram";

/** A hotel's logo; if it cannot be loaded, its italic monogram rather than an empty space. */
export function SiteLogo({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // An image that failed before hydration fired its error event before React was listening.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, [src]);
  if (!src || failed) return <Monogram name={name} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- hotel logos live on arbitrary hosts
    <img ref={img} src={src} alt="" className="h-10 w-auto max-w-[8rem] object-contain" data-testid="site-logo" onError={() => setFailed(true)} />
  );
}
