import { expect, test } from "@playwright/test";
import { API, bookRoom, futureStay, newGuest, randomIp } from "./helpers";

/**
 * M6: Harmattan Hotels & Suites runs on its own dedicated database. Guests should notice nothing:
 * the marketplace (fed by the backend's public listing projection) finds it, and it books as usual
 * (the seed hotel takes payment at the hotel; with Paystack it would pay online, which the test also covers).
 */
test.use({ extraHTTPHeaders: { "x-forwarded-for": randomIp() } });

test("a hotel on a dedicated database is found on the marketplace and booked end to end", async ({ page, request }) => {
  const list = await (await request.get(`${API}/public/hotels?q=Harmattan&pageSize=48`)).json();
  const hotel = (list.items as { slug: string; name: string; city: string }[]).find((h) => /^harmattan-/.test(h.slug) && h.city === "Abuja") ??
    (list.items as { slug: string; name: string; city: string }[]).find((h) => /^harmattan-/.test(h.slug));
  expect(hotel, "a Harmattan property in marketplace search").toBeTruthy();

  // Search by city finds it, dated or not.
  const stay = futureStay(2);
  await page.goto(`/stays?city=${encodeURIComponent(hotel!.city)}&checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=2`);
  const result = page.locator(`a[href^="/stays/${hotel!.slug}"]`).first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(hotel!.name);

  // Book it, paying the way the hotel accepts: online through the mock checkout, or at the hotel.
  const detail = await (await request.get(`${API}/public/hotels/${hotel!.slug}`)).json();
  const online = !!detail.booking?.payOnlineAvailable;
  const guest = newGuest();
  await bookRoom(page, { slug: hotel!.slug, stay, guest, pay: online ? "ONLINE" : "PAY_AT_HOTEL" });
  if (online) {
    await expect(page.getByTestId("held-panel")).toBeVisible();
    const due = await page.getByTestId("due-now").innerText();
    await page.getByTestId("pay-now").click();
    await expect(page).toHaveURL(/\/pay\/mock\?reference=/);
    await page.getByTestId("mock-pay").click();
    await expect(page.getByTestId("confirmation-card")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("paid-amount")).toHaveText(due);
  } else {
    await expect(page).toHaveURL(/\/booking\/confirmation\?code=/);
    await expect(page.getByTestId("confirmation-card")).toContainText("To pay at the hotel");
  }
  const card = page.getByTestId("confirmation-card");
  await expect(card).toContainText(hotel!.name);
  await expect(card).toContainText(guest.name);
  const code = (await page.getByTestId("booking-code").innerText()).trim();
  expect(code).toMatch(/[A-Z0-9]+-[A-Z0-9]+/);

  // The booking is on the hotel's own books (its dedicated database), readable by its link.
  const t = new URL(page.url()).searchParams.get("t");
  const view = await (await request.get(`${API}/public/trips/${code}?t=${encodeURIComponent(t!)}`)).json();
  expect(view.code).toBe(code);
  expect(view.hotel.slug).toBe(hotel!.slug);
});
