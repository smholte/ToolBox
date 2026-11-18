# CLAUDE.md – how we work on ToolBox

Read this first in every chat that works on ToolBox. Then read `TASKS.md`.
The lead keeps this file current: when a rule or a way of working changes, it changes here in the same commit.
(Modelled on Fresing Render's `CLAUDE.md`, 18 Nov 2026, and fitted to this project.)

## 1. The project and the owner

**ToolBox** makes the owner's tools, and other people's, work as one set: a file made in one tool arrives in the next
without Save and Open dialogs. Every tool still works on its own. The plan has three steps, each built on the same
folder and file formats:

- **Step D – the format only, no app.** Tools find each other in a folder `C:\Users\<name>\Toolbox` and hand files
  over as jobs in each other's inbox. Repository `smholte/toolbox-format`.
- **Step B – a background router.** A small tray app: drop a file and pick a tool, routes, "Open with", starting
  tools. This repository.
- **Step A – the full window.** Web tools shown inside, a company's logo, colours and tool set. This repository.

The whole idea in one document: https://claude.ai/artifact/TR3VKEJmoCmfdZJKcvBWbe (the design draft; where it and
`toolbox-format/FORMAT.md` differ, `FORMAT.md` wins).

**Owner: Sebastian (Fresing).** Designs machines in Autodesk Inventor and Fusion. Not a programmer. He tests on his
own Windows PC.

How to work with him:

- Plain language, short. Results first, no account of the effort. No code unless he asks.
- Anything he has to do: numbered steps, click by click, with the exact names of buttons and menus. Say what he
  should see when it worked.
- Say plainly what was tested where ("in Chrome on the test machine", "on your PC") and what is an expectation.
  Never present a guess as a result.
- He decides priorities, tests on his PC, carries messages between leads, makes tags and releases, and approves.

## 2. Who does what

**One lead chat**, in the claude.ai project "ToolBox". It plans, writes task files and briefs, answers the owner,
keeps `TASKS.md` and the status note current, and reads the reports of finished tasks.

**The lead does not build or test.** Anything expected to take more than about 5 minutes of work goes to a worker
chat: features, fixes, tests, measurements. Planning, briefs and small edits to documents stay with the lead; lead
edits to documents may go to `main` directly. (The first version of the format was built by the planning chat
itself, before these rules.)

**Worker chats** take one task each. The owner starts them by hand. The lead gives the exact sentence to paste, with
where, which model and which effort, and with the permission to push in it, for example:

> **Claude Code on the web · Opus · effort High · repositories smholte/ToolBox and smholte/toolbox-format**
> Read CLAUDE.md and TASKS.md in github.com/smholte/ToolBox and do task 0001. You have my permission to push to main
> of smholte/ToolBox for the task list and your report.

A worker that has to stop for the owner pushes its branch first and says so in one line starting
**"WAITING FOR YOU:"**.

**Chats share nothing but GitHub.** Everything another chat needs must be in a repository: this file, `TASKS.md`,
the task file, the code. (Chats inside the claude.ai project also see its documents; do not rely on them for
anything a worker needs.)

**The status note** for the owner is `claude/toolbox-status.md` in the claude.ai project: where everything is, what
is waiting for whom, open decisions. The lead updates it after every finished task and every decision.

## 3. Repositories and lanes

ToolBox is two repositories. This one is **home**: it holds these rules, `TASKS.md` and all task files, whichever
repository a task changes.

| Repository | Holds | Lanes |
| --- | --- | --- |
| `smholte/ToolBox` – **home** | the rules, `TASKS.md`, `tasks/`; later the router (step B) and the window (step A) | Router · Window |
| `smholte/toolbox-format` | the format, its checker, reference code, the trial page | Format |

**One running task per lane.** Two chats never work in the same lane at the same time.

