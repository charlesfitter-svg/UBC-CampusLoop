import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const seller = randomUUID(),
  buyer = randomUUID(),
  stranger = randomUUID();
const bootstrap = readFileSync(
  new URL("./support.sql", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL(
    "../supabase/migrations/202610180001_marketplace.sql",
    import.meta.url,
  ),
  "utf8",
);
async function as<T = Record<string, unknown>>(
  uid: string | null,
  sql: string,
  params: unknown[] = [],
) {
  await db.exec(`set role ${uid ? "authenticated" : "anon"}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    uid ?? "",
  ]);
  try {
    return await db.query<T>(sql, params);
  } finally {
    await db.exec("reset role");
  }
}
async function listing(overrides: Record<string, unknown> = {}) {
  const photo = `${seller}/${randomUUID()}.jpg`;
  await db.query(
    "insert into storage.objects(bucket_id,name) values('listing-images',$1)",
    [photo],
  );
  const data = {
    title: "Desk lamp",
    description: "A visible cream lamp with a round shade.",
    category: "items",
    subcategory: "Electronics",
    price_cents: 0,
    quantity: 1,
    landmark: "nest",
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    image_path: photo,
    food_details: null,
    ...overrides,
  };
  const r = await as<{ id: string }>(
    seller,
    "select public.save_listing($1) as id",
    [data],
  );
  return { id: r.rows[0].id, data };
}
async function reserve(id: string, qty = 1, key = randomUUID(), uid = buyer) {
  const r = await as<{ id: string }>(
    uid,
    "select public.reserve_listing($1,$2,$3) as id",
    [id, qty, key],
  );
  return r.rows[0].id;
}
beforeAll(async () => {
  await db.exec(bootstrap);
  await db.exec(migration);
  for (const id of [seller, buyer, stranger])
    await db.query(
      'insert into auth.users(id,raw_user_meta_data) values($1,\'{"display_name":"Test neighbour"}\')',
      [id],
    );
});
afterAll(() => db.close());
describe("real PostgreSQL migration functions and role policies (PGlite)", () => {
  it("enables RLS on all five application tables", async () => {
    const r = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r'",
    );
    expect(r.rows).toHaveLength(5);
    expect(r.rows.every((r) => r.relrowsecurity)).toBe(true);
  });
  it("allows anonymous browse but hides profiles and reservations", async () => {
    const l = await listing();
    expect(
      (await as(null, "select id from public.listings where id=$1", [l.id]))
        .rows,
    ).toHaveLength(1);
    await expect(as(null, "select * from public.profiles")).rejects.toThrow(
      /permission denied/,
    );
    await expect(as(null, "select * from public.reservations")).rejects.toThrow(
      /permission denied/,
    );
  });
  it("prevents direct inventory writes, including by its seller", async () => {
    const l = await listing();
    await expect(
      as(
        seller,
        "update public.listings set available_quantity=99 where id=$1",
        [l.id],
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("prevents another user editing or removing a listing", async () => {
    const l = await listing();
    const strangerPhoto = `${stranger}/${randomUUID()}.jpg`;
    await db.query(
      "insert into storage.objects(bucket_id,name) values('listing-images',$1)",
      [strangerPhoto],
    );
    await expect(
      as(stranger, "select public.save_listing($1,$2)", [
        { ...l.data, image_path: strangerPhoto },
        l.id,
      ]),
    ).rejects.toThrow(/not yours/);
    await expect(
      as(stranger, "select public.remove_listing($1)", [l.id]),
    ).rejects.toThrow(/not yours/);
  });
  it("prevents anonymous and self reservations", async () => {
    const l = await listing();
    await expect(reserve(l.id, 1, randomUUID(), seller)).rejects.toThrow(
      /own listing/,
    );
    await expect(
      as(null, "select public.reserve_listing($1,1,$2)", [l.id, randomUUID()]),
    ).rejects.toThrow(/permission denied/);
  });
  it("rejects invalid quantities and overselling", async () => {
    const l = await listing({ quantity: 2 });
    await expect(reserve(l.id, 0)).rejects.toThrow(/quantity/);
    await expect(reserve(l.id, 3)).rejects.toThrow(/quantity/);
    await reserve(l.id, 2);
    await expect(reserve(l.id)).rejects.toThrow(/quantity/);
  });
  it("makes retries idempotent and validates their payload", async () => {
    const l = await listing({ quantity: 3 });
    const key = randomUUID();
    const a = await reserve(l.id, 1, key);
    expect(await reserve(l.id, 1, key)).toBe(a);
    await expect(reserve(l.id, 2, key)).rejects.toThrow(/different request/);
    const r = await db.query<{ available_quantity: number }>(
      "select available_quantity from public.listings where id=$1",
      [l.id],
    );
    expect(r.rows[0].available_quantity).toBe(2);
  });
  it("refuses expired listings without a cleanup worker", async () => {
    const l = await listing();
    await db.query(
      "update public.listings set expires_at=now()-interval '1 second' where id=$1",
      [l.id],
    );
    await expect(reserve(l.id)).rejects.toThrow(/no longer available/);
  });
  it("refuses removed listings and invalid food details", async () => {
    const l = await listing();
    await as(seller, "select public.remove_listing($1)", [l.id]);
    await expect(reserve(l.id)).rejects.toThrow(/no longer available/);
    await expect(
      listing({ category: "food", subcategory: "Meals", food_details: null }),
    ).rejects.toThrow();
  });
  it("isolates reservations and hides pickup codes from sellers and strangers", async () => {
    const l = await listing();
    const id = await reserve(l.id);
    expect(
      (
        await as(stranger, "select * from public.reservations where id=$1", [
          id,
        ])
      ).rows,
    ).toHaveLength(0);
    expect(
      (await as(seller, "select * from public.reservations where id=$1", [id]))
        .rows,
    ).toHaveLength(1);
    expect(
      (
        await as(
          seller,
          "select code from public.pickup_secrets where reservation_id=$1",
          [id],
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await as(
          buyer,
          "select code from public.pickup_secrets where reservation_id=$1",
          [id],
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("cancels once, restores inventory once, rejects strangers", async () => {
    const l = await listing({ quantity: 3 });
    const id = await reserve(l.id, 2);
    await expect(
      as(stranger, "select public.cancel_reservation($1)", [id]),
    ).rejects.toThrow(/not found/);
    await as(buyer, "select public.cancel_reservation($1)", [id]);
    await as(buyer, "select public.cancel_reservation($1)", [id]);
    const r = await db.query<{ available_quantity: number }>(
      "select available_quantity from public.listings where id=$1",
      [l.id],
    );
    expect(r.rows[0].available_quantity).toBe(3);
  });
  it("checks seller and code, completes once and counts impact once", async () => {
    const l = await listing({ price_cents: 650, quantity: 2 });
    const id = await reserve(l.id, 2);
    const code = (
      await as<{ code: string }>(
        buyer,
        "select code from public.pickup_secrets where reservation_id=$1",
        [id],
      )
    ).rows[0].code;
    await expect(
      as(stranger, "select public.complete_pickup($1,$2)", [id, code]),
    ).rejects.toThrow(/Only the seller/);
    await expect(
      as(buyer, "select public.complete_pickup($1,$2)", [id, code]),
    ).rejects.toThrow(/Only the seller/);
    expect(
      (
        await as<{ ok: boolean }>(
          seller,
          "select public.complete_pickup($1,$2) as ok",
          [id, "WRONG"],
        )
      ).rows[0].ok,
    ).toBe(false);
    await as(seller, "select public.complete_pickup($1,$2)", [id, code]);
    await as(seller, "select public.complete_pickup($1,$2)", [id, code]);
    await expect(
      as(buyer, "select public.cancel_reservation($1)", [id]),
    ).rejects.toThrow(/Completed/);
    const impact = (
      await as<{ totals: { pickups: number; items: number } }>(
        null,
        "select public.impact_totals() as totals",
      )
    ).rows[0].totals;
    expect(impact.pickups).toBe(1);
    expect(impact.items).toBe(2);
  });
  it("never counts seeded fictional activity", async () => {
    const l = await listing();
    await db.query("update public.listings set is_demo=true where id=$1", [
      l.id,
    ]);
    const id = await reserve(l.id);
    const code = (
      await as<{ code: string }>(
        buyer,
        "select code from public.pickup_secrets where reservation_id=$1",
        [id],
      )
    ).rows[0].code;
    await as(seller, "select public.complete_pickup($1,$2)", [id, code]);
    expect(
      (
        await as<{ totals: { pickups: number } }>(
          null,
          "select public.impact_totals() as totals",
        )
      ).rows[0].totals.pickups,
    ).toBe(1);
  });
  it("prevents quantity/category changes with reservations and preserves agreed price", async () => {
    const l = await listing({ quantity: 3, price_cents: 200 });
    const id = await reserve(l.id);
    await expect(
      as(seller, "select public.save_listing($1,$2)", [
        { ...l.data, quantity: 5 },
        l.id,
      ]),
    ).rejects.toThrow(/Quantity is fixed/);
    await as(seller, "select public.save_listing($1,$2)", [
      { ...l.data, price_cents: 500 },
      l.id,
    ]);
    expect(
      (
        await as<{ unit_price_cents: number }>(
          buyer,
          "select unit_price_cents from public.reservations where id=$1",
          [id],
        )
      ).rows[0].unit_price_cents,
    ).toBe(200);
  });
  it("limits AI requests atomically to eight per hour", async () => {
    for (let i = 0; i < 8; i++)
      expect(
        (
          await as<{ ok: boolean }>(
            buyer,
            "select public.consume_ai_quota() as ok",
          )
        ).rows[0].ok,
      ).toBe(true);
    expect(
      (
        await as<{ ok: boolean }>(
          buyer,
          "select public.consume_ai_quota() as ok",
        )
      ).rows[0].ok,
    ).toBe(false);
  });
  it("enforces storage ownership for writes and referenced photo deletion", async () => {
    await expect(
      as(
        stranger,
        "insert into storage.objects(bucket_id,name) values('listing-images',$1)",
        [`${seller}/${randomUUID()}.jpg`],
      ),
    ).rejects.toThrow(/row-level security/);
    const l = await listing();
    expect(
      (
        await as(
          seller,
          "delete from storage.objects where name=$1 returning name",
          [l.data.image_path],
        )
      ).rows,
    ).toHaveLength(0);
  });
});
