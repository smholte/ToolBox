# Tasks

One file per task in `tasks/`. One running task per lane (CLAUDE.md section 3). Status: open – can start ·
waiting (for what) · running · done.

## Lane: Format (`smholte/toolbox-format`)

| No. | Title | Status | Who · model · effort | Branch |
| --- | --- | --- | --- | --- |
| 0001 | [Independent review of toolbox format v0.1](tasks/0001-independent-review-of-the-format.md) | done – 22 fixes as v0.1.1 ([pull request #1](https://github.com/smholte/toolbox-format/pull/1), merged by the lead 20 Nov 2026 as `cc0356c`; the owner tags it); 29 rule findings → 0011 | worker · Opus · High | `task/0001-independent-review` |
| 0002 | Trial on the owner's PC – **done by the owner, 18 Nov 2026, Edge 157 on Windows, real folder**: round trip works (small and 100 MB: written in 0.5 s, back in 13 s with an 8 s stand-in bake); after a restart Edge keeps the folder but asks one click ("Allow again"), and after "Allow on every visit" asks nothing. Left: the same once in Chrome; the stand-in's "slowed down" line also fires for its own bake (a wrong message in `trial/`, for task 0001) | done, two small points left | owner + lead | – |
| 0010 | [Windows checks on the owner's PC (file names, long paths)](tasks/0010-windows-checks-on-the-owners-pc.md) | open – can start | worker · Sonnet · Medium, then owner | `task/0010-windows-checks` |
| 0011 | [Format 0.2: the rule problems the review found (P1–P29) and the neighbours' findings (P30–P32)](tasks/0011-format-0.2.md) | waiting – after 0010 (v0.1.1 merged 20 Nov 2026) | worker · Opus · High | `task/0011-format-0.2` |

## Lane: Router (`smholte/ToolBox`)

| No. | Title | Status | Who · model · effort | Branch |
| --- | --- | --- | --- | --- |
| 0003 | Plan step B: [docs/step-b-router.md](docs/step-b-router.md), with the owner's six answers | done (18 Nov 2026) | lead | – |
| 0004 | [The router's skeleton: tray app, drop window, installer, tests](tasks/0004-router-skeleton.md) | open – can start (Fresing Render's 0217 released 19 Nov 2026) | worker · Opus · High | `task/0004-router-skeleton` |
| 0005–0009 | The folder · the popup and routes · jobs · Windows integration and updates · review and the owner's test list (listed in the plan) | waiting – each after the one before; its task file is written then | worker | – |

## Lane: Window (`smholte/ToolBox`)

Nothing yet; after the router.

## Waiting for the owner

- Optional: run the trial once in Chrome too.
- Tag `v0.1.1` of `smholte/toolbox-format` on commit `cc0356c` (merged by the lead; a chat may not make releases).
- Start task 0010.
- Start task 0004 (it can run at the same time as 0010: another lane).

## Done

| When | What | Where |
| --- | --- | --- |
| 18 Nov 2026 | Toolbox format 0.1 written, reviewed by the leads of House Planner and Fresing Render, tagged `v0.1` (before these rules, by the planning chat) | `smholte/toolbox-format`, FORMAT.md section 13 |
| 18 Nov 2026 | Briefs to the leads of House Planner and Fresing Render for their side of step D | Fresing Render: its task 0217 |
| 18 Nov 2026 | Working rules, task list and template set up | this repository |
| 20 Nov 2026 | Pull request #1 of `toolbox-format` (v0.1.1) merged by the lead after a green re-run (one web test failed once: flaky, fixed in 0011) | `smholte/toolbox-format`, `cc0356c` |
| 20 Nov 2026 | Neighbours' findings added before the tasks start: 0010 W1 (`CLOCK$`, `COM²`, `COM³`, `LPT¹`, `LPT²`), 0011 P30–P32 and a wider P4 | `tasks/0010-…`, `tasks/0011-…` |
