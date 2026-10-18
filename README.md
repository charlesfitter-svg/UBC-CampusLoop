# CampusLoop

Good things deserve another loop. CampusLoop is an independent UBC student surplus marketplace: photograph an item, review an AI-written draft, publish it, reserve it, meet at a campus landmark, and confirm the handoff.

The first implementation was built from the owner's Master MVP Implementation & Execution Directive. The build specification added separately on GitHub is preserved in `CODEX_BUILD_PROMPT.md`; this README describes the actual code. In particular, use `OPENAI_MODEL` (default `gpt-4.1-mini`), `/list/new`, `/auth`, `/dashboard`, `/api/ai/listing` and `npm run seed`. Proposed `OPENAI_VISION_MODEL`, `NEXT_PUBLIC_SITE_URL`, `/sell`, and `seed:demo` names in the original blueprint are not configuration for this version.

## Implemented features

- Responsive marketplace with search, Food / Items / Free filters, sorting, details, quantity and deadlines.
- Prominent **List with AI**, mobile camera input, desktop upload/drop, immediate preview, on-device JPEG compression, structured OpenAI Responses output, editable review, and an honest manual fallback.
- Supabase email/password registration, login, persistent sessions, logout, password recovery and profile preferences. Browsing does not require an account.
- Owned listings, Supabase Storage photos, edits and removal, free and paid reservations (**pay at pickup**, no online payment).
- Postgres row locks prevent overselling; client-generated UUID keys make reservation retries idempotent. Cancellation restores inventory once. Expiration is enforced in the database without a scheduled worker.
- Buyer-only pickup codes, seller verification, walking directions via Google Maps URLs, buyer history and seller handoff dashboard.
- Community impact counts only completed, non-demo handoffs. No invented CO₂ estimates.
- Free-publication confirmation, compact pickup safety/accessibility resources, optional embedded pickup maps, and guarded expired-listing recovery with a campus reuse directory. See [Phase 2 setup and smoke tests](docs/PHASE_2_SETUP.md) for the required recovery migration and optional restricted Maps Embed key.

Without Supabase configuration, the UI shows six clearly labelled fictional samples. Samples cannot be reserved or contribute to impact. Photo upload and manual editing work in preview; publishing and AI require a signed-in connected account. Preview does not simulate successful backend actions.

## Start here: Mac + Supabase Cloud

The owner reports a completed two-account hosted Supabase/OpenAI marketplace transaction. Automated preview and mocked-provider tests remain separate from that live verification. Phase 2's hosted upgrade and optional Maps Embed configuration require the owner checks described below.

1. [Mac / VS Code setup](docs/LOCAL_SETUP_MAC.md): clone `charlesfitter-svg/UBC-CampusLoop` on `main`, install Node 24 and dependencies, configure ignored `.env.local`, and start the app.
2. [Supabase dashboard setup](docs/SUPABASE_SETUP.md): inspect the existing **CampusLoop Main** project, apply the exact migration once, verify explicit grants/RLS, Storage, Email Auth and `/auth/callback`.
3. [Hosted integration checklist](docs/HOSTED_VERIFICATION.md): genuine OpenAI request, two-account lifecycle, a third buyer for contention, authorization, expiry and impact, with expected outcomes and troubleshooting.
4. [Vercel deployment guide](docs/DEPLOY_VERCEL.md): use later, after live local checks. Nothing is deployed or published automatically by these instructions.
5. [60–90 second demo script](DEMO_SCRIPT.md).

For normal local usage only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and server-only `OPENAI_API_KEY` need values. `OPENAI_MODEL` defaults to `gpt-4.1-mini`; its restricted key needs Responses create/write (`POST /v1/responses`). The optional seed administrator key is not an application prerequisite. No Docker, Stripe or Google Maps API key is needed to run against Supabase Cloud.

## Stack and prerequisites

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 plus custom CSS, Supabase Auth/Postgres/Storage, OpenAI's official Node SDK and Zod. Node **22+** (validated with 24), npm, and a Supabase project. Docker is optional for database contention tests or local Supabase. There is no Stripe or Maps API key requirement.

## Run locally

On macOS (Terminal):

```sh
npm ci
if [ ! -e .env.local ]; then cp .env.example .env.local; fi
# Fill in the variables below for connected mode, or leave them empty for preview.
npm run dev
```

On Windows (PowerShell):

```powershell
npm.cmd ci
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
# Fill in the variables below for connected mode, or leave them empty for preview.
npm.cmd run dev
```

