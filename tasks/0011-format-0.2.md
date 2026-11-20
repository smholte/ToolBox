# 0011 – Format 0.2: the rule problems the review found

**Who:** worker · **Status:** branch pushed, waiting for lead review (20 Nov 2026) · **Lane:** Format
**Repository it changes:** `smholte/toolbox-format` · **Branch:** `task/0011-format-0.2`
**Started by:** lead, 19 Nov 2026 · **Model:** Opus · effort High · **Merge:** lead review before merge, then both neighbour leads review (CLAUDE.md section 6)

## Goal

Format 0.2 closes the rule problems the independent review found, so that several copies of a tool, tools'
own file types and long names cannot break anything – and the text says exactly what the code does.

## Background

Task 0001's report (`tasks/0001-independent-review-of-the-format.md`), table "Rule problems and unclear text", P1–P29;
P30–P32 come from the neighbours' first builds on `v0.1`. The lead's decisions (19 and 20 Nov 2026):

| # | Decision |
| --- | --- |
| P1 | Take up a left-over `waiting`/`working` job only when its status has not been updated for 5 minutes (as 6.4); a final status is never changed again (all readers check before writing). |
| P2 | **Own types may not use `head_matches`.** Only the built-in list may, and its patterns are reviewed here. Simplest and safe; widen later if a tool needs it. |
| P3 | A name: at most 120 characters **and** at most 255 bytes in UTF-8. |
| P4 | Add the names 0010 shows Windows keeps; refuse a space before the extension of a kept name. This also covers `CONIN$`, `CONOUT$`, `CLOCK$`, `COM¹`–`COM³` and `LPT¹`–`LPT³`, as far as 0010 shows Windows refuses or keeps them (added 20 Nov 2026, Fresing Render 0217). |
| P5 | Names must be NFC; "the same name" is compared with `upper()` after NFC. Adjust to 0010's findings. |
| P6 | Keep the whole path under 260 characters: tool id at most 60, job id at most 32, file name at most 80 – unless 0010 shows long paths work without settings. Check the samples and the apps' ids fit. |
| P7 | JSON at most 64 levels deep, in the text and both checkers. |
| P8 | `size` at most 9007199254740991 (schema and text). |
| P9–P29 | Text and checker fixes as the report proposes. Where the report offers a choice, take the simpler rule and say so in the changelog. P27: unknown entries are a WARNING. |

Added by the lead on 20 Nov 2026, from the neighbours' leads (lead post):

| # | Decision |
| --- | --- |
| P30 | Checker, section 7.4: a job whose status is final may have lost its files (7.4 lets them be cleaned up). Then the checker gives **no** "missing" error for them. (Fresing Render, task 0217.) |
| P31 | Sections 7.1 and 7.3: a job or reply that **the user declines** ends `cancelled`; `failed` is only for "could not". (House Planner, task 0042.) |
| P32 | Section 6.3: Web Locks only cover one origin. Copies of a tool on different origins (an offline file, an installed web app) rely on "only what I can place"; a copy writes its status at once when it takes a job. Say this in the text. (House Planner, task 0042.) |

Not a fault (no change): trailing spaces in names – 3.3 already refuses them.

**After 0010** (lead, 20 Nov 2026). 0010 ran on the owner's PC (Windows 11, PowerShell 5.1, .NET calls only): all 14
W1 names made real files, a 311-character path worked (but "long paths" is switched on there), and every W5 pair gave
two files. So .NET on a new Windows is more lenient than other programs may be; Python, Blender and browsers were not
tried. These replace the "as far as 0010 shows" parts above:

| # | Decision |
| --- | --- |
| P4 | Refusing device names is **a format rule, not a Windows fact.** Refuse a name when the part before its first dot, with trailing spaces removed, matched case-insensitively, is `CON`, `PRN`, `AUX`, `NUL`, `COM0`–`COM9`, `COM¹`–`COM³`, `LPT0`–`LPT9`, `LPT¹`–`LPT³`, `CONIN$`, `CONOUT$` or `CLOCK$`. That covers `con .txt`, `con.txt.txt` and `aux` alike. All 14 W1 names get a broken-copy test. |
| P5 | Stands as written. NTFS keeps `ſ`/`s`, `µ`/`μ`, `ı`/`I` and the two `é` as two files, but the format treats each pair as the same name (NFC, then `upper()`): stricter than Windows, so safe. Say in the text that this is on purpose, and test the four pairs in both languages. |
| P6 | Stands as written (limits 60 / 32 / 80, whole path under 260). Long paths worked on the owner's PC only because they are switched on; a PC with them off is untested. |

## The work

1. Each decision into `FORMAT.md`, the schemas, `types.json` if needed, the checker and the reference code in **both**
   languages, with a broken-copy test per new rule and a JavaScript/Python comparison where both judge it.
