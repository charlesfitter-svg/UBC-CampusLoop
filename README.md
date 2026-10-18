# CampusLoop

**Snap it. List it. Give it another life.**

CampusLoop is an unofficial, UBC-focused, mobile-first marketplace for redistributing useful items and surplus food. Sellers can photograph an item, receive an **AI-assisted editable listing draft**, and publish it in a few taps. Other users can reserve it, open walking directions to a public campus pickup point, and complete the handoff.

> **Status:** Hackathon MVP blueprint. This README is a starter handoff and **must be updated by Codex to match what is actually implemented**. Do not assume integrations are live until configured and tested.
>
> **Independence:** Student-built concept. Not affiliated with or endorsed by the University of British Columbia. Example businesses and demo listings are fictional unless specifically stated otherwise.

## Core journey

1. Photograph an object or choose a photo from your gallery.
2. AI identifies the visible contents and drafts a title, category and description.
3. Review the draft, confirm condition or food-specific details, choose pickup location and set a deadline.
4. Publish it to the public campus feed.
5. Another signed-in user reserves it for free or selects **Pay at pickup**.
6. Buyer opens walking directions and collects the item; seller verifies the handoff.
7. Only completed transfers contribute to the impact dashboard.

## MVP functionality

- Browse and search food/item listings, see free items, and read availability and expiration.
- Student sign-up/sign-in and separate buyer/seller views.
- Camera-first AI photo-to-listing (server-side OpenAI Responses API; structured, editable output).
- Manual listing fallback, photo uploads and editing of owned listings.
- Persistent database-backed reservations with inventory protection and expiry rules.
- Free reservations and paid **at-pickup** reservations; no in-app card processing.
- Pickup confirmation, public UBC landmark selection, external walking directions.
- Dashboard of **completed** food portions and reusable goods transfers.

**Not included:** Stripe checkout, Stripe Connect payouts, restaurant POS integration, delivery, chat or official university affiliation. Online checkout can be shown as *Coming later* but does not charge customers.

## Stack

- **Application:** Next.js App Router, TypeScript, Tailwind CSS
- **Backend:** Supabase Postgres, Auth and Storage
- **AI:** OpenAI Responses API with image input and JSON/structured outputs
- **Navigation:** Google Maps directions URLs (no Maps API key needed)
- **Deployment target:** Vercel or other compatible Node.js hosting

## Setup — after Codex has generated the app

### 1. Requirements

- Node.js (use the version indicated by the generated app, ideally an active LTS release), npm, Git.
- A Supabase account/project: https://supabase.com/dashboard
- An OpenAI API project/key with billing configured: https://platform.openai.com/
- The connected Git repository containing the Codex implementation.

### 2. Install and configure the environment

From the repository root:

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` (these are **examples of expected variable names**; Codex must ensure they match the actual code):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
OPENAI_API_KEY=YOUR_PRIVATE_OPENAI_API_KEY
OPENAI_VISION_MODEL=gpt-5.4-mini
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`OPENAI_API_KEY` is a secret: **never put `NEXT_PUBLIC_` in its name, show it in screenshots or commit it**. `.env.local` must be gitignored. The Supabase publishable key is expected to be usable by client code; real access control comes from RLS and server auth checks.

### 3. Set up Supabase

1. Create a new Supabase project (hosted Postgres).
2. Find its **Project URL** and **publishable key** in the dashboard and put them in `.env.local`.
3. Enable email-based Auth. For easiest local testing, create two test accounts; if signup requires verification, follow the email confirmation process. Do not disable email confirmation for a public production deployment merely for demo convenience.
4. Configure authentication **Site URL** `http://localhost:3000` and allowed redirect paths required by Codex's implementation. After deployment, add the actual deployed URL and callback path in Supabase Auth URL Configuration.
5. Apply the SQL migrations in `supabase/migrations/` using the workflow Codex actually sets up (Supabase CLI or dashboard SQL editor). **Do not assume migrations have automatically executed just because the repository contains them.**
6. Create/configure the listing-image Storage bucket and access policies as specified by generated migrations/README. Confirm a signed-in seller can upload an image and another user can view a published image, while others cannot overwrite it.
7. If a demo seed script is provided, run it **only** against your test project following the script's instructions. It should create fictional/labelled sample listings without pretending to represent real vendors.

