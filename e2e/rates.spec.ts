import { expect, test, type Page } from "@playwright/test";
import { addDays, bookRoom, futureStay, lagosToday, newGuest, randomIp } from "./helpers";

/**
 * M4 on the guest side, against the seeded Palmwine House (API-M4.md section 10): rate plans
 * BAR and Non-refundable (-10%), seasons "Weekend +10%" (Fri, Sat) and "Detty December +35%"
 * (15 Dec - 5 Jan), promo codes WELCOME10 (10%) and EASTER15 (expired).
 */
test.use({ extraHTTPHeaders: { "x-forwarded-for": randomIp() } });

const SLUG = "palmwine-house";
const naira = (s: string) => Math.round(Number(s.replace(/[^\d.-]/g, "")) * 100); // "₦12,500" -> kobo

/** A weekday stay: no weekend or December nights, so every night is at the room's base price. */
function weekdayStay(nights: number) {
  for (;;) {
    const s = futureStay(nights);
    const days = Array.from({ length: nights }, (_, i) => addDays(s.checkIn, i));
    const ok = days.every((d) => {
      const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
      const md = d.slice(5);
      return dow !== 5 && dow !== 6 && !(md >= "12-15" || md <= "01-05") && !(md >= "03-20" && md <= "04-30");
    });
    if (ok) return s;
  }
}

async function heldAmount(page: Page) {
  await expect(page.getByTestId("held-panel")).toBeVisible();
  return naira(await page.getByTestId("due-now").innerText());
}

test("book with a promo code: the saving is shown and is what is charged", async ({ page }) => {
  const guest = newGuest();
  const stay = weekdayStay(2);

  // A refused code first: precise, and the price is left alone.
  await page.goto(`/stays/${SLUG}/book?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=2`);
  await page.getByTestId("room-option").filter({ hasText: /Free for your dates|Only \d+ left/ }).first().click();
  await page.getByTestId("booking-next").click();
  await page.getByTestId("guest-name").fill(guest.name);
  await page.getByTestId("guest-phone").fill(guest.phone);
  await page.getByTestId("guest-email").fill(guest.email);
  await page.getByTestId("booking-next").click();
  const before = naira(await page.getByTestId("quote-total").innerText());
  await page.getByTestId("promo-open").click();
  await page.getByTestId("promo-input").fill("EASTER15");
  await page.getByTestId("promo-apply").click();
  await expect(page.getByTestId("promo-error")).toHaveAttribute("data-code", "EXPIRED");
  await expect(page.getByTestId("promo-error")).toContainText("EASTER15");
  expect(naira(await page.getByTestId("quote-total").innerText())).toBe(before);

  // Then the real one.
  const subtotal = naira(await page.getByTestId("nights-subtotal").innerText());
  await page.getByTestId("promo-input").fill("welcome10");
  await page.getByTestId("promo-apply").click();
  await expect(page.getByTestId("promo-applied")).toContainText("WELCOME10");
  const saving = naira(await page.getByTestId("promo-saving").innerText());
  expect(Math.abs(saving - subtotal / 10)).toBeLessThanOrEqual(100 * 2); // 10% of the room, to the naira per night
  await expect(page.getByTestId("discount-line")).toContainText("Promo WELCOME10");
  await expect(page.getByTestId("saving-line")).toBeVisible();
  const total = naira(await page.getByTestId("quote-total").innerText());
  expect(total).toBeLessThan(before);

  // Hold, pay on the practice checkout: the discounted total is what is charged.
  await page.getByTestId("pay-ONLINE").click();
  await page.getByTestId("consent").check();
  await page.getByTestId("book-submit").click();
  expect(await heldAmount(page)).toBe(total);
  await page.getByTestId("pay-now").click();
  await expect(page).toHaveURL(/\/pay\/mock\?reference=/);
  expect(naira(await page.getByTestId("mock-amount").innerText())).toBe(total);
  await page.getByTestId("mock-pay").click();
  await expect(page.getByTestId("confirmation-card")).toBeVisible({ timeout: 30_000 });
  expect(naira(await page.getByTestId("paid-amount").innerText())).toBe(total);
  await expect(page.getByTestId("card-discount")).toHaveText(`-₦${Math.round(saving / 100).toLocaleString("en-US")}`);
});

