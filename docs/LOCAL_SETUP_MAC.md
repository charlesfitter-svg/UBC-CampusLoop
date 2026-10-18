# Run CampusLoop on your Mac with hosted Supabase

These instructions use the actual application on `main` in `charlesfitter-svg/UBC-CampusLoop`. You do not need Docker, the Supabase CLI, Stripe, a Maps API key or Vercel to run locally against **CampusLoop Main** in Supabase Cloud. The database and public listing images remain hosted in Supabase while Next.js runs on your Mac.

**Labels:** **Mac Terminal** means commands on your computer; **VS Code** means editing local files; **Supabase dashboard** and **OpenAI dashboard** mean actions in those websites. Do not run Mac commands in the Supabase SQL Editor. Use the same app origin, `http://localhost:3000`, throughout sign-in, email confirmation and testing.

## 1. Check Git, Node.js and npm — Mac Terminal

Open **Applications → Utilities → Terminal**, then run:

```sh
git --version
node --version
npm --version
```

If Git prompts for Apple's Command Line Tools, accept their installation, or run `xcode-select --install` and finish the installer. If `node`/`npm` is not found, download the **Node.js 24 LTS macOS installer** from https://nodejs.org/en/download, install it, and open a new Terminal window. The repository requires Node 22+ and was tested with Node 24.19.0 / npm 11.9.0; use Node 24 for the closest match. npm is included with Node. If you already use a Node version manager, select its Node 24 version instead of installing a second copy.

Do not use `sudo npm install`, change system folder permissions, or delete your existing projects to install this app.

## 2. Clone the correct branch — Mac Terminal

For a new clone:

```sh
mkdir -p ~/Projects
cd ~/Projects
git clone --branch main https://github.com/charlesfitter-svg/UBC-CampusLoop.git
cd UBC-CampusLoop
git branch --show-current
git log -5 --oneline
```

Expected branch: `main`. The history must contain `45834c9`, `3f459a3` and merge `4369a73`, plus later documentation updates. For a private repository, use your own authorized GitHub login through your credential manager or GitHub Desktop; do not put a token in the clone URL or share one in chat.

If `~/Projects/UBC-CampusLoop` already exists, **do not clone over it**. Run `git status` there first. If it has a clean working tree, use `git switch main` then `git pull --ff-only origin main`. If it has changes or pull is not a fast-forward, preserve your changes and review the difference instead of resetting or force-pulling. Git pulls update files; they do not apply database migrations.

## 3. Open the folder — VS Code

Install VS Code from https://code.visualstudio.com/ if needed. Open VS Code → **File → Open Folder… → Projects → UBC-CampusLoop**. Open **Terminal → New Terminal** inside VS Code; it should start in that folder. Confirm:

```sh
pwd
ls package.json .env.example supabase/migrations/202610180001_marketplace.sql
```

Optional: in VS Code press **Cmd+Shift+P**, choose **Shell Command: Install 'code' command in PATH**, then you can use `code .` from the repository folder. The `.env.local` file belongs beside `package.json`, not inside `src/`.

## 4. Install the locked dependencies — Mac / VS Code Terminal

```sh
npm ci
```

This installs the versions in `package-lock.json` and replaces an existing `node_modules` folder; it does not change the application source or the hosted database. Do not use `npm audit fix --force` to get past installation errors. Use Node 24 and the committed lockfile. An npm update notice is not an installation failure.

## 5. Create the private configuration file — Mac Terminal, then VS Code

From the repository root, run this once (it preserves an existing file):

```sh
if [ ! -e .env.local ]; then cp .env.example .env.local; fi
```

In VS Code open `.env.local` and fill in the following **locally**. The text below uses placeholders; replace them with your own values without sharing a screenshot of the file:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
OPENAI_API_KEY=YOUR_PRIVATE_OPENAI_API_KEY
OPENAI_MODEL=gpt-4.1-mini

