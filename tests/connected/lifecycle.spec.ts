// Run only against a disposable local Supabase stack; creates test accounts and recorded pickups.
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
test.beforeAll(() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname))
    throw new Error(
      "Connected tests create accounts and pickups; only a fresh disposable local Supabase stack is accepted.",
    );
});
const stamp = Date.now();
async function signup(page: Page, role: string) {
  await page.goto("/auth");
  await page
    .getByRole("button", { name: "Join the loop", exact: true })
    .click();
  await page.getByLabel("Your name").fill(`${role} Test`);
  await page
    .getByLabel("Email address")
    .fill(`${role.toLowerCase()}-${stamp}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill(`Local-test-${stamp}!`);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: `Hey, ${role} Test.` }),
  ).toBeVisible();
}
async function publish(page: Page, title: string, paid = false) {
  await page.getByRole("link", { name: "List with AI" }).first().click();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(path.resolve("public/images/lamp.jpg"));
  await expect(page.getByAltText("Your listing photograph")).toBeVisible();
  await page.getByLabel("Listing title").fill(title);
  await page
    .getByLabel("A little about it")
    .fill(
      "A local end-to-end test listing with a cream shade. Check it at pickup.",
    );
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("Electronics");
  if (paid) {
    await page.getByRole("button", { name: "Pass it on for free?" }).click();
  }
  await page
    .getByRole("button", { name: "Publish listing", exact: true })
    .click();
  if (!paid)
    await page.getByRole("button", { name: "Yes, list for free" }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  return new URL(page.url()).pathname;
}
test("two actual accounts publish, reserve, cancel, complete and enforce ownership", async ({
  browser,
  baseURL,
}) => {
  const sellerContext = await browser.newContext({ baseURL }),
    buyerContext = await browser.newContext({ baseURL });
  const seller = await sellerContext.newPage(),
    buyer = await buyerContext.newPage();
  await signup(seller, "Seller");
  await signup(buyer, "Buyer");
  const title = `Free study lamp ${stamp}`;
  const pathname = await publish(seller, title);
  await buyer.goto(`${baseURL}${pathname}/edit`);
  await expect(
    buyer.getByRole("heading", {
      name: "This listing belongs to someone else.",
    }),
  ).toBeVisible();
  await buyer.goto(`${baseURL}${pathname}`);
  await buyer
    .getByRole("button", { name: "Reserve for free", exact: true })
    .click();
  await expect(
    buyer.getByText("Your pickup code", { exact: true }),
  ).toBeVisible();
  const code = (await buyer
    .locator(".pickup-code strong")
    .first()
    .textContent())!;
  expect(code).toMatch(/^[0-9A-F]{8}$/);
  await expect(
    buyer.getByRole("link", { name: "Get walking directions" }),
  ).toHaveAttribute("href", /travelmode=walking/);
  await seller.goto(`${baseURL}/dashboard`);
  await seller
    .getByRole("button", { name: "Seller handoffs", exact: true })
    .click();
  await seller.getByLabel("Buyer’s pickup code").fill("BADCODE1");
  await seller.getByRole("button", { name: "Confirm handoff" }).click();
  await expect(seller.getByRole("alert")).toContainText("didn’t match");
  await seller.getByLabel("Buyer’s pickup code").fill(code);
  await seller.getByRole("button", { name: "Confirm handoff" }).click();
  await expect(
    seller.getByText("Loop completed", { exact: true }),
  ).toBeVisible();
  await buyer.reload();
  await expect(
    buyer.getByText("Loop completed", { exact: true }),
  ).toBeVisible();
  await buyer.goto(`${baseURL}/impact`);
  await expect(buyer.locator(".impact-stat>strong")).toHaveText([
    "0",
    "1",
    "1",
  ]);
  const paidTitle = `Paid study lamp ${stamp}`;
  await seller.goto(`${baseURL}/dashboard`);
  // Create another paid listing; all money handling stays outside the platform.
  const paidPath = await publish(seller, paidTitle);
  await seller.getByRole("link", { name: "Edit listing", exact: true }).click();
  await seller.getByRole("button", { name: "Pass it on for free?" }).click();
  await seller.getByRole("button", { name: "Save changes" }).click();
  await expect(seller.getByText("CAD per unit · Pay at pickup")).toBeVisible();
  await buyer.goto(`${baseURL}${paidPath}`);
  await buyer
    .getByRole("button", { name: "Reserve — Pay at pickup", exact: true })
    .click();
  await expect(buyer.getByText(/\$5 total, pay at pickup/)).toBeVisible();
  buyer.once("dialog", (d) => d.accept());
  await buyer
    .getByRole("button", { name: "Cancel reservation", exact: true })
    .click();
  await expect(buyer.getByText("Cancelled", { exact: true })).toBeVisible();
  await buyer.goto(`${baseURL}${paidPath}`);
  await expect(
    buyer.getByRole("button", { name: "Reserve — Pay at pickup", exact: true }),
  ).toBeEnabled();
  await buyer
    .getByRole("button", { name: "Reserve — Pay at pickup", exact: true })
    .click();
  const secondCode = (await buyer
    .locator(".pickup-code strong")
    .first()
    .textContent())!;
  await seller.goto(`${baseURL}/dashboard`);
  await seller
    .getByRole("button", { name: "Seller handoffs", exact: true })
    .click();
  await seller.getByLabel("Buyer’s pickup code").fill(secondCode);
  await seller.getByRole("button", { name: "Confirm handoff" }).click();
  await expect(seller.getByText("Loop completed", { exact: true })).toHaveCount(
    2,
  );
  await buyer.goto(`${baseURL}/impact`);
  await expect(buyer.locator(".impact-stat>strong")).toHaveText([
    "0",
    "2",
    "2",
  ]);
  await sellerContext.close();
  await buyerContext.close();
});