`npm.cmd` avoids PowerShell script execution-policy restrictions; use it in place of `npm` for the other commands in this guide when needed.

`npm run dev` binds to `localhost` on both platforms. Open `http://localhost:3000` and use that same origin for sign-in and Supabase callbacks. If port 3000 is occupied, stop your earlier server or select a port with `npm run dev -- --port 3001` and update the callback URLs to match. Restart an existing server after changing the startup command.

For optional LAN testing, run `npm run dev:lan` (`npm.cmd run dev:lan` in PowerShell), then open `http://<your-computer-LAN-IP>:3000` on the other device. This binds to all interfaces, so use a trusted network and allow the port through your firewall if required. Add that exact origin's `/auth/callback` URL in Supabase if testing sign-in. For Next.js development assets/HMR, add only the LAN IP hostname (without scheme or port) to `allowedDevOrigins` in `next.config.ts`; restart the server afterward. That option protects Next.js development endpoints and does not replace the AI route's origin validation. For a phone camera, use HTTPS hosting or a supported browser capture input; a secure HTTPS deployment is the most reliable camera demonstration.

The AI route compares a strictly parsed HTTP(S) `Origin` with the request's `Host` (including port) and Next.js request protocol, rather than the server binding address. Missing, malformed and cross-origin requests receive HTTP 403 in development and production; localhost is never a production allowlist exception. `Forwarded` and `X-Forwarded-Host` are not used for this check. Production builds (`npm run build` / `npm run start`) and Vercel use the same validation. A reverse proxy must preserve the browser-facing `Host` and supply the correct HTTPS protocol metadata through a trusted proxy configuration.

If npm's default cache directory is unavailable in Codex, use `npm ci --cache /tmp/campusloop-npm`.

| Variable                               | Where to find it                                                      | Required for                                       |
| -------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase Project Settings → API / Connect                             | Connected marketplace                              |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page, publishable key (legacy anon key also works)               | Browser and server user-scoped access              |
| `OPENAI_API_KEY`                       | OpenAI project API keys                                               | Real photo analysis, server only                   |
| `OPENAI_MODEL`                         | Vision and structured-output capable model ID; default `gpt-4.1-mini` | Optional model override                            |
| `SUPABASE_SERVICE_ROLE_KEY`            | Supabase legacy API keys                                              | **Optional seed command only**, never browser code |
| `SEED_SELLER_ID`                       | Auth → Users, UUID of your sample seller                              | Optional seed command                              |

### Optional: play while you wait

Set `NEXT_PUBLIC_FLAPPY_DEGREE_URL` in the CampusLoop `.env.local` to the public **HTTPS URL of your independently deployed Flappy Degree game**, then restart `npm run dev`. Leave it empty to hide the feature. Invalid/non-HTTPS URLs and URLs containing embedded credentials are ignored. This is public developer-controlled configuration; never put reservation details, pickup codes, tokens or secrets in the URL.

The compact invitation appears only in **My loop → My pickups**, below the existing controls for a buyer's `reserved` pickup. It is hidden for seller handoffs and completed/cancelled reservations. **Play Flappy Degree ↗** synchronously requests a 480×720 desktop pop-out; small/touch devices request a normal new tab. Browser policy decides the actual window behavior. The always-visible **Open in a new tab instead** link is the popup-blocker fallback. Both routes use `noopener`/`noreferrer`; CampusLoop remains open and sends no reservation or account data. Game resources are not loaded or embedded by CampusLoop.

