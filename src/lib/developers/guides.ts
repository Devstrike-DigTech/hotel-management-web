/**
 * The guides, in reading order. Each guide's sections are listed here so the on-page contents,
 * the sidebar and the search index agree with the headings the page renders (same ids).
 */

export interface GuideSection {
  id: string;
  title: string;
}

export interface Guide {
  slug: string;
  title: string;
  /** Short name for the sidebar. */
  nav: string;
  summary: string;
  sections: GuideSection[];
  /** Words people search for that the title does not contain. */
  keywords?: string;
}

export const GUIDES: Guide[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    nav: "Getting started",
    summary: "Create a key in the hotel admin and make your first request in under five minutes.",
    sections: [
      { id: "before-you-start", title: "Before you start" },
      { id: "create-a-key", title: "Create a key" },
      { id: "first-request", title: "Your first request" },
      { id: "read-the-response", title: "Read the response" },
      { id: "next-steps", title: "Next steps" },
    ],
    keywords: "quickstart curl hello first call setup",
  },
  {
    slug: "authentication",
    title: "Authentication and scopes",
    nav: "Authentication",
    summary: "Bearer keys, what each scope allows, property restrictions, IP allowlists, rotation and revocation.",
    sections: [
      { id: "bearer-keys", title: "Bearer keys" },
      { id: "key-anatomy", title: "Anatomy of a key" },
      { id: "scopes", title: "Scopes" },
      { id: "restrictions", title: "Property and IP restrictions" },
      { id: "rotation", title: "Rotating and revoking" },
      { id: "keeping-keys-safe", title: "Keeping keys safe" },
    ],
    keywords: "api key token authorization bearer scope permission rotate revoke allowlist",
  },
  {
    slug: "test-and-live",
    title: "Test and live keys",
    nav: "Test and live keys",
    summary: "Build against a sandbox that never charges a card or messages a guest, then switch one prefix.",
    sections: [
      { id: "two-modes", title: "Two modes, one API" },
      { id: "what-test-mode-does", title: "What test mode does" },
      { id: "telling-them-apart", title: "Telling them apart" },
      { id: "going-live", title: "Going live" },
    ],
    keywords: "sandbox dry run hk_test hk_live",
  },
  {
    slug: "pagination",
    title: "Pagination",
    nav: "Pagination",
    summary: "Cursor pagination on every list: stable under concurrent writes, and simple to loop.",
    sections: [
      { id: "cursors", title: "Cursors, not pages" },
      { id: "walking-a-list", title: "Walking a list" },
      { id: "syncing", title: "Keeping a copy in sync" },
    ],
    keywords: "cursor nextCursor limit page list",
  },
  {
    slug: "errors",
    title: "Errors",
    nav: "Errors",
    summary: "One error envelope, a stable code for every failure and the request id to quote.",
    sections: [
      { id: "envelope", title: "The error envelope" },
      { id: "status-codes", title: "Status codes" },
      { id: "error-codes", title: "Error codes" },
      { id: "handling", title: "Handling errors well" },
    ],
    keywords: "error code status 400 401 403 404 409 422 429 500 request id",
  },
  {
    slug: "rate-limits",
    title: "Rate limits",
    nav: "Rate limits",
    summary: "Limits per key, the RateLimit headers on every response, and backing off politely.",
    sections: [
      { id: "limits", title: "The limits" },
      { id: "headers", title: "RateLimit headers" },
      { id: "when-limited", title: "When you are limited" },
    ],
    keywords: "429 throttle quota RateLimit-Limit RateLimit-Remaining RateLimit-Reset Retry-After",
  },
  {
    slug: "idempotency",
    title: "Idempotency",
    nav: "Idempotency",
    summary: "Every write takes an Idempotency-Key, so a retry after a dropped connection never books twice.",
    sections: [
      { id: "why", title: "Why it matters here" },
      { id: "how-it-works", title: "How it works" },
      { id: "rules", title: "The rules" },
    ],
    keywords: "Idempotency-Key retry duplicate Idempotent-Replayed",
  },
  {
    slug: "webhooks",
    title: "Webhooks",
    nav: "Webhooks",
    summary: "Events pushed to your endpoint, signed, retried for a day, and replayable from the admin.",
    sections: [
      { id: "overview", title: "How delivery works" },
      { id: "events", title: "Event catalogue" },
      { id: "payload", title: "The payload" },
      { id: "verify", title: "Verifying signatures" },
      { id: "retries", title: "Retries and auto-disable" },
      { id: "replay", title: "Replay and test pings" },
    ],
    keywords: "webhook event signature hmac sha256 X-Signature verify retry replay ping",
  },
  {
    slug: "changelog",
    title: "Changelog",
    nav: "Changelog",
    summary: "What changed in the partner API, newest first, and how versions are kept stable.",
    sections: [
      { id: "versioning", title: "Versioning policy" },
      { id: "releases", title: "Releases" },
    ],
    keywords: "changes release version history deprecation",
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);

export function neighbours(slug: string) {
  const i = GUIDES.findIndex((g) => g.slug === slug);
  return { prev: i > 0 ? GUIDES[i - 1] : null, next: i >= 0 && i < GUIDES.length - 1 ? GUIDES[i + 1] : null };
}
