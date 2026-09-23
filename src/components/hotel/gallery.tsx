"use client";

import { ArrowLeft, ArrowRight, ArrowsOutSimple, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageRef } from "@/lib/types";
import { Plate } from "../ui/plate";

/**
 * Asymmetric editorial grid: one tall lead plate and a column of smaller ones.
 * Every plate opens a fullscreen lightbox with keyboard navigation.
 */
export function Gallery({ images, name }: { images: ImageRef[]; name: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const shown = images.slice(0, 5);
  if (!images.length) return null;

  const cell = (img: ImageRef, i: number, className: string, sizes: string) => (
    <button
      key={`${img.url}-${i}`}
      type="button"
      onClick={() => setIndex(i)}
      className={`group relative block overflow-hidden rounded-sm focus-visible:outline-offset-4 ${className}`}
      aria-label={`Open photo ${i + 1} of ${images.length}: ${img.alt}`}
    >
      <Plate src={img.url} alt={img.alt} label={img.alt} sizes={sizes} priority={i === 0} className="absolute inset-0" imgClassName="group-hover:scale-[1.02]" />
      <span aria-hidden className="kicker absolute left-3 top-3 rounded-xs bg-paper/90 px-1.5 py-0.5 !text-[10px] !text-ink opacity-0 transition-opacity group-hover:opacity-100">
        {String(i + 1).padStart(2, "0")}
      </span>
    </button>
  );

  return (
    <>
      <div className="grid h-[min(72vh,40rem)] min-h-[20rem] grid-cols-6 grid-rows-6 gap-2 sm:gap-3">
        {cell(shown[0], 0, shown.length > 1 ? "col-span-6 row-span-4 md:col-span-4 md:row-span-6" : "col-span-6 row-span-6", "(min-width: 768px) 60vw, 100vw")}
        {shown[1] ? cell(shown[1], 1, `col-span-3 row-span-2 ${shown.length > 2 ? "md:col-span-2 md:row-span-3" : "md:col-span-2 md:row-span-6"}`, "(min-width: 768px) 30vw, 50vw") : null}
        {shown[2] ? cell(shown[2], 2, "col-span-3 row-span-2 md:col-span-1 md:row-span-3", "(min-width: 768px) 15vw, 50vw") : null}
        {shown[3] ? cell(shown[3], 3, "hidden md:col-span-1 md:row-span-3 md:block", "15vw") : null}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="kicker">
          <span className="text-ink">{String(images.length).padStart(2, "0")}</span> photographs
        </p>
        <button type="button" className="link-static inline-flex items-center gap-2 text-sm" onClick={() => setIndex(0)}>
          <ArrowsOutSimple size={15} aria-hidden /> View all
        </button>
      </div>
      {index !== null ? <Lightbox images={images} index={index} onIndex={setIndex} onClose={() => setIndex(null)} name={name} /> : null}
    </>
  );
}

function Lightbox({
  images,
  index,
  onIndex,
  onClose,
  name,
}: {
  images: ImageRef[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  name: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const n = images.length;
  const go = useCallback((d: number) => onIndex((index + d + n) % n), [index, n, onIndex]);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Swipe on touch screens.
  const touch = useRef<number | null>(null);
  const img = images[index];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={`Photographs of ${name}`}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-[#0e0d0b] p-0 text-[#efe8dc] backdrop:bg-black/80 open:flex open:flex-col"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-4 px-4 sm:px-6">
        <p className="num text-sm tracking-wider" aria-live="polite">
          {String(index + 1).padStart(2, "0")} <span className="opacity-40">/ {String(n).padStart(2, "0")}</span>
        </p>
        <p className="hidden truncate font-display italic opacity-70 sm:block">{name}</p>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="inline-grid size-10 place-items-center rounded-sm hover:bg-white/10"
          aria-label="Close photographs"
          autoFocus
        >
          <X size={22} weight="light" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-20">
        <figure className="relative h-full w-full">
          <div className="relative h-[calc(100%-3rem)] w-full">
            <Plate key={img.url} src={img.url} alt={img.alt} caption={false} sizes="100vw" className="absolute inset-0 !bg-transparent" imgClassName="!object-contain" />
          </div>
          <figcaption className="flex h-12 items-center justify-center text-center font-display text-sm italic opacity-75">{img.alt}</figcaption>
        </figure>
        {n > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 inline-grid size-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/40 hover:bg-white/10 sm:left-5"
              aria-label="Previous photo"
            >
              <ArrowLeft size={20} weight="light" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 inline-grid size-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/40 hover:bg-white/10 sm:right-5"
              aria-label="Next photo"
            >
              <ArrowRight size={20} weight="light" />
            </button>
          </>
        ) : null}
      </div>
      <ol className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 py-4">
        {images.map((im, i) => (
          <li key={`${im.url}-${i}`}>
            <button
              type="button"
              onClick={() => onIndex(i)}
              aria-label={`Photo ${i + 1}`}
              aria-current={i === index}
              className={`relative block h-12 w-16 overflow-hidden rounded-xs transition-opacity ${i === index ? "opacity-100 ring-1 ring-[#e0714b] ring-offset-2 ring-offset-[#0e0d0b]" : "opacity-45 hover:opacity-80"}`}
            >
              <Plate src={im.url} alt="" caption={false} sizes="64px" className="absolute inset-0" />
            </button>
          </li>
        ))}
      </ol>
    </dialog>
  );
}
