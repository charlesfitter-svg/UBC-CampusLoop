/** Only the developer-configured public URL is used; no pickup/session data. */
export function flappyDegreeUrl(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (
    !candidate ||
    !/^https:\/\//i.test(candidate) ||
    [...candidate].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 32 || code === 127 || character === "\\";
    })
  )
    return null;

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" &&
      url.hostname &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** Call directly from the click event, before any async work. */
export function openFlappyDegree(value: string): void {
  const url = flappyDegreeUrl(value);
  if (!url) return;

  try {
    const preferTab = window.matchMedia(
      "(max-width: 640px), (pointer: coarse)",
    ).matches;
    window.open(
      url,
      "_blank",
      preferTab
        ? "noopener,noreferrer"
        : "popup=yes,width=480,height=720,noopener,noreferrer",
    );
    // With noopener, even a successful open can return null. The ordinary link
    // stays visible rather than guessing that a null handle means 'blocked'.
  } catch {
    // Some browser policies throw instead of returning null. The link remains
    // usable without navigating or changing the CampusLoop reservation page.
  }
}
