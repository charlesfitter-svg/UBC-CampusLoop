import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FlappyDegreeCard } from "../src/components/flappy-degree-card";
import type { Reservation } from "../src/lib/marketplace";

const game = "https://flappy-degree.example/play";
const render = (
  reservationStatus: Reservation["status"] = "reserved",
  isBuyerPickup = true,
) =>
  renderToStaticMarkup(
    createElement(FlappyDegreeCard, { reservationStatus, isBuyerPickup }),
  );

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_FLAPPY_DEGREE_URL", game));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("optional buyer pickup invitation", () => {
  it("renders an accessible invitation for an active reserved buyer pickup", () => {
    const html = render();
    expect(html).toContain('aria-label="Play while you wait"');
    expect(html).toContain("Waiting for your pickup?");
    expect(html).toContain("Three lives, one Thunderbird");
    expect(html).toContain("Play Flappy Degree");
    expect(html).toContain("opens in a separate window or tab");
  });

  it.each<Reservation["status"]>(["completed", "cancelled"])(
    "hides the invitation for a %s pickup",
    (status) => expect(render(status)).toBe(""),
  );

  it.each<Reservation["status"]>(["reserved", "completed", "cancelled"])(
    "never shows on seller handoffs, including %s reservations",
    (status) => expect(render(status, false)).toBe(""),
  );

  it.each([
    undefined,
    "",
    "http://flappy-degree.example",
    "javascript:alert(1)",
  ])("hides gracefully without a valid configured HTTPS URL: %j", (url) => {
    if (url === undefined) delete process.env.NEXT_PUBLIC_FLAPPY_DEGREE_URL;
    else vi.stubEnv("NEXT_PUBLIC_FLAPPY_DEGREE_URL", url);
    expect(render()).toBe("");
  });

  it("always includes a normal protected link for popup-blocked browsers", () => {
    const html = render();
    expect(html).toContain(`href="${game}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html).toContain("Open in a new tab instead");
    expect(html).toContain("Pop-up blocked?");
  });

  it("renders without opening or embedding/prefetching any external resource", () => {
    const open = vi.fn();
    vi.stubGlobal("window", { open });
    const html = render();
    expect(open).not.toHaveBeenCalled();
    expect(html).not.toMatch(/<(iframe|script|img|link|video|audio)\b/i);
    expect(html).not.toMatch(/\b(src|srcdoc|ping)=/i);
    expect(html).not.toContain("reservation=");
  });
});
