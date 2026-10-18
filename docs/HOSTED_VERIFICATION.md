# Verify the real hosted integrations

This is an **unchecked live-verification checklist**, not a claim these checks have passed. The code, isolated PostgreSQL tests and preview browser checks passed in Codex; hosted Supabase credentials and an OpenAI key were not present. The automated connected suite is intentionally restricted to disposable local Supabase and was blocked by Docker image storage. Do not remove its guard and aim it at CampusLoop Main.

Use your Mac app with the hosted project configured. Keep A (seller) in one browser profile and B (buyer) in another. Use a third profile/account C for a true two-buyer race. Never paste sessions, HAR files, keys, codes or passwords into chat or GitHub. Use `http://localhost:3000` consistently; localhost belongs to your Mac. Test your own real photo and new `[TEST]` listings, not the fictional read-only samples.

**Effects:** publishing/reserving/cancelling/completing create or change real hosted rows; photo publication uploads a public file. AI requests can incur charges. Completed test pickups affect app impact permanently under the current user workflow; they are test activity, not proven environmental outcomes. Prefer a separate hosted test project before a public release. No test here requires dropping/resetting data, disabling RLS, uploading a service-role key to a browser, or processing money.

## 1. Connected-state and authentication checklist

- [ ] No preview banner appears. A fresh real database may correctly show no listings. If six fictional preview cards appear, restart with the two public Supabase variables filled; a pretty preview is not backend evidence.
- [ ] A and B can sign up, confirm email and log in through `/auth`. Each has a `profiles` row matching their Auth UID. If preconfirmed dashboard users were used, record email signup/delivery as still untested.
- [ ] Refresh and close/reopen a page in each profile; its correct user persists. Logout in A's profile does not switch B's account. Confirm a logged-out guest can browse but cannot publish, reserve or run AI.
- [ ] Change A's profile name and preferred landmark; a subsequent new listing uses them. Email must not be visible on public cards/details.
- [ ] Test password recovery through its email in the initiating browser, then set a new password in **My loop → Profile**. Record this separately from simple login.

