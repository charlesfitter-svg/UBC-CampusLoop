// Browser interaction tests with mocked Supabase writes; no accounts, uploads,
// listings or OpenAI requests are created on the hosted project.
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { localDateTime } from "../../src/lib/listing-recovery";

const owner = "11111111-1111-4111-8111-111111111111";
const itemId = "22222222-2222-4222-8222-222222222222";
async function mockAccount(
  page: Page,
  baseURL: string,
  food = false,
  reserved = false,
  expiresOffset = -60000,
) {
  const backend = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!backend)
    throw new Error(
      "Phase 2 browser tests need configured public Supabase variables (all browser requests are mocked).",
    );
  const backendUrl = new URL(backend);
  const seconds = Math.floor(Date.now() / 1000);
  const user = {
    id: owner,
    aud: "authenticated",
    role: "authenticated",
    email: "phase2@example.test",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: owner, aud: "authenticated", role: "authenticated", exp: seconds + 3600, iat: seconds })}.test-signature`;
  const session = {
    access_token: token,
    refresh_token: "test-only-refresh",
    expires_in: 3600,
    expires_at: seconds + 3600,
    token_type: "bearer",
    user,
  };
  await page.context().addCookies([
    {
      name: `sb-${backendUrl.hostname.split(".")[0]}-auth-token`,
      value: `base64-${encode(session)}`,
      url: baseURL,
      sameSite: "Lax",
    },
  ]);
  const listing = {
    id: itemId,
    seller_id: owner,
    seller_name: "Test neighbour",
    title: food ? "Test bread" : "Test desk lamp",
    description: "A test listing with an original photograph.",
    category: food ? "food" : "items",
    subcategory: food ? "Bakery" : "Electronics",
    price_cents: 0,
    quantity: 3,
    available_quantity: reserved ? 2 : 3,
    landmark: "nest",
    expires_at: new Date(Date.now() + expiresOffset).toISOString(),
    image_path: "/images/lamp.jpg",
    food_details: food ? "Contents and handling previously confirmed." : null,
    status: "active",
    is_demo: false,
    created_at: new Date().toISOString(),
  };
  const reservations = reserved
    ? [
        {
          id: "33333333-3333-4333-8333-333333333333",
          listing_id: itemId,
          seller_id: owner,
          buyer_id: "44444444-4444-4444-8444-444444444444",
          quantity: 1,
          unit_price_cents: 0,
          status: "reserved",
          created_at: new Date().toISOString(),
          completed_at: null,
        },
      ]
    : [];
  const saves: unknown[] = [],
    relists: Record<string, unknown>[] = [];
  const photoAnalyses: unknown[] = [],
    uploads: string[] = [];
  let releaseSave: (() => void) | undefined;
  const saveGate = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  await page.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.origin === new URL(baseURL).origin) {
      if (url.pathname === "/api/ai/listing") {
        photoAnalyses.push(request.method());
        return route.fulfill({
          json: {
            draft: {
              title: "Original cream lamp",
              description:
                "Original description retained while changing the price.",
              category: "items",
              subcategory: "Electronics",
              visible_details: ["Cream shade"],
              seller_checks: ["Check working status"],
            },
          },
        });
      }
      // Keep test cookies in the browser for the client SDK, but never send a
      // fake session to Next.js's server-side auth proxy or hosted Supabase.
      const headers = { ...request.headers() };
      delete headers.cookie;
      return route.continue({ headers });
    }
    if (url.origin !== backendUrl.origin) return route.abort();
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (url.pathname === "/auth/v1/user") return json(user);
    if (url.pathname.includes("/storage/v1/object/")) {
      uploads.push(request.method());
      return json({ Key: "test-only-photo" });
    }
    if (url.pathname.endsWith("/rpc/save_listing")) {
      saves.push(request.postDataJSON());
      await saveGate;
      return json({ message: "Test write stopped before persistence." }, 400);
    }
    if (url.pathname.endsWith("/rpc/relist_listing")) {
      const payload = request.postDataJSON();
      relists.push(payload);
      listing.expires_at = payload.p_expires_at;
      return json(itemId);
    }
    if (url.pathname.endsWith("/profiles"))
      return json(
        request.method() === "PATCH"
          ? {}
          : {
              id: owner,
              display_name: "Test neighbour",
              preferred_landmark: "nest",
              account_type: "student",
            },
      );
    if (url.pathname.endsWith("/listings"))
      return json(
        url.searchParams.has("seller_id") &&
          url.searchParams.get("seller_id") !== `eq.${listing.seller_id}`
          ? []
          : [listing],
      );
    if (url.pathname.endsWith("/reservations")) return json(reservations);
    if (url.pathname.endsWith("/pickup_secrets"))
      return json(
        reservations
          .filter((r) => r.buyer_id === owner)
          .map((r) => ({
            reservation_id: r.id,
            buyer_id: owner,
            code: "AB12CD34",
          })),
      );
    return route.abort();
  });
  return {
    saves,
    relists,
    photoAnalyses,
    uploads,
    listing,
    reservations,
    releaseSave: () => releaseSave!(),
  };
}

async function prepareDraft(page: Page) {
  await page.goto("/list/new");
  await expect(page.locator(".login-link")).toContainText("My account");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(path.resolve("public/images/lamp.jpg"));
  await expect(page.getByAltText("Your listing photograph")).toBeVisible();
  await page
    .getByRole("main")
    .getByLabel("Listing title")
    .fill("Original cream lamp");
  await page
    .getByLabel("A little about it")
    .fill("Original description retained while changing the price.");
  await expect(
    page.getByRole("button", { name: "Generate my listing" }),
  ).toBeEnabled();
}

test("free confirmation traps focus, handles Escape and preserves the draft", async ({
  page,
  baseURL,
}, testInfo) => {
  const backend = await mockAccount(page, baseURL!);
  await prepareDraft(page);
  await page.getByRole("button", { name: "Generate my listing" }).click();
  await expect(page.locator(".ai-checks")).toContainText(
    "Check working status",
  );
  await page.getByRole("button", { name: "Publish listing" }).click();
  const dialog = page.getByRole("dialog", {
    name: "You’re listing this for free",
  });
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("free-confirmation.png") });
  await expect(
    dialog.getByRole("button", { name: "Change price" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Yes, list for free" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Change price" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("main").getByLabel("Price per unit (CAD)"),
  ).toBeFocused();
  await page.getByRole("button", { name: "Publish listing" }).click();
  await dialog.getByRole("button", { name: "Change price" }).click();
  await expect(page.getByRole("main").getByLabel("Listing title")).toHaveValue(
    "Original cream lamp",
  );
  await expect(
    page.getByRole("main").getByLabel("A little about it"),
  ).toHaveValue("Original description retained while changing the price.");
  await expect(page.getByAltText("Your listing photograph")).toBeVisible();
  await expect(page.locator(".ai-checks")).toContainText(
    "Check working status",
  );
  expect(backend.photoAnalyses).toHaveLength(1);
  await expect(
    page.getByRole("main").getByLabel("Price per unit (CAD)"),
  ).toBeFocused();
});

test("free confirmation submits once and stays locked during publication", async ({
  page,
  baseURL,
}) => {
  const backend = await mockAccount(page, baseURL!);
  await prepareDraft(page);
  await page.getByRole("button", { name: "Publish listing" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Yes, list for free" }).dblclick();
  await expect.poll(() => backend.saves.length).toBe(1);
  await expect(
    dialog.getByRole("button", { name: "Publishing…" }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Change price" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  backend.releaseSave();
  await expect(page.locator('.notice[role="alert"]')).toContainText(
    "Test write stopped",
  );
  expect(backend.saves).toHaveLength(1);
});

test("paid publication bypasses confirmation", async ({ page, baseURL }) => {
  const backend = await mockAccount(page, baseURL!);
  await prepareDraft(page);
  await page.getByRole("main").getByLabel("Price per unit (CAD)").fill("12.50");
  await page.getByRole("button", { name: "Publish listing" }).click();
  await expect.poll(() => backend.saves.length).toBe(1);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  backend.releaseSave();
});

test("expired recovery remembers dismissal and relists without image or AI calls", async ({
  page,
  baseURL,
}, testInfo) => {
  const backend = await mockAccount(page, baseURL!);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "My listings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Still looking for a new home?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await page.getByRole("button", { name: "My pickups", exact: true }).click();
  await page.getByRole("button", { name: "My listings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Still looking for a new home?" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Relist item", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("recovery.png"),
    fullPage: true,
  });
  await expect(
    page.getByRole("main").getByLabel("New pickup deadline"),
  ).toHaveValue("");
  await page
    .getByLabel("New pickup deadline")
    .fill(localDateTime(Date.now() + 86400000));
  await page.getByRole("button", { name: "Confirm new deadline" }).dblclick();
  await expect.poll(() => backend.relists.length).toBe(1);
  expect(backend.saves).toHaveLength(0);
  expect(backend.photoAnalyses).toHaveLength(0);
  expect(backend.uploads).toHaveLength(0);
  await expect(
    page.getByRole("button", { name: "Relist item", exact: true }),
  ).not.toBeVisible();
});

test("expired food requires renewed confirmation", async ({
  page,
  baseURL,
}) => {
  const backend = await mockAccount(page, baseURL!, true);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "My listings", exact: true }).click();
  await page.getByRole("button", { name: "Relist item", exact: true }).click();
  await page
    .getByLabel("New pickup deadline")
    .fill(localDateTime(Date.now() + 3600000));
  await page.getByRole("button", { name: "Confirm new deadline" }).click();
  expect(backend.relists).toHaveLength(0);
  await page.getByRole("checkbox").check();
  await page
    .getByLabel("Renewed food details")
    .fill("Newly checked contents, allergens and handling.");
  await page.getByRole("button", { name: "Confirm new deadline" }).click();
  await expect.poll(() => backend.relists.length).toBe(1);
  expect(backend.relists[0].p_food_confirmed).toBe(true);
});

test("expiry updates manual recovery without interrupting until returning to My listings", async ({
  page,
  baseURL,
}) => {
  await mockAccount(page, baseURL!, false, false, 60000);
  await page.clock.install();
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "My listings", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Test desk lamp" }),
  ).toBeVisible();
  await page.clock.fastForward(120000);
  await expect(
    page.getByRole("button", { name: "Relist item", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Still looking for a new home?" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "My pickups", exact: true }).click();
  await page.getByRole("button", { name: "My listings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Still looking for a new home?" }),
  ).toBeVisible();
});

test("seller pickups retain codes and expose accessible assistance", async ({
  page,
  baseURL,
}, testInfo) => {
  await mockAccount(page, baseURL!, false, true);
  await page.goto("/dashboard");
  await page
    .getByRole("button", { name: "Seller handoffs", exact: true })
    .click();
  await expect(
    page.getByRole("main").getByLabel("Buyer’s pickup code"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Get walking directions" }),
  ).toHaveAttribute("href", /travelmode=walking/);
  await page.locator("summary", { hasText: "Safety & Accessibility" }).click();
  await expect(
    page.getByRole("link", { name: /Call AMS Safewalk/ }),
  ).toHaveAttribute("href", "tel:+16048225355");
  await expect(
    page.getByRole("link", { name: /Call UBC Accessibility Shuttle/ }),
  ).toHaveAttribute("href", "tel:+16048229929");
  await page.screenshot({
    path: testInfo.outputPath("pickup-assistance.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "My listings", exact: true }).click();
  await expect(
    page.getByText(
      "Finish or cancel outstanding reservations before relisting.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Relist item", exact: true }),
  ).not.toBeVisible();
});

test("buyers retain their pickup code and navigation alongside assistance", async ({
  page,
  baseURL,
}) => {
  const backend = await mockAccount(page, baseURL!, false, true);
  backend.listing.seller_id = "44444444-4444-4444-8444-444444444444";
  backend.reservations[0].seller_id = backend.listing.seller_id;
  backend.reservations[0].buyer_id = owner;
  await page.goto("/dashboard");
  await expect(page.locator(".pickup-code strong")).toHaveText("AB12CD34");
  await page.locator("summary", { hasText: "Safety & Accessibility" }).click();
  await expect(
    page.getByRole("link", { name: /Call UBC Campus Security/ }),
  ).toHaveAttribute("href", "tel:+16048222222");
  await expect(
    page.getByRole("link", { name: "Get walking directions" }),
  ).toHaveAttribute("href", /travelmode=walking/);
});

test("reservation deep link stays stable through dashboard effects and data refresh", async ({
  page,
  baseURL,
}) => {
  const backend = await mockAccount(page, baseURL!, false, true);
  backend.listing.seller_id = "44444444-4444-4444-8444-444444444444";
  backend.reservations[0].seller_id = backend.listing.seller_id;
  backend.reservations[0].buyer_id = owner;
  const reservation = backend.reservations[0].id;
  const dashboardRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.pathname === "/dashboard" &&
      url.searchParams.get("reservation") === reservation
    ) {
      dashboardRequests.push(request.resourceType());
    }
  });
  await page.clock.install();
  await page.goto(`/dashboard?reservation=${reservation}`);
  await expect(page.locator(".pickup-code strong")).toHaveText("AB12CD34");
  await page.getByRole("button", { name: "My listings", exact: true }).click();
  await page.getByRole("button", { name: "My pickups", exact: true }).click();
  await page.clock.fastForward(90000); // Exercise three shared-clock updates.
  await page.getByRole("button", { name: "Refresh dashboard" }).click();
  await expect(
    page.getByRole("button", { name: "Refresh dashboard" }),
  ).toBeEnabled();
  await expect(page.locator(".pickup-code strong")).toHaveText("AB12CD34");
  // Observe real elapsed time as well: the reported dev-client loop requested
  // the current URL roughly every 200ms, independently of the app's timers.
  await page.waitForTimeout(2000);
  await expect(page).toHaveURL(
    `${baseURL}/dashboard?reservation=${reservation}`,
  );
  expect(dashboardRequests).toEqual(["document"]);
});

test("all reuse resources remain available with eligibility restrictions", async ({
  page,
}, testInfo) => {
  await page.goto("/reuse?category=items&subcategory=Furniture");
  await expect(
    page.getByRole("heading", { name: "UBC Zero Waste Market" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("main")
      .getByText(/Not an ordinary personal student drop-off/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Get Thrifty UBC" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Walking directions to Get Thrifty/ }),
  ).toHaveAttribute("href", /travelmode=walking/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("reuse-directory.png"),
    fullPage: true,
  });
});
