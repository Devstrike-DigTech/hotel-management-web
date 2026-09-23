/**
 * A calendar entry for a stay (RFC 5545). The API serves one per booking; this builds the same
 * file in the browser so "Add to calendar" still works when the network does not.
 */
import type { ISODate } from "./dates";

export interface StayEvent {
  uid: string;
  title: string;
  checkIn: ISODate;
  checkOut: ISODate;
  /** "14:00" local Lagos time; defaults to 14:00 and 12:00. */
  checkInTime?: string | null;
  checkOutTime?: string | null;
  location?: string;
  description?: string;
  url?: string;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** Folds lines at 75 octets as the spec asks (approximated by characters). */
const fold = (line: string) => line.match(/.{1,73}/g)?.join("\r\n ") ?? line;

function stamp(date: ISODate, time: string | null | undefined, fallback: string) {
  const t = /^\d{1,2}:\d{2}/.test(time ?? "") ? time!.slice(0, 5).padStart(5, "0") : fallback;
  // Lagos is UTC+1 all year: convert the wall-clock time to UTC.
  const utc = new Date(`${date}T${t}:00+01:00`);
  return utc.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildIcs(e: StayEvent, prodId = "-//Hotel bookings//EN"): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART:${stamp(e.checkIn, e.checkInTime, "14:00")}`,
    `DTEND:${stamp(e.checkOut, e.checkOutTime, "12:00")}`,
    `SUMMARY:${esc(e.title)}`,
    e.location ? `LOCATION:${esc(e.location)}` : "",
    e.description ? `DESCRIPTION:${esc(e.description)}` : "",
    e.url ? `URL:${e.url}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(e.title)} tomorrow`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadIcs(e: StayEvent, filename = "stay.ics") {
  const blob = new Blob([buildIcs(e)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** A Google Calendar "add event" link, for people without a calendar app that opens .ics files. */
export function googleCalendarUrl(e: StayEvent) {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(e.checkIn, e.checkInTime, "14:00")}/${stamp(e.checkOut, e.checkOutTime, "12:00")}`,
    ...(e.location ? { location: e.location } : {}),
    ...(e.description ? { details: e.description } : {}),
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function mapsUrl(name: string, address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${address}`)}`;
}
