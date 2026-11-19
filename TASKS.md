# Tasks

One file per task in `tasks/`. One running task per lane (CLAUDE.md section 3). Status: open – can start ·
waiting (for what) · running · done.

## Lane: Format (`smholte/toolbox-format`)

| No. | Title | Status | Who · model · effort | Branch |
| --- | --- | --- | --- | --- |
| 0001 | [Independent review of toolbox format v0.1](tasks/0001-independent-review-of-the-format.md) | done – 22 fixes as v0.1.1 ([pull request #1](https://github.com/smholte/toolbox-format/pull/1), the owner merges and tags); 29 rule findings → 0011 | worker · Opus · High | `task/0001-independent-review` |
| 0002 | Trial on the owner's PC – **done by the owner, 18 Nov 2026, Edge 157 on Windows, real folder**: round trip works (small and 100 MB: written in 0.5 s, back in 13 s with an 8 s stand-in bake); after a restart Edge keeps the folder but asks one click ("Allow again"), and after "Allow on every visit" asks nothing. Left: the same once in Chrome; the stand-in's "slowed down" line also fires for its own bake (a wrong message in `trial/`, for task 0001) | done, two small points left | owner + lead | – |
| 0010 | [Windows checks on the owner's PC (file names, long paths)](tasks/0010-windows-checks-on-the-owners-pc.md) | open – can start | worker · Sonnet · Medium, then owner | `task/0010-windows-checks` |
| 0011 | [Format 0.2: the rule problems the review found](tasks/0011-format-0.2.md) | waiting – after 0010 and after v0.1.1 is merged | worker · Opus · High | `task/0011-format-0.2` |

## Lane: Router (`smholte/ToolBox`)

| No. | Title | Status | Who · model · effort | Branch |
| --- | --- | --- | --- | --- |
| 0003 | Plan step B: [docs/step-b-router.md](docs/step-b-router.md), with the owner's six answers | done (18 Nov 2026) | lead | – |
| 0004 | [The router's skeleton: tray app, drop window, installer, tests](tasks/0004-router-skeleton.md) | waiting – starts when Fresing Render's task 0217 is under way (the owner says when) | worker | `task/0004-router-skeleton` |
| 0005–0009 | The folder · the popup and routes · jobs · Windows integration and updates · review and the owner's test list (listed in the plan) | waiting – each after the one before; its task file is written then | worker | – |

## Lane: Window (`smholte/ToolBox`)

Nothing yet; after the router.

## Waiting for the owner

- Optional: run the trial once in Chrome too.
- Merge pull request #1 of `smholte/toolbox-format` and tag `v0.1.1`.
- Start task 0010.
- Say when Fresing Render's task 0217 is under way, so task 0004 can start.

## Done

| When | What | Where |
| --- | --- | --- |
| 18 Nov 2026 | Toolbox format 0.1 written, reviewed by the leads of House Planner and Fresing Render, tagged `v0.1` (before these rules, by the planning chat) | `smholte/toolbox-format`, FORMAT.md section 13 |
| 18 Nov 2026 | Briefs to the leads of House Planner and Fresing Render for their side of step D | Fresing Render: its task 0217 |
| 18 Nov 2026 | Working rules, task list and template set up | this repository |
