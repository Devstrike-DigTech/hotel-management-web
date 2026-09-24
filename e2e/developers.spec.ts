import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { API } from "./helpers";

/** The partner spec straight from the backend, to check the reference against. */
const SPEC_URL = API.replace(/\/api\/v1$/, "") + "/api/partner/v1/openapi.json";

const preinstalled = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM || (existsSync(preinstalled) ? preinstalled : undefined);
// A hotel's custom domain, pointed at this app the way DNS would in production.
test.use({ launchOptions: { executablePath, args: ["--host-resolver-rules=MAP book.harmattanhotels.com 127.0.0.1", "--no-proxy-server"] } });

test("the reference is rendered from the live OpenAPI document", async ({ page, request }) => {
  const spec = await (await request.get(SPEC_URL)).json();
  const paths = Object.keys(spec.paths as Record<string, unknown>);
  const opCount = paths.reduce((n, p) => n + Object.keys(spec.paths[p]).filter((m) => ["get", "post", "put", "patch", "delete"].includes(m)).length, 0);

  await page.goto("/developers/reference");
  await expect(page.getByTestId("spec-source")).toContainText("live specification");
  // Every operation in the spec is listed, and nothing else.
  await expect(page.locator('main a[href*="/developers/reference/"][href*="#"]')).toHaveCount(opCount);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Every endpoint");

  // An endpoint page: method, path, scope, schema and the three samples.
  await page.goto("/developers/reference/reservations");
  const create = page.locator("section.op-target").filter({ has: page.getByRole("heading", { name: /Create a reservation/ }) });
  await expect(create.getByTestId("op-path")).toHaveText("/reservations");
  await expect(create).toContainText("reservations:write");
  await expect(create).toContainText("Idempotency-Key");
  // Nested objects open on demand.
  const guest = create.locator('[data-field="guest"]').first();
  await expect(guest.locator('[data-field="fullName"]')).toBeHidden();
  await guest.getByText(/Show \d+ fields/).click();
  await expect(guest.locator('[data-field="fullName"]')).toBeVisible();
});

test("the code sample language is shared by every sample and remembered", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/developers/reference/reservations");
  const first = page.locator("figure.code-plate[data-lang]").first();
  await expect(first).toHaveAttribute("data-lang", "curl");
  await expect(first.locator("pre")).toContainText("curl");

  await first.getByTestId("lang-python").click();
  await expect(first.locator("pre")).toContainText("import requests");
  // Every tabbed sample on the page follows.
  const langs = await page.locator("figure.code-plate[data-lang]").evaluateAll((els) => els.map((e) => e.getAttribute("data-lang")));
  expect(new Set(langs)).toEqual(new Set(["python"]));

  // Copy puts the sample on the clipboard.
  await first.getByRole("button", { name: /Copy Python code/ }).click();
  await expect(first.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("requests.");

  // Remembered across pages and reloads.
  await page.goto("/developers/getting-started");
  await expect(page.locator("figure.code-plate[data-lang]").first()).toHaveAttribute("data-lang", "python");
  await page.reload();
  await expect(page.locator("figure.code-plate[data-lang]").first()).toHaveAttribute("data-lang", "python");

  // Arrow keys move between languages.
  const tab = page.locator("figure.code-plate[data-lang]").first().getByTestId("lang-python");
  await tab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("figure.code-plate[data-lang]").first()).not.toHaveAttribute("data-lang", "python");
});

test("search finds guides and endpoints with Ctrl+K, and deep links land on the endpoint", async ({ page }) => {
  await page.goto("/developers");
  await page.keyboard.press("Control+k");
  const input = page.getByTestId("docs-search-input");
  await expect(input).toBeFocused();
  await input.fill("cancel reservation");
  await expect(page.getByRole("option").first()).toContainText("Cancel a reservation");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/developers\/reference\/reservations#cancel-reservation$/);
  await expect(page.locator("#cancel-reservation")).toBeInViewport();

  await page.keyboard.press("Control+k");
  await page.getByTestId("docs-search-input").fill("signature");
  await expect(page.getByRole("option").first()).toContainText(/signatures/i);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/developers\/webhooks#verify$/);

  // A deep link straight to an endpoint.
  await page.goto("/developers/reference/reservations#create-reservation");
  await expect(page.locator("#create-reservation")).toBeInViewport();
});

test("guides quote the contract: webhook events, verification in three languages, rate-limit headers", async ({ page, request }) => {
  const spec = await (await request.get(SPEC_URL)).json();
  await page.goto("/developers/webhooks");
  const catalogue = page.getByTestId("event-catalogue");
  for (const type of Object.keys(spec.webhooks ?? {})) await expect(catalogue).toContainText(type);
  const verify = page.locator("figure.code-plate[data-lang]").filter({ hasText: "HMAC" }).or(page.locator("figure.code-plate[data-lang]").filter({ hasText: "hmac" })).first();
  for (const lang of ["node", "php", "python"]) {
    await verify.getByTestId(`lang-${lang}`).click();
    await expect(verify.locator("pre")).toContainText(lang === "php" ? "hash_equals" : lang === "node" ? "timingSafeEqual" : "compare_digest");
  }
  await page.goto("/developers/rate-limits");
  for (const h of ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset", "Retry-After"]) await expect(page.locator("main")).toContainText(h);
});

test("the docs are on the marketplace host only", async ({ page }) => {
  // A hotel's subdomain, the path fallback and a white-labelled custom domain all answer 404.
  for (const url of ["http://palmwine-house.localhost:3000/developers", "/h/palmwine-house/developers", "http://book.harmattanhotels.com:3000/developers", "http://book.harmattanhotels.com:3000/developers/reference"]) {
    const res = await page.goto(url);
    expect(res?.status(), url).toBe(404);
  }
  const ok = await page.goto("/developers");
  expect(ok?.status()).toBe(200);
});
