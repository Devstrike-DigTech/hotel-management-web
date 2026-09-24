import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { API, fillRequiredAnswers, futureStay, newGuest, randomIp, staffToken } from "./helpers";

/**
 * M7 on the guest side: the six booking-site templates over the seeded hotels, the Essentials
 * performance budget, booking through a hotel's own form (a conditional question, an extra and a
 * pickup from a motor park), email only for online payment, and the draft preview.
 */

const ADMIN_ORIGIN = new URL(process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001").origin;
/** JavaScript the Essentials hotel page may transfer on first load (API-M7: `performance.maxJsKb`). */
const ESSENTIALS_BUDGET = 120 * 1024;

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  // The sandbox cannot reach the photo CDN; fail those fast instead of waiting on them.
  await page.route(/images\.unsplash\.com/, (r) => r.abort());
});

async function previewToken(request: APIRequestContext, kinds: ("THEME" | "FORM")[] = ["THEME", "FORM"]) {
  const token = await staffToken(request);
  const res = await request.post(`${API}/site/preview-token`, { headers: { authorization: `Bearer ${token}` }, data: { kinds, ttlMinutes: 30 } });
  expect(res.ok(), `preview token: ${res.status()} ${await res.text()}`).toBeTruthy();
  return ((await res.json()) as { token: string }).token;
}

/** The template's page, its hero with the hotel's name, the rooms, and a mark of its own layout. */
async function expectTemplate(page: Page, id: string, marker: string) {
  await expect(page.locator(`.brand-scope[data-template="${id}"]`)).toBeVisible();
  await expect(page.locator(`[data-template-page="${id}"]`)).toBeVisible();
  await expect(page.locator("#hotel-name")).toBeVisible();
  await expect(page.locator('[data-section="rooms"]')).toBeVisible();
  await expect(page.locator(marker).first()).toBeAttached();
  // Visual smoke: the page draws something substantial, and a full-page image is kept with the run.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(height).toBeGreaterThan(1200);
  await page.screenshot({ path: `test-results/m7-template-${id}.png`, fullPage: true });
}

test.describe("booking-site templates", () => {
  const cases = [
    { id: "editorial", path: "/h/palmwine-house", marker: ".drop-cap" },
    { id: "business", path: "/h/palmwine-house-ikoyi", marker: '[data-testid="rates-table"]' },
    { id: "resort", path: "/h/eko-tides", marker: ".resort-mosaic" },
    { id: "heritage", path: "/h/harmattan-abuja", marker: ".heritage-frame" },
    { id: "essentials", path: "/h/bodija-heights", marker: '[data-testid="lite-room"]' },
  ];
  for (const c of cases) {
    test(`${c.id} renders for its seeded hotel`, async ({ page }) => {
      await page.goto(c.path);
      await expectTemplate(page, c.id, c.marker);
    });
  }

  test("boutique renders from the seeded draft behind a preview token", async ({ page, request }) => {
    // The seed leaves a Boutique draft on Palmwine Lekki; other suites (the admin's Brand Studio tests)
    // may have published or discarded it since, so put it back first.
    const staff = { authorization: `Bearer ${await staffToken(request)}` };
    const state = (await (await request.get(`${API}/site/theme`, { headers: staff })).json()) as { draft: { templateId: string } };
    if (state.draft.templateId !== "boutique") {
      const put = await request.put(`${API}/site/theme/draft`, { headers: { ...staff, "idempotency-key": `web-e2e-${Date.now()}` }, data: { templateId: "boutique", brand: { fontPairingId: "cormorant-manrope" } } });
      expect(put.ok(), await put.text()).toBeTruthy();
    }
    const token = await previewToken(request, ["THEME"]);
    await page.goto(`/h/palmwine-house?preview=${token}`);
    await expectTemplate(page, "boutique", "[data-hero-bleed]");
  });

  test("the group root is themed", async ({ page }) => {
    await page.goto("/g/harmattan");
    await expect(page.locator('.brand-scope[data-template="heritage"]')).toBeVisible();
  });

  test("the marketplace keeps its look but shows the hotel's mark", async ({ page }) => {
    await page.goto("/stays/palmwine-house-ikoyi");
    await expect(page.locator(".brand-scope")).toHaveCount(0);
    await expect(page.getByTestId("hotel-mark").first()).toBeVisible();
  });
});

