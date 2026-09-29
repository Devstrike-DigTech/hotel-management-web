import { expect, test, type Page } from "@playwright/test";
import { addDays, API, lagosToday, randomIp, staffToken } from "./helpers";

/**
 * Room details ("View details" on every room card, API-ROOMS 5 and 6): from the cards of each
 * template, the marketplace and booking step one to the room's own page; the photographs filtered by
 * kind and opened full screen; dates that price the room live; "Book this room" filling in the
 * booking flow; and the Essentials room page served without framework scripts, within its budget.
 */

const ESSENTIALS_BUDGET = 120 * 1024;

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
  // The sandbox cannot reach the photo CDN; fail those fast instead of waiting on them.
  await page.route(/images\.unsplash\.com/, (r) => r.abort());
});

interface PublicRoom {
  id: string;
  slug: string;
  name: string;
  galleryCount: number;
}
interface RoomPageApi {
  roomType: { id: string; slug: string; name: string; gallery: { tag: string | null }[]; galleryTags: { tag: string; label: string; count: number }[] };
  stay: null | { bookable: boolean; quote: { totalKobo: number } | null; ratePlans: { ratePlan: { id: string; kind?: string }; bookable: boolean; quote: { totalKobo: number } | null }[] };
}

async function roomsOf(page: Page, slug: string): Promise<PublicRoom[]> {
  const res = await page.request.get(`${API}/public/hotels/${slug}`);
  expect(res.ok()).toBeTruthy();
  // Other suites may add and remove test room types ("E2E ..."): only the seeded ones.
  return ((await res.json()) as { roomTypes: PublicRoom[] }).roomTypes.filter((r) => !/^E2E/i.test(r.name));
}

const naira = (kobo: number) => `₦${Math.round(kobo / 100).toLocaleString("en-US")}`;

test.describe("View details from every kind of room card", () => {
  const cases = [
    { template: "editorial", slug: "palmwine-house" },
    { template: "business", slug: "palmwine-house-ikoyi" },
    { template: "resort", slug: "eko-tides" },
    { template: "heritage", slug: "harmattan-abuja" },
    { template: "essentials", slug: "bodija-heights" },
  ];
  for (const c of cases) {
    test(`${c.template}: a room card opens the room's own page`, async ({ page }) => {
      await page.goto(`/h/${c.slug}`);
      await expect(page.locator(`.brand-scope[data-template="${c.template}"]`)).toBeVisible();
      // Other suites may add and remove test room types ("E2E ..."): use a seeded one.
      const link = page.locator('[data-section="rooms"] [data-testid="view-details"]:not([aria-label*="E2E"])').first();
      await expect(link).toBeVisible();
      const label = (await link.getAttribute("aria-label")) ?? "";
      const name = /View details of the (.+)$/.exec(label)?.[1] ?? "";
      expect(name).not.toBe("");
      await link.click();
      await expect(page).toHaveURL(new RegExp(`/h/${c.slug}/rooms/[a-z0-9-]+`));
      await expect(page.locator(`[data-room-page="${c.template}"]`)).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
      await expect(page.getByTestId("room-facts")).toBeVisible();
      await expect(page.getByTestId("room-gallery")).toBeAttached();
      await expect(page.getByTestId("room-amenities")).toBeVisible();
      await expect(page.getByTestId("room-policies")).toBeVisible();
      await expect(page.getByTestId("book-this-room")).toBeVisible();
      // Search engines get the room and its offers.
      const ld = JSON.parse((await page.getByTestId("room-json-ld").textContent()) ?? "{}") as { "@graph": { "@type": string }[] };
      expect(ld["@graph"].map((n) => n["@type"])).toEqual(expect.arrayContaining(["HotelRoom", "Offer"]));
      expect(await page.locator('meta[property="og:image"]').count()).toBeGreaterThan(0);
      await expect(page).toHaveTitle(new RegExp(name));
      // And back to the other rooms.
      await page.getByTestId("room-back").first().click();
      await expect(page).toHaveURL(new RegExp(`/h/${c.slug}/?(#rooms)?$`));
    });
  }

  test("the marketplace hotel page and booking step one link to the room too", async ({ page }) => {
    const rooms = await roomsOf(page, "palmwine-house");
    await page.goto("/stays/palmwine-house");
    const card = page.getByTestId("room-card").filter({ hasNotText: /E2E/ }).first();
    await card.getByTestId("view-details").click();
    await expect(page).toHaveURL(/\/stays\/palmwine-house\/rooms\/[a-z0-9-]+$/);
    await expect(page.locator('[data-room-page="marketplace"]')).toBeVisible();

    await page.goto("/h/palmwine-house/book");
    const options = page.locator('[data-testid="view-details"]:not([aria-label*="E2E"])');
    await expect(options).toHaveCount(rooms.length);
    const target = rooms[rooms.length - 1];
    await page.getByRole("link", { name: new RegExp(`View details of the ${target.name}`) }).click();
    await expect(page).toHaveURL(new RegExp(`/h/palmwine-house/rooms/${target.slug}`));
    await expect(page.getByRole("heading", { level: 1, name: target.name })).toBeVisible();
  });

  test("an old link by the room's id goes to its stable address", async ({ page }) => {
    const [room] = await roomsOf(page, "palmwine-house");
    await page.goto(`/h/palmwine-house/rooms/${room.id}`);
    await expect(page).toHaveURL(new RegExp(`/h/palmwine-house/rooms/${room.slug}$`));
  });
});

