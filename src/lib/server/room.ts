import "server-only";
import { cache } from "react";
import { api, ApiError } from "../api";
import { normaliseStay, todayInLagos, type ISODate } from "../dates";
import type { RoomDetail } from "../rooms";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export interface RoomRequest {
  today: ISODate;
  initial: { checkIn: ISODate | null; checkOut: ISODate | null; guests: number };
}

/** The stay a room page was opened with (`?checkIn=&checkOut=&guests=`), checked like every other page. */
export function roomRequest(sp: Record<string, string | string[] | undefined>): RoomRequest {
  const today = todayInLagos();
  const stay = normaliseStay(one(sp.checkIn), one(sp.checkOut), today);
  const guests = Math.min(Math.max(Number(one(sp.guests) || one(sp.adults)) || 2, 1), 12);
  return { today, initial: { ...stay, guests } };
}

/**
 * One room type's page data, priced for the stay when there is one. Dates the API will not price
 * (a closed day, too long a stay) fall back to the page without prices rather than a failure.
 * Shared between the page and its metadata.
 */
export const loadRoom = cache(
  async (slug: string, room: string, checkIn: string | null, checkOut: string | null, guests: number, channel: "MARKETPLACE" | "BOOKING_SITE", preview: string | null): Promise<RoomDetail | null> => {
    try {
      const found = await api.roomType(slug, room, { checkIn, checkOut, adults: guests, channel, preview });
      // A preview token for the theme or the form only does not open room drafts: show the published room.
      if (!found && preview) return api.roomType(slug, room, { checkIn, checkOut, adults: guests, channel });
      return found;
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && checkIn) return api.roomType(slug, room, { channel, preview });
      throw err;
    }
  },
);
