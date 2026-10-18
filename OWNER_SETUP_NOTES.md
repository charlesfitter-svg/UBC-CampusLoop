# CampusLoop — owner setup outside Codex

These are steps you perform in external accounts or dashboards. They are **not** instructions to implement Stripe or to pay anyone now. Codex should still generate all integration code and setup files it can without credentials. Never place a secret in a GitHub issue, repo, screenshot or chat response.

## Mandatory to use the complete working MVP

### A. GitHub / Codex

- Connect the correct repository to Codex and grant repository write access where intended.
- Open the Codex session on the right branch/repo. Paste the complete `CODEX_BUILD_PROMPT.md` text as the instruction, or commit it in the repository and ask Codex to execute it.
- **If your hackathon has an AI-use policy, check it**. Be prepared to explain the implementation and your product decisions.
- No special GitHub plugin is needed solely to paste an instruction into an already-connected Codex environment.

### B. OpenAI API — mandatory for LIVE photo-to-listing

- Go to https://platform.openai.com/ and create/select an API project.
- Set up **API billing** and a payment method/available balance if required. This is separate from any ChatGPT subscription; being a Plus subscriber does not include paid API vision calls.
- Create a new API key for this app and store it as `OPENAI_API_KEY` in your **local `.env.local`** and (later) Vercel server environment variables. Avoid broad sharing; rotate if exposed.
- Codex should use the Responses API's image input and Structured Outputs. Set `OPENAI_VISION_MODEL` to a currently supported model (the specification suggests `gpt-5.4-mini`, subject to account availability).
- Review model pricing and usage; set sensible alerts/spending limits in the API dashboard and modest per-user usage caps in the app. A single live call per photo is adequate.
- Validate with a real photo of a clearly recognizable item; check that resulting description does not invent condition, brand, price or food-safety information.

### C. Supabase — mandatory for MULTI-USER persistence

- Create one Supabase project at https://supabase.com/dashboard and retrieve **project URL** and **publishable key**; add these to `.env.local` using names in `.env.example`.
- Follow Codex-generated instructions to apply **migrations** (schema, RPC functions, access policies) and configure image Storage bucket. Creating the project does not run repository SQL automatically.
- Enable email sign-up; configure **Auth Site URL and Redirect URLs** for `http://localhost:3000`, then update for deployment later. Use two separate test accounts. Email verification may be required and should remain enabled for real launch.
- Test using two browsers/accounts. Pay particular attention to permission errors, concurrency and upload RLS; these are frequent integration issues.
- Keep Supabase secret/service-role keys server-side only if Codex introduces them for a justified reason. In this specification they are **not needed for ordinary public browsing**.

### D. Node / local testing

- Have a Node.js LTS runtime and npm installed on your computer or available in the Codex environment.
- After code generation: `npm install`, `cp .env.example .env.local`, fill keys, `npm run dev`.
- Test on a mobile browser for camera/gallery selection and one-handed seller flow. The phone must be able to access the dev app (deployed preview is often easiest).

## Strongly recommended but optional

### E. Vercel deployment

- Create/connect a Vercel project to the GitHub repository when ready for a judges' demo.
- Add public Supabase URL/publishable key and **server-only OpenAI API key** to Vercel environment settings; deploy.
- Set final Auth Site URL/allow-list to include your Vercel domain and appropriate auth callback.
- Confirm server-side AI calls work on deployed site and no secret is exposed in frontend code.

### F. Maps

- **No Google Cloud project, billing account or Maps API key is necessary** for the external Google Maps directions links used by this MVP.
- Verify any seeded UBC landmark names/destinations in live Maps and correct inaccurate addresses or entrances before public use.

## Not required — do NOT set these up yet

### Stripe and banking

- **No Stripe account, Stripe API keys, Connect platform, bank deposit account, merchant onboarding or payment processing balance is required** for the MVP. The product collects **zero** payments online. Paid listings use `Reserve — Pay at pickup` and any exchange of money is off-platform between buyer and seller.
- A disabled `Online payments coming later` button is sufficient. Don't collect card details or create fake charges.
- **When scaling later**, a real marketplace likely needs **Stripe Connect**, connected seller onboarding, identity verification, tax/refund/dispute design, and payouts. A personal Stripe account merely taking all customers' money would not be a suitable multi-seller marketplace design. Read https://docs.stripe.com/connect/marketplace.

### Restaurant partnerships

- No POS API key, restaurant POS access, inventory integration or vendor contract needed for the demo. Food listings are **manual** and seed data must be labelled fictional. Partner legitimacy and food-safety rules require real-world work before public launch.

### Delivery / embedded maps

- No courier accounts, tracking infrastructure, paid geocoding or Maps JavaScript SDK needed. MVP is walk-to-pickup only.

## Suggested owner checklist

- [ ] Hackathon permits Codex/AI-assisted code generation.
- [ ] Correct GitHub repository selected in Codex.
- [ ] OpenAI API project created and billing available.
- [ ] OpenAI key in local/server environment (never in repository).
- [ ] Supabase project URL + publishable key set.
- [ ] Supabase migration and Storage RLS successfully applied.
- [ ] Auth redirect settings configured and two test users created.
- [ ] Live photo generates an editable, accurate draft.
- [ ] User A publishes; User B reserves; walking directions open.
- [ ] Pickup completes; impact increments exactly once.
- [ ] Public deployment and mobile photo upload tested.
- [ ] `README.md` accurately reflects commands and what is actually live.
