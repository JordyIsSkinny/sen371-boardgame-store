# Usability testing

Findings for #151.

## Methodology

- **Participants:** 4, none of them the developers of this application. Nielsen's research on usability testing found that five participants surface roughly 85% of the usability problems a much larger sample would find, which is the standard justification for a small student-project sample size being defensible rather than a corner cut – a single participant, or the developer testing their own build, forfeits that justification and collapses "user testing" back into an ordinary developer walkthrough, which is exactly the distinction this QA area is graded on. Four is the practical middle of the defensible 3–5 range.
- **Recruitment:** Classmates, friends, or family who haven't used the app before. Prior exposure to the app defeats the point: someone who already knows where "Cart" is isn't testing discoverability.
- **Format:** Moderated (someone watches and takes notes) is strongly preferred over unmoderated for a first round, since it's the only way to capture *why* someone hesitated, not just that they did.
- **Protocol:** Think-aloud – ask each participant to narrate what they're looking for and why as they go, rather than working in silence. Prompt with "what are you looking for right now?" if they go quiet, not with "click there" – the moment a moderator starts pointing, the task stops measuring the interface and starts measuring the moderator.
- **Environment:** Local dev (`npm run dev` in both `client/` and `server/`), not the deployed site. Local avoids Render's cold-start delay contaminating timing data; revisit this once M6 deployment has been live and warm for a while, since the deployed site is more representative of what a real user actually experiences – but timing numbers aren't comparable across the two, so this has to be picked once and stated, not switched mid-session.
- **Device/browser:** Record per participant on the day (whatever they naturally show up with – laptop, phone, a specific browser). A finding that only reproduces on one browser or one screen width is still a real finding, but it needs the context to be actionable.
- **Consent and privacy:** Get a verbal or written okay to observe and take notes before starting. Identify participants as P1, P2, etc. in every document this produces – never by name – the same way the codebase never puts a name in a comment when a role or ticket number does the job.

## Tasks

