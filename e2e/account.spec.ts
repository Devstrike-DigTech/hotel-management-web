import { expect, test, type Page } from "@playwright/test";
import { bookRoom, e164, futureStay, newGuest, outboxFor, randomIp } from "./helpers";

test.use({ extraHTTPHeaders: { "x-forwarded-for": randomIp() } });

async function signInWithOtp(page: Page, phone: string) {
  await page.goto("/account/sign-in");
  await page.getByTestId("signin-phone").fill(phone);
  await page.getByTestId("signin-send").click();
  await expect(page.getByTestId("otp-0")).toBeVisible();
  const msg = await outboxFor(page.request, e164(phone), "OTP");
  const code = msg.meta?.otpCode ?? /\b(\d{6})\b/.exec(msg.text)![1];
  // Paste the whole code into the first box, as SMS autofill does.
  await page.getByTestId("otp-0").focus();
  await page.evaluate((c) => {
    const dt = new DataTransfer();
    dt.setData("text", c);
    document.activeElement!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, code);
}

test("sign in with a phone code, and the booking made earlier is in Trips", async ({ page }) => {
  const guest = newGuest();
  await bookRoom(page, { slug: "palmwine-house", stay: futureStay(2), guest, pay: "PAY_AT_HOTEL" });
  await expect(page.getByTestId("confirmation-card")).toBeVisible();
  const code = await page.getByTestId("booking-code").innerText();

  await signInWithOtp(page, guest.phone);
  // A first sign-in lands on the profile to add a name, then on to Trips.
  await page.waitForURL(/\/(account|trips)/);
  await page.goto("/trips");
  const trips = page.getByTestId("trips-upcoming");
  await expect(trips).toBeVisible();
  await expect(trips.getByTestId("trip-row").filter({ hasText: code })).toBeVisible();
  await expect(page.getByRole("link", { name: /Trips/ }).first()).toBeVisible();
});

test("a wrong code is refused calmly and can be corrected", async ({ page }) => {
  const phone = newGuest().phone;
  await page.goto("/account/sign-in");
  await page.getByTestId("signin-phone").fill(phone);
  await page.getByTestId("signin-send").click();
  await expect(page.getByTestId("otp-0")).toBeVisible();
  const msg = await outboxFor(page.request, e164(phone), "OTP");
  const right = msg.meta?.otpCode ?? /\b(\d{6})\b/.exec(msg.text)![1];
  const wrong = right === "000000" ? "111111" : "000000";
  // Typing moves along the boxes one by one.
  await page.getByTestId("otp-0").focus();
  await page.keyboard.type(wrong);
  await expect(page.getByText(/That code is not right/)).toBeVisible();
  await page.keyboard.type(right);
  await page.waitForURL(/\/(account|trips)/);
});

test("cancel a paid booking and see the refund", async ({ page }) => {
  const guest = newGuest();
  await bookRoom(page, { slug: "palmwine-house", stay: futureStay(2), guest, pay: "ONLINE" });
  await page.getByTestId("pay-now").click();
  await page.getByTestId("mock-pay").click();
  await expect(page.getByTestId("confirmation-card")).toBeVisible({ timeout: 30_000 });
  const paid = await page.getByTestId("paid-amount").innerText();

  // The manage link works without an account.
  await page.getByTestId("manage-link").click();
  await expect(page).toHaveURL(/\/trips\/.+\?t=/);
  await page.getByTestId("cancel-open").click();
  const dialog = page.getByTestId("cancel-dialog");
  await expect(dialog.getByTestId("cancel-preview")).toBeVisible();
  // Far in the future, so cancelling is free and the whole payment comes back.
  await expect(dialog.getByTestId("cancel-headline")).toContainText("free");
  await expect(dialog.getByTestId("cancel-refund")).toHaveText(paid);
  await dialog.getByTestId("cancel-confirm").click();
  await expect(dialog.getByTestId("cancel-done")).toBeVisible();
  await expect(dialog.getByTestId("refund-amount")).toHaveText(paid);
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(page.getByTestId("status-chip").first()).toContainText("Cancelled");
  await expect(page.getByTestId("cancellation-summary")).toContainText(paid);
});
