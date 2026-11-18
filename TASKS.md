# Tasks

One file per task in `tasks/`. One running task per lane (CLAUDE.md section 3). Status: open – can start ·
waiting (for what) · running · done.

## Lane: Format (`smholte/toolbox-format`)

| No. | Title | Status | Who | Branch |
| --- | --- | --- | --- | --- |
| 0001 | [Independent review of toolbox format v0.1](tasks/0001-independent-review-of-the-format.md) | waiting – lead review of the branch; report in the task file | worker (Claude Code on the web, 18 Nov 2026) | `task/0001-independent-review` |
| 0002 | Trial on the owner's PC – **done by the owner, 18 Nov 2026, Edge 157 on Windows, real folder**: round trip works (small and 100 MB: written in 0.5 s, back in 13 s with an 8 s stand-in bake); after a restart Edge keeps the folder but asks one click ("Allow again"), and after "Allow on every visit" asks nothing. Left: the same once in Chrome; the stand-in's "slowed down" line also fires for its own bake (a wrong message in `trial/`, for task 0001) | done, two small points left | owner + lead | – |

## Lane: Router (`smholte/ToolBox`)

| No. | Title | Status | Who | Branch |
| --- | --- | --- | --- | --- |
| 0003 | Plan step B: [docs/step-b-router.md](docs/step-b-router.md), with the owner's six answers | done (18 Nov 2026) | lead | – |
| 0004 | [The router's skeleton: tray app, drop window, installer, tests](tasks/0004-router-skeleton.md) | waiting – starts when Fresing Render's task 0217 is under way (the owner says when) | worker | `task/0004-router-skeleton` |
| 0005–0009 | The folder · the popup and routes · jobs · Windows integration and updates · review and the owner's test list (listed in the plan) | waiting – each after the one before; its task file is written then | worker | – |

## Lane: Window (`smholte/ToolBox`)

Nothing yet; after the router.

## Waiting for the owner

- Optional: run the trial once in Chrome too.
- Say when Fresing Render's task 0217 is under way, so task 0004 can start.

## Done

| When | What | Where |
| --- | --- | --- |
| 18 Nov 2026 | Toolbox format 0.1 written, reviewed by the leads of House Planner and Fresing Render, tagged `v0.1` (before these rules, by the planning chat) | `smholte/toolbox-format`, FORMAT.md section 13 |
| 18 Nov 2026 | Briefs to the leads of House Planner and Fresing Render for their side of step D | Fresing Render: its task 0217 |
| 18 Nov 2026 | Working rules, task list and template set up | this repository |