On Vercel, add the optional variable to **CampusLoop → Settings → Environment Variables** for the intended environment(s), then rebuild/redeploy when you choose. As a `NEXT_PUBLIC_` variable it is embedded at build time. No setting, source change, authentication connection or deployment in the Flappy Degree project is required. The projects remain independent. See [local setup](docs/LOCAL_SETUP_MAC.md#optional-flappy-degree-invitation) and [Vercel configuration](docs/DEPLOY_VERCEL.md#optional-flappy-degree-invitation).

`.env.local` and all secret-bearing env files are ignored by Git. Only `.env.example` is committed. Never put a service-role key or OpenAI key in a `NEXT_PUBLIC_` variable. The running application does not use a service-role key.

## Supabase setup (existing hosted project)

Phase 2 requires [202610180002_listing_recovery.sql](supabase/migrations/202610180002_listing_recovery.sql). On an existing initialized project, apply only this new upgrade; on a fresh project, apply initialization below and then the upgrade. Follow the [exact owner instructions](docs/PHASE_2_SETUP.md#required-supabase-upgrade); never reset or rerun initialization on a live project.

1. In **SQL Editor**, run the complete file `supabase/migrations/202610180001_marketplace.sql` once. It is a transactional migration, not a script to repeatedly paste into an already migrated database. Back up unrelated existing project data first. The migration creates only CampusLoop tables/functions/policies, backfills profiles for existing Auth users, and creates/configures the `listing-images` bucket.
2. Under **API settings**, keep the Data API enabled and ensure `public` is an exposed schema. Automatic exposure can remain disabled: the migration explicitly grants the necessary table and function permissions to `anon` and `authenticated`. All five application tables explicitly enable RLS.
3. In **Authentication → Providers → Email**, enable email/password signup. Add the app's origin as the **Site URL** and the exact `/auth/callback` URL under allowed redirect URLs (include local development and deployed origins). Keep email confirmation on for public deployments. For a private hackathon, you can create two confirmed users in the Auth dashboard instead of waiting for email delivery. No GitHub login or university-domain restriction is used.
4. In **Storage**, verify public bucket `listing-images`, size limit 5 MB and JPEG/PNG/WebP MIME restrictions. Policies allow uploads in `<auth.uid()>/<uuid>.jpg|png|webp`, public reads, and owner deletion of unreferenced photos. Referenced images cannot be deleted. Do not add broad “allow all” write policies. All listing photos are public; upload no sensitive images.
5. Fill `.env.local` and restart Next.js. A configured backend error shows an error, not fake sample success.

Alternatively, with a supported Supabase CLI installed, `supabase link --project-ref YOUR_PROJECT_REF` then `supabase db push` applies the migration. Confirm the target project before any push/reset. **Never run `db reset` against a shared/hosted project to seed a demo.** `supabase/config.toml` is for optional local development, not a replacement for hosted Auth settings.

### Check access after migration

In SQL Editor:

```sql
select tablename, rowsecurity from pg_tables
where schemaname='public' and tablename in
('profiles','listings','reservations','pickup_secrets','ai_usage');
select has_table_privilege('anon','public.listings','select'); -- true
select has_table_privilege('anon','public.reservations','select'); -- false
select has_table_privilege('authenticated','public.listings','update'); -- false: RPC only
select has_function_privilege('authenticated','public.reserve_listing(uuid,integer,uuid)','execute'); -- true
```

The running app never queries `auth.users`, nor publishes user emails. Profiles are private to their owner; seller display names are snapshots stored in listings. Reservations are visible only to their buyer/seller; codes are visible only to the buyer. Removed listings remain readable by their seller and existing buyers for pickup history.

## OpenAI setup and behavior

Put the project key in `OPENAI_API_KEY` on the **server** and authorize Responses create/write (`POST /v1/responses`) plus the configured model. Review rate limits, low budgets/alerts and credit/auto-recharge controls in OpenAI's dashboard; budget alerts generally are not a guaranteed hard spending cutoff. `/api/ai/listing` authenticates the Supabase user, checks same-origin requests, validates request size and image signatures, and consumes a database-backed quota of eight analyses per user per clock hour. Failed provider attempts also consume quota; edits never call AI automatically. Provider automatic retries are disabled.

The official SDK calls `responses.parse` with a strict structured Zod format, `store:false`, 1,200 maximum output tokens and a 45-second timeout. The schema is validated again at runtime, including category/subcategory consistency. Refusals, empty output, malformed output, rate limits and network errors return actionable errors while retaining the photo and form. Images and provider payloads are not logged. Images are sent to OpenAI for analysis; published photos are stored as files in Supabase, never base64 database rows.

Test with a real photo of a lamp or book: log in → **List with AI** → take/upload photo → **Generate my listing**. Check the generated title, description and category, then confirm quantity, pickup and any food facts. AI never supplies location, availability, price, safety, ingredients or allergens as established facts. Verify uncertain suggestions yourself. There is no hardcoded “successful AI” response. See `BUILD_PROGRESS.md` for which real integrations were actually tested.

## Two accounts and repeatable demo data

Create **Account A (seller)** and **Account B (buyer)** through signup, confirming their emails, or through Supabase Auth → Add user with email confirmed. Choose your own passwords securely. Use two browser profiles or one normal and one private window; this avoids mixed sessions. Accounts need no university email.

To add the six fictional sample cards to the **connected database**, set `SUPABASE_SERVICE_ROLE_KEY` and `SEED_SELLER_ID` for Account A in ignored `.env.local`, then:

```sh
npm run seed
npm run seed # existing sample IDs are skipped; reservations and inventory are not reset
```

The seed uploads local sample visuals and inserts `is_demo=true` listings using deterministic UUIDs. It never changes real listings, creates passwords or generates completed activity. Samples cannot be reserved. Sample expiry dates are set only on first insertion; later runs skip them, including expired samples. Remove an expired sample through the seller dashboard if desired. Do not reset an entire database to refresh samples. Preview samples are independent read-only display data, not a mock backend.

## Exact live demo walkthrough

1. A opens **List with AI**, photographs an object, clicks **Generate my listing**, reviews the real draft, leaves **Free** and quantity 1, selects **AMS Student Nest**, and publishes. For an API outage, clearly announce the manual fallback.
2. B searches for its title, opens the listing, and selects **Reserve for free**. Availability drops. In **My loop → My pickups**, B gets an 8-character pickup code and **Get directions** walking link.
3. A opens **My loop → Seller handoffs**, refreshes, enters B's code after the handoff, and clicks **Confirm handoff**. Both refresh and see **Loop completed**. **Our impact** increases by one pickup and one item exactly once.
4. A publishes another real test listing at CAD 5. B chooses **Reserve — Pay at pickup**. The app explicitly says payment happens directly at pickup; it never claims an online charge. Complete the code flow again.
5. For cancellation, reserve a quantity from a multi-unit listing, cancel before completion and verify the units return. For expiration, create a short deadline and attempt a reservation after it passes: Postgres rejects it even if the page is stale. B cannot edit A's listing.

Use freshly published test listings for the functional demonstration; the fictional sample cards are presentation data only. An actual confirmed test handoff is recorded activity; do not claim test activity proves real-world environmental savings.

## State model and integrity

- Listing `active → removed`; expiration and sold-out availability are derived from deadline and remaining quantity. Removal prevents new reservations but does not erase outstanding reservations. Seller must fulfil or cancel them.
- Reservation `reserved → completed` (seller + correct code) or `reserved → cancelled` (buyer or seller). Terminal states cannot reverse. Valid pickup completion is allowed after the listing deadline for an already held reservation; new reservations never are.
- Reserve/cancel operations lock the listing row. Cancellation locks the reservation too. Completion locks the reservation. Transactions roll back on errors; no direct client grants can change inventory or reservation state.
- `quantity` is the original total; `available_quantity` excludes reserved **and** completed units. Cancellation restores only held units. Price per unit is snapshotted onto a reservation. Quantity/category cannot change after a non-cancelled reservation, preserving inventory and impact meaning.
- Retry keys are scoped to the buyer and verified against listing/quantity. Repeated completion or cancellation does not double-count. A cancelled key returns the existing cancelled reservation; a new intentional reservation needs a fresh key.
- Only the seller may check a code. Ten wrong guesses lock that reservation's confirmation; cancel and reserve again if necessary. Codes must not be shared except during pickup. Buyers cannot mark themselves complete.
- Free and paid reservations use the same lifecycle. There is no payment transaction table or claim that a payment was collected. Future Stripe Checkout/Connect would be added at reservation/payment confirmation boundaries with verified webhooks and a separate payment status, not by reinterpreting current completion as a charge.

## Testing

```sh
npm run typecheck
npm run lint
npm test                 # schema, mocked AI route, actual PostgreSQL functions/RLS via PGlite
npm run test:postgres    # Docker required; isolated PostgreSQL 17, real concurrent connections
npm run build
npm run start
npm run test:e2e         # preview browser tests; no Supabase env variables configured
npm run test:phase2      # desktop/mobile UI with mocked Supabase writes; see Phase 2 setup
```

`npm run test:e2e` starts the development server unless `PLAYWRIGHT_BASE_URL` points to an already running app. Install Chromium with `npx playwright install chromium`; in Codex, use `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`. Mobile checks use Chromium with iPhone viewport/touch emulation, not physical Safari. With Supabase connected, use the live walkthrough or the local connected test below; preview tests intentionally assert preview mode.

`test:postgres` creates and removes its own Docker container with a random name, random loopback-only port and test-only trust authentication. It never touches your Supabase project. It checks 20 buyers competing for 5 units plus simultaneous duplicate reservation, completion and cancellation calls. PGlite uses test-only Auth/Storage schema primitives while executing the actual application migration and roles. It does not establish hosted Auth, Storage API, SMTP or OpenAI connectivity.

## Deploy on Vercel

1. When you choose to deploy, follow [the separate Vercel guide](docs/DEPLOY_VERCEL.md). Import this repository as a Next.js project, use Node 24 (minimum 22+) and the npm lockfile.
2. Configure the two `NEXT_PUBLIC_SUPABASE_*` values **before building**, plus server-only `OPENAI_API_KEY` and optional `OPENAI_MODEL`. Do not add the seed service-role key to the app unless running an explicit administrative seed outside browser code.
3. Apply the migration to the target Supabase project and configure Auth Site URL/redirects for the final HTTPS deployment. Allow server egress to your exact Supabase host and `api.openai.com` if your environment restricts network access.
4. Deploy, sign in as two separate users, run the live walkthrough, and verify upload policies and actual AI access. The Node API route has a 60-second maximum duration; ensure the hosting plan permits it. Requests after compression stay below 3 MB (4 MB multipart ceiling).

Public release also needs SMTP/deliverability, moderation/reporting, account/API abuse controls, retention and orphan-photo cleanup, privacy/terms/food redistribution guidance, monitoring and accessibility review. Verify third-party sample image reuse rights or replace those visuals with your own before public distribution (see `public/images/ATTRIBUTION.md`).

## Differences from the original blueprint

The original `CODEX_BUILD_PROMPT.md` is retained, not a promise that every suggested field/route/security enhancement exists. Current startup instructions use the actual variable/route names above. The category values are `food` and `items`; landmarks are a curated map in `src/lib/marketplace.ts`, not a database `pickup_locations` table. Paid behavior derives from integer cents and a reservation price snapshot; there is no payment-processing status table. Presentation seeds intentionally cannot be reserved.

Pickup codes are retrievable plaintext in a buyer-only RLS table with seller-only verification and ten wrong attempts, not the blueprint's proposed hash/regeneration design. Active expired listing information remains readable with expired/unavailable states; new reservations are rejected by server time. Quantity/category changes are guarded after reservations, but pickup/deadline edits are not notified/snapshotted. These are actual limitations to review before unrestricted launch, not additional env settings. No completed features were rebuilt during repository integration.

## Known limits and next steps

- External hosted integration tests need owner credentials. Mocked OpenAI tests are not evidence of a real AI request.
- JPEG/PNG/WebP are supported; convert HEIC/HEIF or animated GIF first. Device capture support varies. Photos survive AI errors in memory; after a full page reload, text is restored in that tab but the photo must be reattached.
- Discovery loads the latest 200 listings and filters locally. Availability refreshes on navigation/request; a reservation refreshes the detail on failure, and dashboard supports refresh/tab return. Correctness is always database-enforced. No realtime subscription or pagination yet.
- No notifications/chat, delivery, POS synchronization, automated merchant inventory, online payments or merchant payouts. Public campus landmarks only; no residential addresses.
- Sellers can change pickup/description/deadline while existing reservations remain. Coordinate changed arrangements in person for this MVP; notifications and immutable pickup snapshots are sensible future work.
- Quotas limit accidental AI usage but are not a complete defense against mass-account abuse. Add edge rate limits/CAPTCHA and provider spending limits before a public launch.
- Removed listings/history are retained. Images referenced by listings remain protected from deletion; abandoned upload cleanup and account deletion/retention are future operational work.
- Optional business account metadata is present for expansion; no verified-business claim, POS integration or payout infrastructure is implemented.

See [OWNER_SETUP_NOTES.md](OWNER_SETUP_NOTES.md) for exact remaining owner actions and [BUILD_PROGRESS.md](BUILD_PROGRESS.md) for executed checks and recovery notes.

### Optional full local Auth/Storage browser integration

With a supported Supabase CLI and Docker installed, start a **fresh disposable local** stack with `supabase start`. Stop any development server for this checkout (Next.js allows only one dev instance per checkout), then run:

```sh
# Local-only, destructive to the LOCAL test database: use a disposable local stack!
supabase db reset --local
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium node scripts/test-local.mjs
```

The helper reads local public credentials from CLI status without printing them, injects them into a temporary app/test process, and refuses non-loopback targets. It registers two users through the UI, uploads photos to real Storage, publishes free and paid listings, checks unauthorized editing, reserves, rejects a wrong code, completes pickups, cancels/re-reserves a paid listing, follows direction links, and checks exact impact totals. It needs local email confirmations disabled (the checked-in local config does this); it does not weaken hosted Auth settings. Start with a fresh local DB because the test asserts exact zero-to-two totals. It records simulated test handoffs **only in the disposable local database**. `SUPABASE_CLI_BIN` can point to a separately installed CLI. This test never calls OpenAI; the API-provider tests remain explicitly mocked until a real key is supplied.