test("the gallery filters by kind and opens full screen with the keyboard", async ({ page }) => {
  const rooms = await roomsOf(page, "palmwine-house");
  const room = rooms.find((r) => r.galleryCount >= 6) ?? rooms[0];
  const detail = (await (await page.request.get(`${API}/public/hotels/palmwine-house/room-types/${room.slug}`)).json()) as RoomPageApi;
  const tag = detail.roomType.galleryTags.find((t) => t.count > 0 && t.count < detail.roomType.gallery.length)!;
  expect(tag, "a picture kind that is not every picture").toBeTruthy();

  await page.goto(`/h/palmwine-house/rooms/${room.slug}`);
  const gallery = page.getByTestId("room-gallery");
  await expect(gallery.getByTestId("room-photo-count")).toContainText(String(detail.roomType.gallery.length));
  const chip = gallery.locator(`[data-testid="room-tag-chip"][data-tag="${tag.tag}"]`);
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await expect(gallery.getByTestId("room-photo-count")).toContainText(`${tag.count} ${tag.count === 1 ? "photograph" : "photographs"}`);
  await gallery.locator(`[data-testid="room-tag-chip"][data-tag="ALL"]`).click();

  // Open the first photograph: a modal dialog, arrow keys move, Escape closes and focus comes back.
  const first = gallery.getByTestId("room-photo").first();
  await first.click();
  const box = page.getByTestId("room-lightbox");
  await expect(box).toBeVisible();
  await expect(box.getByTestId("lightbox-count")).toContainText("01");
  await page.keyboard.press("ArrowRight");
  await expect(box.getByTestId("lightbox-count")).toContainText("02");
  await page.keyboard.press("End");
  await expect(box.getByTestId("lightbox-count")).toContainText(String(detail.roomType.gallery.length).padStart(2, "0"));
  await page.keyboard.press("Escape");
  await expect(box).toBeHidden();
  await expect(first).toBeFocused();
});

