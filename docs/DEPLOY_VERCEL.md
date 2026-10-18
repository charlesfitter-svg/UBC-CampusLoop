# Deploy CampusLoop with Vercel — when you decide to deploy

**This is a later, manual guide. Do not execute it until local connected verification passes. No Vercel project import, deployment, custom-domain change or Codex environment publication was performed for this documentation task.** Importing a Git repository into Vercel and clicking Deploy creates a hosted deployment; pushing to a connected production branch can deploy automatically afterward.

Phase 2 requires the [recovery migration](PHASE_2_SETUP.md#required-supabase-upgrade) before relisting. Maps Embed is optional: add `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` in the intended Vercel environments, restrict the key to Maps Embed API and exact authorized HTTP referrers, then rebuild. Follow the [full Google Maps setup](PHASE_2_SETUP.md#optional-google-maps-embed-configuration); external navigation works without the key.

## 1. Before creating the deployment

- Complete [Mac setup](LOCAL_SETUP_MAC.md), [Supabase setup](SUPABASE_SETUP.md), and [hosted verification](HOSTED_VERIFICATION.md), especially a genuine photo response, two independent accounts, inventory/expiry/authorization and completed impact.
- Decide which Supabase project holds hackathon test data. Using **CampusLoop Main** for both local and public apps shares users, photos, reservations and impact. It is not a separate database per deployment. If you create a new project later, apply migrations and configure Auth/Storage there before pointing a build at it; never reset Main to obtain an empty demo.
- Verify/replace the three tutorial sample-photo sources listed in `public/images/ATTRIBUTION.md`; retrieval of their license files was unsuccessful. Use your own photographs for real offers. Original lamp/books/chair illustrations can remain. Do not imply real vendor or UBC affiliation.
- For a controlled judging demo, limit who can register/access the app (for example pre-created users and hosting access controls). The eight/hour/user AI quota is not protection against mass signup. Do not expose an untested open marketplace with unlimited account creation and a billable key.

## 2. Import the GitHub repository — Vercel dashboard

When ready, sign in at https://vercel.com/ → **Add New → Project → Import Git Repository** → select **charlesfitter-svg/UBC-CampusLoop**. Grant GitHub access only to this repository if that option is available. If it is absent, configure the Vercel GitHub integration for your repository owner, not a different personal fork.

Before clicking **Deploy**, review the settings and variables below. If you want it private during smoke tests, configure available deployment protection/access controls first. Connecting Vercel means later `main` pushes may automatically publish new versions; review that workflow before using the repository for more work.

## 3. Build and runtime settings

| Setting           | Value                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Framework preset  | **Next.js**                                                                                   |
| Root directory    | Repository root, `.` (not `src/` and not another `UBC-CampusLoop/` subfolder inside the repo) |
| Production branch | `main`                                                                                        |
| Node.js version   | **24.x** where supported (repository minimum 22+)                                             |
| Install command   | `npm ci`                                                                                      |
| Build command     | `npm run build`                                                                               |
| Output directory  | Leave the Next.js default / automatic `.next` handling; do not use `out` or static export     |
| Start/dev command | Vercel manages the Next.js runtime; do not run a persistent `npm run dev` server there        |

This app needs a Node.js server for cookie auth and `src/app/api/ai/listing/route.ts`. It is not a static website. That AI route exports `runtime='nodejs'` and `maxDuration=60`, with a 45-second provider timeout. Ensure your plan/function duration supports that duration; do not simply reduce it below the provider timeout and call AI reliable. Multipart requests are capped at 4 MB in-app with compressed images capped at 3 MB; confirm the hosting plan's request limits too.

## 4. Set environment variables before the first build

In the import screen or **Project → Settings → Environment Variables**, add:

```text
NEXT_PUBLIC_SUPABASE_URL              = the intended hosted project's URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  = its publishable (or legacy anon) key
OPENAI_API_KEY                        = CampusLoop's private restricted OpenAI key
OPENAI_MODEL                          = gpt-4.1-mini (or an explicitly tested compatible model)
```

Choose **Production** for the production deployment. Add distinct appropriate values to **Preview** and **Development** only if you intend to use those environments; do not give arbitrary preview branches unrestricted production data/key access. Mark server credentials sensitive where supported. Never paste the `.env.local` file into Git, expose the OpenAI key as `NEXT_PUBLIC_…`, or add the seed service-role key to the normal app. The optional seed command runs separately on your own machine.

The actual code does **not** read `OPENAI_VISION_MODEL`, `NEXT_PUBLIC_SITE_URL`, Stripe variables or a Maps key. Public Supabase values are embedded at build time; after changing them choose **Redeploy** to rebuild. A server environment setting alone cannot rewrite an already-built browser bundle. Update/redeploy after a server key change too; never print env values to debug.

The OpenAI key must allow **Responses create/write, `POST /v1/responses`**, and the selected model. Images-generation-only permission will not suffice. Restrict unrelated capabilities. Verify organization/project billing and model access separately.

## 5. Configure production Auth — Supabase dashboard

Determine the intended final domain (the stable Vercel production domain, then a custom domain if desired). In **CampusLoop Main → Authentication → URL Configuration**:

```text
Site URL:
https://YOUR-STABLE-PRODUCTION-DOMAIN

Redirect URL:
https://YOUR-STABLE-PRODUCTION-DOMAIN/auth/callback
```

Replace the domain placeholders; do not enter the example text literally. Keep the exact localhost callback entries if you still develop locally against that project. Avoid broad production redirect wildcards. If you test an authorized protected Vercel preview, add that exact preview callback, then remove it when no longer needed. Do not redirect between `www` and apex halfway through signup; choose one canonical origin.

Keep Email Auth and confirmation enabled, verify signup/recovery templates use the implemented callback flow, and configure SMTP/sender settings for the audience you invite. Built-in email delivery restrictions are often unsuitable for a public signup flow. Preconfirmed accounts can support a private demo but are not evidence that arbitrary users can sign up or recover passwords.

No Google/GitHub OAuth, Stripe account, merchant contract or Maps billing is required. Recheck the Storage bucket, policies and explicit grants from [SUPABASE_SETUP.md](SUPABASE_SETUP.md); Vercel does not apply SQL migrations for you.

## 6. Deploy manually, then smoke-test

Only after the above, click **Deploy** yourself. Inspect the build status and sanitized logs. Do not ignore failed type checking or add broad service-role access to clear an error. If a build fails on missing modules, check the root directory, Node version and committed npm lockfile. There are no GitHub Actions deployment workflows in this implementation; Vercel's Git integration controls its own deployments.

On the HTTPS production domain:

- [ ] Signed-out homepage loads without a preview banner or backend error; public image, search, details and walking-directions links work.
- [ ] A and B sign in in separate profiles; confirmed email/callback, refresh, logout and recovery work with production URLs.
- [ ] A real photo produces HTTP 200 from `/api/ai/listing`, a valid editable draft and corresponding OpenAI usage. Editing does not call AI again. Mobile camera/gallery produces a supported format.
- [ ] A publishes a real test listing, B retrieves it from hosted storage/data and reserves; stale/expired/self/unauthorized actions are refused.
- [ ] Free and CAD 5 pay-at-pickup flows work; wrong code fails and the right seller completes once. Impact increases only for completed non-demo units, once. Cancelled/expired/sample rows do not count.
- [ ] Two buyers race for the last unit, no overselling; only buyer/seller can see the reservation and only its buyer can retrieve the code.
- [ ] DevTools never shows `OPENAI_API_KEY` or service-role credentials in browser code/network requests. App requests use only public key and the user's scoped session; do not export/share those tokens.
- [ ] Refusal/network/rate-limit errors retain the photograph and manual path. Vercel's Node function duration and network access permit the genuine provider request.

Use baseline/delta impact counts because the project may already contain local testing activity. Record which deployment commit was tested and what remains pending. A successful build is not a successful live AI or Auth/Storage test. Keep deployment protected or signup limited until these pass.

## 7. Optional custom domain — Vercel and DNS dashboard

In **Project → Settings → Domains**, add the domain you own. Follow the DNS records **Vercel displays for that exact domain** in your DNS provider dashboard; do not copy arbitrary IP/CNAME values from old tutorials. Changing records can affect existing websites/email; review current records first and do not replace mail records.

Wait for verified DNS and HTTPS, select your canonical apex or `www` domain, then update Supabase Site URL and the exact `/auth/callback` entry. Keep the old callback temporarily only if authorized active tests need it. Retest signup, recovery, genuine AI and pickup on the canonical HTTPS domain. A domain is optional for hackathon judging; the stable Vercel domain suffices.

## 8. Costs, security and release boundaries

**Essential even for a controlled hackathon deployment:**

- Server-only provider secrets; correct project/model/Responses permissions; explicit grants and RLS; ownership-restricted Storage; HTTPS; working callbacks/accounts; no broad anonymous writes or service-role browser key.
- OpenAI Usage monitoring, low budget/alerts, provider rate limits, limited audience/signup and a plan to disable/revoke the AI key if abuse occurs. Budgets commonly alert rather than hard-stop spending. Monitor Vercel/Supabase usage too: hosting, storage and egress can incur charges separately.
- Eight AI calls/user/clock hour, request/file limits and timeout already exist. They do not provide a global spend ceiling or stop attackers creating accounts. For broad access, add edge-level limits/CAPTCHA or other effective abuse controls first.
- Truthful fictional-data labels and unverified-impact language, image reuse rights, safe meeting landmarks, basic privacy/AI-photo disclosure and prohibited/unsafe-food guidance. No UBC/vendor partnership claims. Photos are public and sent to OpenAI only when generation is requested.

**Additional work before an unrestricted public marketplace:**

- Moderation/reporting and abuse response; food redistribution permissions/safety review; privacy/terms/retention/account-deletion and orphan-image cleanup; monitoring, backup/restore and incident response; deeper accessibility and real-device tests.
- Pickup secrets are currently retrievable plaintext in a buyer-only RLS table with seller authorization and a ten-failure cap. The original blueprint's hashed-at-rest/regeneration workflow is **not implemented**. Treat that as a separate security enhancement, not a setting this deployment guide magically enables. An administrator/service-role can currently read the codes.
- Seller changes to pickup spot/deadline are not notified or snapshotted; discovery is limited to 200 locally filtered listings; no realtime refresh or pagination. Address these before broader usage as appropriate.
- Keep production and preview/test data separate for clean metrics. Deleting/unpublishing completed test listings in the app does not erase impact history.

**Future scaling only:** Stripe Checkout/Connect with webhooks/payouts, restaurant POS synchronization, verified multi-location businesses, messages, delivery. None is a prerequisite to the current free/pay-at-pickup marketplace, and none is deployed by this guide.

Changing Vercel settings, DNS, hosted SQL, enabling arbitrary signup and making real API calls are intentional owner actions. Codex environment publication is a separate developer-environment snapshot feature and is neither required for running your Mac clone nor equivalent to deploying this application.
