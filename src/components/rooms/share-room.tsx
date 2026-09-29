"use client";

import { Check, ShareNetwork, WhatsappLogo } from "@phosphor-icons/react";
import { useState } from "react";

/**
 * Share this room: the phone's own share sheet where there is one, else the link copied. The link
 * is the page's address, dates included, so the person it goes to sees the same prices. WhatsApp
 * gets its own link because that is how most stays are planned here.
 */
export function ShareRoom({ title, text, className = "", tone = "default" }: { title: string; text: string; className?: string; tone?: "default" | "caps" }) {
  const [copied, setCopied] = useState(false);
  const here = () => (typeof window !== "undefined" ? window.location.href.replace(/[?&]preview=[^&]*/, "") : "");

  async function share() {
    const url = here();
    try {
      if (typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* nothing more to try */
      }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  }

  const cls = tone === "caps" ? "text-[11px] uppercase tracking-[0.18em]" : "text-sm";
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2 ${cls} ${className}`}>
      <button type="button" onClick={share} className="inline-flex items-center gap-1.5 text-ink-muted hover:text-ink" data-testid="share-room">
        {copied ? <Check size={15} aria-hidden className="text-palm" /> : <ShareNetwork size={15} aria-hidden />}
        {copied ? "Link copied" : "Share this room"}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text} `)}`}
        onClick={(e) => {
          e.currentTarget.href = `https://wa.me/?text=${encodeURIComponent(`${text} ${here()}`)}`;
        }}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-ink-muted hover:text-ink"
      >
        <WhatsappLogo size={15} aria-hidden /> WhatsApp
      </a>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "The link to this room is copied." : ""}
      </span>
    </div>
  );
}
