"use client";

import { ArrowsOutSimple, Images } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { TAG_LABEL, TAG_ORDER, type RoomImage, type RoomTag } from "@/lib/rooms";
import type { TemplateId } from "@/lib/theme/types";
import { Plate } from "../ui/plate";
import { RoomLightbox } from "./lightbox";

type Look = Exclude<TemplateId, "essentials">;

/**
 * The room's photographs: a hero and a grid laid out in the template's manner, the picture kinds
 * (Bedroom, Bathroom, View...) as filter chips with their counts, and every picture opening the
 * full-screen lightbox, which moves through the filtered set.
 */
export function RoomGallery({ images, title, look }: { images: RoomImage[]; title: string; look: Look }) {
  const [tag, setTag] = useState<RoomTag | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const tags = useMemo(() => {
    const counts = new Map<RoomTag, number>();
    for (const im of images) if (im.tag) counts.set(im.tag, (counts.get(im.tag) ?? 0) + 1);
    return TAG_ORDER.filter((t) => counts.has(t)).map((t) => [t, counts.get(t)!] as const);
  }, [images]);
  // All: the cover first. One kind: that kind in the hotel's own order.
  const shown = tag ? images.filter((im) => im.tag === tag).sort((a, b) => a.order - b.order) : images;

  if (!images.length) {
    return <Plate src={null} alt={`The ${title}: photographs to come`} label={title} sizes="100vw" className={`aspect-[16/7] ${look === "resort" ? "rounded-[24px]" : "rounded-sm"}`} />;
  }

  const cell = (im: RoomImage, i: number, className: string, sizes: string, frame = false) => {
    const plate = (
      <Plate
        src={im.url}
        alt={im.alt}
        label={im.caption || im.alt}
        sizes={sizes}
        priority={i === 0}
        className="absolute inset-0"
        imgClassName="transition-transform duration-700 group-hover:scale-[1.025]"
      />
    );
    return (
      <button
        key={`${im.url}-${i}`}
        type="button"
        onClick={() => setOpen(i)}
        className={`group relative block ${frame ? "heritage-frame w-full focus-visible:outline-offset-[6px]" : "overflow-hidden focus-visible:outline-offset-4"} ${className}`}
        aria-label={`Open photo ${i + 1} of ${shown.length}: ${im.alt}`}
        data-testid="room-photo"
      >
        {frame ? <span className="relative block h-full w-full overflow-hidden">{plate}</span> : plate}
        {look === "editorial" ? (
          <span aria-hidden className="kicker absolute left-3 top-3 rounded-xs bg-paper/90 px-1.5 py-0.5 !text-[10px] !text-ink">
            Pl. {String(i + 1).padStart(2, "0")}
          </span>
        ) : null}
      </button>
    );
  };

  const five = shown.slice(0, 5);
  const more = shown.length - five.length;

  let grid: React.ReactNode;
  switch (look) {
    case "boutique":
      // A strip of big pictures at alternating heights, snapping one by one.
      grid = (
        <div className="boutique-strip -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:-mx-10 sm:gap-5 sm:px-10">
          {shown.map((im, i) =>
            cell(im, i, `shrink-0 snap-center ${i % 3 === 1 ? "aspect-[3/4] w-[64vw] sm:w-[24vw] sm:translate-y-8" : "aspect-[4/3] w-[82vw] sm:w-[40vw]"}`, "(min-width: 640px) 40vw, 82vw"),
          )}
        </div>
      );
      break;
    case "business":
      grid = (
        <div className="grid h-[22rem] grid-cols-4 grid-rows-2 gap-1.5 sm:h-[26rem]">
          {cell(five[0], 0, five.length > 1 ? "col-span-4 row-span-2 sm:col-span-2" : "col-span-4 row-span-2", "(min-width: 640px) 50vw, 100vw")}
          {five.slice(1, 5).map((im, j) => cell(im, j + 1, "hidden sm:block", "25vw"))}
        </div>
      );
      break;
    case "resort":
      grid = (
        <div className="grid h-[min(70vh,36rem)] min-h-[20rem] grid-cols-4 grid-rows-2 gap-2.5">
          {cell(five[0], 0, `rounded-[24px] ${five.length > 1 ? "col-span-4 row-span-2 md:col-span-2" : "col-span-4 row-span-2"}`, "(min-width: 768px) 50vw, 100vw")}
          {five.slice(1, 5).map((im, j) => cell(im, j + 1, `hidden rounded-[24px] md:block ${five.length === 2 ? "col-span-2 row-span-2" : five.length === 3 ? "col-span-2" : ""}`, "25vw"))}
        </div>
      );
      break;
    case "heritage":
      grid = (
        <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
          {cell(five[0], 0, "aspect-[4/3]", "(min-width: 768px) 60vw, 100vw", true)}
          {five.length > 1 ? (
            <div className="hidden grid-rows-2 gap-6 md:grid">
              {five.slice(1, 3).map((im, j) => cell(im, j + 1, "h-full", "35vw", true))}
            </div>
          ) : null}
        </div>
      );
      break;
    default:
      // Editorial: one tall lead plate and a column of numbered smaller ones.
      grid = (
        <div className="grid h-[min(70vh,38rem)] min-h-[20rem] grid-cols-6 grid-rows-6 gap-2 sm:gap-3">
          {cell(five[0], 0, `rounded-sm ${five.length > 1 ? "col-span-6 row-span-4 md:col-span-4 md:row-span-6" : "col-span-6 row-span-6"}`, "(min-width: 768px) 60vw, 100vw")}
          {five[1] ? cell(five[1], 1, `rounded-sm col-span-3 row-span-2 ${five.length > 2 ? "md:col-span-2 md:row-span-3" : "md:col-span-2 md:row-span-6"}`, "(min-width: 768px) 30vw, 50vw") : null}
          {five[2] ? cell(five[2], 2, "rounded-sm col-span-3 row-span-2 md:col-span-1 md:row-span-3", "(min-width: 768px) 15vw, 50vw") : null}
          {five[3] ? cell(five[3], 3, "rounded-sm hidden md:col-span-1 md:row-span-3 md:block", "15vw") : null}
        </div>
      );
  }

  const chip = (active: boolean) => {
    switch (look) {
      case "boutique":
        return `boutique-kicker border-b py-1 transition-colors ${active ? "border-ink !text-ink" : "border-transparent hover:!text-ink"}`;
      case "business":
        return `border px-2.5 py-1 text-[12.5px] ${active ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink"}`;
      case "resort":
        return `rounded-full px-4 py-2 text-sm transition-colors ${active ? "bg-[var(--laterite-fill,var(--laterite))] text-[color:var(--laterite-fill-ink,var(--laterite-ink))]" : "bg-surface-2 hover:bg-line"}`;
      case "heritage":
        return `heritage-caps text-[11px] px-1 py-1 transition-colors ${active ? "text-laterite underline decoration-1 underline-offset-[6px]" : "text-ink-muted hover:text-ink"}`;
      default:
        return `rounded-xs border px-3 py-1.5 text-[13px] transition-colors ${active ? "border-laterite bg-laterite text-laterite-ink" : "border-line-strong hover:border-ink-muted"}`;
    }
  };

  const countRow = (
<div className={`${look === "resort" ? "mb-3" : "mt-3"} flex items-center gap-4 ${look === "heritage" ? "justify-center" : "justify-between"}`}>
        <p className={look === "heritage" ? "heritage-kicker !text-[10px]" : look === "boutique" ? "boutique-kicker" : "kicker"} data-testid="room-photo-count">
          <Images size={14} weight="light" aria-hidden className="-mt-0.5 mr-1.5 inline" />
          <span className="text-ink">{shown.length}</span> {shown.length === 1 ? "photograph" : "photographs"}
          {tag ? ` of the ${TAG_LABEL[tag].toLowerCase()}` : ""}
          {more > 0 && look !== "boutique" ? <span className="text-ink-muted">, {more} more inside</span> : null}
        </p>
        {look !== "heritage" ? (
          <button type="button" className="link-static inline-flex items-center gap-2 text-sm" onClick={() => setOpen(0)} data-testid="room-gallery-all">
            <ArrowsOutSimple size={15} aria-hidden /> View all
          </button>
        ) : (
          <button type="button" className="heritage-caps text-[11px] text-laterite hover:underline" onClick={() => setOpen(0)} data-testid="room-gallery-all">
            View all
          </button>
        )}
      </div>
  );

  return (
    <div data-testid="room-gallery" data-look={look}>
      {tags.length > 1 ? (
        <div
          role="toolbar"
          aria-label="Show photographs of"
          className={`mb-4 flex flex-wrap items-center gap-2 ${look === "heritage" ? "justify-center gap-x-5" : look === "boutique" ? "gap-x-6" : ""}`}
        >
          <button type="button" aria-pressed={tag === null} onClick={() => setTag(null)} className={chip(tag === null)} data-testid="room-tag-chip" data-tag="ALL">
            All <span className="num opacity-70">{images.length}</span>
          </button>
          {tags.map(([t, count]) => (
            <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)} className={chip(tag === t)} data-testid="room-tag-chip" data-tag={t}>
              {TAG_LABEL[t]} <span className="num opacity-70">{count}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div aria-live="polite" className="sr-only">
        {tag ? `${shown.length} ${shown.length === 1 ? "photograph" : "photographs"} of the ${TAG_LABEL[tag].toLowerCase()}` : ""}
      </div>
      {look === "resort" ? countRow : null}
      {grid}
      {look !== "resort" ? countRow : null}
      {open !== null ? <RoomLightbox images={shown} index={Math.min(open, shown.length - 1)} onIndex={setOpen} onClose={() => setOpen(null)} title={title} /> : null}
    </div>
  );
}
