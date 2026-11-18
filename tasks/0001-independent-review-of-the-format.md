# 0001 – Independent review of toolbox format v0.1

**Who:** worker · **Status:** running · **Lane:** Format
**Repository it changes:** `smholte/toolbox-format` · **Branch:** `task/0001-independent-review`
**Started by:** lead, 18 Nov 2026 · **Model:** Opus · effort High · **Merge:** lead review before merge

## Goal

The owner knows whether the format's checker and its reference code can be relied on: a chat that did not write
them has tried to break them, and what it found is fixed or listed.

## Background

- `smholte/toolbox-format`, tag `v0.1`: the format text (`FORMAT.md`), the type list, the checker (`check.py`,
  `tbf/`), reference code for a native tool (`tbf/folder.py`) and for a web tool (`web/toolbox-folder.js`), the
  trial page (`trial/`), 179 tests. All of it was written by one chat in one evening, which also wrote the tests.
- `house-scene-format` learned this the hard way: an independent reviewer found six crashes of its checker and one
  wrong rule while all 43 of the author's tests passed.
- Fresing Render (task 0217) and House Planner copy `tbf/detect.py` and follow `web/toolbox-folder.js`. A fault
  there becomes a fault in both apps.
- **You must not have written any of it.** Read `FORMAT.md` first and form your own picture of what must be true
  before you read the code or its tests.

## The work

1. **Read `FORMAT.md` as a tool author would.** List every sentence that is unclear, that two readers could take
   differently, or that contradicts another section. List every MUST the checker does not check.
2. **Try to make the checker crash or pass something it must refuse:** broken and hostile Toolbox folders,
   manifests, jobs, status files; odd file names (Unicode, long, Windows-reserved, case games); links; very large
   and empty files; odd zips; JSON at its limits. A crash is a fault; a wrong verdict is a fault.
3. **Try to make the two languages disagree.** `tests/test_web.py` compares JavaScript and Python on several hundred
   cases chosen by the author. Choose your own: file types (also zip64, zips with comments, deflate edge cases,
   patterns in own types), names, times, patterns, rules, bad jobs and their codes. Every disagreement is a fault.
4. **Read the reference code against section 6 and 7 of the format**, step by step: sending (order of writing),
   taking a job, claiming it, jobs left from an earlier run, replies, cancelling, cleaning up, links, what happens
   when a write or a delete fails. On Windows-only behaviour you cannot run: say what you expect and why, and mark
   it for the owner's PC.
5. **Try the trial page** in Chrome with the browser's private file system (`?opfs=1`, as the tests do) with your
   own sequence of clicks, not the tests': two sender tabs, two stand-in tabs, reload in the middle of a job, cancel
   at every stage.
6. **Fix what is a plain bug** (a crash, a wrong verdict, a disagreement between the languages) on the branch, each
   with a test that failed before. **Do not change a rule of the format**: list such findings for the lead, with a
   proposal.
7. In `smholte/toolbox-format/CLAUDE.md`, add as its second line: "Project rules and tasks:
   `github.com/smholte/ToolBox` (`CLAUDE.md`, `TASKS.md`)."

## Done when

- [ ] A list of findings in the report, each as: what, how to reproduce, how bad (crash / wrong verdict / the two
      languages disagree / unclear text / missing check), fixed or proposed
- [ ] Every fixed bug has a test that failed before; all tests pass, also on GitHub, on the branch
- [ ] Nothing in `FORMAT.md`'s rules, the schemas or `types.json` is changed; proposals for them are in the report
- [ ] The branch is pushed and **not merged**; the report says whether the fixes fit a `v0.1.1` (no rule changed)
- [ ] Report below filled in, pushed to `main` of `smholte/ToolBox`

## Not in this task

Changing a rule of the format; anything in House Planner or Fresing Render (never attach `house-planner-dev`); the
router; making a tag.

---

## Report (filled in by the chat that did the task)

**Chat / date:**

**What changed:**

**Tested and measured** (name the machine, the browser, the version):

**Open points / follow-up tasks:**