`smholte/toolbox-format` keeps a `CLAUDE.md` of its own with the rules that belong to it (its tests, its "things
learned"). A worker in that repository reads both.

## 4. Tasks

- A task is a file `tasks/NNNN-short-name.md` in this repository, made from `tasks/TEMPLATE.md`. Its header names
  **the repository it changes**. `TASKS.md` is the overview.
- Each task gets its own branch `task/NNNN-short-name` in the repository it changes.
- **The worker finishes the task completely:** all tests pass, also on GitHub; the report in the task file is
  filled in; then it merges into `main` and pushes. Exception: a task whose file says "lead review before merge" –
  then the worker stops at a pushed branch and the lead decides.
- `main` of every repository is always a tested, working version. A red run on `main` comes first: the chat that
  turned it red fixes it before anything else; a chat that finds `main` red at its start says so to the owner.
- A worker that starts a task sets it to "running" in `TASKS.md` and pushes that to `main` of this repository at
  once. When it finishes it moves the task to "Done" and sets the next task of its lane to "open – can start".
- A task is done when its "Done when" list is met, the tests pass (also on GitHub) and the **Report** in its task
  file is filled in (what changed, what was tested and where, what is left open).
- The lead reads every finished report and writes a follow-up task when something is off.

## 5. The neighbours

Tools that use the toolbox format. Each has its own project, its own lead and its own rules; ToolBox does not own
them.

| Neighbour | Repository | State |
| --- | --- | --- |
| House Planner | `smholte/house-planner` (public), `smholte/house-planner-dev` (private) | uses the format from `v0.1` |
| Fresing Render | `smholte/CAD-render-animation` | uses the format from `v0.1` (its task 0217) |
| Bolted-joint calculator | not made yet | a project and a repository of its own, made when its work starts |

- The ToolBox lead **never writes a task in a neighbour's repository**. It writes a **brief**, as a message in the
  **lead post**; their lead turns it into a task of their own.
- **The lead post** (`smholte/lead-post`, private; its `CLAUDE.md` has the rules) is how the leads write to each
  other. The ToolBox lead reads `toolbox/inbox.md` there at the start of a chat and whenever the owner says "check
  the post" – that one file, and only the messages it lists. A message it has dealt with moves from the inbox to
  `toolbox/closed.md`. After sending, it tells the owner in one line which lead has post, so he can nudge that
  chat. Worker chats never use the lead post.
- **Never attach or clone `smholte/house-planner-dev`.** It holds the owner's own house. Public samples only.

## 6. Changing the format

`smholte/toolbox-format` is a contract between projects, so it changes more carefully than code.

- Only by a task, on a branch. The same commit changes the text, the schemas, the samples, the checker, the
  reference code in both languages, their tests and the changelog (that repository's `CLAUDE.md` has the list).
- **The leads of the neighbours that use the format review** before a merge into `main`: such a task always says
  "lead review before merge". The owner carries each lead's OK.
- **The owner makes the tag** (GitHub → Releases → new release; the lead gives the steps and the commit). A tag is
  never moved. A chat can push branches but not tags.
- The apps pin a tag and copy its files. A fix that changes no rule (a crash in the checker, a clearer message) is
  a third number (`v0.1.1`); a change to a rule is a new version (`v0.2`), and until 1.0 a tool reads only its own.
- A rule must be one **every kind of tool can follow**: a web page, a Blender extension and a small program alike.

## 7. Rules for changes

- **Everything is public and made up.** No real house, machine, customer, path of a real PC or person. No file of
  the owner's or of his clients.
- New behaviour gets a test. A bug fix gets a test that failed before.
- What exists in two languages (JavaScript and Python) is compared case by case in a test; a change to one side
  changes the other in the same commit.
- **Independent review** by a chat that did not write it, before it is relied on: every format rule and its
  checker; all code that only runs on Windows.
- Claims about speed or size are measured, with the machine named.
- Licences: a repository says its licence before others copy from it. Nothing comes in under a licence that stops
  the owner's other apps from using it. (`toolbox-format` and this repository: MIT.)

## 8. Things learned the hard way

- A chat can push branches but not tags; the owner makes tags (18 Nov 2026).
- A page on GitHub Pages only exists after the owner has turned Pages on in the repository's settings; a chat cannot
  do that and should check that the address answers before sending the owner there (18 Nov 2026).
- Leads cannot reach each other's chats, and a chat only acts when the owner writes to it. The lead post carries
  the content; the owner still gives the nudge (18 Nov 2026).
- More, about the format itself: `toolbox-format/CLAUDE.md`, "Things learned".
