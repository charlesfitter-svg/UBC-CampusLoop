import { safeRedirect } from "../src/lib/safe-redirect";
import { describe, it, expect } from "vitest";
import {
  listingSchema,
  validateDeadline,
  available,
  directions,
  money,
} from "../src/lib/marketplace";
import { aiDraftSchema, imageMime, aiError } from "../src/lib/ai";
import { demoListings } from "../src/lib/demo";
const example = () => demoListings()[1];
describe("listing validation and availability", () => {
  it("accepts a complete free item", () =>
    expect(listingSchema.safeParse(example()).success).toBe(true));
  it.each([0, -1, 1.5, 101, NaN])("rejects quantity %s", (quantity) =>
    expect(listingSchema.safeParse({ ...example(), quantity }).success).toBe(
      false,
    ),
  );
  it("requires seller verified details for food", () =>
    expect(
      listingSchema.safeParse({ ...demoListings()[0], food_details: null })
        .success,
    ).toBe(false));
  it("rejects food subcategories on goods", () =>
    expect(
      listingSchema.safeParse({ ...example(), subcategory: "Meals" }).success,
    ).toBe(false));
  it("rejects negative pricing", () =>
    expect(
      listingSchema.safeParse({ ...example(), price_cents: -1 }).success,
    ).toBe(false));
  it("enforces expiration and food windows", () => {
    const now = Date.now();
    expect(
      validateDeadline(new Date(now - 1).toISOString(), "items", now),
    ).toBeTruthy();
    expect(
      validateDeadline(new Date(now + 3 * 86400000).toISOString(), "food", now),
    ).toBeTruthy();
    expect(
      validateDeadline(new Date(now + 86400000).toISOString(), "items", now),
    ).toBeNull();
  });
  it("makes expired, removed and sold out listings unavailable", () => {
    expect(
      available({ ...example(), expires_at: new Date(0).toISOString() }),
    ).toBe(false);
    expect(available({ ...example(), status: "removed" })).toBe(false);
    expect(available({ ...example(), available_quantity: 0 })).toBe(false);
  });
  it("uses walking URLs and honest price labels", () => {
    expect(directions("nest")).toContain("travelmode=walking");
    expect(money(0)).toBe("Free");
    expect(money(650)).toContain("6.50");
  });
});
describe("AI boundary", () => {
  const draft = {
    title: "Cream desk lamp",
    description: "A cream lamp with an adjustable arm.",
    category: "items",
    subcategory: "Electronics",
    visible_details: ["Cream shade"],
    seller_checks: ["Verify it works."],
  };
  it("accepts a structured draft", () =>
    expect(aiDraftSchema.parse(draft).title).toBe(draft.title));
  it("rejects incomplete or invented schema fields", () => {
    expect(
      aiDraftSchema.safeParse({ ...draft, category: "vehicles" }).success,
    ).toBe(false);
    expect(aiDraftSchema.safeParse({ title: "lamp" }).success).toBe(false);
  });
  it("validates magic bytes instead of trusting MIME labels", () => {
    expect(imageMime(new Uint8Array([255, 216, 255]))).toBe("image/jpeg");
    expect(imageMime(new TextEncoder().encode("<svg/>"))).toBeNull();
  });
  it("gives safe errors for quota, auth and provider failures", () => {
    expect(aiError(429).status).toBe(429);
    expect(aiError(401).status).toBe(503);
    expect(aiError(500).message).toContain("safe");
  });
});

describe("login redirects", () => {
  it("allows an internal listing path", () =>
    expect(safeRedirect("/listings/123?x=1", "https://campus.test")).toBe(
      "/listings/123?x=1",
    ));
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "javascript:alert(1)",
  ])("rejects external redirect %s", (value) =>
    expect(safeRedirect(value, "https://campus.test")).toBe("/dashboard"),
  );
});