test("Essentials stays inside its JavaScript budget", async ({ page }) => {
  let js = 0;
  const scripts: string[] = [];
  page.on("requestfinished", async (req) => {
    if (req.resourceType() !== "script") return;
    const sizes = await req.sizes();
    js += sizes.responseBodySize + sizes.responseHeadersSize;
    scripts.push(req.url());
  });
  const res = await page.goto("/h/bodija-heights", { waitUntil: "networkidle" });
  expect(res?.headers()["x-lite"]).toBe("1");
  await expect(page.locator('[data-template="essentials"]')).toBeVisible();
  await page.waitForTimeout(500);
  const inline = await page.evaluate(() => [...document.scripts].filter((s) => !s.src && s.type !== "application/ld+json").reduce((n, s) => n + (s.textContent?.length ?? 0), 0));
  console.log(`Essentials home: ${(js / 1024).toFixed(1)} KB of script files (${scripts.length}), ${(inline / 1024).toFixed(1)} KB inline`);
  expect(js + inline).toBeLessThan(ESSENTIALS_BUDGET);
  expect(await page.locator("script[src]").count()).toBe(0);
  // It still works without the framework: the theme switch flips, and a room's link opens the booking page.
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.locator("[data-lite-theme]").click();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).not.toBe(before);
  await page.getByTestId("lite-room").first().getByRole("link").click();
  await expect(page).toHaveURL(/\/h\/bodija-heights\/book\?room=/);
});

interface PublicField {
  key: string;
  type: string;
  source: string;
  section: string;
  required: string;
  options: { value: string; label: string }[];
  condition: { fieldKey: string; operator: string; value?: unknown } | null;
}

/** A question on the hotel's form that only shows for one answer to another question. */
async function conditionalField(request: APIRequestContext, slug: string) {
  const res = await request.get(`${API}/public/hotels/${slug}/booking-form?channel=BOOKING_SITE`);
  expect(res.ok()).toBeTruthy();
  const form = (await res.json()) as { fields: PublicField[] };
  for (const f of form.fields) {
    const c = f.condition;
    if (!c || !["EQUALS", "IN", "IS_TRUE"].includes(c.operator)) continue;
    const target = form.fields.find((x) => x.key === c.fieldKey);
    if (!target || !["SELECT", "YES_NO", "CHECKBOX"].includes(target.type)) continue;
    const value = c.operator === "IN" ? (c.value as string[])[0] : c.operator === "IS_TRUE" ? true : c.value;
    return { field: f, target, value };
  }
  return null;
}

async function setAnswer(page: Page, target: PublicField, value: unknown) {
  const el = page.getByTestId(`field-${target.key}`);
  if (target.type === "SELECT") {
    const tag = await el.evaluate((n) => n.tagName.toLowerCase());
    if (tag === "select") await el.selectOption(String(value));
    else await el.getByText(target.options.find((o) => o.value === value)!.label, { exact: true }).click();
  } else if (target.type === "YES_NO") await el.getByText(value ? "Yes" : "No", { exact: true }).click();
  else await el.check();
}

