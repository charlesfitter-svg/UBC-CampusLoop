# CampusLoop: 60–90 second judging walkthrough

Prepare two independent, confirmed accounts A/B, valid Supabase configuration, an OpenAI key authorized for Responses, a real object photo, and the actual live verification in `docs/HOSTED_VERIFICATION.md`. Open A in a normal browser profile, B in another profile/private window. This script is a demonstration plan, not a claim it has run. Local app address: `http://localhost:3000` on your Mac.

1. **0–10s — The idea.** “Give useful things another life, without the listing hassle.” Show the marketplace; mention public campus pickup and no delivery. Fictional sample cards, if present, are labelled and cannot be reserved.
2. **10–35s — The flagship.** As A choose **List with AI**, take/upload a real object photo and **Generate my listing**. “The photo is sent to OpenAI; AI describes visible details and asks us to verify uncertain facts.” Wait for the genuine response, show the original photo and editable fields, make one small edit. If the API fails, clearly name the manual fallback; never call preset/manual text successful AI.
3. **35–45s — Publish.** Leave **Free**, quantity 1, a future deadline, choose **AMS Student Nest**, then **Publish listing**. This saves the real photo to Supabase Storage and a real database row.
4. **45–60s — Reserve and navigate.** As B find that title, choose **Reserve for free**, show the persistent pickup code and **Get directions** walking link. “Availability changes atomically. We don’t charge online.”
5. **60–80s — Close the loop.** A opens **My loop → Seller handoffs**, refreshes, and enters B's code when the handoff is intended. Both refresh to **Loop completed**; **Our impact** increases by one item and one pickup, once.
6. **80–90s — Paid variation.** Show a separately prepared CAD 5 test listing's **Reserve — Pay at pickup** action. Explain it uses the same code/pickup workflow, with any money exchanged directly at pickup. Do not claim an online charge occurred.

Do not use fictional samples for the functional reservation step. Completed test handoffs affect recorded metrics; describe them as test activity, not audited environmental savings. For an actual food demonstration the seller supplies verified food details and a pickup window within 48 hours; AI never certifies safety or allergens. Observe your hackathon's AI-use rules and the app's independence from UBC.
