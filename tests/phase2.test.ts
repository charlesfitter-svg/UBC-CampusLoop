import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { demoListings } from "../src/lib/demo";
import {
  directions,
  landmarks,
  type Landmark,
  type Reservation,
} from "../src/lib/marketplace";
import {
  needsFreeConfirmation,
  recoveryDismissalKey,
  recoveryStatus,
} from "../src/lib/listing-recovery";
import {
  pickupMapUrl,
  pickupServices,
  telephone,
} from "../src/lib/pickup-help";
import {
  recommendedReuseIds,
  reuseDirections,
  reuseLink,
  reuseResources,
} from "../src/lib/reuse";
import { SafetyAccessibility } from "../src/components/safety-accessibility";
import { PickupNavigation } from "../src/components/pickup-navigation";

afterEach(() => vi.unstubAllEnvs());
describe("free publication intent", () => {
  it.each([
    [0, undefined, true],
    [500, undefined, false],
    [0, 500, true],
    [0, 0, false],
    [500, 0, false],
  ])(
    "price %s previously %s requires confirmation: %s",
    (price, previous, expected) => {
      expect(needsFreeConfirmation(price!, previous)).toBe(expected);
    },
  );
});
describe("pickup safety, accessibility and trusted maps", () => {
  it("uses verified contact numbers and HTTPS official information", () => {
    expect(pickupServices.map((service) => telephone(service.phone))).toEqual([
      "tel:+16048225355",
      "tel:+16048222222",
      "tel:+16048229929",
    ]);
    for (const service of pickupServices)
      expect(new URL(service.href).protocol).toBe("https:");
    const markup = renderToStaticMarkup(createElement(SafetyAccessibility));
    expect(markup).toContain("<summary>Safety &amp; Accessibility</summary>");
    expect(markup).toContain('href="tel:911"');
    expect(markup).toContain('href="https://maps.ubc.ca/"');
    expect(pickupServices[0].description).not.toMatch(/24\/7|\d:.*[ap]m/i);
    expect(pickupServices[2].description).toContain("advance bookings");
    expect(pickupServices[2].description).toContain("Not on-demand");
  });
  it.each(Object.keys(landmarks) as Landmark[])(
    "maps only canonical %s coordinates with encoded query parameters",
    (landmark) => {
      const key = "test-only+key&not-a-credential";
      const url = new URL(pickupMapUrl(landmark, key)!);
      expect(url.origin).toBe("https://www.google.com");
      expect(url.pathname).toBe("/maps/embed/v1/place");
      expect(url.searchParams.get("key")).toBe(key);
      expect(url.searchParams.get("q")).toBe(
        `${landmarks[landmark].lat},${landmarks[landmark].lng}`,
      );
      expect([...url.searchParams.keys()]).toEqual(["key", "q"]);
      expect(directions(landmark)).toContain("travelmode=walking");
    },
  );
  it("has no iframe without a key and rejects arbitrary destinations", () => {
    for (const key of [undefined, "", " "])
      expect(pickupMapUrl("nest", key)).toBeNull();
    for (const key of ["https://evil.example", "constructor", "__proto__"])
      expect(pickupMapUrl(key as Landmark, "test-key")).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY", "");
    const markup = renderToStaticMarkup(
      createElement(PickupNavigation, { landmark: "nest" }),
    );
    expect(markup).not.toContain("<iframe");
    expect(markup).toContain("Get walking directions");
    expect(markup).toContain("Safety &amp; Accessibility");
  });
  it("renders an accessible, lazy map with the external fallback retained", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY", "test-only-key");
    const markup = renderToStaticMarkup(
      createElement(PickupNavigation, { landmark: "nest" }),
    );
    expect(markup).toContain('title="Pickup map: AMS Student Nest"');
    expect(markup).toContain('loading="lazy"');
    expect(markup).toContain('height="260"');
    expect(markup).toContain("walking directions remain available");
  });
});
describe("expired recovery eligibility and reusable directory", () => {
  const expired = {
    ...demoListings()[1],
    is_demo: false,
    expires_at: new Date(0).toISOString(),
    seller_id: "owner",
  };
  it("flags only owned, expired, active listings with remaining inventory", () => {
    expect(recoveryStatus(expired, "owner", [])).toBe("ready");
    expect(recoveryStatus(expired, "stranger", [])).toBeNull();
    expect(
      recoveryStatus(
        {
          ...expired,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
        "owner",
        [],
      ),
    ).toBeNull();
    expect(
      recoveryStatus({ ...expired, status: "removed" }, "owner", []),
    ).toBeNull();
    expect(
      recoveryStatus({ ...expired, available_quantity: 0 }, "owner", []),
    ).toBeNull();
    expect(
      recoveryStatus({ ...expired, is_demo: true }, "owner", []),
    ).toBeNull();
  });
  it("defers unresolved reservations and keys dismissal to the exact expiry occurrence", () => {
    const reservation = {
      listing_id: expired.id,
      status: "reserved",
    } as Reservation;
    expect(recoveryStatus(expired, "owner", [reservation])).toBe("reserved");
    expect(
      recoveryStatus({ ...expired, available_quantity: 0 }, "owner", [
        reservation,
      ]),
    ).toBe("reserved");
    expect(
      recoveryStatus(expired, "owner", [
        { ...reservation, status: "completed" },
      ]),
    ).toBe("ready");
    expect(recoveryDismissalKey(expired)).not.toBe(
      recoveryDismissalKey({
        ...expired,
        expires_at: new Date(1000).toISOString(),
      }),
    );
  });
  it("suggests conditional resources by the existing taxonomy and keeps all six discoverable", () => {
    expect(
      recommendedReuseIds({ category: "food", subcategory: "Meals" }),
    ).toEqual(["food-bank", "sprouts", "recyclepedia"]);
    expect(
      recommendedReuseIds({ category: "items", subcategory: "Furniture" }),
    ).toEqual(["zero-waste", "recyclepedia"]);
    expect(
      recommendedReuseIds({ category: "items", subcategory: "Other" }),
    ).toContain("get-thrifty");
    expect(
      recommendedReuseIds({ category: "items", subcategory: "Electronics" }),
    ).not.toContain("get-thrifty");
    expect(reuseResources).toHaveLength(6);
    expect(
      reuseResources.find((r) => r.id === "zero-waste")!.description,
    ).toContain("Not an ordinary personal student drop-off");
    expect(
      reuseResources.find((r) => r.id === "food-bank")!.description,
    ).toContain("Do not assume prepared meals");
    expect(reuseLink(expired)).toContain("subcategory=Electronics");
    const destination = "UBC Life Building, Room 0014";
    expect(
      new URL(reuseDirections(destination)).searchParams.get("destination"),
    ).toBe(destination);
  });
});
