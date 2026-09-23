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
export async function bookRoom(
  page: Page,
  opts: {
    slug: string;
    stay: { checkIn: string; checkOut: string };
    guest: GuestInfo;
    pay: "ONLINE" | "PAY_AT_HOTEL";
    base?: string;
    /** M4: pick this rate plan kind in step one (e.g. "NON_REFUNDABLE"). */
    planKind?: string;
    /** M4: apply this promo code in the review step, and wait for it to be accepted. */
    promo?: string;
  },
) {
  const base = opts.base ?? `/stays/${opts.slug}`;
  await page.goto(`${base}/book?checkIn=${opts.stay.checkIn}&checkOut=${opts.stay.checkOut}&guests=2`);
  // Step one: the first room type that is free for the dates (live availability).
  const option = page.getByTestId("room-option").filter({ hasText: /Free for your dates|Only \d+ left/ }).first();
  await expect(option).toBeVisible();
  await option.click();
  if (opts.planKind) {
    const plan = page.locator(`[data-testid="plan-option"][data-plan-kind="${opts.planKind}"]`);
    await expect(plan).toBeVisible();
    await plan.click();
    await expect(plan.locator("input")).toBeChecked();
  }
  await page.getByTestId("booking-next").click();
  // Step two: details.
  await page.getByTestId("guest-name").fill(opts.guest.name);
  await page.getByTestId("guest-phone").fill(opts.guest.phone);
  await page.getByTestId("guest-email").fill(opts.guest.email);
  await page.getByTestId("booking-next").click();
  // Step three: the authoritative quote, then pay.
  await expect(page.getByTestId("quote-total")).toBeVisible();
  if (opts.promo) {
    await page.getByTestId("promo-open").click();
    await page.getByTestId("promo-input").fill(opts.promo);
    await page.getByTestId("promo-apply").click();
    await expect(page.getByTestId("promo-applied")).toBeVisible();
  }
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

/** Signs in on /account/sign-in with the code from the dev outbox, pasted as SMS autofill does. */
export async function signInWithOtp(page: Page, phone: string) {
  await page.goto("/account/sign-in");
  await page.getByTestId("signin-phone").fill(phone);
  await page.getByTestId("signin-send").click();
  await expect(page.getByTestId("otp-0")).toBeVisible();
  const msg = await outboxFor(page.request, e164(phone), "OTP");
  const code = msg.meta?.otpCode ?? /\b(\d{6})\b/.exec(msg.text)![1];
  await page.getByTestId("otp-0").focus();
  await page.evaluate((c) => {
    const dt = new DataTransfer();
    dt.setData("text", c);
    document.activeElement!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, code);
  // Signed in once the page leaves the sign-in form (for the profile or trips).
  await page.waitForURL((u) => /^\/(account|trips)/.test(u.pathname) && !u.pathname.startsWith("/account/sign-in"));
}

/**
 * Checks a booked stay in and straight out again as the hotel's front desk (staff API), as a guest
 * cannot. `propertyId` scopes the staff calls to the stay's property (M5 X-Property-Id).
 */
export async function checkInAndOut(
  request: APIRequestContext,
  stay: { code: string; roomTypeId: string; checkIn: string; checkOut: string; propertyId?: string },
) {
  const token = await staffToken(request);
  const auth: Record<string, string> = { authorization: `Bearer ${token}`, ...(stay.propertyId ? { "x-property-id": stay.propertyId } : {}) };
  const list = await (await request.get(`${API}/reservations?q=${stay.code}`, { headers: auth })).json();
  const res = (list.items as { id: string; code: string }[]).find((r) => r.code === stay.code)!;
  expect(res, `reservation ${stay.code}`).toBeTruthy();
  const rooms = await (
    await request.get(`${API}/availability/rooms?roomTypeId=${stay.roomTypeId}&stayType=NIGHTLY&arrivalDate=${stay.checkIn}&departureDate=${stay.checkOut}&forCheckIn=true`, { headers: auth })
  ).json();
  const all = rooms.rooms as { id: string; checkInReady: boolean; free: boolean; reason: string | null }[];
  const room = all.find((r) => r.checkInReady) ?? all.find((r) => r.free && r.reason === "DIRTY");
  expect(room, "a room to check into").toBeTruthy();
  const inRes = await request.post(`${API}/reservations/${res.id}/check-in`, {
    headers: auth,
    data: { roomId: room!.id, registerLater: true, ...(room!.checkInReady ? {} : { override: { reason: "E2E test stay" } }) },
  });
  expect(inRes.ok(), await inRes.text()).toBeTruthy();
  const outRes = await request.post(`${API}/reservations/${res.id}/check-out`, { headers: auth, data: {} });
  expect(outRes.ok(), await outRes.text()).toBeTruthy();
}