test("book through the hotel's own form: a conditional question, an extra and a motor-park pickup", async ({ page, request }) => {
  const slug = "palmwine-house";
  const cond = await conditionalField(request, slug);
  expect(cond, "the seeded form has a conditional question").toBeTruthy();
  const stay = futureStay(2);
  const guest = newGuest();
  await page.goto(`/h/${slug}/book?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=2`);
  await page.getByTestId("room-option").filter({ hasText: /Free for your dates|Only \d+ left/ }).first().click();
  await page.getByTestId("booking-next").click();

  // Details: the conditional question appears only for the answer that asks for it.
  await page.getByTestId("guest-name").fill(guest.name);
  await page.getByTestId("guest-phone").fill(guest.phone);
  const conditional = page.getByTestId(`field-${cond!.field.key}`);
  await expect(conditional).toHaveCount(0);
  await setAnswer(page, cond!.target, cond!.value);
  await expect(conditional).toBeVisible();
  if (cond!.field.type === "SELECT") await setAnswer(page, cond!.field, cond!.field.options[0].value);
  else await conditional.fill("Adaeze, turning 30");
  await fillRequiredAnswers(page);
  await page.getByTestId("booking-next").click();

  // Extras and getting here: an extra, and a pickup from Jibowu Motor Park off a GIGM bus from Abuja.
  await expect(page.getByTestId("step-addons")).toBeVisible();
  const extra = page.getByTestId("extra-option").filter({ has: page.locator('[data-testid="extra-toggle"]:not([disabled])') }).first();
  const extraName = (await extra.getAttribute("data-extra"))!;
  await extra.getByTestId("extra-toggle").click();
  await expect(extra.getByTestId("extra-toggle")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("pickup-toggle").check({ force: true });
  await page.getByTestId("pickup-kind-MOTOR_PARK").click();
  const park = page.getByTestId("pickup-point").filter({ hasText: /Jibowu/ });
  await expect(park).toBeVisible();
  await park.click();
  const gigm = await page.getByTestId("pickup-company").locator("option", { hasText: "God is Good" }).first().getAttribute("value");
  await page.getByTestId("pickup-company").selectOption(gigm!);
  await page.getByTestId("pickup-from-city").fill("Abuja");
  await page.getByTestId("pickup-time").fill("15:30");
  await page.getByTestId("pickup-ticket").fill("GIG-44821");
  await expect(page.getByTestId("pickup-price")).toContainText("₦");
  await page.getByTestId("booking-next").click();

  // Review: the answers, the pickup and the extra, priced by the quote.
  await expect(page.getByTestId("quote-total")).toBeVisible();
  await expect(page.getByTestId("review-transfers")).toContainText("Jibowu");
  await expect(page.getByTestId("review-extras")).toContainText(extraName.split(" ")[0]);
  await expect(page.getByTestId("addon-line").first()).toBeVisible();
  await page.getByTestId("pay-PAY_AT_HOTEL").click();
  await page.getByTestId("consent").check();
  await page.getByTestId("book-submit").click();

  // The card: the transfer with the motor-park details, and the extra in the ledger.
  const card = page.getByTestId("confirmation-card");
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(new RegExp(`/h/${slug}/booking/confirmation`));
  await expect(card.getByTestId("card-transfers")).toContainText("Jibowu");
  await expect(card.getByTestId("card-transfers")).toContainText(/GIG|God is Good/);
  await expect(card).toContainText(extraName.split(" ")[0]);
});

test("email is optional to pay at the hotel but needed to pay online", async ({ page }) => {
  const stay = futureStay(1);
  const guest = newGuest();
  await page.goto(`/h/palmwine-house/book?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&guests=2`);
  await page.getByTestId("room-option").filter({ hasText: /Free for your dates|Only \d+ left/ }).first().click();
  await page.getByTestId("booking-next").click();
  await page.getByTestId("guest-name").fill(guest.name);
  await page.getByTestId("guest-phone").fill(guest.phone);
  await expect(page.getByTestId("guest-email")).not.toHaveAttribute("aria-required", "true");
  await fillRequiredAnswers(page);
  await page.getByTestId("booking-next").click();
  const addons = page.getByTestId("step-addons");
  await expect(addons.or(page.getByTestId("quote-total")).first()).toBeVisible();
  if (await addons.isVisible()) await page.getByTestId("booking-next").click();
  await expect(page.getByTestId("quote-total")).toBeVisible();

  // Online without an email: asked for it at once, and nothing is held.
  await page.getByTestId("pay-ONLINE").click();
  await page.getByTestId("consent").check();
  await expect(page.getByTestId("review-email")).toBeVisible();
  await page.getByTestId("book-submit").click();
  await expect(page.getByTestId("review-email-box")).toContainText(/email/i);
  await expect(page.getByTestId("held-panel")).toHaveCount(0);

  // At the hotel it is not needed: the booking is confirmed without one.
  await page.getByTestId("pay-PAY_AT_HOTEL").click();
  await expect(page.getByTestId("review-email")).toHaveCount(0);
  await page.getByTestId("book-submit").click();
  await expect(page.getByTestId("confirmation-card")).toBeVisible({ timeout: 30_000 });
});

test("a preview token shows the draft theme with a banner, noindex and admin-only framing", async ({ page, request, browser, baseURL }) => {
  const token = await previewToken(request);
  const res = await page.goto(`/h/palmwine-house?preview=${token}`);
  expect(res?.headers()["content-security-policy"]).toBe(`frame-ancestors ${ADMIN_ORIGIN}`);
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.getByTestId("preview-banner")).toContainText("Draft preview");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  // The published site is untouched and frameable only by itself and the admin.
  const live = await page.request.get("/h/palmwine-house?preview=off");
  expect(live.headers()["content-security-policy"]).toBe(`frame-ancestors 'self' ${ADMIN_ORIGIN}`);
  const other = await browser.newContext({ baseURL });
  const fresh = await other.newPage();
  await fresh.goto("/h/palmwine-house");
  await expect(fresh.getByTestId("preview-banner")).toHaveCount(0);
  await expect(fresh.locator('.brand-scope[data-template="editorial"]')).toBeVisible();
  await other.close();
  // The draft booking form: shown, but the final booking is switched off.
  await page.goto(`/h/palmwine-house/book?preview=${token}`);
  await expect(page.getByTestId("preview-banner")).toBeVisible();
});
