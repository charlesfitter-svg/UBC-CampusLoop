# Configure CampusLoop Main in Supabase Cloud

Use https://supabase.com/dashboard and select **CampusLoop Main** before every change. This app needs **Auth**, **Postgres Data API**, and **Storage** from the same project. A working GitHub connection does not configure them. No Docker or local database is required.

## 1. Inspect before changing anything — Supabase SQL Editor

Open **SQL Editor → New query**, select the normal database connection / `postgres` role, and run this **read-only** check:

```sql
select table_name
from information_schema.tables
where table_schema='public'
  and table_name in ('profiles','listings','reservations','pickup_secrets','ai_usage');

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets where id='listing-images';

select tgname from pg_trigger where tgname='campusloop_new_user';
```

On a fresh intended project these return no CampusLoop application objects. If the five tables and trigger already exist, do not rerun the initial migration: inspect the checks below and its existing schema first. If only some objects exist, or a table named `profiles` already belongs to another app, stop before applying and compare definitions; do not drop tables, reset the database or overwrite another app's bucket. Preserve a backup/export of any existing data. The initial migration is transactional, but that does not make it a repeatable upgrade script.

## 2. Run the one migration — Mac Terminal, then Supabase SQL Editor

The file in your local checkout is:

```text
supabase/migrations/202610180001_marketplace.sql
```

In your **Mac Terminal**, from the root of `UBC-CampusLoop`, copy its contents:

```sh
pbcopy < supabase/migrations/202610180001_marketplace.sql
```

Then in **Supabase SQL Editor → New query**, paste the **complete file**, including `begin;` and `commit;`, and click **Run**. SQL Editor warnings about grants/revokes concern the intended permission changes described below; review the selected project and script before executing. Expect a successful execution. Save the query with the migration filename and record that you applied it manually. The file being on GitHub does not execute it automatically.

**Effects to review:** creates five tables and indexes, Auth-to-profile trigger, functions, explicit table/function grants, RLS policies, profile rows for existing Auth users, and a public `listing-images` bucket with MIME/size restrictions plus Storage policies. If that bucket already exists, its `public` and size/MIME configuration is updated. Do not apply this file to an unrelated or already migrated app merely to “try again.” An error rolls back this migration's transaction; diagnose the named object or permission rather than repeatedly pasting it.

If you later adopt Supabase CLI migrations, reconcile this manually applied version with the CLI migration history before `db push`; do not blindly reapply the initial file. `supabase/config.toml` configures optional local Supabase only and does not change the settings of CampusLoop Main.

## 3. Keep the Data API exposed and use explicit permissions — project settings

Open **Project Settings → Data API** (older layouts use **API**):

- Data API: **enabled**.
- Exposed schemas: include **public**. This is the schema, not “make every new table public.”
- Automatic RLS: may stay enabled. The migration explicitly enables it too.
- Automatic new-table exposure/grants: may stay disabled. The migration explicitly grants only the table/column privileges and RPC execution this app needs.

Do not enable global anonymous writes or disable RLS to fix a permissions error. The browser uses a publishable/anon key with the user's authenticated session, never an administrator key.

After migration, run these **read-only** SQL Editor checks:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname='public'
  and tablename in ('profiles','listings','reservations','pickup_secrets','ai_usage');
-- Exactly those five tables, all rowsecurity=true.

select
  has_schema_privilege('anon','public','USAGE') as anon_schema_usage,
  has_table_privilege('anon','public.listings','SELECT') as anon_listing_read,
  has_table_privilege('anon','public.profiles','SELECT') as anon_profile_read,
  has_table_privilege('anon','public.reservations','SELECT') as anon_reservation_read,
  has_table_privilege('authenticated','public.listings','UPDATE') as direct_inventory_write,
  has_column_privilege('authenticated','public.pickup_secrets','code','SELECT') as buyer_code_column_read;
-- true, true, false, false, false, true (code rows are additionally restricted by RLS).

select
  has_function_privilege('authenticated','public.save_listing(jsonb,uuid)','EXECUTE') as publish,
  has_function_privilege('authenticated','public.reserve_listing(uuid,integer,uuid)','EXECUTE') as reserve,
  has_function_privilege('authenticated','public.cancel_reservation(uuid)','EXECUTE') as cancel,
  has_function_privilege('authenticated','public.complete_pickup(uuid,text)','EXECUTE') as complete,
  has_function_privilege('anon','public.reserve_listing(uuid,integer,uuid)','EXECUTE') as guest_reserve;
-- true, true, true, true, false.

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where (schemaname='public' and tablename in
 ('profiles','listings','reservations','pickup_secrets','ai_usage'))
 or (schemaname='storage' and policyname in
 ('listing_photos_read','listing_photos_upload','listing_photos_delete'))