2. `VERSION` 0.2; samples remade; `CHANGELOG.md` says, per change, what an app has to do.
3. A short "What changed for tool authors" at the top of the changelog entry, for the leads' review.
4. Two small fixes found while merging v0.1.1 (20 Nov 2026):
   - `tests/test_web.py`, the trial test around line 433 ("a bake that answers a job this browser did not send is
     left alone"): it failed once on GitHub with `NotFoundError` from `DUMP` and passed on a re-run – it reads the
     page's folder while the page is still removing files. Make it wait for the page to finish, so it cannot fail
     by timing.
   - `CHANGELOG.md`: the 0.1.1 heading still says "not tagged yet"; make it "tag `v0.1.1` (20 Nov 2026)" – the owner
     made the tag that evening, on `cc0356c`.
5. Push the branch, **do not merge**. The ToolBox lead reviews, then sends it to the House Planner and Fresing Render
   leads through the lead post.

## Done when

- [ ] P1–P32 each done or, with a reason, left (in the report)
- [ ] All tests pass, also on GitHub; samples up to date
- [ ] Branch pushed, not merged; report filled in

## Not in this task

Router, apps, the trial page beyond what a rule change needs, making a tag.

---

## Report (filled in by the chat that did the task)

**Chat / date:** worker chat in Claude Code on the web, 20 Nov 2026. Branch `task/0011-format-0.2` of
`smholte/toolbox-format`, two commits (`a50e843`, `11770b8`), **pushed, not merged**.

**What changed:**

- **All of P1–P32 are done**; none left out. Each decision is in `FORMAT.md` (new section 14 lists P1–P32 with the
  section it changed), in the schemas, in `tbf/` and in `web/toolbox-folder.js` alike, with tests. `VERSION` and all
  samples are 0.2. `CHANGELOG.md` starts with a short **"What changed for tool authors"** (10 points, for the leads),
  then one line per P-number with what an app has to do and where the simpler choice was taken (P2, P10, P15, P17,
  P20, P22).
- Places where I went beyond the decision, and why:
  - **P5:** plain `upper()` cannot be used. Python 3.11–3.13 and Chrome give different capitals for about 55
    characters (Chrome knows newer Unicode). So "compared in capitals" means: characters below U+0590 (Latin, Greek,
    Cyrillic, Armenian) whose capital is also below U+0590 become that capital; others stay as written. It covers
    `ſ`/`s`, `µ`/`μ`, `ı`/`I`. It gives the same answer in both languages for every one of the 1.1 million
    characters (tested).
  - **P1:** a copy that holds a job must write its status every 2 minutes (else 5 minutes later another copy takes
    it up). The review had proposed this; without it a `waiting` job ("Bake now?") would be taken over. Taking up
    uses a short lock file `.taking-up` so that of several copies only one wins.
  - **P20:** a missing or short file is now `bad-job` at once (the simpler of "helper or drop the sentence").
  - **P25:** JavaScript had no `clean()`; it has one now, compared with Python.
- Item 4: the trial test that failed once on GitHub now waits for the page, stops the stand-in tab first and skips
  the browser's `.crswap` files. The 0.1.1 changelog heading says "tag `v0.1.1` (20 Nov 2026)".
- An **independent reviewer** (a separate agent that did not write the code) checked the branch. It found no case
  where the two languages disagree (about 250 000 random cases). It did find **4 real problems**, all fixed in the
  second commit, each with a test:
  1. A line break in a status text (an error message) made `status.json` unreadable, so a final status could be
     overwritten.
  2. A broken key in a job crashed Python's `refuse()` and `check.py`.
  3. My first take-up design could, in a very narrow timing, let two copies hold one job.
  4. That first design could also leave a stray file behind on Windows.

**Tested and measured** (name the machine, the browser, the version):

- Cloud Linux container: all **351 tests pass** with Python 3.13.18 and Chrome 153.0.8010.12 (Playwright 1.63).
  The 278 Python-only tests also pass with Python 3.11 and 3.12. Samples up to date; `check.py` OK.
- **GitHub: green on the last commit** (run 44824545300, 351 passed, Chrome tests included; the Windows script job
  green too).
- Take-up with 8 copies at once: exactly one winner in 1500 of 1500 rounds. The worst order of steps is forced in a
  test.
- The only patterns left (the built-in IFC/STEP one) take well under a second on hostile 64 KiB files.
- The formerly flaky trial test: passed 15 of 15 runs in a row in the container.
- **Not tested on Windows:** the lock file and the rewritten status while another program reads it. The Windows job
  on GitHub runs only the PowerShell script, not the tests. This is an expectation: `O_EXCL` and replace work on NTFS,
  and a failed replace is "try again".

**Open points / follow-up tasks:**

1. **Lead review of the branch, then the two neighbour leads** (CHANGELOG "What changed for tool authors"). Two
   questions are addressed to them there:
   - House Planner: a `scene.json` is now recognised only when it is at most 64 levels deep.
   - Fresing Render: a tool that may run as several copies no longer deletes `alive.json`.
2. **Upgrading is all-or-nothing until 1.0.** A 0.2 tool reads no 0.1 file. The owner's own Toolbox folder from the
   trial (task 0002) has a 0.1 marker: after the merge the trial page will say "version" until the folder is marked
   0.2. A native 0.2 tool does that by itself; a page may not. The owner deletes `toolbox-folder.json` there, or the
   whole trial folder, and lets the trial page set it up again.
3. Accepted limits, written down:
   - NFC differs between Python and Chrome only for 20 characters of four scripts new in Unicode 16.
   - Cleaning up by `created` trusts the sender's clock: a `created` far in the future is never cleaned, and one more
     than 30 days in the past is deleted at once. The format allows this; a later version could ignore such dates.
4. Suggested small task: run `pytest` (the Python part) on `windows-latest` in GitHub's workflow, so the folder code
   is tested on NTFS at every push.
