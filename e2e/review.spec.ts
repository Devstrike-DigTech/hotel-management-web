import { expect, test, type APIRequestContext } from "@playwright/test";
import { addDays, API, e164, lagosToday, newGuest, randomIp, staffToken } from "./helpers";

const ip = randomIp();
test.use({ extraHTTPHeaders: { "x-forwarded-for": ip } });

/**
 * A real, checked-out stay: book and pay tonight through the public API, then check in and out
 * as the hotel's front desk. Only then does the backend issue a review token.
 */
async function checkedOutStay(request: APIRequestContext) {
  const slug = "palmwine-house";
  const checkIn = lagosToday();
  const checkOut = addDays(checkIn, 1);
  const guest = newGuest();

  const avail = await (await request.get(`/api/v1/public/hotels/${slug}/availability?checkIn=${checkIn}&checkOut=${checkOut}&adults=1`)).json();
  const type = (avail.roomTypes as { roomType: { id: string }; bookable: boolean }[]).find((r) => r.bookable);
  test.skip(!type, "No room free tonight at the test hotel");

  const quote = await request.post(`/api/v1/public/quotes`, {
    data: { hotelSlug: slug, roomTypeId: type!.roomType.id, channel: "MARKETPLACE", checkIn, checkOut, adults: 1 },
  });
  expect(quote.ok(), await quote.text()).toBeTruthy();
  const { quoteToken } = await quote.json();
  const booked = await request.post(`/api/v1/public/bookings`, {
    data: { quoteToken, paymentMode: "ONLINE", guest: { fullName: guest.name, phone: e164(guest.phone), email: guest.email }, consent: true },
  });
  expect(booked.ok(), await booked.text()).toBeTruthy();
  const { booking, manageToken, payment } = await booked.json();
  const paid = await request.post(`/api/v1/public/dev/payments/${payment.reference}/confirm`, { data: { outcome: "success", channel: "card" } });
  expect(paid.ok(), await paid.text()).toBeTruthy();

  // The front desk checks the guest in and straight out again.
  const token = await staffToken(request);
  const auth = { authorization: `Bearer ${token}` };
  const list = await (await request.get(`${API}/reservations?q=${booking.code}`, { headers: auth })).json();
  const res = (list.items as { id: string; code: string }[]).find((r) => r.code === booking.code)!;
  const rooms = await (
    await request.get(`${API}/availability/rooms?roomTypeId=${type!.roomType.id}&stayType=NIGHTLY&arrivalDate=${checkIn}&departureDate=${checkOut}&forCheckIn=true`, { headers: auth })
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

  const trip = await (await request.get(`/api/v1/public/trips/${booking.code}?t=${manageToken}`)).json();
  expect(trip.review.eligible).toBeTruthy();
  return { code: booking.code as string, manageToken: manageToken as string, reviewToken: trip.review.token as string, guest };
}

test("submit a review from the emailed link", async ({ page, request }) => {
  const stay = await checkedOutStay(request);

  // The trip page offers the review; the link is the same one the email carries.
  await page.goto(`/trips/${stay.code}?t=${stay.manageToken}`);
  await expect(page.getByTestId("review-cta")).toBeVisible();
  await page.goto(`/review?t=${encodeURIComponent(stay.reviewToken)}`);

  const form = page.getByTestId("review-form");
  await expect(form).toBeVisible();
  // Submitting empty explains what is missing.
  await page.getByTestId("review-submit").click();
  await expect(page.getByText("Rate overall")).toBeVisible();

  for (const [name, n] of [["overall", 4], ["cleanliness", 5], ["service", 4], ["location", 5], ["value", 3]] as const) {
    await page.getByTestId(`${name}-${n}`).check({ force: true });
  }
  await page.getByTestId("type-COUPLE").check({ force: true });
  await page.getByLabel("A headline").fill("Quiet, clean and close to the lagoon");
  await page
    .getByTestId("review-body")
    .fill("The room was spotless, the power never dropped, and the desk booked us a driver to the island. Breakfast could start earlier.");
  const posted = page.waitForResponse((r) => r.url().endsWith("/api/v1/public/reviews") && r.request().method() === "POST");
  await page.getByTestId("review-submit").click();
  const review = (await (await posted).json()) as { id: string };

  await expect(page.getByTestId("review-done")).toBeVisible();
  await expect(page.getByTestId("review-done")).toContainText("Quiet, clean and close to the lagoon");

  // One review per stay: the link now says so.
  await page.goto(`/review?t=${encodeURIComponent(stay.reviewToken)}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("You have reviewed this stay");

  // Leave the demo guest book as it was: a platform moderator hides the test review.
  await hideReview(request, review.id);
});

async function hideReview(request: APIRequestContext, id: string) {
  const login = await request.post(`${API}/platform/auth/login`, {
    data: { email: process.env.E2E_PLATFORM_EMAIL || "admin@devstrike.ng", password: process.env.E2E_PLATFORM_PASSWORD || "Admin1234!" },
  });
  if (!login.ok()) return;
  const { accessToken } = await login.json();
  await request.patch(`${API}/platform/reviews/${id}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    data: { status: "HIDDEN", reason: "SPAM", note: "Automated web test review" },
  });
}
