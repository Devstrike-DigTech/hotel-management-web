"use client";

import Image, { type ImageLoaderProps } from "next/image";
import { useState } from "react";

/**
 * Unsplash (imgix) resizes at the edge, so we let it do the work instead of the
 * Next optimiser. Other hosts fall through to the default loader.
 */
function unsplashLoader({ src, width, quality }: ImageLoaderProps) {
  const url = new URL(src);
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality ?? 72));
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "crop");
  return url.toString();
}

const isUnsplash = (src: string) => /^https:\/\/(images|plus)\.unsplash\.com\//.test(src);

interface PlateProps {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  /** Text shown on the patterned fallback when the photo is missing or fails to load. */
  label?: string;
}

/**
 * A photograph mounted like a printed plate. While loading, or if the image cannot be
 * fetched, the frame shows a quiet adire field instead of a broken image.
 */
const TONES = ["var(--laterite)", "var(--palm)", "var(--adire)", "var(--brass)", "var(--ochre)"];

function toneFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

export function Plate({ src, alt, sizes, priority, className = "", imgClassName = "", label }: PlateProps) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const showImage = !!src && state !== "error";

  return (
    <div
      className={`${/\b(absolute|fixed)\b/.test(className) ? "" : "relative "}overflow-hidden ${className}`}
      {...(!showImage ? { role: "img", "aria-label": alt } : {})}
      style={{ "--tone": toneFor(label ?? alt), backgroundColor: "color-mix(in oklab, var(--tone) 13%, var(--surface-2))" } as React.CSSProperties}
    >
      <div aria-hidden className="adire-field absolute inset-0 text-[color:var(--tone)] opacity-[0.22]" />
      {state !== "loaded" && (label || !src || state === "error") ? (
        <div aria-hidden className="absolute inset-x-0 bottom-0 flex items-end p-3">
          <span className="kicker truncate rounded-xs bg-paper/85 px-1.5 py-0.5 !text-[10px] !text-ink">{label ?? alt}</span>
        </div>
      ) : null}
      {showImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          loader={isUnsplash(src) ? unsplashLoader : undefined}
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          className={`object-cover transition-[opacity,transform] duration-700 ease-out ${
            state === "loaded" ? "opacity-100" : "opacity-0"
          } ${imgClassName}`}
        />
      ) : null}
    </div>
  );
}
