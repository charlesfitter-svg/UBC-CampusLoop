import { afterEach, describe, expect, it, vi } from "vitest";
import { flappyDegreeUrl, openFlappyDegree } from "../src/lib/flappy-degree";

const game = "https://flappy-degree.example/play?mode=classic#start";

afterEach(() => vi.unstubAllGlobals());

describe("Flappy Degree URL configuration", () => {
  it("accepts and normalizes an absolute HTTPS game URL", () => {
    expect(flappyDegreeUrl("  HTTPS://flappy-degree.example  ")).toBe(
      "https://flappy-degree.example/",
    );
    expect(flappyDegreeUrl(game)).toBe(game);
  });

  it.each([
    undefined,
    "",
    "   ",
    "not a URL",
    "http://flappy-degree.example",
    "javascript:alert(1)",
    "data:text/html,game",
    "ftp://flappy-degree.example",
    "//flappy-degree.example",
    "/game",
    "https:flappy-degree.example",
    "https://",
    "https://player:secret@flappy-degree.example",
    "https://flappy-degree.example/with a space",
    "https://flappy-degree.example/with\na-line-break",
    "https://flappy-degree.example\\@other.example",
  ])("hides unusable or unsafe configuration %j", (url) => {
    expect(flappyDegreeUrl(url)).toBeNull();
  });
});

describe("safe synchronous external game navigation", () => {
  function browser(mobile: boolean) {
    const open = vi.fn<Window["open"]>(() => null);
    const matchMedia = vi.fn(() => ({ matches: mobile }));
    const location = {
      href: "https://campus.example/dashboard?reservation=private-id#pickup-code",
    };
    vi.stubGlobal("window", { open, matchMedia, location });
    return { open, matchMedia, location };
  }

  it("requests a protected, reasonably sized desktop popup synchronously", () => {
    const { open, matchMedia } = browser(false);
    openFlappyDegree(game);
    // Assert immediately: delaying this call can lose the click's user activation.
    expect(open).toHaveBeenCalledExactlyOnceWith(
      game,
      "_blank",
      "popup=yes,width=480,height=720,noopener,noreferrer",
    );
    expect(matchMedia).toHaveBeenCalledWith(
      "(max-width: 640px), (pointer: coarse)",
    );
  });

  it("requests a normal new tab on small or touch devices", () => {
    const { open } = browser(true);
    openFlappyDegree(game);
    expect(open).toHaveBeenCalledExactlyOnceWith(
      game,
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("never copies page/reservation information or navigates the current page", () => {
    const { open, location } = browser(false);
    const before = location.href;
    openFlappyDegree(game);
    expect(open.mock.calls[0][0]).toBe(game);
    expect(location.href).toBe(before);
    expect(JSON.stringify(open.mock.calls)).not.toContain("private-id");
    expect(JSON.stringify(open.mock.calls)).not.toContain("pickup-code");
  });

  it("handles blocked or uninspectable windows without retrying or redirecting", () => {
    const { open, location } = browser(false);
    const before = location.href;
    expect(() => openFlappyDegree(game)).not.toThrow();
    expect(open).toHaveBeenCalledTimes(1);
    expect(location.href).toBe(before);
  });

  it("keeps the ordinary-link recovery path usable if window.open throws", () => {
    const { open, location } = browser(false);
    const before = location.href;
    open.mockImplementation(() => {
      throw new Error("Blocked by browser policy");
    });
    expect(() => openFlappyDegree(game)).not.toThrow();
    expect(open).toHaveBeenCalledTimes(1);
    expect(location.href).toBe(before);
  });

  it("does not open an invalid URL even if called directly", () => {
    const { open, matchMedia } = browser(false);
    openFlappyDegree("javascript:alert(1)");
    expect(open).not.toHaveBeenCalled();
    expect(matchMedia).not.toHaveBeenCalled();
  });
});
