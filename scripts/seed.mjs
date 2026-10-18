// Explicit, repeatable sample seeding. Requires an existing owner account.
// Does not create passwords, alter real listings, or manufacture completed impact.
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const owner = process.env.SEED_SELLER_ID;
if (!url || !key || !owner)
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SEED_SELLER_ID securely in .env.local. Use an existing seller user UUID.",
  );
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const check = (result) => {
  if (result.error) throw result.error;
  return result.data;
};
const profile = check(
  await db.from("profiles").select("id").eq("id", owner).single(),
);
if (!profile)
  throw new Error(
    "Seller profile missing. Apply the migration and create the seller account first.",
  );
const rows = [
  [
    "00000000-0000-4000-8000-000000000001",
    "croissants",
    "A loaf worth sharing",
    "A sourdough-style loaf from a fictional bakery. Sample only; all food information must be verified by a seller.",
    "food",
    "Bakery",
    400,
    4,
    "nest",
  ],
  [
    "00000000-0000-4000-8000-000000000002",
    "lamp",
    "A brighter study corner",
    "A cream desk lamp with an adjustable arm. Original illustration; check real item functionality at pickup.",
    "items",
    "Electronics",
    0,
    1,
    "ikb",
  ],
  [
    "00000000-0000-4000-8000-000000000003",
    "books",
    "New semester, pre-loved pages",
    "A small stack of study books. Sample illustration; verify editions and course requirements.",
    "items",
    "Textbooks",
    1200,
    1,
    "buchanan",
  ],
  [
    "00000000-0000-4000-8000-000000000004",
    "bowl",
    "Your lunch break, rescued",
    "A prepared food bowl from a fictional campus kitchen. Sample only; seller must confirm food information.",
    "food",
    "Meals",
    650,
    3,
    "orchard",
  ],
  [
    "00000000-0000-4000-8000-000000000005",
    "chair",
    "Room for one more",
    "A simple wooden chair. Sample illustration; inspect the real item in person.",
    "items",
    "Furniture",
    1500,
    1,
    "totem",
  ],
  [
    "00000000-0000-4000-8000-000000000006",
    "plant",
    "A little green for your room",
    "A small potted cactus in a terracotta pot. A fictional listing to demonstrate campus sharing.",
    "items",
    "Home",
    0,
    1,
    "sauder",
  ],
];
for (const [
  id,
  photo,
  title,
  description,
  category,
  subcategory,
  price_cents,
  quantity,
  landmark,
] of rows) {
  const existing = check(
    await db.from("listings").select("id,is_demo").eq("id", id).maybeSingle(),
  );
  if (existing) {
    if (!existing.is_demo)
      throw new Error(
        "Seed ID conflicts with a real listing; stopping without overwriting it.",
      );
    console.log(`Skipped existing sample: ${title}`);
    continue;
  }
  const image_path = `${owner}/${id}.jpg`;
  check(
    await db.storage
      .from("listing-images")
      .upload(
        image_path,
        await readFile(
          new URL(`../public/images/${photo}.jpg`, import.meta.url),
        ),
        { contentType: "image/jpeg", upsert: true },
      ),
  );
  check(
    await db.from("listings").insert({
      id,
      seller_id: owner,
      seller_name: "CampusLoop sample · Fictional",
      title,
      description,
      category,
      subcategory,
      price_cents,
      quantity,
      available_quantity: quantity,
      landmark,
      expires_at: new Date(
        Date.now() + (category === "food" ? 8 : 168) * 3600000,
      ).toISOString(),
      image_path,
      food_details:
        category === "food"
          ? "Sample only. Contents, allergens and handling require seller verification."
          : null,
      is_demo: true,
    }),
  );
  console.log(`Added fictional sample: ${title}`);
}
console.log(
  "Sample seeding finished. Samples never contribute to recorded community impact. Existing samples and reservations were preserved.",
);