order by schemaname, tablename, policyname;
```

`ai_usage` deliberately has no client read/write policy: the narrow quota RPC accesses it. The SQL Editor normally runs as an administrative role and bypasses RLS, so successful SQL Editor reads do **not** prove that ordinary app users are authorized. Use the role and browser checks in [HOSTED_VERIFICATION.md](HOSTED_VERIFICATION.md).

## 4. Verify Storage — Storage dashboard

Open **Storage → Buckets → listing-images**. The migration creates it; do not create a differently named bucket.

| Setting                        | Expected                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------- |
| Bucket ID/name                 | `listing-images`                                                                  |
| Public                         | Yes; all published listing images are public                                      |
| Maximum file size              | 5,242,880 bytes (5 MiB; UI may label 5 MB)                                        |
| Allowed MIME types             | `image/jpeg`, `image/png`, `image/webp`                                           |
| Policy `listing_photos_read`   | Public read for this bucket                                                       |
| Policy `listing_photos_upload` | Authenticated insert only under the caller's UID folder                           |
| Policy `listing_photos_delete` | Owner deletes only unreferenced files; referenced listing photos remain protected |

Application path: `<seller-user-uuid>/<random-photo-uuid>.jpg`. `src/lib/compress.ts` converts uploads to JPEG before publication. The UI does not upload the photo into this bucket during AI analysis; upload occurs when publishing. `listings.image_path` stores only the file path, not a base64 image. Ordinary users have no overwrite/update policy; do not add one for convenience. A public bucket does not mean unauthenticated uploads are allowed.

Test through the app as A, then inspect the UID folder here. Open the published image in B's independent browser: it should load without the seller's session. Do not upload personal documents, addresses or sensitive photos. Abandoned upload cleanup and referenced-image retention are current operational limitations, not configured background tasks.

## 5. Configure email authentication — Authentication dashboard

1. Open **Authentication → Sign In / Providers → Email** (older layout: **Providers → Email**). Enable Email and signup. Use email/password, not GitHub OAuth. CampusLoop accepts non-university emails and enforces at least eight password characters in its UI.
2. Keep email confirmation enabled for real/public use. For private testing, either complete the emails or add confirmed test users through **Authentication → Users → Add user → Create new user**. Built-in test email delivery may have recipient/rate restrictions; see **Authentication → Email / SMTP Settings** and Auth logs. A dashboard-created confirmed user is not a test of confirmation email delivery.
3. Open **Authentication → URL Configuration**. For local Mac development set:

   ```text
   Site URL:
   http://localhost:3000

   Redirect URLs (exact entries):
   http://localhost:3000/auth/callback
   http://127.0.0.1:3000/auth/callback
   ```

   The second callback is optional unless you actually use `127.0.0.1`. These two hosts use different browser cookies; use one consistently. Do not add a trailing slash to just one side of the callback route. If you choose another port, add its exact callback too.

4. Leave standard Supabase email templates unless you understand their link flow. The implemented callback exchanges the `code` query parameter with `exchangeCodeForSession`; it does **not** implement `/auth/confirm?token_hash=…` from a different tutorial. An old custom email template may point at the wrong route. Confirmation and recovery links should use your configured redirect; open them in the same browser/profile that initiated the flow.
5. Under **Authentication → Users**, verify A and B exist after signup; under **Table Editor → profiles**, verify each has a matching UUID profile created by `campusloop_new_user`. No email is copied into public listings.

No OAuth client ID, GitHub app, Google sign-in or university-domain restriction is required. Password recovery sets a new password from **My loop → Profile** after the email callback.

## 6. Optional sample seeding — Mac Terminal only

Do this after creating A and applying the migration. Set `SEED_SELLER_ID` to A's UUID and `SUPABASE_SERVICE_ROLE_KEY` to the private legacy service-role key in ignored `.env.local`, then:

```sh
npm run seed
npm run seed
```

**This performs real administrative writes** to Storage and `listings` using a key that bypasses RLS. The second run should skip all existing sample UUIDs without resetting quantities, reservations or dates. It never creates accounts or passwords and refuses to overwrite a non-demo row at one of its IDs. It can upload/replace its deterministic sample image paths when inserting missing samples; use only your intended test seller/project. Remove the optional key from `.env.local` after seeding, restart Next.js, and never add it to browser code or a normal Vercel runtime.

Samples are fictional presentation data and cannot be reserved. They are excluded from impact. To test the marketplace lifecycle, publish your own fresh non-sample test listing through the UI. Sample expiry dates are set on first insertion and are not refreshed on repeat seed runs. Do not reset the database to refresh them.

## Troubleshooting

| Symptom                                                               | Check and next action                                                                                                                                                                                               |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `relation already exists` or trigger/policy already exists            | Inspect prior migration/schema. Do not drop objects or rerun unchanged SQL. The full migration is one transaction; a prior partial manual setup needs comparison before repair.                                     |
| `relation public.listings does not exist` or missing RPC / `PGRST202` | Verify the right project and complete migration. Confirm `public` is exposed. If the objects exist but the API cache is stale, an administrator can run `notify pgrst, 'reload schema';` in SQL Editor, then retry. |
| `permission denied for table` / `42501` / RLS refusal                 | Confirm matching project URL/key, valid user session, all explicit grants/policies, and the UID upload folder. Keep RLS on and do not substitute the service-role key into browser env.                             |
| Signup says database error saving new user                            | Inspect Auth/Postgres logs and the `campusloop_new_user` trigger/profile constraints. Run the migration once before creating users.                                                                                 |
| Invalid API key / project not found                                   | Ensure the URL and publishable key come from CampusLoop Main. Use neither the dashboard URL nor a service-role/secret key in the public variable. Restart Next.js after changes.                                    |
| Confirmation goes to wrong site or `?error=confirmation`              | Check exact Site URL/redirects, current browser origin/profile, original PKCE cookies, expiry and email template. Request a new email; don't share the email link/token.                                            |
| No verification/recovery email                                        | Check Auth logs, provider recipient restrictions/rate limits/spam; configure custom SMTP if needed. Confirmed dashboard users can unblock private login testing but leave delivery verification pending.            |
| Image upload refused                                                  | Verify `listing-images`, policy, signed-in user UID path, MIME/5 MiB limit. Use an ordinary JPEG; HEIC is not supported. A replaced file needs a new random path.                                                   |
| Reservations fail after deadline                                      | Expected. Postgres checks current time on every new reservation; the UI can be stale for up to 30 seconds. Choose a future pickup time for a new listing.                                                           |

Never run `supabase db reset` against CampusLoop Main. Neither this guide nor the app needs its database password.
