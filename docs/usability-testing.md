# Usability testing

Template for #151. Nothing below the methodology section has real data in
it yet — this is the structure to fill in once a session actually runs, not
a report of one that already happened. Replace every `_TBD_` and empty
table row with real observations; delete this paragraph once that's done.

## When to run this

Not yet. The single most important task below — completing a purchase — is
currently blocked by [#175](https://github.com/JordyIsSkinny/sen371-boardgame-store/issues/175):
`Checkout.jsx`'s Place order button is hardcoded disabled, so no participant
can complete it no matter how the screen is designed. Running the session
before that lands would spend participant time hitting a known bug rather
than surfacing new findings, and would produce a "finding" that's really
just a re-discovery of an issue already tracked.

Not blocked by anything else. [#176](https://github.com/JordyIsSkinny/sen371-boardgame-store/issues/176)
(the session-race bug) is intermittent, not a reason to wait — worth noting
in the moderator's log if a participant gets unexpectedly signed out
mid-session, since that would otherwise look like an unrelated point of
confusion. The [#167](https://github.com/JordyIsSkinny/sen371-boardgame-store/issues/167)
wizard-scope decision, the Figma cleanup issues, and the production
deployment's manual setup steps have no bearing on this at all — this can
run against local dev the moment #175 is fixed.

## Methodology

- **Participants:** _TBD_ — aim for 3–5. This isn't an arbitrary number:
  Nielsen's research on usability testing found that five participants
  surface roughly 85% of the usability problems a much larger sample would
  find, which is the standard justification for a small student-project
  sample size being defensible rather than a corner cut.
- **Recruitment:** _TBD_ — classmates, friends, or family who haven't used
  the app before. Prior exposure to the app defeats the point: someone who
  already knows where "Cart" is isn't testing discoverability.
- **Format:** _TBD_ — moderated (someone watches and takes notes) is
  strongly preferred over unmoderated for a first round, since it's the
  only way to capture *why* someone hesitated, not just that they did.
- **Protocol:** Think-aloud — ask each participant to narrate what they're
  looking for and why as they go, rather than working in silence. Prompt
  with "what are you looking for right now?" if they go quiet, not with
  "click there" — the moment a moderator starts pointing, the task stops
  measuring the interface and starts measuring the moderator.
- **Environment:** _TBD_ — local dev (`npm run dev` in both `client/` and
  `server/`) or the deployed site. Local avoids Render's cold-start delay
  contaminating timing data; the deployed site is more representative of
  what a real user actually experiences. Pick one and say which, since
  timing numbers aren't comparable across the two.
- **Device/browser:** _TBD_ — record per participant. A finding that only
  reproduces on one browser or one screen width is still a real finding,
  but it needs the context to be actionable.
- **Consent and privacy:** Get a verbal or written okay to observe and take
  notes before starting. Identify participants as P1, P2, etc. in every
  document this produces — never by name — the same way the codebase never
  puts a name in a comment when a role or ticket number does the job.

## Tasks

Deliberately the same five journeys the Playwright suite (#149/#150)
already covers end to end. That's not a coincidence — it means a finding
here and a finding there are talking about the same slice of the app, and
a marker can see the automated-testing and human-testing evidence line up
rather than covering unrelated ground.

Each task needs a participant who starts from the state the task assumes
(logged out for tasks 1–2, logged in for tasks 3–4, an admin account for
task 5) — reset or use a fresh account per participant so task 2's
"register" step isn't skipped for the second person through.

| # | Task given to the participant | Success looks like |
|---|---|---|
| 1 | "Find a strategy game for 4 players." | Applies a category and a player-count filter unaided, lands on a plausible result, without asking what the filters do. |
| 2 | "Create an account for yourself." | Completes registration without needing the password rules explained out loud. |
| 3 | "Add a game to your cart and buy it." | Reaches order confirmation. **Blocked until #175 is fixed — see above.** |
| 4 | "Find the order you just placed." | Locates it in Order History without being told where to look. |
| 5 (admin persona) | "You're a store admin. Find yesterday's orders and mark one as shipped." | Uses the Orders tab in the admin dashboard and completes the status change. Needs a participant briefed as store staff, not a regular shopper — optional if only one session is feasible, since most real users never see this screen. |

## Results

_One row per participant per task. Fill in after each session; don't wait
until the end to transcribe from memory._

| Task | Participant | Completed? | Time on task | Notes |
|---|---|---|---|---|
| | | | | |

## Findings

_Grouped by theme or severity, not by participant — a marker wants "these_
_are the things that matter," not a per-person transcript. Severity scale:_

- **Critical** — blocks the task entirely; no workaround the participant found on their own.
- **Major** — task eventually completed, but with real friction (backtracking, asking for help, visible frustration).
- **Minor** — cosmetic or a small hesitation that didn't change the outcome.

| Severity | Finding | Where | Recommendation | Issue |
|---|---|---|---|---|
| | | | | |

## Summary

_Three to five sentences once the above is filled in: what worked well,_
_what didn't, and what the single highest-priority fix would be. This is_
_the paragraph a marker reads first — write it last._
