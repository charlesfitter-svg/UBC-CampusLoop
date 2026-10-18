export function safeRedirect(value: string | null, origin: string) {
  if (!value || !value.startsWith("/")) return "/dashboard";
  try {
    const url = new URL(value, origin);
    return url.origin === origin
      ? url.pathname + url.search + url.hash
      : "/dashboard";
  } catch {
    return "/dashboard";
  }
}
