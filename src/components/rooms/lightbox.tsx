"use client";

import { ArrowLeft, ArrowRight, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef } from "react";
import { TAG_LABEL, type RoomImage } from "@/lib/rooms";
import { Plate } from "../ui/plate";

/**
 * The room's photographs full screen: a native modal <dialog> (focus is trapped and Escape closes),
 * arrow keys, Home and End, swipe on touch screens, a thumbnail strip, and the caption and kind of each
 * picture. Focus goes back to whatever opened it. The slide is a short fade that reduced-motion turns off.
 */
export function RoomLightbox({
  images,
  index,
  onIndex,
  onClose,
  title,
}: {
  images: RoomImage[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  title: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const n = images.length;
  const go = useCallback((d: number) => onIndex((index + d + n) % n), [index, n, onIndex]);

  useEffect(() => {
    opener.current = document.activeElement;
    const d = ref.current;
    if (d && !d.open) d.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      const el = opener.current as HTMLElement | null;
      if (el && typeof el.focus === "function" && el.isConnected) el.focus({ preventScroll: true });
    };
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "Home") onIndex(0);
    else if (e.key === "End") onIndex(n - 1);
    else return;
    e.preventDefault();
  };

  const touch = useRef<{ x: number; y: number } | null>(null);
  const img = images[index];
  if (!img) return null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onKeyDown={onKey}
      aria-label={`Photographs of the ${title}`}
      data-testid="room-lightbox"
      className="room-lightbox m-0 h-dvh max-h-none w-full max-w-none bg-[#0e0d0b] p-0 text-[#efe8dc] backdrop:bg-black/80 open:flex open:flex-col"
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const t = touch.current;
        touch.current = null;
        if (!t) return;
        const dx = e.changedTouches[0].clientX - t.x;
        const dy = e.changedTouches[0].clientY - t.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
        else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) ref.current?.close();
      }}
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-4 px-4 sm:px-6">
        <p className="num text-sm tracking-wider" aria-live="polite" data-testid="lightbox-count">
          {String(index + 1).padStart(2, "0")} <span className="opacity-45">/ {String(n).padStart(2, "0")}</span>
          <span className="sr-only">: {img.alt}</span>
        </p>
        <p className="hidden truncate font-display italic opacity-70 sm:block">{title}</p>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          className="inline-grid size-11 place-items-center rounded-full hover:bg-white/10 focus-visible:outline-[#e0714b]"
          aria-label="Close photographs"
          autoFocus
        >
          <X size={22} weight="light" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-20">
        <figure className="relative flex h-full w-full flex-col">
          <div className="room-lightbox-slide relative min-h-0 w-full flex-1" key={img.url + index}>
            <Plate src={img.url} alt={img.alt} caption={false} sizes="100vw" className="absolute inset-0 !bg-transparent" imgClassName="!object-contain" />
          </div>
          <figcaption className="mx-auto flex min-h-14 max-w-3xl flex-col items-center justify-center px-4 py-2 text-center">
            {img.tag ? <span className="kicker !text-[10px] !text-[#d6a94a]">{TAG_LABEL[img.tag]}</span> : null}
            <span className="mt-0.5 font-display text-[0.9375rem] italic opacity-85">{img.caption || img.alt}</span>
          </figcaption>
        </figure>
        {n > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 inline-grid size-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/40 hover:bg-white/10 focus-visible:outline-[#e0714b] sm:left-5"
              aria-label="Previous photo"
            >
              <ArrowLeft size={20} weight="light" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 inline-grid size-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/40 hover:bg-white/10 focus-visible:outline-[#e0714b] sm:right-5"
              aria-label="Next photo"
            >
              <ArrowRight size={20} weight="light" />
            </button>
          </>
        ) : null}
      </div>
      {n > 1 ? (
        <ol className="flex shrink-0 gap-2 overflow-x-auto px-4 py-4 sm:justify-center" aria-label="All photographs">
          {images.map((im, i) => (
            <li key={`${im.url}-${i}`} className="shrink-0">
              <button
                type="button"
                onClick={() => onIndex(i)}
                aria-label={`Photo ${i + 1}: ${im.alt}`}
                aria-current={i === index ? "true" : undefined}
                className={`relative block h-12 w-16 overflow-hidden rounded-[3px] transition-opacity focus-visible:outline-[#e0714b] ${i === index ? "opacity-100 ring-1 ring-[#e0714b] ring-offset-2 ring-offset-[#0e0d0b]" : "opacity-45 hover:opacity-80"}`}
              >
                <Plate src={im.url} alt="" caption={false} sizes="64px" className="absolute inset-0" />
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </dialog>
  );
}
