# Phase 2 setup and verification

The five enhancements preserve the existing AI prompt/model, authentication, reservation codes, Storage paths and completed-handoff impact accounting:

- New $0 listings and paid-to-free edits require confirmation. Change price and Escape preserve the draft and focus the price field; already free edits skip redundant confirmation. Publishing is locked against repeat clicks.
- Listing details and buyer/seller pickup cards provide compact **Safety & Accessibility** assistance with phone links, official information and emergency guidance. Seasonal hours and wheelchair accessibility are not assumed.
- An optional Google Maps Embed preview uses the existing landmark coordinates. External walking directions always remain available, including without a key or when an iframe fails.
- **My loop → My listings** provides expired-listing recovery. Dismissal is remembered in this browser for the owner, listing and expiration occurrence, with manual actions retained. It appears on entering the tab or refreshing loaded account data, not on a timer. Browser storage restrictions can prevent persistent dismissal.
- `/reuse` contains all six campus resources and conditional category suggestions, without promising donation eligibility, transport or acceptance. No external donation or impact event is recorded.

## Required Supabase upgrade

The hosted database was not changed automatically.

1. Select the intended project in Supabase. Confirm `202610180001_marketplace.sql` was already applied; do not rerun initialization on an existing database.
2. In **SQL Editor → New query**, paste and run the **complete** [202610180002_listing_recovery.sql](../supabase/migrations/202610180002_listing_recovery.sql), including `begin` and `commit`.
3. The new migration is safe to reapply. It adds `relist_listing(uuid,timestamptz,boolean,text)`, executable only by authenticated users, with owner checks and a listing row lock. It replaces the existing `save_listing` implementation only to prevent expired listings bypassing recovery through ordinary edits. It creates no tables and changes no RLS or Storage policies.
4. Check permissions:

```sql
select to_regprocedure('public.relist_listing(uuid,timestamptz,boolean,text)');
select has_function_privilege('authenticated',
  'public.relist_listing(uuid,timestamptz,boolean,text)', 'execute'); -- true
select has_function_privilege('anon',
  'public.relist_listing(uuid,timestamptz,boolean,text)', 'execute'); -- false
```

Alternatively, use `supabase db push` with a supported CLI already linked to the correct project, after reviewing all pending migrations. Never reset the hosted database. Fresh projects need both migrations in filename order.

Relisting changes only the deadline and, for food, renewed food details. It preserves ID, photo, original/available quantities, category, price, location, reservations and impact. No Storage upload or OpenAI call occurs. Outstanding reservations block recovery; their original codes still complete after the deadline. Once resolved, remaining stock can be relisted. Fully fulfilled, removed, non-expired and sample listings are ineligible. A duplicate renewal is rejected without changing inventory.

Food requires current contents/allergens/handling details and a fresh, initially unchecked suitability confirmation. Its new deadline must be within 48 hours; other listings allow up to 31 days. A listing deadline is not evidence of food safety. If suitability cannot be confirmed, use official information instead of relisting.

