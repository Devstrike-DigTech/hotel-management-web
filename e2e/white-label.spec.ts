import { existsSync } from "node:fs";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { brandVars } from "../src/lib/brand";
import { API, bookRoom, futureStay, newGuest, randomIp } from "./helpers";

/**
 * M6 white-label: Harmattan Hotels & Suites (Enterprise) on its verified booking domain. The browser
 * resolves the domain to this machine, as DNS would in production, so the request really arrives
 * with `Host: book.harmattanhotels.com`.
 */
const DOMAIN = process.env.E2E_WL_DOMAIN || "book.harmattanhotels.com";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "HotelOS";
const port = new URL(process.env.E2E_BASE_URL || "http://localhost:3000").port || "80";
const SITE = `http://${DOMAIN}:${port}`;

const preinstalled = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM || (existsSync(preinstalled) ? preinstalled : undefined);
test.use({
  // No proxy: a sandbox proxy in the environment would otherwise be used for the custom domain.
  launchOptions: { executablePath, args: [`--host-resolver-rules=MAP ${DOMAIN} 127.0.0.1`, "--no-proxy-server"] },
  extraHTTPHeaders: { "x-forwarded-for": randomIp() },
});

interface WhiteLabel {
  brandName: string;
  faviconUrl: string | null;
  primaryColor: string | null;
  headingFont: { family: string } | null;
  bodyFont: { family: string; category: string } | null;
  footerLinks: { label: string; url: string }[];
}

/** What the API says about the domain: the property it serves and its white-label brand. */
async function brandFor(request: APIRequestContext) {
  const host = await request.get(`${API}/public/resolve-host?host=${DOMAIN}`);
  expect(host.ok(), `resolve-host ${DOMAIN}`).toBeTruthy();
  const { slug, whiteLabel } = (await host.json()) as { slug: string; whiteLabel?: boolean };
  expect(whiteLabel).toBe(true);
  const detail = await (await request.get(`${API}/public/hotels/${slug}?host=${DOMAIN}`)).json();
  const plain = await (await request.get(`${API}/public/hotels/${slug}`)).json();
  expect(detail.whiteLabel, "white-label brand on the verified domain").toBeTruthy();
  expect(plain.whiteLabel ?? null, "no white-label brand without the host").toBeNull();
  return { slug, wl: detail.whiteLabel as WhiteLabel, name: detail.name as string };
}

/** No platform name, credit or marketplace link anywhere on the page. */
async function expectNoPlatform(page: Page) {
  const text = await page.locator("body").innerText();
  expect(text).not.toContain(APP_NAME);
  expect(text).not.toMatch(/Powered by/i);
  await expect(page.getByTestId("powered-by")).toHaveCount(0);
  const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
  for (const href of hrefs) {
    const u = new URL(href);
    if (u.protocol === "http:" || u.protocol === "https:") {
      // Either this domain, or somewhere that is not the platform (the hotel's own links, maps, WhatsApp).
      if (u.hostname === DOMAIN) expect(u.pathname, href).not.toMatch(/^\/(stays|pricing|for-hotels|developers|account)(\/|$)/);
      else expect(u.hostname, href).not.toMatch(/localhost|hotelos/);
    }
  }
}

test("a white-labelled hotel's own domain carries its brand and no platform chrome", async ({ page, request }) => {
  const { slug, wl, name } = await brandFor(request);
  await page.goto(`${SITE}/`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
  const scope = page.locator("[data-white-label=true]");
  await expect(scope).toHaveCount(1);
  await expectNoPlatform(page);

  // The hotel's colour takes the accent role, darkened only as far as contrast needs.
  if (wl.primaryColor) {
    const laterite = await scope.evaluate((el) => getComputedStyle(el).getPropertyValue("--laterite").trim().toLowerCase());
    expect(laterite).toBe(brandVars(wl.primaryColor)!.light);
    const button = await page.getByRole("link", { name: "Book a room" }).first().evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(button).not.toBe("rgb(180, 69, 42)"); // the platform's laterite
  }
  // Its chosen fonts: the heading font on headings, the body font (a text face) on copy.
  if (wl.headingFont) {
    await expect.poll(() => page.getByRole("heading", { level: 1 }).evaluate((el) => getComputedStyle(el).fontFamily)).toContain(wl.headingFont.family);
    await expect.poll(() => page.evaluate((f) => document.fonts.check(`16px "${f}"`) || [...document.styleSheets].some((s) => (s.href ?? "").includes("fonts.googleapis.com")), wl.headingFont!.family)).toBe(true);
  }
  if (wl.bodyFont && wl.bodyFont.category !== "display") {
    expect(await page.locator("main").evaluate((el) => getComputedStyle(el).fontFamily)).toContain(wl.bodyFont.family);
  }
  // Its favicon replaces the platform's key fob.
  if (wl.faviconUrl) {
    const icons = await page.locator('link[rel~="icon"]').evaluateAll((ls) => ls.map((l) => l.getAttribute("href")));
    expect(icons).toContain(wl.faviconUrl);
    expect(icons.some((h) => h?.includes("/icon.svg"))).toBe(false);
  }
  // Its own footer links, and its brand in the copyright line.
  const footer = page.locator("footer");
  await expect(footer).toContainText(wl.brandName);
  for (const l of wl.footerLinks) await expect(footer.getByRole("link", { name: l.label })).toHaveAttribute("href", l.url);

  // The booking page is just as clean.
  await page.goto(`${SITE}/book`);
  await expect(page.getByTestId("room-option").first()).toBeVisible();
  await expectNoPlatform(page);

  // The same hotel on the platform's own subdomain keeps the normal chrome.
  await page.goto(`http://${slug}.localhost:${port}/`);
  await expect(page.locator("[data-white-label]")).toHaveCount(0);
  await expect(page.getByTestId("powered-by")).toBeVisible();
});

test("booking on the white-labelled domain stays on it from the room to managing the booking", async ({ page, request }) => {
  const { slug } = await brandFor(request);
  const guest = newGuest();
  await bookRoom(page, { slug, base: SITE, stay: futureStay(1), guest, pay: "PAY_AT_HOTEL" });
  await expect(page).toHaveURL(new RegExp(`^http://${DOMAIN.replace(/\./g, "\\.")}:${port}/booking/confirmation\\?code=`));
  const card = page.getByTestId("confirmation-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText(guest.name);
  await expect(card).not.toContainText("Booked through");
  await expectNoPlatform(page);

  // Manage booking is served on the hotel's domain too.
  const manage = page.getByTestId("manage-link");
  await expect(manage).toHaveAttribute("href", /^\/trips\/[A-Z0-9-]+\?t=/);
  await manage.click();
  await expect(page).toHaveURL(new RegExp(`^http://${DOMAIN.replace(/\./g, "\\.")}:${port}/trips/`));
  await expect(page.getByTestId("documents").or(page.getByText("Cancel this booking")).first()).toBeVisible();
  await expectNoPlatform(page);
});
