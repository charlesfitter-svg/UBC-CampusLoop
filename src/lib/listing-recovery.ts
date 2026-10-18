import type { Listing, Reservation } from "./marketplace";

export function needsFreeConfirmation(
  priceCents: number,
  existingPriceCents?: number,
) {
  return priceCents === 0 && existingPriceCents !== 0;
}

export function recoveryStatus(
  listing: Listing,
  owner: string,
  reservations: Reservation[],
  now = Date.now(),
): "ready" | "reserved" | null {
  if (
    listing.seller_id !== owner ||
    listing.status !== "active" ||
    listing.is_demo ||
    Date.parse(listing.expires_at) > now ||
    !Number.isFinite(Date.parse(listing.expires_at))
  )
    return null;
  if (
    reservations.some(
      (r) => r.listing_id === listing.id && r.status === "reserved",
    )
  )
    return "reserved";
  return listing.available_quantity > 0 ? "ready" : null;
}

export const recoveryDismissalKey = (listing: Listing) =>
  `campusloop-recovery:${listing.seller_id}:${listing.id}:${listing.expires_at}`;

export function localDateTime(time: number) {
  const date = new Date(time);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
