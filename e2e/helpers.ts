import { expect, type APIRequestContext, type Page } from "@playwright/test";

/** Backend base for staff-side setup steps (check-in / check-out for the review test). */
export const API = (process.env.E2E_API_URL || process.env.API_URL || "http://localhost:4000").replace(/\/$/, "") + "/api/v1";

export function lagosToday() {
  return new Date(Date.now() + 3600_000).toISOString().slice(0, 10);
}
export function addDays(d: string, n: number) {
  return new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

/** A stay far enough out, and spread across runs, so tests do not compete for the same rooms. */
export function futureStay(nights = 2) {
  const offset = 60 + Math.floor(Math.random() * 240);
  const checkIn = addDays(lagosToday(), offset);
  return { checkIn, checkOut: addDays(checkIn, nights) };
}

/** A fresh Nigerian mobile number per test, so per-phone limits never collide across runs. */
export function randomPhone() {
  return `0803${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
}
export const e164 = (local: string) => `+234${local.slice(1)}`;

/** A distinct client address per test for the per-IP limits (the web gateway forwards it). */
export function randomIp() {
  const b = () => 1 + Math.floor(Math.random() * 250);
  return `10.${b()}.${b()}.${b()}`;
}

export interface GuestInfo {
  name: string;
  phone: string;
  email: string;
}
export function newGuest(): GuestInfo {
  const n = Math.floor(Math.random() * 1e6);
  const first = ["Adaeze", "Tunde", "Ngozi", "Ibrahim", "Folake", "Emeka", "Aisha", "Segun"][n % 8];
  const last = ["Okafor", "Adeyemi", "Eze", "Bello", "Balogun", "Nwosu", "Musa", "Fashola"][(n >> 3) % 8];
  return { name: `${first} ${last}`, phone: randomPhone(), email: `guest${n}@example.ng` };
}

/**
 * Walks the booking flow from the book page to the review step and submits it.
 * Returns once the hold panel (online) or the confirmation (pay at hotel) is showing.
 */
export async function bookRoom(page: Page, opts: { slug: string; stay: { checkIn: string; checkOut: string }; guest: GuestInfo; pay: "ONLINE" | "PAY_AT_HOTEL"; base?: string }) {
  const base = opts.base ?? `/stays/${opts.slug}`;
  await page.goto(`${base}/book?checkIn=${opts.stay.checkIn}&checkOut=${opts.stay.checkOut}&guests=2`);
  // Step one: the first room type that is free for the dates (live availability).
  const option = page.getByTestId("room-option").filter({ hasText: /Free for your dates|Only \d+ left/ }).first();
  await expect(option).toBeVisible();
  await option.click();
  await page.getByTestId("booking-next").click();
  // Step two: details.
  await page.getByTestId("guest-name").fill(opts.guest.name);
  await page.getByTestId("guest-phone").fill(opts.guest.phone);
  await page.getByTestId("guest-email").fill(opts.guest.email);
  await page.getByTestId("booking-next").click();
  // Step three: the authoritative quote, then pay.
  await expect(page.getByTestId("quote-total")).toBeVisible();
  await page.getByTestId(`pay-${opts.pay}`).click();
  await page.getByTestId("consent").check();
  await page.getByTestId("book-submit").click();
}

/** Newest dev-outbox message to a recipient (the backend's non-production mail/SMS capture). */
export async function outboxFor(request: APIRequestContext, to: string, template?: string) {
  for (let i = 0; i < 20; i++) {
    const res = await request.get(`/api/v1/public/dev/outbox`);
    if (res.ok()) {
      const { items } = (await res.json()) as { items: { to: string; template: string; text: string; meta?: { otpCode?: string } }[] };
      const hit = items.find((m) => m.to === to && (!template || m.template === template));
      if (hit) return hit;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No outbox message to ${to}${template ? ` (${template})` : ""}`);
}

/** Staff login on the backend, for the setup a guest cannot do (check-in and check-out). */
export async function staffToken(request: APIRequestContext) {
  const res = await request.post(`${API}/auth/login`, { data: { email: process.env.E2E_STAFF_EMAIL || "demo@palmwine.ng", password: process.env.E2E_STAFF_PASSWORD || "Demo1234!" } });
  expect(res.ok(), `staff login: ${res.status()}`).toBeTruthy();
  return ((await res.json()) as { accessToken: string }).accessToken;
}