Deliberately the same five journeys the Playwright suite (#149/#150) already covers end to end. That's not a coincidence – it means a finding here and a finding there are talking about the same slice of the app, and a marker can see the automated-testing and human-testing evidence line up rather than covering unrelated ground.

Each task needs a participant who starts from the state the task assumes (logged out for tasks 1–2, logged in for tasks 3–4, an admin account for task 5) – reset or use a fresh account per participant so task 2's "register" step isn't skipped for the second person through. [#176](https://github.com/JordyIsSkinny/sen371-boardgame-store/issues/176) is an intermittent session-race bug – if a participant gets unexpectedly signed out mid-session, note it as that rather than as a fresh point of confusion.

| # | Task given to the participant | Success looks like |
|---|---|---|
| 1 | "Find a strategy game for 4 players." | Applies a category and a player-count filter unaided, lands on a plausible result, without asking what the filters do. |
| 2 | "Create an account for yourself." | Completes registration without needing the password rules explained out loud. |
| 3 | "Add a game to your cart and buy it." | Reaches order confirmation. |
| 4 | "Find the order you just placed." | Locates it in Order History without being told where to look. |
| 5 (admin persona) | "You're a store admin. Find yesterday's orders and mark one as shipped." | Uses the Orders tab in the admin dashboard and completes the status change. Needs a participant briefed as store staff, not a regular shopper – optional if only one session is feasible, since most real users never see this screen. |

## Results

_One row per participant per task. Fill in after each session; don't wait until the end to transcribe from memory._

| Task | Participant | Completed? | Time on task | Notes |
|---|---|---|---|---|
| 1 | P1 | Yes | 47s | Was able to access the filter with no difficulty, and applied the filter with ease. |
| 1 | P2 | Yes | 1m 10s | Found the catalogue and filter side bar with minimal difficulty, and applied the filter with ease. |
| 1 | P3 | Yes | 34s | Attempted to press on the strategy games button on the home page and was redirected to the catalogue screen, but the strategy filter was not already in place. They had to select that and the 4 player count themself. The filter side bar was found easily. |
| 1 | P4 | Yes | 38s | Navigated to the catalogue and utilised the filter side bar to with ease.|
| 2 | P1 | Yes | 1m 45s | Registered account with no complications. |
| 2 | P2 | Yes | 1m 20s | Registered account with no difficulty. |
| 2 | P3 | Yes | 40s | Clicked on the register link in the navigation bar and made their account with no difficulty. |
| 2 | P4 | Yes | 30s | Clicked on the register link in the navigation bar and made their account quickly and with no difficulty. |
| 3 | P1 | Yes | 2m 24s | Browsed until a game that interested them, and was able to add to cart and checkout the order with ease. |
| 3 | P2 | Yes | 1m 43s | Browsed the catalogue and chose the first game they saw. Was able to add to cart and go to chekout with no difficulty. |
| 3 | P3 | Yes | 1m 20s | Added the selected board game to cart and placed the order at checkout with ease. |
| 3 | P4 | Yes | 1m 8s | Applied the card games filter, selected a game, added it to cart, and proceeded to checkout with no difficulty. |
| 4 | P1 | Yes | 12s | Was able to locate the order quickly, however when attempted to view details, it did not work. |
| 4 | P2 | Yes | 7s | Clicked on the view my orders button after checkout, and was redirected to the orders page quickly and with ease. |
| 4 | P3 | Yes | 5s | Clicked on the view my orders button after checkout, and was redirected to the orders page quickly and with ease. They also attempted to click on the view order details button but was not redirected. |
| 4 | P4 | Yes | 4s | Clicked on the view my orders button after checkout, and was redirected to the orders page quickly and with ease. |
| 5 (admin) | P1 | Yes | 42s | Navigated to the admin dashboard with no difficulty and located the order in the Orders tab and changed the order status to shipped. |

## Findings

_Grouped by theme or severity, not by participant – a marker wants "these are the things that matter," not a per-person transcript. Severity scale:_

- **Critical** – blocks the task entirely; no workaround the participant found on their own.
- **Major** – task eventually completed, but with real friction (backtracking, asking for help, visible frustration).
- **Minor** – cosmetic or a small hesitation that didn't change the outcome.

| Severity | Finding | Where | Recommendation | Issue |
|---|---|---|---|---|
| Minor | "View details" on an order does not respond to clicks. Hit independently by P1 and P3, both of whom tried it unprompted after locating their order; neither participant's assigned task (locating the order) was blocked or slowed by it. | Order History (Task 4) | Wire up an order-detail route, or remove/disable the button until one exists, so the interface doesn't visibly offer an action it can't perform. | [#204](https://github.com/JordyIsSkinny/sen371-boardgame-store/issues/204) |
| Minor | Clicking the home page's "Strategy" category link lands on the catalogue with no filter actually applied – all games across every category are shown, and the participant had to select Strategy and the player count themselves. P3 still completed the task in 34s, the fastest Task 1 time recorded, so it didn't block or meaningfully slow the outcome. | Home page category links -> Catalogue (Task 1) | Have the home page's category links pass the category through as an active filter (e.g. a query param the catalogue reads on load) rather than landing on the unfiltered view. | [#205](https://github.com/JordyIsSkinny/sen371-boardgame-store/issues/205) |

## Summary

All four participants completed every core task – filtering, registration, and checkout – without assistance, and the one participant who attempted the admin persona task (Task 5) completed it without difficulty as well. Task 1 showed the only variation in approach: three participants went straight to the catalogue's filter sidebar, while P3 first tried a homepage category link that landed on the catalogue without the filter pre-applied (#205), though this didn't slow them down – 34s was the fastest Task 1 time recorded. The one recurring issue across sessions was Order History's "View details" button, independently clicked by two of the four participants expecting more information, which does not currently respond (#204); it didn't block or slow the assigned task for either of them, so it's rated Minor rather than Major. The highest-priority fix from this round is wiring up (or hiding) that button, since it's the only friction point more than one participant hit on their own.
