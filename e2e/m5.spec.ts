import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { addDays, API, bookRoom, checkInAndOut, e164, futureStay, lagosToday, newGuest, randomIp, signInWithOtp, staffToken, fillRequiredAnswers, passAddOnsStep } from "./helpers";

/**
 * M5 on the guest side: a hotel group's site, loyalty points at booking and after check-out, and
 * WhatsApp chat for the hotels that answer there. Runs against the M5 seed (The Palmwine House group on
 * Pro with Lekki and Ikoyi, "Palmwine Circle"; Eko Tides on Growth).
 */

test.use({ extraHTTPHeaders: { "x-forwarded-for": randomIp() } });

const GROUP = "palmwine-house";
const LEKKI = "palmwine-house";
const IKOYI = "palmwine-house-ikoyi";

const num = (s: string) => Number(s.replace(/[^\d]/g, ""));

test.describe("a hotel group's site", () => {
  test("lists both hotels, and each books on its own microsite", async ({ page }) => {
    await page.goto(`/g/${GROUP}`);
    const index = page.getByTestId("group-index");
    await expect(index).toBeVisible();
    const rows = index.getByTestId("group-property");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toHaveAttribute("data-slug", LEKKI);
    await expect(rows.nth(1)).toHaveAttribute("data-slug", IKOYI);
    await expect(rows.nth(1)).toContainText("Palmwine House Ikoyi");

    // Each entry leads to that hotel's own microsite, which points back at the group.
    await rows.nth(1).getByTestId("group-property-link").click();
    await expect(page).toHaveURL(new RegExp(`/h/${IKOYI}$`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Palmwine House Ikoyi");

    for (const slug of [IKOYI, LEKKI]) {
      await bookRoom(page, { slug, base: `/h/${slug}`, stay: futureStay(1), guest: newGuest(), pay: "PAY_AT_HOTEL" });
      await expect(page).toHaveURL(new RegExp(`/h/${slug}/booking/confirmation\\?code=`));
      const card = page.getByTestId("confirmation-card");
      await expect(card).toBeVisible();
      await expect(card).toContainText(slug === IKOYI ? "Palmwine House Ikoyi" : "The Palmwine House");
    }
  });

  test("the group's own host shows the list and serves each hotel under it", async ({ page }) => {
    const port = new URL(test.info().project.use.baseURL ?? "http://localhost:3000").port || "3000";
    const origin = `http://${GROUP}.localhost:${port}`;
    await page.goto(`${origin}/`);
    await expect(page.getByTestId("group-property")).toHaveCount(2);
    await page.goto(`${origin}/${IKOYI}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Palmwine House Ikoyi");
    await expect(page.getByTestId("group-link")).toHaveAttribute("href", "/");
    // Canonical addresses name the hotel's own domain, not the host it was reached on.
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    const { canonicalUrl } = await (await page.request.get(`/api/v1/public/hotels/${IKOYI}`)).json();
    expect(canonicalUrl).toMatch(/^https:\/\//);
    expect(canonical?.replace(/\/$/, "")).toBe(canonicalUrl.replace(/\/$/, ""));
  });

  test("the marketplace lists the properties one by one, each part of the group", async ({ page }) => {
    await page.goto(`/stays?city=Lagos`);
    for (const name of ["The Palmwine House", "Palmwine House Ikoyi"]) {
      const row = page.locator("article").filter({ has: page.getByRole("link", { name, exact: true }) });
      await expect(row.getByTestId("part-of-group")).toContainText("Part of");
    }
  });
});

/** A fresh guest, signed in and enrolled in Palmwine Circle, with `points` credited by the hotel. */
async function member(page: Page, request: APIRequestContext, points: number) {
  const guest = newGuest();
  await signInWithOtp(page, guest.phone);
  const enrol = await page.request.post(`/api/v1/guest/loyalty/enrol`, { data: { hotelSlug: LEKKI } });
  expect(enrol.ok(), await enrol.text()).toBeTruthy();
  if (points) {
    const token = await staffToken(request);
    const auth = { authorization: `Bearer ${token}` };
    const found = await (await request.get(`${API}/loyalty/members?q=${encodeURIComponent(guest.phone.slice(1))}`, { headers: auth })).json();
    const m = (found.items as { id: string; guest: { phone: string | null } }[]).find((x) => x.guest.phone === e164(guest.phone));
    expect(m, "the new member").toBeTruthy();
    const adj = await request.post(`${API}/loyalty/members/${m!.id}/adjust`, { headers: { ...auth, "idempotency-key": `e2e-${Date.now()}` }, data: { points, reason: "E2E test credit" } });
    expect(adj.ok(), await adj.text()).toBeTruthy();
  }
  return guest;
}

async function balance(page: Page) {
  const r = await page.request.get(`/api/v1/guest/loyalty`);
  expect(r.ok()).toBeTruthy();
  const { memberships } = (await r.json()) as { memberships: { group: { slug: string }; points: number }[] };
  return memberships.find((m) => m.group.slug === GROUP)?.points ?? 0;
}

test.describe("loyalty", () => {
  test("redeem points at booking: the charge is lower and the balance falls", async ({ page, request }) => {
    const guest = await member(page, request, 3000);
    expect(await balance(page)).toBe(3000);

    const stay = futureStay(1);
    await page.goto(`/stays/${LEKKI}/book?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=2`);
    await page.getByTestId("room-option").filter({ hasText: /Free for your dates|Only \d+ left/ }).first().click();
    await page.getByTestId("booking-next").click();
    await page.getByTestId("guest-name").fill(guest.name);
    await page.getByTestId("guest-phone").fill(guest.phone);
    await page.getByTestId("guest-email").fill(guest.email);
    await fillRequiredAnswers(page);
    await page.getByTestId("booking-next").click();
    await passAddOnsStep(page);

    const total = page.getByTestId("quote-total");
    await expect(total).toBeVisible();
    const before = num(await total.innerText());
    const use = page.getByTestId("points-use");
    await expect(use).toContainText("Use 3,000 points (₦3,000)");
    await use.click();
    await expect(page.getByTestId("points-applied")).toContainText("3,000");
    await expect(page.getByTestId("points-line")).toContainText("3,000 points");
    await expect(total).not.toHaveText(new RegExp(`^₦${before.toLocaleString("en-NG")}$`));
    const after = num(await total.innerText());
    // A pre-tax discount: the total falls by the points' value plus the tax on it.
    expect(before - after).toBeGreaterThanOrEqual(3000);
    expect(before - after).toBeLessThan(3000 * 1.2);

    await page.getByTestId("pay-ONLINE").click();
    await page.getByTestId("consent").check();
    await page.getByTestId("book-submit").click();
    await expect(page.getByTestId("due-now")).toHaveText(`₦${after.toLocaleString("en-NG")}`);
    await page.getByTestId("pay-now").click();
    await expect(page.getByTestId("mock-amount")).toHaveText(`₦${after.toLocaleString("en-NG")}`);
    await page.getByTestId("mock-pay").click();
    await expect(page.getByTestId("confirmation-card")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("paid-amount")).toHaveText(`₦${after.toLocaleString("en-NG")}`);
    await expect(page.getByTestId("confirmation-card")).toContainText("3,000 points");
    await expect(page.getByTestId("points-to-earn")).toBeVisible();

    expect(await balance(page)).toBe(0);
    await page.goto("/account/points");
    await expect(page.getByTestId("points-balance")).toHaveText("0");
    await expect(page.getByTestId("statement-row").filter({ hasText: "Used" }).first()).toContainText("3,000");
  });

  test("a trip shows the points earned once the guest has checked out", async ({ page, request }) => {
    const guest = await member(page, request, 0);
    const checkIn = lagosToday();
    const checkOut = addDays(checkIn, 1);
    const avail = await (await page.request.get(`/api/v1/public/hotels/${LEKKI}/availability?checkIn=${checkIn}&checkOut=${checkOut}&adults=1`)).json();
    const type = (avail.roomTypes as { roomType: { id: string }; bookable: boolean }[]).find((r) => r.bookable);
    test.skip(!type, "No room free tonight at the test hotel");

    // Book and pay tonight through the gateway (as the signed-in member), then the desk checks in and out.
    const quote = await page.request.post(`/api/v1/public/quotes`, { data: { hotelSlug: LEKKI, roomTypeId: type!.roomType.id, channel: "MARKETPLACE", checkIn, checkOut, adults: 1 } });
    expect(quote.ok(), await quote.text()).toBeTruthy();
    const q = await quote.json();
    expect(q.loyalty?.member).toBeTruthy();
    const booked = await page.request.post(`/api/v1/public/bookings`, {
      data: { quoteToken: q.quoteToken, paymentMode: "ONLINE", guest: { fullName: guest.name, phone: e164(guest.phone), email: guest.email }, consent: true },
    });
    expect(booked.ok(), await booked.text()).toBeTruthy();
    const { booking, manageToken, payment } = await booked.json();
    const paid = await page.request.post(`/api/v1/public/dev/payments/${payment.reference}/confirm`, { data: { outcome: "success", channel: "card" } });
    expect(paid.ok(), await paid.text()).toBeTruthy();

    await page.goto(`/trips/${booking.code}?t=${manageToken}`);
    await expect(page.getByTestId("points-to-earn")).toBeVisible();

    await checkInAndOut(request, { code: booking.code, roomTypeId: type!.roomType.id, checkIn, checkOut });

    await page.reload();
    const earned = page.getByTestId("points-earned");
    await expect(earned).toBeVisible();
    const pts = num(await earned.locator(".num").first().innerText());
    expect(pts).toBeGreaterThan(0);
    await page.goto("/trips");
    await page.getByRole("tab", { name: /Past/ }).click();
    await expect(page.getByTestId("trip-row").filter({ hasText: booking.code }).getByTestId("trip-points")).toContainText(`${pts.toLocaleString("en-NG")} points`);
    expect(await balance(page)).toBe(pts);
  });
});

test.describe("WhatsApp chat", () => {
  test("offered by Pro hotels only, prefilled with the booking code", async ({ page }) => {
    await page.goto(`/stays/${LEKKI}`);
    const chat = page.getByTestId("whatsapp-chat");
    await expect(chat).toBeVisible();
    await expect(chat).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+\?text=/);

    // Eko Tides is on Growth: no guest WhatsApp.
    await page.goto(`/stays/eko-tides`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("whatsapp-chat")).toHaveCount(0);

    // On a Pro hotel's confirmation and trip, the first message carries the code.
    await bookRoom(page, { slug: LEKKI, stay: futureStay(1), guest: newGuest(), pay: "PAY_AT_HOTEL" });
    await expect(page.getByTestId("confirmation-card")).toBeVisible();
    const code = await page.getByTestId("booking-code").innerText();
    const confirmChat = page.getByTestId("whatsapp-chat");
    await expect(confirmChat).toHaveAttribute("href", new RegExp(encodeURIComponent(code)));
    await page.getByTestId("manage-link").click();
    await expect(page.getByTestId("whatsapp-chat")).toHaveAttribute("href", new RegExp(encodeURIComponent(code)));
  });
});
