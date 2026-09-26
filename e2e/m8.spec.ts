import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { API, fillRequiredAnswers, futureStay, newGuest, e164, randomIp, staffToken } from "./helpers";

/**
 * M8: the concierge on the guest side (API-M8 4.6, 6.7-6.10, 15.1), against the live backend and its
 * seed (The Palmwine House, Lekki: twelve lawful services, the concierge switched on).
 */

const SLUG = "palmwine-house";

interface PublicService {
  id: string;
  name: string;
  pricing: string;
  requiresSlot: boolean;
  discreetEligible: boolean;
  preArrival: boolean;
  duringStay: boolean;
  variants: { id: string }[];
}

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
});

async function services(request: APIRequestContext, channel?: string): Promise<PublicService[]> {
  const res = await request.get(`/api/v1/public/hotels/${SLUG}/concierge${channel ? `?channel=${channel}` : ""}`);
  expect(res.ok(), `catalogue: ${res.status()}`).toBeTruthy();
  return ((await res.json()) as { services: PublicService[] }).services;
}

/** A pay-at-hotel booking made through the web's gateway: its code and manage token. */
async function book(request: APIRequestContext) {
  const stay = futureStay(3);
  const guest = newGuest();
  const hotel = await (await request.get(`/api/v1/public/hotels/${SLUG}`)).json();
  for (const rt of hotel.roomTypes as { id: string }[]) {
    const q = await request.post(`/api/v1/public/quotes`, {
      data: { hotelSlug: SLUG, roomTypeId: rt.id, channel: "BOOKING_SITE", stayType: "NIGHTLY", checkIn: stay.checkIn, checkOut: stay.checkOut, adults: 2, children: 0 },
    });
    if (!q.ok()) continue;
    const { quoteToken } = await q.json();
    const b = await request.post(`/api/v1/public/bookings`, {
      headers: { "idempotency-key": crypto.randomUUID() },
      data: { quoteToken, paymentMode: "PAY_AT_HOTEL", guest: { fullName: guest.name, phone: e164(guest.phone), email: guest.email }, consent: true, answers: {} },
    });
    if (b.ok()) {
      const j = await b.json();
      return { code: j.booking.code as string, token: j.manageToken as string, stay };
    }
  }
  throw new Error("no room could be booked");
}

const tripUrl = (t: { code: string; token: string }) => `/h/${SLUG}/trips/${t.code}?t=${encodeURIComponent(t.token)}`;

/** Fills the open request form: the first variant, required questions, a free time when one is needed. */
async function fillRequest(page: Page) {
  const form = page.getByTestId("concierge-form");
  await expect(form).toBeVisible();
  const variants = form.getByTestId("variants");
  if (await variants.count()) await variants.locator("label").first().click();
  await fillRequiredAnswers(page);
  for (const group of await form.locator('[role="radiogroup"][data-testid^="q-"]').all()) {
    if (!(await group.locator("input:checked").count())) await group.locator("label").first().click();
  }
  const picker = form.getByTestId("slot-picker");
  if (await picker.count()) {
    for (const day of await picker.locator('[data-testid^="day-"]').all()) {
      await day.click();
      const free = picker.locator('[data-testid^="slot-"]:not(:has(input[disabled]))');
      await expect(free.first().or(picker.getByText(/Nothing is free/))).toBeVisible();
      if (await free.count()) {
        await free.first().click();
        break;
      }
    }
  }
}

