# 0011 – Format 0.2: the rule problems the review found

**Who:** worker · **Status:** round 2 done 21 Nov 2026 (section "Round 2" at the end) – waiting for the lead's review, then both neighbour leads · **Lane:** Format
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

---

## Lead review (21 Nov 2026)

Read: the report, `CHANGELOG.md` "What changed for tool authors", `tbf/folder.py` (`write_json`, `write_status`,
`take_up`) and `tools/standin.py`, together with Fresing Render's Windows results of 21 Nov (their task 0245, run on
GitHub's Windows machine, Windows Server 2025 10.0.26100, Python 3.13.13 in Blender 5.2.3 and Python 3.11.9).

**Approved as done:** all of P1–P32, including the places that went beyond the decision: P5's capitals below U+0590
(same answer in both languages is what counts), P1's status every 2 minutes with the `.taking-up` lock, P20's
`bad-job` at once, P25's `clean()` in JavaScript. The accepted limits under open point 3 stay as written.

**Three changes before the branch goes to the neighbour leads** (same branch, then stop again for the lead):

1. **W3 – a refused status write must not stop a job.** Fresing Render measured on Windows: a reader that holds
   `status.json` open blocks the replace as long as it holds it – refusals up to **0.5 s**, so the 5 × 50 ms in
   `write_json` is too short. On this branch `write_status()` still raises after that, and `tools/standin.py`
   does not catch it: the stand-in stops mid-bake. Change:
   - a status that is **not final** (`waiting`, `working`): when the replace is refused, `write_status()` returns
     false ("not written now, write again at the next update") instead of raising;
   - a **final** status (`done`, `failed`, `cancelled`) keeps trying for up to 2 s (about 4× the longest refusal
     measured), then raises – the caller tries again at its next look;
   - the stand-in survives a refused write; `FORMAT.md` section 2 says the same in words (no number of tries in
     the rule); `CHANGELOG.md` gets the line for tool authors;
   - a test that holds `status.json` open (as a slow reader does) while the stand-in writes; on Linux, simulate the
     refusal. JavaScript: check whether `writeStatus()` can be refused the same way in a browser and keep both sides
     saying the same; if it cannot, say so in the report.
2. **Run `pytest` on `windows-latest`** in the workflow (your open point 4), so the lock file, the status rewrite
   and the W3 test above run on NTFS before 0.2 goes out. The report then says what ran there.
3. **Blender runs Python 3.13** (Blender 5.2.3), not 3.11: fix the text in `tbf/folder.py` (`is_link` docstring), the
   0.2 changelog line on junctions and the 0.1.1 changelog line that says "Python 3.11 (Blender)". The 3.11 path stays
   supported and tested.

Model and effort for this round: **Opus · Medium** (fixes along the existing pattern, but Windows behaviour in
format code). Report: add a short "Round 2" under the report above.

---

## Round 2 (21 Nov 2026)

**Chat:** worker chat in Claude Code on the web, Opus. Branch `task/0011-format-0.2` of `smholte/toolbox-format`, two
more commits (`e755110`, `8cd350b`), **pushed, not merged**.

**What changed – the three asked:**

1. **W3 – a refused status write never stops a job.** A refused `waiting`/`working` is not written now:
   `write_status()` returns false, the next update writes it. A final status keeps trying for 2 s, then raises; the
   caller writes it at its next look. `send_reply()` puts the reply's id on that error, so the result is never sent
   twice. The stand-in writes a refused final status again at its next looks (and no longer stops on a refused
   `alive.json` either). `FORMAT.md` section 2 says it in words, without a number of tries; section 14 has a row W3;
   `CHANGELOG.md` has point 11 for tool authors and a W3 line.
   **JavaScript:** yes, a browser can be refused the same way – in Chrome a write to `status.json` fails with
   `NoModificationAllowedError` while another writer holds the file (tested), and on Windows a program reading it
   blocks the browser's swap too (expected, not tried in a browser on Windows). So `writeStatus()` / `sendReply()`
   do the same as Python, and the trial page's stand-in tab writes a refused final status again.
2. **`pytest` on `windows-latest`** at every push, with Python 3.11 and 3.13, Chrome tests included. Its **first
   run found a real Windows-only crash**: Python's `claim()` on a job whose `status.json` is a folder (Windows says
   "permission denied", not "exists"). Fixed, with a test.
3. **Python 3.13 text:** the `is_link` docstring and the 0.1.1 changelog line now say Blender 5.2 runs 3.13 and that
   3.11 stays supported. The 0.2 changelog had no line on junctions; nothing to change there.

**Tested** (where):

- Cloud Linux container, Python 3.13 and Chrome: 359 passed.
- **GitHub, run 44910257435, all green:** Linux 359 passed; **Windows (`windows-latest`, NTFS) 359 passed with
  Python 3.11 and 359 with Python 3.13**, nothing skipped. That run covers on NTFS: the `.taking-up` lock and the
  take-up with 8 copies, the status rewrite, and the W3 test where a real reader holds `status.json` open for 0.5 s
  again and again while the stand-in bakes – that test requires Windows to refuse at least one write, and it did;
  the bake still ended `done` and the result was sent once.