## Optional Google Maps Embed configuration

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/). Follow [Google's setup](https://developers.google.com/maps/documentation/embed/get-api-key), linking billing if required for the project.
2. Under **APIs & Services → Library**, enable **Maps Embed API**.
3. Under **Credentials**, create an API key. This key is browser-visible by design.
4. Under **Application restrictions**, select **Websites (HTTP referrers)**. Add only authorized local and production origins, for example:

```text
http://localhost:3000/*
http://127.0.0.1:3000/*
https://YOUR-EXACT-PRODUCTION-DOMAIN/*
```

Add separate entries for intentionally used ports or a trusted LAN host. Avoid broad `*.vercel.app` access. If an exact preview domain is authorized, remove it afterward. Under **API restrictions**, restrict the key to **Maps Embed API** only, then save. See [Google's security guidance](https://developers.google.com/maps/api-security-best-practices).

5. Add the actual restricted key to ignored `.env.local` without altering existing credentials:

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY=YOUR_RESTRICTED_MAPS_EMBED_KEY
```

Restart `npm run dev` (PowerShell: `npm.cmd run dev`). Open a listing or reserved pickup and expand **Preview pickup map**. The responsive iframe has a descriptive title, lazy loading and reserved height. Its `strict-origin-when-cross-origin` policy supports website restrictions without exposing page paths. [Official embedding reference](https://developers.google.com/maps/documentation/embed/embedding-map).

6. When you later choose to deploy, add the same variable in **Vercel → Project → Settings → Environment Variables**, selecting the intended environments. Public variables are embedded at build time: rebuild/redeploy after changes. Authorize the exact final HTTPS domain in Google Cloud and test it after deployment. Nothing here deploys automatically.
7. Check the map and external walking directions on desktop and mobile. Remove the key temporarily to verify fallback. Cross-origin iframe failures cannot all be detected reliably; an iframe load event is not proof of authorization. External navigation stays available regardless.

No actual Embed key was configured during implementation. Live Google Maps rendering remains an owner check; `.env.local` was not modified.

## Resource information and limits

Official pages checked on October 18, 2026; current acceptance and operating hours must still be checked before travel:

- [AMS Safewalk](https://www.ams.ubc.ca/support-services/student-services/safewalk/): 604-822-5355, during published hours.
- [UBC Campus Security / Community Safety](https://communitysafety.ubc.ca/): 604-822-2222, 24/7. Call 911 for emergencies.
- [Accessibility Shuttle](https://students.ubc.ca/about-student-services/centre-for-accessibility/ubc-accessibility-shuttle/): 604-822-9929, designated stops and advance bookings, subject to availability. No instant pickup or delivery promise. [Campus Wayfinding](https://maps.ubc.ca/) is linked by UBC's accessibility page.
- [UBC Free Store](https://sustain.ubc.ca/ubc-free-store): AMS Nest, Room 0021; suitable general items, with acceptance checked before bulky/electrical donations.
- [Get Thrifty](https://getthrifty.ca/pages/how-to-donate): Life Building, Room 0014, 6138 Student Union Blvd; clothing and eligible accessories, not furniture/electronics.
- [AMS Food Bank](https://www.ams.ubc.ca/support-services/student-services/food-bank/): Life Building, Room 0023; eligible non-perishables, with other donations arranged first. Prepared meals, opened products and expired food are not assumed acceptable.
- [Sprouts Community Fridge](https://ubc-sprouts.squarespace.com/community-fridge): outside Sprouts Cafe in the Life Building basement; consult current food-safety and acceptance guidance. Never bring unsafe or expired food.
- [Zero Waste Market](https://zero-waste-market.ubc.ca/donations/): eligible UBC faculties, departments and affiliated campus organizations only; not ordinary personal student furniture drop-offs.
- [Recyclepedia](https://sustain.ubc.ca/resources/campus-guides/sort-it-out/z-recyclepedia-search): appropriate disposal guidance.

CampusLoop is not affiliated with these services. The existing taxonomy has no clothing subcategory; **Other** includes a conditional Get Thrifty suggestion. Every category still allows browsing the full directory. Furniture recommendations explicitly preserve institutional eligibility restrictions.

## Verification and smoke tests

If development repeatedly requests the same dashboard URL with `Compiled in 0ms`, check the first browser/dev-log error before changing navigation. The observed Phase 2 incident followed a stale missing-module error for `expired-listing-recovery` while the new files were being introduced. The dev trace recorded repeated Fast Refresh cycles with no updated modules; closing/reloading the affected tab cleared its old client state. The `reservation` query parameter was merely retained in the current URL, not repeatedly processed by the dashboard. After all component files are present, fully reload the affected tab; if a current module-resolution error remains, restart `npm run dev` and investigate that error. Do not remove uncommitted source files or change backend credentials to clear development state. The focused browser suite checks that a signed-in reservation URL stays stable through tab changes, clock updates and dashboard data refresh.

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and `npm run test:phase2`; use `npm.cmd` in PowerShell as needed. Phase 2 browser tests use configured public Supabase values with mocked browser requests/writes: no hosted accounts, listings, uploads or OpenAI calls are created. Windows uses installed Edge; elsewhere install Playwright Chromium or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. `PLAYWRIGHT_BASE_URL` can target another running local server. The disposable-local connected lifecycle suite is updated for free confirmation.

1. Generate a photo draft once. At $0, check Change price, Escape, Tab/Shift+Tab and image/text preservation. Confirm publication once. Paid publication should skip the dialog; an already free edit should not prompt again.
2. As buyer and seller, check reserved pickup codes, assistance links and walking directions at desktop and iPhone-sized widths. Do not place test calls to assistance/emergency numbers.
3. After applying the upgrade, create an owned listing with a deadline a few minutes ahead. Return to My listings after it expires. Dismiss recovery and revisit: the prompt remains dismissed, with manual recovery available. Relist with an explicit deadline; confirm the same ID, photo, price and inventory remain.
4. Reserve before expiration, then verify relisting is deferred afterward. Complete using the original code and relist only remaining stock, or cancel and verify inventory returns once. Removed or fully fulfilled listings cannot be revived.
5. Verify expired food requires renewed details and a fresh confirmation; deadlines over 48 hours fail. If confirmation is impossible, use informational resources instead.
6. Browse reuse options and directions: impact must not change. Only completing a CampusLoop handoff changes completed-loop and redistribution totals.

Physical iPhone/Safari behavior, the hosted upgrade and live Maps authorization require owner verification. Identity/CWL verification, badges, payments/Stripe, automated donations, transport/POS integrations, notifications and arcade features remain deferred.
