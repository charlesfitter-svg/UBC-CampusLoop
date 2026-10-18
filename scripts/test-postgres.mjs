// Real concurrent connections against a disposable, loopback-only PostgreSQL 17.
// Requires Docker. Never points at the owner's project or changes real accounts.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import pg from "pg";
const name = `campusloop-test-${randomUUID().slice(0, 8)}`;
const run = (args) => execFileSync("docker", args, { encoding: "utf8" }).trim();
let pool;
try {
  run([
    "run",
    "--rm",
    "-d",
    "--name",
    name,
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "-p",
    "127.0.0.1::5432",
    "postgres:17-alpine",
  ]);
  const port = run(["port", name, "5432/tcp"]).split(":").at(-1);
  pool = new pg.Pool({
    host: "127.0.0.1",
    port: Number(port),
    user: "postgres",
    database: "postgres",
    max: 24,
  });
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      await pool.query("select 1");
      break;
    } catch (e) {
      if (attempt === 29) throw e;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  await pool.query(
    readFileSync(new URL("../tests/support.sql", import.meta.url), "utf8"),
  );
  await pool.query(
    readFileSync(
      new URL(
        "../supabase/migrations/202610180001_marketplace.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const seller = randomUUID();
  const users = Array.from({ length: 20 }, () => randomUUID());
  for (const id of [seller, ...users])
    await pool.query(
      "insert into auth.users(id,raw_user_meta_data) values($1,'{}')",
      [id],
    );
  const photo = `${seller}/${randomUUID()}.jpg`;
  await pool.query(
    "insert into storage.objects(bucket_id,name) values('listing-images',$1)",
    [photo],
  );
  const payload = {
    title: "Concurrent test item",
    description: "A transaction test fixture, not demonstration data.",
    category: "items",
    subcategory: "Other",
    quantity: 5,
    price_cents: 500,
    landmark: "nest",
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    image_path: photo,
    food_details: null,
  };
  async function as(user, sql, params = []) {
    const connection = await pool.connect();
    try {
      await connection.query("begin");
      await connection.query("set local role authenticated");
      await connection.query(
        "select set_config('request.jwt.claim.sub',$1,true)",
        [user],
      );
      const result = await connection.query(sql, params);
      await connection.query("commit");
      return result;
    } catch (e) {
      await connection.query("rollback");
      throw e;
    } finally {
      connection.release();
    }
  }
  const id = (
    await as(seller, "select public.save_listing($1) as id", [payload])
  ).rows[0].id;
  const results = await Promise.allSettled(
    users.map((user) =>
      as(user, "select public.reserve_listing($1,1,$2) as id", [
        id,
        randomUUID(),
      ]),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 5);
  assert.equal(
    results.filter(
      (r) => r.status === "rejected" && /quantity/.test(r.reason.message),
    ).length,
    15,
  );
  assert.equal(
    (
      await pool.query(
        "select available_quantity from public.listings where id=$1",
        [id],
      )
    ).rows[0].available_quantity,
    0,
  );
  console.log(
    "PASS: 20 concurrent buyers compete for 5 units; exactly 5 reservations, zero oversell.",
  );
  const retryId = (
    await as(seller, "select public.save_listing($1) as id", [
      { ...payload, quantity: 10 },
    ])
  ).rows[0].id;
  const key = randomUUID();
  const retries = await Promise.all(
    Array.from({ length: 8 }, () =>
      as(users[0], "select public.reserve_listing($1,1,$2) as id", [
        retryId,
        key,
      ]),
    ),
  );
  assert.equal(new Set(retries.map((r) => r.rows[0].id)).size, 1);
  assert.equal(
    (
      await pool.query(
        "select available_quantity from public.listings where id=$1",
        [retryId],
      )
    ).rows[0].available_quantity,
    9,
  );
  console.log(
    "PASS: 8 concurrent retries produce one reservation and one inventory decrement.",
  );
  const reservation = retries[0].rows[0].id;
  const code = (
    await as(
      users[0],
      "select code from public.pickup_secrets where reservation_id=$1",
      [reservation],
    )
  ).rows[0].code;
  await Promise.all(
    Array.from({ length: 8 }, () =>
      as(seller, "select public.complete_pickup($1,$2)", [reservation, code]),
    ),
  );
  assert.equal(
    (await pool.query("select public.impact_totals() as totals")).rows[0].totals
      .pickups,
    1,
  );
  console.log(
    "PASS: 8 concurrent completion retries count exactly one impact event.",
  );
  const cancelId = results.find((r) => r.status === "fulfilled").value.rows[0]
    .id;
  await Promise.all(
    Array.from({ length: 8 }, () =>
      as(seller, "select public.cancel_reservation($1)", [cancelId]),
    ),
  );
  assert.equal(
    (
      await pool.query(
        "select available_quantity from public.listings where id=$1",
        [id],
      )
    ).rows[0].available_quantity,
    1,
  );
  console.log(
    "PASS: 8 concurrent cancellations return inventory exactly once.",
  );
} finally {
  if (pool) await pool.end();
  try {
    run(["rm", "-f", name]);
  } catch {
    /* Container may already be gone. */
  }
}