# Optional sample seeding only. Leave empty for normal app usage.
SUPABASE_SERVICE_ROLE_KEY=
SEED_SELLER_ID=
```

Do not include angle brackets around real values or add spaces inside them. Do not use `export` in this file. Keep keys on one line. The application needs only the first three values; `OPENAI_MODEL` has the shown default. No database password is needed by the app.

| Actual variable                        | Retrieve it here                                                                                                        | Visibility and purpose                                                                                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase dashboard → **CampusLoop Main** → **Connect** (Project URL), or **Project Settings → Data API** / API settings | Public project endpoint, not the dashboard URL or a database connection string                                                                                              |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same project → **Project Settings → API Keys → Publishable key**, normally `sb_publishable_…`                           | Public by design; access control relies on Auth, grants and RLS. A legacy `anon` key is also supported. Never use a secret or service-role key here.                        |
| `OPENAI_API_KEY`                       | OpenAI platform → select **CampusLoop** project → **API keys**                                                          | Server secret. Keep its current restricted permissions; see step 7. If a key's full value is no longer available, create a replacement rather than exposing or guessing it. |
| `OPENAI_MODEL`                         | Set in this file, choosing a model your project can use                                                                 | Actual code default: `gpt-4.1-mini`. It must support image input and Structured Outputs through Responses.                                                                  |
| `SUPABASE_SERVICE_ROLE_KEY`            | Optional: Supabase → **Project Settings → API Keys → Legacy API Keys → service_role**                                   | Administrative seed command only; not required by Next.js or ordinary users. Leave empty unless intentionally seeding.                                                      |
| `SEED_SELLER_ID`                       | Optional: Supabase → **Authentication → Users → your seller → User UID**                                                | Seed owner UUID, not their email                                                                                                                                            |

Supabase labels can move between **Connect**, **Data API**, and **API Keys**. Always verify that the selected project is **CampusLoop Main** and the URL and key belong to that same project. The OpenAI project name is a dashboard selection, not another env variable.

Check that Git will exclude the private file, without printing its contents:

```sh
git check-ignore .env.local
git ls-files .env.local
git status --short
```

The first command should print `.env.local`; the second should print nothing. Never `git add -f .env.local`. Rotate a key if it was exposed; simply deleting a committed key does not remove it from Git history.

**Blueprint differences:** `OPENAI_VISION_MODEL` and `NEXT_PUBLIC_SITE_URL` are not read by this version. `OPENAI_MODEL` is the supported override. Routes are `/list/new`, `/auth`, `/dashboard`, `/impact`, and `/api/ai/listing`. No Stripe or Google Maps key is needed.

## 6. Configure the hosted database, Auth and Storage — Supabase dashboard

Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md) before trying to publish. It includes a read-only check for an earlier migration, the exact SQL file, RLS/grant checks, the bucket, and local email callback settings.

**This is a real database change:** the migration creates tables/functions/indexes, changes application grants/RLS, adds an Auth trigger, backfills profiles and creates or reconfigures the public `listing-images` bucket. On a fresh intended project, run it once. If CampusLoop tables or a bucket already exist, inspect first; never drop/reset data or loosen policies merely to clear an error. Keeping automatic RLS enabled and automatic new-table exposure disabled is compatible with the migration's explicit grants.

## 7. Confirm OpenAI permissions and billing — OpenAI dashboard

1. Open https://platform.openai.com/ and select **CampusLoop** in the project selector.
2. In **API keys**, inspect your restricted key's permissions. The code uses the **Responses API: `POST /v1/responses`**. Permit creation/write of Responses (UI may label this **Responses** or **Model capabilities → Responses**), and ensure the project allows the configured model. Permission only for image generation/Images or Chat Completions is insufficient. No Images generation, Files upload, Assistants, vector-store or fine-tuning permission is required by this application; photos are sent inline as image input. Keep unrelated permissions restricted. A later missing-scope/model denial should be diagnosed against this exact request, not solved by switching every permission to All.
3. In **Billing**, activate API billing/credits if needed. ChatGPT subscription billing is separate. In **Project Settings → Limits**, review model access, rate limits and a low monthly budget/alerts; monitor **Usage** filtered to CampusLoop. Project budgets/alerts generally are not guaranteed hard spending cutoffs. Review prepaid credit/auto-recharge and organization limits if available.
4. Save the key in `.env.local` and retain `OPENAI_MODEL=gpt-4.1-mini` for the initial test if available to your account. Changing to a reasoning model can alter output-token needs and latency; do not assume every vision model behaves the same with the current 1,200-token/45-second settings.

**Cost:** each Generate click may incur a real API charge, including some failed/partial provider attempts. Typing edits and publishing do not automatically request generation. CampusLoop caps analyses at eight per user per UTC clock hour; failures after quota consumption count too. Do not lower security or bypass the quota to test repeatedly.

## 8. Start Next.js — Mac / VS Code Terminal

```sh
npm run dev
```

Leave the terminal running. Open `http://localhost:3000` in your browser. This is the address on **your Mac**, not a deployed website or a link to the Codex environment. If port 3000 is occupied, stop your earlier CampusLoop server with **Ctrl+C** or identify the other app; do not kill arbitrary processes. If you intentionally choose another port, use `npm run dev -- --port 3001` and update Supabase's local callback URLs to match.

