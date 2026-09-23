import { expect, test } from "@playwright/test";
import { futureStay, randomIp } from "./helpers";

test.use({ extraHTTPHeaders: { "x-forwarded-for": randomIp() } });

test("search with dates shows only hotels with rooms free, priced for the stay", async ({ page }) => {
  const stay = futureStay(3);
  await page.goto(`/stays?city=Lagos&checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=2`);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Lagos");
  const prices = page.getByTestId("result-price");
  await expect(prices.first()).toBeVisible();
  await expect(prices.first()).toContainText("3 nights, all in");
  await expect(prices.first()).toContainText(/room types? free/);

  // The dates travel with the guest into the hotel page, which prices every room live.
  await page.getByRole("article").first().getByRole("link").first().click();
  await expect(page).toHaveURL(new RegExp(`checkIn=${stay.checkIn}`));
  const offer = page.getByTestId("room-offer").first();
  await expect(offer).toContainText(/3 nights, all in|Full on your dates|Too small/);
  await expect(page.getByTestId("stay-card")).toContainText("3 nights, taxes included");
  await expect(page.getByTestId("cancellation-policy")).toBeVisible();
  await expect(page.locator("#reviews")).toBeVisible();
});