test("book the non-refundable rate on the hotel's own site: the policy is stated and pay-at-hotel is off", async ({ page }) => {
  const guest = newGuest();
  const stay = weekdayStay(2);

  // The hotel page sets out both rates with their terms.
  await page.goto(`/h/${SLUG}?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=2`);
  const ledger = page.getByTestId("plan-ledger").first();
  await expect(ledger.locator('[data-plan-kind="BAR"]')).toContainText(/Free cancellation until/);
  await expect(ledger.locator('[data-plan-kind="NON_REFUNDABLE"]')).toContainText(/No refund if you cancel/);
  await expect(ledger.locator('[data-plan-kind="NON_REFUNDABLE"]')).toContainText(/Saves ₦/);

  await bookRoom(page, { slug: SLUG, base: `/h/${SLUG}`, stay, guest, pay: "ONLINE", planKind: "NON_REFUNDABLE" });
  // Step three said so before anything was booked; the hold carries on as usual.
  await expect(page.getByTestId("held-panel")).toBeVisible();
  await page.getByTestId("pay-now").click();
  await page.getByTestId("mock-pay").click();
  await expect(page).toHaveURL(/\/h\/palmwine-house\/booking\/confirmation/);
  const card = page.getByTestId("confirmation-card");
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card).toContainText(/Non-refundable/);
  await expect(card).not.toContainText(/Free cancellation until/);
});

test("the review step states the non-refundable terms and offers no pay-at-hotel", async ({ page }) => {
  const guest = newGuest();
  const stay = weekdayStay(1);
  await page.goto(`/stays/${SLUG}/book?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=2`);
  await page.getByTestId("room-option").filter({ hasText: /Free for your dates|Only \d+ left/ }).first().click();
  await page.locator('[data-testid="plan-option"][data-plan-kind="NON_REFUNDABLE"]').click();
  await page.getByTestId("booking-next").click();
  await page.getByTestId("guest-name").fill(guest.name);
  await page.getByTestId("guest-phone").fill(guest.phone);
  await page.getByTestId("guest-email").fill(guest.email);
  await page.getByTestId("booking-next").click();
  await expect(page.getByTestId("quote-total")).toBeVisible();
  await expect(page.getByTestId("policy-line")).toHaveAttribute("data-policy", "non-refundable");
  await expect(page.getByTestId("policy-line")).toContainText("nothing is refunded");
  await expect(page.getByTestId("pay-PAY_AT_HOTEL").locator("input")).toBeDisabled();
});

test("a stay into Detty December is priced night by night, with the correct total", async ({ page, request }) => {
  // Mon 14 and Tue 15 Dec: one ordinary night, one Detty December night (+35%). Next year's once this year's has passed.
  let year = Number(lagosToday().slice(0, 4));
  if (`${year}-12-13` < lagosToday()) year += 1;
  const checkIn = `${year}-12-14`;
  const checkOut = `${year}-12-16`;
  test.skip([5, 6].includes(new Date(`${checkIn}T00:00:00Z`).getUTCDay()) || [5, 6].includes(new Date(`${year}-12-15T00:00:00Z`).getUTCDay()), "Weekend nights this year");

  const hotel = await (await request.get(`/api/v1/public/hotels/${SLUG}`)).json();
  const avail = await (await request.get(`/api/v1/public/hotels/${SLUG}/availability?checkIn=${checkIn}&checkOut=${checkOut}&adults=2`)).json();
  const free = (avail.roomTypes as { roomType: { id: string; name: string }; bookable: boolean }[]).find((r) => r.bookable);
  test.skip(!free, "No room free over those nights");
  const base = (hotel.roomTypes as { id: string; basePriceKobo: number }[]).find((r) => r.id === free!.roomType.id)!.basePriceKobo;
  const detty = Math.round((base * 1.35) / 100) * 100;

  // The date picker shows the price calendar for this hotel.
  await page.goto(`/stays/${SLUG}/book?room=${free!.roomType.id}&checkIn=${checkIn}&checkOut=${checkOut}&guests=2`);
  await expect(page.locator(`[data-date="${checkIn}"][data-price]`)).toBeVisible();
  await expect(page.locator(`[data-date="${year}-12-15"]`)).toHaveAttribute("data-price", /\d+/);

  const guest = newGuest();
  await page.getByTestId("booking-next").click();
  await page.getByTestId("guest-name").fill(guest.name);
  await page.getByTestId("guest-phone").fill(guest.phone);
  await page.getByTestId("guest-email").fill(guest.email);
  await page.getByTestId("booking-next").click();

  // Nights differ, so the ledger lists each one, with its season.
  const nights = page.getByTestId("night-line");
  await expect(nights).toHaveCount(2);
  await expect(nights.nth(1)).toContainText("Detty December");
  const amounts = await page.getByTestId("night-amount").allInnerTexts();
  expect(amounts.map(naira)).toEqual([base, detty]);
  expect(naira(await page.getByTestId("nights-subtotal").innerText())).toBe(base + detty);
});