### 4. Enable OpenAI vision

1. Set up API billing separately from ChatGPT at https://platform.openai.com/.
2. Create an API key with only the access needed for this application and store it in `.env.local` / host environment variables.
3. Choose a vision-capable model that supports structured outputs. The prompt proposes `gpt-5.4-mini` as a default; Codex should verify available model support before shipping.
4. Set a conservative spending budget/usage alerts and test one real photo before inviting others.
5. In CampusLoop, sign in, select **List with a photo**, choose a desk lamp/textbook picture, and confirm that the AI title/category/description appears **editable** before publication.

If no OpenAI key is available, manual listings should still work and the AI feature must show a truthful *not configured* message rather than fake results.

### 5. Run locally

```bash
npm run dev
```

Open http://localhost:3000.

Expected additional scripts (Codex must implement/document or remove as appropriate):

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

### 6. Test the complete journey

Use **two separate test accounts**, ideally two browsers or one normal/incognito window:

1. **Seller A:** sign in → take/upload photo → AI draft → edit → set Free / Pay at pickup and pickup landmark → publish.
2. **Buyer B:** browse/search/filter → open published listing → reserve → open Google Maps walking directions.
3. **Seller A + Buyer B:** complete pickup verification (using the implemented confirmation flow).
4. Check that the buyer's reservation becomes `completed`, the listing's remaining quantity stays accurate and the impact dashboard increments **only after completion**.
5. Test expiry and cancellation, plus two simultaneous reservations for the final available unit.
6. Repeat on a phone or responsive browser emulator.

A well-polished one-minute judging walkthrough should be included in `DEMO_SCRIPT.md` by Codex.

## Deploy

1. Connect the repository to Vercel or another Next.js-compatible hosting provider.
2. Add the same Supabase and **server-only** OpenAI variables to the host's environment settings (never paste keys into client-side source).
3. Add deployed domain/callback URLs in Supabase Auth's allowed URL configuration.
4. Confirm SQL migrations and storage policies are already applied to the intended project.
5. Deploy, then repeat the two-account end-to-end test from real devices.
6. Before opening to the public, review listing safety, seller legitimacy, content moderation, food-handling restrictions, terms/privacy obligations and abuse limits.

## Common issues

| Problem | First checks |
|---|---|
| AI draft button fails | Server has `OPENAI_API_KEY`, billing/model access works, image within supported size/type, no rate limit reached; read server logs without sharing keys |
| Photo upload fails | Storage bucket exists, user signed in, RLS upload path/policy correct, file validation succeeds |
| Auth redirects incorrectly | Supabase Site URL and redirect allow-list include `localhost` or deployed domain; auth callback matches actual Next.js route |
| Listing created but not visible | RLS public read policy, `active` status, deadline in future, server time correct |
| Two buyers reserve one item | Verify transactional reservation function and locking; never fix by client-side `quantity - 1` only |
| Google Maps opens wrong place | Verify destination landmark label/address and URL encoding; no key required for Maps URLs |
| Impact count seems inflated | Only completed reservations should count; seeded demo data should be clearly labelled or separated |
| Online payment button doesn't work | Expected: real checkout is deliberately out of scope; pay in person at pickup |

## Roadmap after hackathon

- Stripe **Connect** for real multi-seller charges/payouts and seller onboarding, not just single-merchant Stripe Checkout.
- Restaurant partnerships and POS/inventory synchronization.
- Verified vendor accounts, food-safety compliance processes and moderation.
- Pickup coordination improvements, notifications, scaling beyond UBC, optional delivery.

## Reference documentation

- [OpenAI vision/image input](https://developers.openai.com/api/docs/guides/images-vision)
- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Supabase with Next.js](https://supabase.com/nextjs)
- [Supabase Auth SSR](https://supabase.com/docs/guides/auth/server-side)
- [Supabase Storage access policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
- [Stripe Connect for marketplaces — later](https://docs.stripe.com/connect/marketplace)

---

**For Codex:** Reconcile this README with the real implementation before marking the build complete. Replace proposed commands/paths with actually verified ones and transparently note external setup still required.