test("dates price the room live, and Book this room fills in the booking", async ({ page }) => {
  const rooms = await roomsOf(page, "palmwine-house");
  const room = rooms[0];
  await page.goto(`/h/palmwine-house/rooms/${room.slug}`);
  const panel = page.getByTestId("room-stay");
  await expect(panel.getByTestId("room-from")).toBeVisible();

  // Pick dates with the hotel's date picker, three weeks out.
  const checkIn = addDays(lagosToday(), 21);
  const checkOut = addDays(checkIn, 2);
  await panel.getByRole("button", { name: /Check in/ }).click();
  const pick = async (d: string) => {
    for (let i = 0; i < 3 && !(await page.locator(`button[data-date="${d}"]`).first().isVisible()); i++) await page.getByRole("button", { name: "Next month" }).first().click();
    await page.locator(`button[data-date="${d}"]`).first().click();
  };
  await pick(checkIn);
  await pick(checkOut);
  await page.keyboard.press("Escape");

  // The total for the stay, the same as the API's for those dates, and the dates in the address.
  const api = (await (await page.request.get(`${API}/public/hotels/palmwine-house/room-types/${room.slug}?checkIn=${checkIn}&checkOut=${checkOut}&adults=2&channel=BOOKING_SITE`)).json()) as RoomPageApi;
  expect(api.stay?.bookable, "the room is free three weeks out").toBeTruthy();
  const totals = [api.stay!.quote?.totalKobo, ...api.stay!.ratePlans.filter((p) => p.bookable && p.quote).map((p) => p.quote!.totalKobo)].filter((n): n is number => !!n);
  await expect(panel.getByTestId("room-total")).toBeVisible();
  const shown = (await panel.getByTestId("room-total").textContent())!.trim();
  expect(totals.map(naira)).toContain(shown);
  await expect(panel.getByTestId("room-availability")).toContainText(/Free for your dates|Only \d+ left/);
  await expect(page).toHaveURL(new RegExp(`checkIn=${checkIn}&checkOut=${checkOut}`));

  // Night by night for the chosen rate.
  await panel.getByTestId("night-by-night").locator("summary").click();
  await expect(panel.getByTestId("night-by-night").locator("li").first()).toBeVisible();

  // Book this room: step one with this room chosen and the dates filled in.
  await panel.getByTestId("book-this-room").click();
  await expect(page).toHaveURL(new RegExp(`/h/palmwine-house/book\\?room=${room.id}.*checkIn=${checkIn}&checkOut=${checkOut}`));
  const option = page.getByTestId("room-option").filter({ hasText: room.name });
  await expect(option.locator('input[type="radio"]')).toBeChecked();
  await expect(option).toContainText(/Free for your dates|Only \d+ left/);
});

test("a room page opened with dates is priced by the server", async ({ page }) => {
  const [room] = await roomsOf(page, "palmwine-house-ikoyi");
  const checkIn = addDays(lagosToday(), 24);
  const checkOut = addDays(checkIn, 3);
  await page.goto(`/h/palmwine-house-ikoyi/rooms/${room.slug}?checkIn=${checkIn}&checkOut=${checkOut}`);
  await expect(page.getByTestId("room-total")).toBeVisible();
  await expect(page.getByTestId("room-rates")).toContainText("Night by night");
});

