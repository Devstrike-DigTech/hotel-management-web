import { expect, test } from "@playwright/test";
import { API, bookRoom, futureStay, newGuest, randomIp } from "./helpers";

/**
 * M6: Harmattan Hotels & Suites runs on its own dedicated database. Guests should notice nothing:
 * the marketplace (fed by the backend's public listing projection) finds it, and it books as usual.
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
  const card = page.locator(`a[href^="/stays/${hotel!.slug}"]`).first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(hotel!.name);

  // Book online and pay on the mock checkout.
  const guest = newGuest();
  await bookRoom(page, { slug: hotel!.slug, stay, guest, pay: "ONLINE" });
  await expect(page.getByTestId("held-panel")).toBeVisible();
  const due = await page.getByTestId("due-now").innerText();
  await page.getByTestId("pay-now").click();
  await expect(page).toHaveURL(/\/pay\/mock\?reference=/);
  await page.getByTestId("mock-pay").click();
  await expect(page.getByTestId("confirmation-card")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("paid-amount")).toHaveText(due);
  await expect(page.getByTestId("confirmation-card")).toContainText(hotel!.name);
  await expect(page.getByTestId("booking-code")).toHaveText(/[A-Z0-9]+-[A-Z0-9]+/);
});
