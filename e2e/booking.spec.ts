import { expect, test } from "@playwright/test";
import { bookRoom, futureStay, newGuest, randomIp } from "./helpers";

test.use({ extraHTTPHeaders: { "x-forwarded-for": randomIp() } });

test("book online and pay with the mock Paystack checkout", async ({ page }) => {
  const guest = newGuest();
  await bookRoom(page, { slug: "palmwine-house", stay: futureStay(2), guest, pay: "ONLINE" });

  // The room is held with a calm twenty-minute countdown before paying.
  await expect(page.getByTestId("held-panel")).toBeVisible();
  await expect(page.getByTestId("hold-countdown")).toContainText(/Your room is held/);
  const due = await page.getByTestId("due-now").innerText();
  await page.getByTestId("pay-now").click();

  // Development checkout stands in for Paystack.
  await expect(page).toHaveURL(/\/pay\/mock\?reference=/);
  await expect(page.getByTestId("mock-amount")).toHaveText(due);
  await page.getByTestId("mock-pay").click();

  // Back on the site: verify, then the printed confirmation card.
  await expect(page).toHaveURL(/\/booking\/confirmation/);
  const card = page.getByTestId("confirmation-card");
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("booking-code")).toHaveText(/[A-Z0-9]+-[A-Z0-9]+/);
  await expect(page.getByTestId("paid-amount")).toHaveText(due);
  await expect(page.getByTestId("balance-amount")).toHaveText("₦0");
  await expect(card).toContainText(guest.name);
  // A reload no longer depends on the payment reference.
  await expect(page).toHaveURL(/code=.*&t=/);
});

test("book and pay at the hotel", async ({ page }) => {
  const guest = newGuest();
  await bookRoom(page, { slug: "palmwine-house", stay: futureStay(1), guest, pay: "PAY_AT_HOTEL" });

  await expect(page).toHaveURL(/\/booking\/confirmation\?code=/);
  const card = page.getByTestId("confirmation-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText("To pay at the hotel");
  await expect(page.getByTestId("balance-amount")).not.toHaveText("₦0");
  await expect(page.getByText("Booking confirmed, pay at the hotel")).toBeVisible();
});

test("a microsite booking stays on the hotel's own site", async ({ page }) => {
  const guest = newGuest();
  await bookRoom(page, { slug: "palmwine-house", base: "/h/palmwine-house", stay: futureStay(1), guest, pay: "PAY_AT_HOTEL" });
  await expect(page).toHaveURL(/\/h\/palmwine-house\/booking\/confirmation\?code=/);
  await expect(page.getByTestId("confirmation-card")).toBeVisible();
});