test("a fixed-price service from the trip page: paid on the practice checkout, then confirmed", async ({ page, request }) => {
  const trip = await book(request);
  const s = (await services(request)).find((x) => x.duringStay && ["FIXED", "PER_HOUR", "PER_PERSON"].includes(x.pricing))!;
  expect(s, "a fixed-price service").toBeTruthy();

  await page.goto(tripUrl(trip));
  await page.getByTestId("concierge-open").click();
  await page.getByTestId(`service-${s.id}`).click();
  await expect(page.getByTestId("service-price")).toContainText("₦");
  await fillRequest(page);
  await page.getByTestId("concierge-submit").click();

  // Before arrival the bill is not open, so it is paid online to confirm.
  const sent = page.getByTestId("concierge-sent");
  await expect(sent).toBeVisible();
  const status = await sent.getAttribute("data-status");
  if (status !== "CONFIRMED") {
    await page.getByTestId("concierge-pay").click();
    await expect(page.getByTestId("mock-amount")).toContainText("₦");
    await page.getByTestId("mock-pay").click();
    await page.waitForURL(/\/trips\/|\/concierge\/q\//, { timeout: 30_000 });
    if (!/\/trips\//.test(page.url())) await page.goto(tripUrl(trip));
  } else await page.goto(tripUrl(trip));

  const card = page.getByTestId("concierge-request").filter({ hasText: s.name });
  await expect(card).toHaveAttribute("data-status", /CONFIRMED|SCHEDULED/, { timeout: 30_000 });
  await expect(card.getByTestId("request-status")).toHaveText(/Confirmed|Booked in/);
});

test("a 'from' price: the concierge quotes, the guest accepts and pays, and it is confirmed", async ({ page, request }) => {
  const trip = await book(request);
  const s = (await services(request)).find((x) => x.duringStay && x.pricing === "FROM")!;
  expect(s, "a quoted service").toBeTruthy();

  await page.goto(tripUrl(trip));
  await page.getByTestId("concierge-open").click();
  await page.getByTestId(`service-${s.id}`).click();
  await fillRequest(page);
  await expect(page.getByTestId("concierge-submit")).toHaveText(/Ask for a price/);
  await page.getByTestId("concierge-submit").click();
  await expect(page.getByTestId("concierge-sent")).toHaveAttribute("data-status", "NEW");

  // The concierge sends a price (staff API).
  const staff = { authorization: `Bearer ${await staffToken(request)}` };
  const list = await (await request.get(`${API}/concierge/requests?q=${trip.code}`, { headers: staff })).json();
  const item = (list.items as { id: string; title: string; status: string }[]).find((r) => r.title === s.name && r.status === "NEW");
  expect(item, "the request on the staff side").toBeTruthy();
  const quoted = await request.post(`${API}/concierge/requests/${item!.id}/quote`, {
    headers: { ...staff, "idempotency-key": crypto.randomUUID() },
    data: { amountKobo: 9_500_000, note: "Three courses for two, with a vegetarian main." },
  });
  expect(quoted.ok(), await quoted.text()).toBeTruthy();

  await page.goto(tripUrl(trip));
  const card = page.getByTestId("concierge-request").filter({ hasText: s.name });
  await expect(card.getByTestId("request-status")).toHaveText(/Price ready/);
  await card.getByTestId("see-quote").click();

  await expect(page.getByTestId("quote-page")).toHaveAttribute("data-state", "OPEN");
  await expect(page.getByTestId("quote-total")).toContainText("₦");
  await expect(page.getByTestId("quote-card")).toContainText("Three courses for two");
  await page.getByText("Pay now", { exact: true }).click();
  await expect(page.getByTestId("quote-pay-online")).toBeChecked();
  await page.getByTestId("quote-accept").click();
  await page.getByTestId("mock-pay").click();
  await page.waitForURL(/\/concierge\/q\//, { timeout: 30_000 });
  await expect(page.getByTestId("quote-page")).toHaveAttribute("data-status", "CONFIRMED", { timeout: 30_000 });
  await expect(page.getByTestId("quote-outcome-title")).toHaveText(/Paid and confirmed/);
});

test("a service added in the booking step is on the confirmation", async ({ page, request }) => {
  const s = (await services(request, "BOOKING_FLOW")).find((x) => x.preArrival)!;
  expect(s, "a service offered while booking").toBeTruthy();
  const stay = futureStay(2);
  const guest = newGuest();
  await page.goto(`/h/${SLUG}/book?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=2`);
  await page.getByTestId("room-option").filter({ hasText: /Free for your dates|Only \d+ left/ }).first().click();
  await page.getByTestId("booking-next").click();
  await page.getByTestId("guest-name").fill(guest.name);
  await page.getByTestId("guest-phone").fill(guest.phone);
  await page.getByTestId("guest-email").fill(guest.email);
  await fillRequiredAnswers(page);
  await page.getByTestId("booking-next").click();
  const addons = page.getByTestId("step-addons");
  const arrange = page.getByTestId("step-arrange");
  await expect(addons.or(arrange).first()).toBeVisible();
  if (await addons.isVisible()) {
    await fillRequiredAnswers(page);
    await page.getByTestId("booking-next").click();
  }
  await expect(arrange).toBeVisible();
  await page.getByTestId(`arrange-add-${s.id}`).click();
  await fillRequest(page);
  await page.getByTestId("concierge-submit").click();
  await expect(page.getByTestId("arranged-list")).toContainText(s.name);
  await page.getByTestId("booking-next").click();

  await expect(page.getByTestId("review-arranged")).toContainText(s.name);
  await page.getByTestId("pay-PAY_AT_HOTEL").click();
  await page.getByTestId("consent").check();
  await page.getByTestId("book-submit").click();
  await expect(page.getByTestId("confirmation-card")).toBeVisible({ timeout: 30_000 });
  const panel = page.getByTestId("trip-concierge");
  await expect(panel.getByTestId("concierge-request").filter({ hasText: s.name })).toBeVisible({ timeout: 30_000 });
});

test("a private request: plain reassurance, never the room phone, and marked private", async ({ page, request }) => {
  const trip = await book(request);
  const s = (await services(request)).find((x) => x.duringStay && x.discreetEligible)!;
  expect(s, "a service that can be private").toBeTruthy();
  await page.goto(tripUrl(trip));
  await page.getByTestId("concierge-open").click();
  await page.getByTestId(`service-${s.id}`).click();
  await fillRequest(page);

  const copy = page.getByTestId("discreet-copy");
  await expect(copy).toHaveText("Only the concierge team sees this.");
  await page.getByTestId("discreet-toggle").check();
  await expect(copy).toContainText("Only the concierge team sees this.");
  await expect(copy).toContainText("never through your room phone");
  const options = page.getByTestId("contact-options");
  await expect(options).toContainText("WhatsApp");
  await expect(options).toContainText("Text message");
  await expect(options).not.toContainText(/room/i);
  await options.getByText("Text message").click();
  await expect(page.getByTestId("contact-SMS")).toBeChecked();
  await page.getByTestId("concierge-submit").click();
  await expect(page.getByTestId("concierge-sent")).toContainText("only the concierge team can see it");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("concierge-request").filter({ hasText: s.name })).toContainText("Private");
});

test("something else, held for review, reads the same as any request: we'll get back to you", async ({ page, request }) => {
  const trip = await book(request);
  await page.goto(tripUrl(trip));
  await page.getByTestId("concierge-open").click();
  await page.getByTestId("ask-something-else").click();
  await page.getByTestId("free-form-ask").fill("Could you find us some weed for the evening?");
  await page.getByTestId("concierge-submit").click();
  const sent = page.getByTestId("concierge-sent");
  await expect(sent).toHaveAttribute("data-status", "NEW");
  await expect(sent).toContainText(/get back to you/);
  await page.keyboard.press("Escape");
  const card = page.getByTestId("concierge-request").filter({ hasText: "Something else" });
  await expect(card.getByTestId("request-status")).toHaveText("Received");
  await expect(card.getByTestId("request-line")).toContainText(/get back to you/);
  await expect(card).not.toContainText(/review|flag/i);
});

test("the concierge on the hotel's home and its catalogue; Essentials serves it without scripts", async ({ page, request }) => {
  const list = await services(request);
  await page.goto(`/h/${SLUG}`);
  await expect(page.getByTestId("concierge-showcase")).toBeVisible();
  await page.getByTestId("concierge-all").click();
  await expect(page.getByTestId("concierge-catalogue")).toBeVisible();
  await expect(page.getByTestId("catalogue-service")).toHaveCount(list.length);

  // Essentials: the catalogue page is plain HTML, like the home (the M7 budget still holds).
  const res = await request.get(`/h/${SLUG}/concierge?template=essentials`, { headers: { accept: "text/html" } });
  expect(res.headers()["x-lite"]).toBe("1");
  const html = await res.text();
  expect(html).not.toMatch(/<script[^>]+src=/);
  expect(html).toContain("Arrange something for your stay");
});