The default command binds to `localhost` on macOS and Windows. For optional phone/LAN access, use the separate `npm run dev:lan` command and follow the [LAN setup notes in the README](../README.md#run-locally), including the exact development hostname and Auth callback configuration. Do not use `0.0.0.0` as the browser URL.

After any `.env.local` change, **Ctrl+C → `npm run dev`**. Production builds also need rebuilding when `NEXT_PUBLIC_` values change. Next.js automatically loads this file; you do not need to `source` it.

Expected connected state: no preview-mode notice; on a new database the feed is honestly empty until someone publishes. Six fictional preview cards mean the public Supabase variables are missing/empty in the running build. A database connection or permissions error is a different state; do not treat an error as evidence of a successful connection.

## 9. Create two users and check sessions — local browser

1. Normal window: visit `/auth`, select **Join the loop**, create **Account A (seller)** with a name, a real email you control, and a password of at least eight characters.
2. If confirmation is enabled, follow the email link in the **same browser profile and origin that initiated signup** (PKCE verifier cookies are browser-specific), then return to the app. Repeat by signing in after confirming if needed.
3. Private/incognito window or a different browser profile: create and confirm **Account B (buyer)**. Two tabs in the same profile share a session; they are not two independent accounts.
4. Refresh both windows. Their **My loop** pages should retain the correct identities. Profile names and last pickup landmarks are editable. In **My loop → Profile**, test **Log out**, then log back in. This must not log the other profile into the wrong user.

If email delivery blocks a private hackathon check, use **Supabase → Authentication → Users → Add user → Create new user** with confirmed email where offered. Create known A/B accounts there and sign in normally. This tests password login and sessions, but **does not verify signup-email delivery**; keep that checkbox pending. Do not disable production confirmation or create GitHub logins for app users.

Password recovery is **Forgot password?** on `/auth`. Follow the email in the same browser, then set the new password in **My loop → Profile**. Invalid confirmation currently redirects to `/auth?error=confirmation`; the page does not give a dedicated callback-error explanation, so check the address and request a fresh email if this occurs.

## 10. Verify a genuine AI draft — local browser + OpenAI dashboard

1. Sign in as A. Open **List with AI** (`/list/new`). Upload a **new real photograph** of a recognizable object, e.g. your desk lamp or textbook. JPEG/PNG/WebP are supported; export an iPhone HEIC photo as JPEG if needed. Compression strips metadata and reduces the longest dimension to 1600px; source file limit 20 MB, compressed image limit 3 MB.
2. Click **Generate my listing** once. This submits your compressed photo to OpenAI; use a non-sensitive image. Wait for the loading state, then confirm title, description/category and seller-verification suggestions appear with your photo intact. Everything remains editable; there is no automatic publication.
3. In browser Developer Tools → **Network**, find `POST /api/ai/listing`. Success is HTTP **200** with a `draft` containing `title`, `category`, `subcategory`, `description`, `visible_details` and `seller_checks`. Never share a HAR/network export: it can contain photos, auth cookies/tokens and headers. The OpenAI secret must never appear in this browser request or bundle.
4. In OpenAI **Usage**, filter the CampusLoop project and confirm the corresponding model request/usage (reporting may lag). An unmodified local app route returning a valid draft plus provider usage is evidence of a genuine call; preview/manual fallback or mocked tests is not.
5. Edit the generated text without pressing Generate again. Confirm no second AI request appears. If AI fails, verify your photo and edits remain and finish manually while the issue is diagnosed.

Never assume AI verified functionality, item condition, food contents/allergens, or safety. Review every statement. AI supplies no authoritative price, quantity, location or availability.

## 11. Publish and follow the complete lifecycle — two browser profiles

Use [HOSTED_VERIFICATION.md](HOSTED_VERIFICATION.md) as the checklist. The essential demonstration is:

- A publishes a **new non-sample** free item with quantity 1 and a future deadline at **AMS Student Nest**.
- B searches it, reserves for free, sees its pickup code, and opens walking directions.
- A opens **My loop → Seller handoffs**, refreshes, checks one wrong code (expected refusal), then confirms B's correct code when the handoff is intended.
- Both refresh and see completion; community impact increments by one pickup and one item, once.
- Repeat with a CAD 5 listing and **Reserve — Pay at pickup**. No card, Stripe charge or online-paid confirmation should appear.

Hosted test pickups are persistent activity in your project and affect impact. Label them in the title (e.g. `[TEST] Lamp`) and don't present them as independently verified environmental outcomes. Use a separate hosted test project before public launch if you need to keep production totals clean. Removing a completed test listing does not subtract its historical impact; there is no safe general-purpose cleanup/reset command in the app.

## 12. Run the available automated checks — another Mac Terminal

With dependencies installed, from the root:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

These check types, lint, schemas, mocked AI API behavior and actual SQL/RLS via PGlite, then the production bundle. They do **not** contact hosted Supabase or OpenAI. `npm run test:postgres` is optional and requires Docker; it uses a disposable local PostgreSQL container, never CampusLoop Main. The preview Playwright suite (`npm run test:e2e`) expects **no Supabase configuration** and should not be used to assert success of this connected run. The automated connected suite deliberately accepts only a fresh disposable loopback Supabase stack; do not remove its guard to point it at your cloud project.

To test the production build locally, stop the dev server and run `npm run start`. Do not run a build while another process is serving the same build output. To stop the server, press **Ctrl+C**. When sharing problems, share command names/status codes and sanitized messages, never env contents, passwords, network dumps or keys.

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md), [HOSTED_VERIFICATION.md](HOSTED_VERIFICATION.md), and [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md) for the remaining exact actions and troubleshooting.