Likely failures: wrong URL/key pair, expired session, missing profile trigger, email restrictions, mismatched callback host/port/profile or a custom email template for an unimplemented route. See [Supabase troubleshooting](SUPABASE_SETUP.md#troubleshooting). Auth dashboard user creation is not proof that the app's login/cookies work.

## 2. Real AI and draft editing

- [ ] A selects **List with AI** → a real JPEG/PNG/WebP photograph → **Generate my listing**. Photo previews immediately; loading prevents repeat Generate clicks.
- [ ] Browser Network shows `POST /api/ai/listing` → **200** → a structured `draft` with title/category/subcategory/description/visible_details/seller_checks. The same photo remains visible and the form is populated. OpenAI Usage, filtered to CampusLoop, confirms matching model usage after any reporting delay.
- [ ] Text naturally describes the photographed object and omits unsupported claims. Seller-confirmation prompts handle uncertainty. For food, the seller must separately enter verified contents/allergen/handling information and a deadline within 48 hours.
- [ ] Edit title, description, category, Free/price, quantity, landmark and deadline. Edits make no additional AI request. The AI did not fabricate price, pickup spot, dates, quantity or safety assurances.
- [ ] Recoverable generation failure retains the photo and entered text. On your local app only, temporarily remove the OpenAI key from the ignored env file, restart and test the truthful manual fallback, then restore/restart. This intentionally breaks AI during that check; it does not test provider success. Reloading a page retains draft text in that tab but requires reattaching the image.

| AI response/symptom                             | Expected interpretation / next action                                                                                                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 200 with valid `draft`, matching provider usage | Genuine integration path; retain sanitized success evidence (date/model/status only).                                                                                                                |
| 401 from the local app route                    | Sign in to the connected Supabase account.                                                                                                                                                           |
| 403 from local route                            | Origin mismatch; use the app's actual origin. Behind a reverse proxy, verify forwarded scheme/host rather than disabling origin validation.                                                          |
| 503                                             | Missing OpenAI key/backend, bad provider permissions, or unavailable quota RPC. Check configuration and the error text. Key must allow `POST /v1/responses`; Images-only permission is insufficient. |
| 413 / 415                                       | Image too large or unsupported/forged type. Use JPEG/PNG/WebP; convert HEIC. Source max 20 MB, compressed max 3 MB.                                                                                  |
| 422                                             | Refusal/empty or invalid structured draft. Try one clearer non-sensitive photo, or use manual mode. No fabricated fallback text should appear.                                                       |
| 429                                             | App's eight/hour/user quota or provider quota/rate/billing limit. Check local message, OpenAI billing/Usage/Limits; do not loop clicks.                                                              |
| 502 / network error / long wait                 | Provider/network/model problem or 45-second timeout; check account model access/billing and server egress. The app intentionally does not log provider payloads or photos.                           |

These checks may incur OpenAI charges. Project budget alerts are not reliable hard caps. Never solve a restricted-key failure by placing the key in `NEXT_PUBLIC_` or turning on unrelated permissions.

## 3. Publish, Storage and discovery

- [ ] A publishes `[TEST] Free study lamp`, category Items/Electronics, price Free, quantity 1, landmark AMS Student Nest and a future deadline. Use **Publish listing** once. It navigates to a real UUID listing page, not a `demo-…` URL.
- [ ] Supabase **Storage → listing-images** contains `<A_UID>/<photo_UUID>.jpg`. **Table Editor → listings** contains the same image path and seller UUID, `is_demo=false`, original quantity and available quantity 1. There is no base64 image in the row. Refreshing retrieves the saved listing.
- [ ] B or a logged-out profile finds the listing by search and category/free filters and sees the correct photograph, CAD price, location, quantity and deadline. B can open the public photograph without A's session.
- [ ] A edits its title/description and sees the change after refresh; B cannot edit it. A may remove its own unused test listing; removal prevents new reservations but preserves existing buyer/seller history.
- [ ] If using optional `npm run seed`, run it twice on the intended project: first inserts samples; second skips their IDs. No real rows/reservations are reset. Samples remain labelled and cannot be reserved; they never affect impact. Remove the administrative seed key afterward.

Upload failures: verify the named bucket, MIME/size limit, signed-in UID path and Storage policies. Listing failures after upload: inspect migration/RPC/grants and the form's deadline/category/food validation. A failed publish can leave an unreferenced image; do not solve it by adding public bucket writes. Backend errors do not silently become successful sample data.

## 4. Free reservation, code and handoff — A and B

1. Record current **Our impact** counts (food/items/pickups).
2. B opens A's free listing and chooses **Reserve for free**. Expected: one reservation, status `reserved`, quantity 1; `available_quantity` becomes 0. B's **My loop → My pickups** shows an 8-character hexadecimal code. Merely reserving does **not** change impact.
3. Refresh B's page. The code persists. A opens **My loop → Seller handoffs**, refreshes and sees the reservation and quantity but cannot read B's code from a table query or UI. Unrelated C must see neither reservation nor code.
4. A enters one deliberately wrong code. Expected: clear mismatch error; reservation remains reserved and impact unchanged. Do not burn all ten attempts; ten failures lock confirmation for that reservation.
5. When the test handoff is intended, B shares the code; A enters it and clicks **Confirm handoff**. Both refresh: status `completed`, timestamp recorded, quantity remains unavailable. B cannot self-complete. A must not confirm twice to count twice.
6. Impact changes by exactly **one item unit and one pickup** compared with baseline; food count stays unchanged. Refresh repeatedly: no extra increments. Existing held pickups can be completed after the listing deadline; only new reservations are denied after expiry.

Troubleshooting: wrong buyer code/reservation/profile, stale dashboard (Refresh button/tab return), cancelled status or ten failed attempts. Only buyer/seller may cancel a reserved entry; a completed pickup cannot be cancelled. If an active reservation locks after ten wrong guesses, cancel and intentionally reserve anew (with a new request key) if inventory/deadline still permit it.

## 5. Cancellation, multiple quantities and paid listings

- [ ] A publishes a **new** test item with quantity 3. B reserves 2; availability goes 3 → 1. B cancels; availability goes 1 → 3. Retrying cancellation restores nothing extra. Cancelled pickups never affect impact. A can also cancel its own listing's reservations.
- [ ] A publishes another item at CAD 5 using the **Pass it on for free?** toggle, quantity 1. B sees **Reserve — Pay at pickup** and CAD 5, reserves, gets a code and directions, and A can complete the handoff normally. No Stripe request, card input, successful charge or online-paid status should appear. Pickup confirmation does not verify cash payment.
- [ ] After a non-cancelled reservation exists, trying to change total quantity or category is refused. Existing reservation unit price stays the agreed snapshot if the seller changes the listing price. Description, pickup and deadline can currently be changed by the seller; there is no notification system, so coordinate changes explicitly.
- [ ] Optional food case: create a responsibly described test food listing with seller-entered details, quantity 2 and pickup within 48 hours. Reserve 2 and complete once. Compared with baseline, food +2, pickups +1, item count unchanged. Do not present artificial test handoffs as real waste savings.

## 6. Hosted concurrency and retry behavior

**A seller cannot reserve its own listing. A and B alone are not two different buyers.** For a genuine independent-buyer race use A as seller and B/C as buyers in separate profiles. Alternatively B can use two tabs as two independent requests, but label this a same-buyer contention check.

1. A publishes a fresh non-demo test item, quantity **1**, future deadline.
2. B and C preload that same detail page while it still shows available.
3. Submit both Reserve actions as close together as possible. Use Network timing to check requests overlap; if they do not, repeat with another fresh listing before claiming simultaneous contention was tested. Do not change inventory directly to force a pass.
4. Expected: exactly one successful reservation; the other receives unavailable/not-enough-quantity feedback and an updated detail state. Inventory is 0, never negative. The loser has no new reservation/code.
5. In **SQL Editor**, copy the listing UUID from its URL and run these **read-only** checks, replacing the UUID locally:

```sql
select id, quantity, available_quantity, status, expires_at, is_demo
from public.listings where id='REPLACE_WITH_LISTING_UUID';

select id, buyer_id, quantity, status
from public.reservations where listing_id='REPLACE_WITH_LISTING_UUID';
-- Right after the fresh one-unit race: one reserved row, quantity 1; available_quantity=0.
```

6. To check duplicate delivery, in the **winning buyer's** DevTools Network entry for `rpc/reserve_listing`, use the browser's **Replay XHR** / **Edit and Resend** feature (where available) to resend the **identical** request with its original `p_key`, listing and quantity. This makes an authenticated write request. Do not copy its headers/tokens anywhere else. Expected: same reservation UUID and unchanged inventory/row count. Reusing that key with a different quantity/listing is refused. An ordinary new click after a reload gets a new key and is not an identical retry. DevTools UI varies; if replay is unavailable, leave this live checkbox pending rather than claiming it from a normal refresh.
7. Cancel the winning reservation once and verify stock returns to 1. On a separate test, retry completion of the same reservation and verify exactly one completed pickup/impact increment. No directly edited database status is proof of a working application RPC.

The isolated automated test already exercised 20 concurrent connections competing for 5 units and duplicate reserve/complete/cancel calls, **but that was local PostgreSQL, not hosted Supabase**. Record hosted outcomes separately. UI clicking without overlapping requests is a functional availability check, not a load/concurrency test.

## 7. Expiry and walking directions

- [ ] A publishes a separate item with a deadline a few minutes ahead. B preloads it; wait until **after the stored server deadline**, then attempt to reserve from the stale page if the control is still present. The RPC must refuse even before a scheduled job or UI refresh. If the UI already disables it, that validates display but leaves the stale-request assertion for a replay/explicit RPC check using the same authenticated tools as above.
- [ ] Reload: an **Expired**/unavailable state appears and new reservation is impossible. Existing reservations still appear for completion/cancellation. Expiry itself never increments impact. A new item deadline must be within 31 days; food within 48 hours. Forms use your device's local time; displayed listing deadlines use Vancouver/PT and database timestamps are UTC.
- [ ] **Get walking directions** on listing / **Get directions** on B's reservation opens Google Maps with `api=1`, the selected landmark coordinates, and `travelmode=walking`. Verify it points at the intended public UBC landmark and entrance, not a residential address. No Maps key, app geolocation or API billing is required. Confirm physical landmark accuracy before inviting the public.

## 8. Authorization and RLS — browser plus named-role SQL

- [ ] Signed-out browsing works; protected actions require login. A cannot reserve A's listing.
- [ ] B opens A's `/listings/A_LISTING_UUID/edit`: refused. This UI check alone is not a database authorization test.
- [ ] With known test rows belonging to several users, use the role-scoped read test below. B sees only its profile, reservations where it is buyer/seller, and its own buyer codes. A can read B's reservation for A's listing but cannot read its code. C sees neither. Compare with the administrative data first: zero rows is meaningful only if other users' rows actually exist.
- [ ] Verify table/RPC grants using [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Browser identities have no direct inventory or reservation writes; use the authenticated functions, never service-role credentials, for functional tests.

**SQL Editor, read-only within a rolled-back transaction** (replace B's UID locally; not an API key). `SET LOCAL ROLE` is essential: the ordinary SQL Editor is an administrator and bypasses RLS. This simulates database role/UID authorization; it does not validate browser JWT delivery, which must also work in the UI.

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','REPLACE_WITH_BUYER_B_UUID',true);
select auth.uid() as simulated_user;
select id, display_name from public.profiles; -- B only
select id, buyer_id, seller_id, status from public.reservations; -- B's party rows only
select reservation_id, buyer_id, code from public.pickup_secrets; -- B's buyer codes only
select count(*) as other_profiles from public.profiles where id<>auth.uid(); -- 0
select count(*) as unrelated_reservations from public.reservations
 where buyer_id<>auth.uid() and seller_id<>auth.uid(); -- 0
select count(*) as other_buyer_codes from public.pickup_secrets where buyer_id<>auth.uid(); -- 0
rollback;
```

Repeat using seller A's UUID and query **B's known reservation UUID** from `pickup_secrets`: it must return zero rows. Repeat using unrelated C. Do not screenshot code values. To inspect public-listing permissions as a guest, use `set local role anon` inside a separate transaction, `set_config('request.jwt.claim.sub','',true)`, and query only listing data; private-table reads should be denied by grants.

For server-side ownership testing, use a dedicated `[TEST]` listing owned by B with an already uploaded B photo, and one owned by A. In SQL Editor, substitute the two UUIDs and B's Auth UID in the following rollback-only test. It exercises `save_listing` under B's identity with otherwise valid B-owned photo/data; the result should be **Expected refusal**, and A's row must stay unchanged. Do not point it at unrelated real offers.

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','REPLACE_WITH_BUYER_B_UUID',true);
do $$
declare payload jsonb; target uuid := 'REPLACE_WITH_A_TEST_LISTING_UUID';
begin
  select jsonb_build_object(
    'title',title,'description',description,'category',category,'subcategory',subcategory,
    'price_cents',price_cents,'quantity',quantity,'landmark',landmark,
    'expires_at',expires_at,'image_path',image_path,'food_details',food_details)
  into payload from public.listings where id='REPLACE_WITH_B_TEST_LISTING_UUID';
  if payload is null then raise exception 'Create a valid B-owned test listing first'; end if;
  begin
    perform public.save_listing(payload,target);
    raise warning 'UNEXPECTED SUCCESS: ownership check failed. Transaction will be rolled back.';
  exception when others then
    if sqlerrm = 'Listing not found or not yours' then
      raise notice 'Expected refusal: %',sqlerrm;
    else
      raise exception 'Test did not reach the ownership guard: %',sqlerrm;
    end if;
  end;
end $$;
rollback;
```

This test attempts a write but rolls it back; run the full transaction, never copy only the `perform` call. It is a database-authorization check, not a replacement for B's real authenticated app calls. Never relax RLS based on a zero-row result. For Storage authorization, verify unrelated users cannot insert into A's folder or overwrite A's published path; do not add an update policy to make such a test succeed. The migration's owner-unreferenced delete rule intentionally protects images referenced by any listing the owner can see.

## Evidence to record

For each checkbox, record date, environment (Mac + hosted project vs preview/local DB), application commit, test actor labels A/B/C, pass/fail and a sanitized error if any. Record the configured model and a successful AI response/Usage observation without images or credentials. Keep pending checks pending. If a failure is an actual code defect, preserve reproduction steps and fix it in a separate coding change rather than describing configuration as successful.