test("Essentials: the room page ships no framework scripts and still works", async ({ page }) => {
  const rooms = await roomsOf(page, "bodija-heights");
  const room = rooms.find((r) => r.galleryCount > 1) ?? rooms[0];
  let js = 0;
  const scripts: string[] = [];
  page.on("requestfinished", async (req) => {
    if (req.resourceType() !== "script") return;
    scripts.push(req.url());
    try {
      const s = await req.sizes();
      js += s.responseBodySize + s.responseHeadersSize;
    } catch {
      /* counted above */
    }
  });
  const res = await page.goto(`/h/bodija-heights/rooms/${room.slug}`, { waitUntil: "networkidle" });
  expect(res?.headers()["x-lite"]).toBe("1");
  await expect(page.locator('[data-room-page="essentials"]')).toBeVisible();
  const inline = await page.evaluate(() => [...document.scripts].filter((s) => !s.src && s.type !== "application/ld+json").reduce((n, s) => n + (s.textContent?.length ?? 0), 0));
  console.log(`Essentials room page: ${(js / 1024).toFixed(1)} KB of script files (${scripts.length}), ${(inline / 1024).toFixed(1)} KB inline`);
  expect(js + inline).toBeLessThan(ESSENTIALS_BUDGET);
  expect(await page.locator("script[src]").count()).toBe(0);
  expect(scripts).toEqual([]);

  // Photographs open with plain links, and Escape closes them (the tiny inline script).
  await page.getByTestId("room-photo").first().click();
  await expect(page).toHaveURL(/#photo-1$/);
  await expect(page.locator("#photo-1")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/#photo-2$/);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/#photos$/);
  await expect(page.locator("#photo-2")).toBeHidden();

  // The kind of picture filters with no script.
  const chips = page.locator('[data-testid="room-tag-chip"]:not([data-tag="ALL"])');
  if (await chips.count()) {
    const tag = (await chips.first().getAttribute("data-tag"))!;
    await chips.first().click();
    const shown = await page.locator(".lite-thumb:visible").count();
    expect(shown).toBe(await page.locator(`.lite-thumb[data-tag="${tag}"]`).count());
  }

  // Dates: a native form; the server answers with the stay's prices.
  const checkIn = addDays(lagosToday(), 20);
  await page.locator('[data-testid="lite-dates"] input[name="checkIn"]').fill(checkIn);
  await page.locator('[data-testid="lite-dates"] input[name="checkOut"]').fill(addDays(checkIn, 2));
  await page.locator('[data-testid="lite-dates"] button[type="submit"]').click();
  await expect(page).toHaveURL(new RegExp(`checkIn=${checkIn}`));
  await expect(page.getByTestId("room-rate-total").first()).toBeVisible();
  await page.getByTestId("book-this-room").click();
  await expect(page).toHaveURL(new RegExp(`/h/bodija-heights/book\\?room=${room.id}.*checkIn=${checkIn}`));
});

test("a photo the hotel uploaded shows on the room's draft preview, served by the API", async ({ page, request }) => {
  const auth = { authorization: `Bearer ${await staffToken(request)}` };
  const list = (await (await request.get(`${API}/room-types`, { headers: auth })).json()) as { id: string; slug: string; name: string }[];
  const room = list.find((r) => r.slug === "deluxe-king") ?? list.find((r) => !/^E2E/i.test(r.name))!;
  // A real PNG, drawn by the browser: 320 x 240, in the house's laterite.
  await page.setViewportSize({ width: 320, height: 240 });
  await page.setContent('<body style="margin:0;background:#b4452a"></body>');
  const png = await page.screenshot({ type: "png" });
  await page.setViewportSize({ width: 1280, height: 900 });
  const up = await request.post(`${API}/room-types/${room.id}/gallery`, {
    headers: auth,
    multipart: { file: { name: "e2e-room.png", mimeType: "image/png", buffer: png }, alt: "E2E upload: the bed made up in laterite linen", tag: "BEDROOM" },
  });
  expect(up.ok(), `upload: ${up.status()} ${await up.text()}`).toBeTruthy();
  const image = ((await up.json()) as { image: { id: string; url: string } }).image;
  try {
    const tok = await request.post(`${API}/room-types/${room.id}/preview-token`, { headers: auth, data: {} });
    expect(tok.ok(), `preview token: ${tok.status()}`).toBeTruthy();
    const { token } = (await tok.json()) as { token: string };
    await page.goto(`/h/palmwine-house/rooms/${room.slug}?preview=${token}`);
    await expect(page.getByTestId("room-draft-note")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    // The uploaded photo, straight from the API's asset address, in the grid and the lightbox.
    const photo = page.getByTestId("room-photo").filter({ has: page.locator(`img[src="${image.url}"]`) });
    const inGrid = await photo.count();
    if (!inGrid) {
      await page.getByTestId("room-gallery-all").click();
      await page.getByRole("button", { name: /E2E upload/ }).click();
    } else await photo.first().click();
    const img = page.getByTestId("room-lightbox").locator(`img[src="${image.url}"][alt^="E2E upload"]`);
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(320);
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
  } finally {
    await request.delete(`${API}/room-types/${room.id}/gallery/${image.id}`, { headers: auth });
  }
});

test.describe("room drafts from the admin's room editor", () => {
  async function staff(request: import("@playwright/test").APIRequestContext) {
    const auth = { authorization: `Bearer ${await staffToken(request)}` };
    const list = (await (await request.get(`${API}/room-types`, { headers: auth })).json()) as { id: string; slug: string; name: string }[];
    const room = list.find((r) => r.slug === "deluxe-king")!;
    return { auth, room };
  }

  test("the cover leads the gallery wherever it sits in the hotel's order", async ({ page, request }) => {
    const { auth, room } = await staff(request);
    const g = (await (await request.get(`${API}/room-types/${room.id}/gallery`, { headers: auth })).json()) as { images: { id: string; alt: string; isCover: boolean; tag: string | null }[] };
    const was = g.images.find((i) => i.isCover)!;
    const last = g.images[g.images.length - 1];
    expect(last.id).not.toBe(was.id);
    const set = await request.post(`${API}/room-types/${room.id}/gallery/${last.id}/cover`, { headers: auth });
    expect(set.ok()).toBeTruthy();
    try {
      const { token } = (await (await request.post(`${API}/room-types/${room.id}/preview-token`, { headers: auth, data: {} })).json()) as { token: string };
      await page.goto(`/h/palmwine-house/rooms/${room.slug}?preview=${token}`);
      await expect(page.getByTestId("room-draft-note")).toBeVisible();
      const first = page.getByTestId("room-photo").first();
      await expect(first).toHaveAttribute("aria-label", new RegExp(`^Open photo 1 of \\d+: ${last.alt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
      await first.click();
      await expect(page.getByTestId("room-lightbox").getByTestId("lightbox-count")).toContainText(last.alt);
      await page.keyboard.press("Escape");
      // A kind keeps the hotel's order: the first picture of that kind that comes first in the gallery.
      if (last.tag) {
        const firstOfKind = g.images.find((i) => i.tag === last.tag)!;
        await page.locator(`[data-testid="room-tag-chip"][data-tag="${last.tag}"]`).click();
        await expect(page.getByTestId("room-photo").first()).toHaveAttribute("aria-label", new RegExp(firstOfKind.alt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }
    } finally {
      await request.post(`${API}/room-types/${room.id}/gallery/${was.id}/cover`, { headers: auth });
    }
  });

  test("a room preview stays on that room's page and ends with its token", async ({ page, request, context }) => {
    const { auth, room } = await staff(request);
    const { token } = (await (await request.post(`${API}/room-types/${room.id}/preview-token`, { headers: auth, data: { ttlMinutes: 5 } })).json()) as { token: string };
    const res = await page.goto(`/h/palmwine-house/rooms/${room.slug}?preview=${token}`);
    expect(res?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.getByTestId("room-draft-note")).toBeVisible();
    // No site-wide "Draft preview" band for a room's draft.
    await expect(page.getByTestId("preview-banner")).toHaveCount(0);
    const cookie = (await context.cookies()).find((c) => c.name === "room_preview")!;
    expect(cookie.path).toBe(`/h/palmwine-house/rooms/${room.slug}`);
    expect(cookie.expires * 1000 - Date.now()).toBeLessThanOrEqual(5 * 60 * 1000 + 5000);
    // The same room without the link: still the draft, while the token lasts.
    await page.goto(`/h/palmwine-house/rooms/${room.slug}`);
    await expect(page.getByTestId("room-draft-note")).toBeVisible();
    // Anywhere else on the site: the live site, no band.
    const home = await page.goto("/h/palmwine-house");
    expect(home?.headers()["x-robots-tag"]).toBeUndefined();
    await expect(page.getByTestId("preview-banner")).toHaveCount(0);
    // Leave preview.
    await page.goto(`/h/palmwine-house/rooms/${room.slug}`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole("link", { name: "Leave preview" }).click();
    await expect(page.getByTestId("room-draft-note")).toHaveCount(0);
    expect((await context.cookies()).find((c) => c.name === "room_preview")).toBeUndefined();

    // An expired token remembered in the cookie stops previewing and is forgotten.
    const stale = `${Buffer.from(JSON.stringify({ tid: "t", pid: "p", k: ["ROOMS"], exp: Math.floor(Date.now() / 1000) - 60 })).toString("base64url")}.c2lnbmF0dXJl`;
    await context.addCookies([{ name: "room_preview", value: stale, domain: "localhost", path: `/h/palmwine-house/rooms/${room.slug}` }]);
    const after = await page.goto(`/h/palmwine-house/rooms/${room.slug}`);
    expect(after?.headers()["x-robots-tag"]).toBeUndefined();
    await expect(page.getByTestId("room-draft-note")).toHaveCount(0);
    expect((await context.cookies()).find((c) => c.name === "room_preview")).toBeUndefined();
  });
});
