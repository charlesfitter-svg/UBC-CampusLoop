# Owner setup notes

## Required to run locally

- Node 22+ and `npm ci`. `npm run dev` works in clearly labelled UI preview without external keys.
- For the connected app, copy `.env.example` to ignored `.env.local` and enter your Supabase URL and publishable/legacy anon key from **Supabase → Project Settings → API / Connect**. Never use a service-role key as the public key.
- In **Supabase → SQL Editor**, execute `supabase/migrations/202610180001_marketplace.sql` once. Confirm Data API is enabled, `public` is exposed, all five application tables have RLS, and `listing-images` exists. The SQL explicitly includes grants because automatic new-table exposure is disabled in this project.
- Enable **Authentication → Email**. Set Site URL to your local development origin and allow its exact `/auth/callback` redirect. Use confirmed test accounts A/B or confirm signup email. Email stays private; no university-domain or GitHub requirement.
- For genuine AI, put your OpenAI project key in server-only `OPENAI_API_KEY`; optionally override `OPENAI_MODEL` (default `gpt-4.1-mini`). Set an OpenAI project budget. Restart the server. Never paste secrets into chat, commit them or place them in a `NEXT_PUBLIC_` variable.
- If Codex cloud restricts egress, add **your exact Supabase project hostname** and **api.openai.com** in environment network settings. A connected GitHub repository does not configure these services.
- Run the two-account walkthrough in README. Real OpenAI success must be verified with an actual photo; manual fallback or mocked tests do not count.
- Optional connected sample cards: create Account A, set `SEED_SELLER_ID` and server-only `SUPABASE_SERVICE_ROLE_KEY`, run `npm run seed` twice to check repeatability. Remove the seed key from the app environment afterward. Seed creates no passwords and never resets existing listings.

## Required to deploy publicly

- Configure the Supabase public variables at Vercel build time and OpenAI key server-side; use HTTPS. Update Supabase Site URL and redirect allowlist to the final origin. Keep email confirmation on and set up production SMTP.
- Apply migrations to the correct project, test RLS with independent accounts, storage ownership and email confirmation/recovery. Confirm OpenAI model access, billing and provider project limits.
- Run types, lint, unit/database tests, build and the two-account live walkthrough on the deployment. Test an expired listing, cancellation, wrong pickup code and unauthorized edit.
- Add moderation/reporting, abuse controls (including account creation), monitoring, privacy/terms, retention/orphan-image cleanup and food safety guidance. Review accessibility and real device camera behavior.
- Verify rights for the tutorial sample visuals or replace them with photographs you own. No verified license was retrievable for those three tutorial image sources. Original lamp/books/chair illustrations belong to this project.
- A local build or saved cloud draft is not a deployment. Use Vercel's deployment flow; use the Codex environment UI to review/save and publish the prepared development environment separately.

## Future scaling integrations

- Stripe Checkout/Connect, verified webhooks, payment/refund status and merchant onboarding **only when online payments become a requirement**. No Stripe account, bank details or payment credentials are needed for this MVP.
- Verified business profiles, POS/inventory synchronization and multi-location support.
- Pagination, realtime refresh, messages/notifications, moderation tools and optional evidence-based impact estimates.
- No delivery tracking, custom routing or map API is needed for campus pickup.

## Verification status

Refer to BUILD_PROGRESS.md for the final executed checks. Hosted Supabase and real OpenAI calls have not been verified unless that file explicitly records a successful real run. No external credential values were available during the initial implementation.

### Full local integration check

`node scripts/test-local.mjs` reads public credentials from an installed Supabase CLI (`SUPABASE_CLI_BIN` override supported), refuses non-loopback projects, starts a temporary connected app and runs `npm run test:connected`. It needs a fresh disposable local database and email confirmations disabled only in that local config. See README. In this Codex machine the official Supabase Postgres image failed to unpack in Docker with `no space left on device`; the full connected suite could not run. PostgreSQL transaction/policy tests use a smaller successfully tested image and still pass. Hosted credentials are the alternative for manually verifying the owner's actual project.
