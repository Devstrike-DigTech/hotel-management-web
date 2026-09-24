/**
 * Facts about the partner API that the guides quote. Kept in one place so a contract change is a
 * one-line edit here, not a hunt through prose.
 */
import { ADMIN_URL, APP_NAME } from "@/lib/env";

const PUBLIC_API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

/** Where partners send requests. Set NEXT_PUBLIC_PARTNER_API_URL when the API lives on its own host. */
export const PARTNER_BASE_URL = (process.env.NEXT_PUBLIC_PARTNER_API_URL || `${PUBLIC_API}/api/partner/v1`).replace(/\/$/, "");

/** Where a hotel's owner creates keys and webhook endpoints in the hotel admin. */
export const ADMIN_KEYS_URL = `${ADMIN_URL}/developers/api-keys`;
export const ADMIN_WEBHOOKS_URL = `${ADMIN_URL}/developers/webhooks`;
/** How the hotel admin labels that area in its navigation. */
export const ADMIN_AREA = "Developers";

export const DOCS_TITLE = `${APP_NAME} for developers`;

export const KEY_EXAMPLE = {
  live: "hk_live_8f3k2q_4tXv9Lw2bRk7PzQm1sY6cHn0aJd3eFg5",
  test: "hk_test_2m7c1p_Qe8rT3yU6iO9pA2sD5fG7hJ0kL4zX1cV",
};

export const AUTH_HEADER = "Authorization";
export const authValue = (key: string) => `Bearer ${key}`;

export interface ScopeInfo {
  scope: string;
  grants: string;
}

export const SCOPES: ScopeInfo[] = [
  { scope: "reservations:read", grants: "List and read reservations, with their stay, room and totals." },
  { scope: "reservations:write", grants: "Create, modify and cancel reservations." },
  { scope: "availability:read", grants: "Read free rooms and prices for a stay." },
  { scope: "rates:read", grants: "Read nightly rates and rate overrides." },
  { scope: "rates:write", grants: "Set and clear rate overrides for dates." },
  { scope: "guests:read", grants: "Read guest names and contact details. ID document numbers are never returned." },
  { scope: "folios:read", grants: "Read folios: charges, payments, discounts and balances." },
  { scope: "rooms:read", grants: "Read room types and rooms with their status." },
  { scope: "rooms:write", grants: "Change a room's status (for example, cleaned or out of order)." },
  { scope: "housekeeping:read", grants: "Read housekeeping tasks." },
  { scope: "housekeeping:write", grants: "Update housekeeping tasks." },
  { scope: "webhooks:manage", grants: "Create, change and delete webhook endpoints through the API." },
  { scope: "reports:read", grants: "Read daily statistics: occupancy, rooms sold, ADR and RevPAR." },
];

export interface EventInfo {
  type: string;
  when: string;
  object: string;
}

export const EVENTS: EventInfo[] = [
  { type: "reservation.created", when: "A reservation is made from any channel: front desk, booking site, marketplace, OTA or the API.", object: "Reservation" },
  { type: "reservation.updated", when: "Dates, guests, room or rate change.", object: "Reservation" },
  { type: "reservation.cancelled", when: "A reservation is cancelled.", object: "Reservation" },
  { type: "reservation.checked_in", when: "The guest is checked in and given a room.", object: "Reservation" },
  { type: "reservation.checked_out", when: "The guest is checked out and the folio is settled or closed.", object: "Reservation" },
  { type: "reservation.no_show", when: "The hotel marks a reservation as a no-show after the arrival day.", object: "Reservation" },
  { type: "payment.received", when: "Money is posted to a folio: card, transfer, POS terminal or cash.", object: "Payment" },
  { type: "room.status_changed", when: "A room moves between clean, dirty, occupied, reserved and out of order.", object: "Room" },
  { type: "housekeeping.task_completed", when: "A housekeeping task is marked done or passes inspection.", object: "HousekeepingTask" },
  { type: "review.published", when: "A guest's review of a checked-out stay is published.", object: "Review" },
  { type: "guard.flag_raised", when: "Revenue Guard flags something for the owner, such as an unpaid occupied room.", object: "GuardFlag" },
  { type: "webhook.ping", when: "Someone presses \"Send test\" on the endpoint in the hotel admin.", object: "none" },
];

/** Webhook delivery: header name and signing scheme. */
export const SIGNATURE_HEADER = "X-Signature";
export const WEBHOOK_TOLERANCE_SECONDS = 300;
/** When each attempt is made, counted from the first. */
export const RETRY_SCHEDULE = ["at once", "1 minute", "5 minutes", "30 minutes", "2 hours", "5 hours", "10 hours", "24 hours"];
export const DELIVERY_TIMEOUT_SECONDS = 10;

export const RATE_LIMIT = { perMinute: 600, burstPerSecond: 50, addonPerMinute: 120, addonBurstPerSecond: 20 };
export const PAGE_LIMIT = { max: 200, default: 50 };
export const IDEMPOTENCY_HOURS = 72;
export const ALT_KEY_HEADER = "X-Api-Key";
