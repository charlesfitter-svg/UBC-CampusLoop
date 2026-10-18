import { z } from "zod";

export const landmarks = {
  nest: {
    name: "AMS Student Nest",
    short: "The Nest",
    lat: 49.2666,
    lng: -123.2499,
    note: "Outside the main entrance on University Boulevard",
  },
  ikb: {
    name: "Irving K. Barber Library",
    short: "IKB Library",
    lat: 49.2675,
    lng: -123.2527,
    note: "By the steps facing Main Mall",
  },
  buchanan: {
    name: "Buchanan Courtyard",
    short: "Buchanan",
    lat: 49.269,
    lng: -123.2546,
    note: "Central courtyard, beside the benches",
  },
  sauder: {
    name: "Sauder School of Business",
    short: "Sauder",
    lat: 49.2648,
    lng: -123.2538,
    note: "Outside the main entrance on Main Mall",
  },
  totem: {
    name: "Totem Park Commonsblock",
    short: "Totem Park",
    lat: 49.2595,
    lng: -123.2612,
    note: "Outside the commonsblock entrance",
  },
  orchard: {
    name: "Orchard Commons",
    short: "Orchard Commons",
    lat: 49.2606,
    lng: -123.2497,
    note: "Public plaza outside the dining hall",
  },
  life: {
    name: "UBC Life Building",
    short: "Life Building",
    lat: 49.267,
    lng: -123.2503,
    note: "Outside the south entrance",
  },
} as const;
export type Landmark = keyof typeof landmarks;
export const subcategories = [
  "Bakery",
  "Meals",
  "Produce",
  "Textbooks",
  "Furniture",
  "Electronics",
  "Home",
  "Supplies",
  "Other",
] as const;
export const foodCategories = ["Bakery", "Meals", "Produce", "Other"];
export const listingSchema = z
  .object({
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().min(10).max(1600),
    category: z.enum(["food", "items"]),
    subcategory: z.enum(subcategories),
    price_cents: z.number().int().min(0).max(100000),
    quantity: z.number().int().min(1).max(100),
    landmark: z.enum([
      "nest",
      "ikb",
      "buchanan",
      "sauder",
      "totem",
      "orchard",
      "life",
    ]),
    expires_at: z.iso.datetime({ offset: true }),
    image_path: z.string().min(1).max(300),
    food_details: z.string().trim().max(800).nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.category === "food" && (!v.food_details || v.food_details.length < 5))
      ctx.addIssue({
        code: "custom",
        path: ["food_details"],
        message: "Confirm food contents, allergens and handling information.",
      });
    const valid =
      v.category === "food"
        ? foodCategories.includes(v.subcategory)
        : !["Bakery", "Meals", "Produce"].includes(v.subcategory);
    if (!valid)
      ctx.addIssue({
        code: "custom",
        path: ["subcategory"],
        message: "Choose a subcategory matching the listing.",
      });
  });
export function validateDeadline(
  expires: string,
  category: string,
  now = Date.now(),
) {
  const time = Date.parse(expires);
  if (!Number.isFinite(time) || time <= now)
    return "Choose a future pickup deadline.";
  if (time - now > (category === "food" ? 2 : 31) * 86400000)
    return category === "food"
      ? "Food pickup must be within 48 hours."
      : "Choose a deadline within 31 days.";
  return null;
}
export type ListingInput = z.infer<typeof listingSchema>;
export type Listing = ListingInput & {
  id: string;
  seller_id: string;
  seller_name: string;
  available_quantity: number;
  status: "active" | "removed";
  is_demo: boolean;
  created_at: string;
};
export type Reservation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  quantity: number;
  unit_price_cents: number;
  status: "reserved" | "cancelled" | "completed";
  created_at: string;
  completed_at: string | null;
  listing?: Listing;
  code?: string;
};
export const money = (cents: number) =>
  cents === 0
    ? "Free"
    : new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: cents % 100 ? 2 : 0,
      }).format(cents / 100);
export const available = (l: Listing, now = Date.now()) =>
  l.status === "active" &&
  l.available_quantity > 0 &&
  Date.parse(l.expires_at) > now;
export function deadlineLabel(value: string) {
  const date = new Date(value);
  return (
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Vancouver",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date) + " PT"
  );
}
export function directions(landmark: Landmark) {
  const l = landmarks[landmark];
  return `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}&travelmode=walking`;
}
export function imageUrl(path: string) {
  if (path.startsWith("/images/")) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path.split("/").map(encodeURIComponent).join("/")}`;
}
