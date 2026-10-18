import { test, expect } from "@playwright/test";
import path from "node:path";
test("marketplace filters, searches, details and honest sample state", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Good things deserve",
  );
  await expect(
    page.getByText("Preview · Fictional sample listings"),
  ).toBeVisible();
  await expect(page.locator(".listing-card")).toHaveCount(6);
  await page.getByRole("button", { name: "Free finds" }).click();
  await expect(page.locator(".listing-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Food", exact: true }).click();
  await expect(page.locator(".listing-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Everything" }).click();
  await page
    .getByRole("textbox", { name: "Search listings" })
    .fill("desk lamp");
  await expect(page.locator(".listing-card")).toHaveCount(1);
  await page.locator(".listing-card").click();
  await expect(page.getByText("Fictional sample listing ·")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Get walking directions" }),
  ).toHaveAttribute("href", /travelmode=walking/);
  await expect(
    page.getByRole("link", { name: "Log in to reserve" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("photo upload and editable manual draft preserve image without credentials", async ({
  page,
}) => {
  await page.goto("/list/new");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(path.resolve("public/images/lamp.jpg"));
  await expect(page.getByAltText("Your listing photograph")).toBeVisible();
  await page.getByLabel("Listing title").fill("My cream study lamp");
  await page
    .getByLabel("A little about it")
    .fill("Cream lamp with an adjustable arm. Please check it at pickup.");
  await expect(
    page.getByRole("button", { name: "Generate my listing" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Publish listing" }).click(); // Browser validates all required fields before submit.
  await expect(page.getByAltText("Your listing photograph")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Listing title")).toHaveValue(
    "My cream study lamp",
  );
  await expect(
    page.getByText("Reattach your photo after a reload."),
  ).toBeVisible();
  await page.getByLabel("What are you sharing?").selectOption("food");
  await expect(page.getByLabel("Seller-verified food details")).toBeVisible();
  await expect(page.getByLabel("Pick up food by")).toBeVisible();
});
test("impact reports zero rather than fictional activity and mobile layout fits", async ({
  page,
}) => {
  await page.goto("/impact");
  await expect(
    page.getByRole("heading", { name: "Food portions shared" }),
  ).toBeVisible();
  await expect(page.getByText("No live activity is connected.")).toBeVisible();
  await expect(page.locator(".impact-stat>strong")).toHaveText(["0", "0", "0"]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/");
  await expect(page.locator(".listing-card").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  for (const image of await page.locator("img").all())
    expect(
      await image.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    ).toBe(true);
});