- Also W3 simulated on every system: a refused `working` (false, old status whole, no stray file), a final status
  that waits out 0.5 s, one that raises after 2 s, `send_reply()` handing back the reply id, the stand-in carrying on
  through 1.5 s and 3.6 s of refusals.

**Open points:**

1. Lead review of round 2, then the two neighbour leads (CHANGELOG "What changed for tool authors", now 11 points).
2. Not tried: the browser on Windows against a program that holds `status.json` (only the Chrome-side refusal and
   the Python side on Windows were tested).
3. The earlier open points 2 and 3 above stay as written.

---

## Lead review of round 2 (21 Nov 2026)

Read: the round 2 report and the diff `11770b8..8cd350b` (`tbf/folder.py`, `web/toolbox-folder.js`, `tools/standin.py`,
`FORMAT.md` 2 and 14, `CHANGELOG.md`, the workflow). The lead could not open GitHub run 44910257435 from its chat;
the green result is the worker's report.

**Approved.** All three changes are done as asked, the same in both languages: a refused `waiting`/`working` returns
false, a final status tries 2 s and then raises with the reply's id on the error, the stand-in and the trial page
write it again; `pytest` runs on `windows-latest` with 3.11 and 3.13; the Python text is fixed. The Windows-only
`claim()` crash the new job found is fixed with a test.

One point for the tool authors, sent with the review request rather than as a round 3: from 0.2, false from a
non-final `write_status()` / `writeStatus()` means "not written now" – refused, **or** final already. A tool must not
take it as "the job has ended"; it reads the status when it needs to know.

**Next:** the branch goes to the House Planner and Fresing Render leads (lead post, 21 Nov). With both OKs: merge, the
owner tags `v0.2`, then 0005.

---

## Round 3 (lead, 21 Nov 2026) – from task 0005's findings

Task 0005 (the router's folder, built on this branch) found points for the format. One of them breaks the main use
case of 0.2 at random, so they go in **before the tag**. Same branch, same rules (both languages, tests, changelog).
**Opus · Medium.** Then stop again for the lead; add a short "Round 3" report below.

1. **An empty `job.json` is "not there yet", not `bad-job`** (0005 point 2a). In Chrome,
   `getFileHandle('job.json', {create: true})` puts an empty `job.json` on disk at once; `createWritable()` swaps the
   content in only at `close()`. A receiver that looks in that moment – Fresing Render, a native tool, receiving from
   House Planner, a web tool – refuses the job as `bad-job` today, in `take()` of both languages. Change:
   - `take()` / `take()` in JavaScript: a `job.json` of **0 bytes** is `not-complete` (Python: the same "try again at
     the next look" as a file that cannot be read right now). Only empty – a non-empty `job.json` that is not JSON
     stays `bad-job` (a swapping writer never shows half a file).
   - `pending()` / `unfinished()` and the 30-day clean-up keep working with a `job.json` that stays empty for ever
     (a sender that crashed): it is never taken, and cleaned up by its newest file's date as a missing one is.
   - `FORMAT.md` 6.2: correct the sentence that says a browser's `createWritable()` makes `job.json` appear whole – it
     appears empty first, then whole. 6.3 step 1: "No `job.json`, or an empty one: leave it alone." Also check the
     same for `status.json` and `cancel.json` written by a web tool (an empty `status.json` is already "not there
     yet" for its reader, section 2; an empty `cancel.json` counts as there – confirm both in a test).
   - A test in both languages that failed before: a receiver taking a job while `job.json` is empty, then again once
     it is written – the job is taken, not refused.
   - Do **not** make the web sender write under another name and `move()`: not every browser has `move()` on a local
     folder, and the receiver's rule covers every sender.
2. **A read error is never a verdict** (0005 points 2b, 2c). `zipIndex` / `zipRead` (and the Python twins, if they do
   the same) turn a read error into "not a zip", so a file another program holds for a moment can end `wrong-type`
   for good: a read error must come out as "cannot be read right now" (`not-complete`). And `open()` must report a
   `toolbox-folder.json` it cannot read right now as that, not as "not the Toolbox folder". A test for each that
   failed before.
3. **The marker of another version** (0005 point 2d – the lead's decision): section 2 says a native tool that finds
   `toolbox-folder.json` of another version writes it again with its own. With two native tools of different versions
   on one PC that flips the marker at every start. New rule: a native tool rewrites the marker **only when its version
   is older** than its own; a **newer** marker it leaves alone and says so to its user. Text in section 2, the
   reference code if it does this, a test, a changelog line. (The router follows this when 0005 is continued.)
4. **Texts only:** 7.4 "delete `job.json` first" when deleting a job folder (0005 point 2f, the review's point 12),
   and in `CLAUDE.md` "Things learned": on NTFS, Node's writes and deletes are not refused by a reader (POSIX
   semantics, measured in 0005 on Windows Server 2025); the refusals come from Python and .NET writers.

The changelog's "What changed for tool authors" gets one or two short new points (1 and 3 concern every tool).
