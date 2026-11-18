# 0001 – Independent review of toolbox format v0.1

**Who:** worker · **Status:** waiting – lead review of the branch · **Lane:** Format
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

- [x] A list of findings in the report, each as: what, how to reproduce, how bad (crash / wrong verdict / the two
      languages disagree / unclear text / missing check), fixed or proposed
- [x] Every fixed bug has a test that failed before; all tests pass, also on GitHub, on the branch
- [x] Nothing in `FORMAT.md`'s rules, the schemas or `types.json` is changed; proposals for them are in the report
- [x] The branch is pushed and **not merged**; the report says whether the fixes fit a `v0.1.1` (no rule changed)
- [x] Report below filled in, pushed to `main` of `smholte/ToolBox`

## Not in this task

Changing a rule of the format; anything in House Planner or Fresing Render (never attach `house-planner-dev`); the
router; making a tag.

---

## Report (filled in by the chat that did the task)

**Chat / date:** Claude Code on the web (Opus), 18 Nov 2026. I did not write any of the format, its checker or its
reference code; I read `FORMAT.md` first and wrote down what must be true before reading code or tests.

**In short:**

- **Fixed on the branch (not merged): 22 bugs** – 7 crashes of the checker or of a Python tool, 13 places where
  JavaScript and Python gave different answers, 2 smaller ones. Every fix has a test that failed before. Branch
  `task/0001-independent-review` in `smholte/toolbox-format`, one commit, 224 tests (was 179).
- **No rule changed.** `FORMAT.md`, the schemas and `types.json` are untouched. The fixes **fit a `v0.1.1`**. One
  verdict of the checker changed: a JSON text with an unpaired `\ud800` escape is now refused (3.4 says UTF-8; before,
  it passed the checker and then crashed the Python tool that copied it into its reply). Apps copy the new
  `tbf/` files or `web/toolbox-folder.js`; nothing changes in what they write.
- **The most important rule problems (for the lead, proposals below):**
  1. **"Jobs left from an earlier run" breaks "a tool may run as several copies"** (6.3). Reproduced on the trial
     page: a second stand-in tab, opened while the first bakes, marks the job `failed` ("closed while it worked on
     this"); the first tab then overwrites that final status with `working` and `done`.
  2. **One careless pattern in any manifest freezes every tool.** `head_matches` allows patterns that take minutes
     on a 64 KiB head: `[a-z]*x` takes 3.4 s in Python, `\w+\s*\w+x` more than 2 minutes, `(\w+\s?)+x` doubles its
     time with every 2 letters. A tool's own type with such a pattern hangs every tool that looks at a text file.
  3. **The file name rule allows names Linux and macOS cannot store** (120 characters can be 480 bytes; the limit
     there is 255 bytes), and misses names Windows keeps (`COM0`, `LPT0`, `COM¹`–`COM³`, `CONIN$`, `CONOUT$`,
     probably `con .txt`).
  4. **No limit on how deep JSON may nest**: Python 3.11 refuses ~1000 levels, Python 3.12 and Chrome read 3000.
     The two languages can only agree with a limit in the text.

### Findings

Columns: what · how to reproduce · how bad · fixed (F) or proposed (P). "Test" names the test that failed before
the fix (`R` = `tests/test_review.py`, `W` = `tests/test_web.py`, both on the branch).

**Crashes (all fixed)**

| # | What | How to reproduce | Bad | |
| --- | --- | --- | --- | --- |
| C1 | `RecursionError` in the checker and in `take()` | a job whose `options` nest 3000 deep (Python 3.12/3.13; CI runs 3.12) | crash | F – walk without recursion. R `test_deeply_nested_json_is_no_crash` |
| C2 | `ValueError` (Python's 4300-digit limit) | `"options": {"n": 1000…0}` with 5000 digits; also inside a house scene's `scene.json` – **every** Python tool that looks at that `.hpscene` crashes | crash | F – such a number is read as JavaScript reads it (`Infinity`). R `…thousands_of_digits…`, `…deep_or_has_a_huge_number…` |
| C3 | `RecursionError` while detecting a house scene | `scene.json` nested 3000 deep inside a `.hpscene` | crash | F (as C1) |
| C4 | `OverflowError` in the pattern checker | own type with `head_matches: "a{4294967295}"` | crash | F – refused in both languages ("count larger than 4294967294"). R/W |
| C5 | `OSError: File name too long` in `take()`; the checker aborted the whole folder with "cannot be read" | job naming a file of 110 CJK characters (fine on Windows, too long on Linux/macOS) | crash | F – `bad-job`, and the checker reports that one file. R |
| C6 | `UnicodeEncodeError` when the receiver sends its reply | job with `"title": "\ud800 house"` (valid JSON escape): Python takes it, then fails writing the title into the reply – after copying the result | crash | F – such text is refused when read (3.4: UTF-8), both languages. R, W |
| C7 | `FileNotFoundError` when two copies write `alive.json` at once | two native copies (they share one temp name `alive.json.tmp`); 3 threads × 300 writes crash at once | crash | F – a temp name of its own per write. R `test_two_copies_writing…` |

**JavaScript and Python disagreed (all fixed; each now compared in `W`, "review" tests)**

| # | What | Python said | JavaScript said |
| --- | --- | --- | --- |
| D1 | file name with an unpaired surrogate (`"\ud800.hpscene"`) | "not complete" for ever | read the file `�.hpscene` – **another file** |
| D2 | a key written twice in `scene.json` (`{"format":"x","format":"house-scene"}`) | not a house scene (`ext:hpscene`) | `hpscene` – a web sender labels it, a Python receiver refuses it |
| D3 | a byte-order mark before a name inside a zip (UTF-8 flag set) | the name keeps it | `TextDecoder` drops it – different type |
| D4 | zip64 field cut short at the very end of the zip's list (offset `0xFFFFFFFF`) | not a zip | read zeros past the end → `hpscene` |
| D5 | own type defined by two tools with keys in another order | the same type, used | a "clash", left out → `ext:w` |
| D6 | a pattern range at a class: `[\s-z]`, `[a-\d]`, `[\w-a]` | refused (Python cannot compile it) | allowed – a manifest valid for a page, broken for a program |
| D7 | `created` / `updated` that do not exist (`2026-02-30`) or use Arabic digits | taken / believed (`\d` in the schema takes Arabic digits; `take()` checked no date) | refused |
| D8 | a job field named `constructor` or `toString` | refused (unknown field) | **accepted** (`required[k] \|\| optional[k]` finds them on every object) |
| D9 | a folder where a job's file should be | `bad-job` | "not complete" for ever |
| D10 | `job.json` another program holds open right now | `bad-job` – a final `failed` for a good job | the same (section 2 says: try again) – now both "not complete" |
| D11 | a key written twice in a `job.json` | `bad-job` | taken (cannot notice). Now both take it (the last counts); the checker still refuses it (3.4 allows a reader either) |
| D12 | `send()` with two files `house.hpscene` / `HOUSE.hpscene` | wrote the job (on Windows the second overwrites the first) | refused |
| D13 | a title longer than 120 characters given to `send()` | wrote an invalid `job.json` | shortened to 120 |

**Smaller, fixed:** `clean()` deleted any folder in an inbox older than 30 days, also ones that are not jobs (7.4
allows job folders only). `is_link()` did not see junctions on Python 3.11 – the Python in Blender – because
`os.path.isjunction` is new in 3.12; it now uses the reparse tag (**untested on Windows**, see below). One regression
of my own (a version written in Arabic digits slipped through) was found by re-running my comparison and is pinned.

**Rule problems and unclear text (proposed, nothing changed)**

| # | What | How bad | Proposal |
| --- | --- | --- | --- |
| P1 | 6.3 "jobs left from an earlier run" vs "several copies" (2, 6.3): a starting copy cannot tell a job another running copy works on from a left-over one, and a final status then changes again. Reproduced in the trial (above); the Python stand-in and `unfinished()` do the same | wrong rule | Take up a `waiting`/`working` job only when its status has not been updated for 5 minutes (as 6.4 already says for senders); a tool that keeps a job writes its status again at least every 2 minutes when it is free to. Never write over a final status (re-read just before writing). |
| P2 | `head_matches` patterns can backtrack for minutes (numbers above); one manifest in the folder stalls every tool, the router of step B too | wrong rule (safety) | For 0.2: own types may not use `head_matches` (only the built-in list, reviewed here); or allow counts only on a single character, set or `\s\d\w`, never on a group, and at most two unbounded counts per pattern. |
| P3 | 3.3: 120 characters ≠ "a name every system takes": Linux/macOS hold 255 **bytes** | wrong rule | "at most 120 characters and at most 255 bytes in UTF-8" (or 240). |
| P4 | 3.3: Windows also keeps `COM0`, `LPT0`, `COM¹`–`COM³`, `LPT¹`–`LPT³`, `CONIN$`, `CONOUT$`; and a space before the extension (`con .txt`) probably still means the device | missing check | Add them; test on the owner's PC first (W1). |
| P5 | 3.3 "the same name when capitals are ignored": `lower()` differs from how Windows compares (`ſ`/`s`, `µ`/`μ`, `ı`/`I` are one file on NTFS, two for the rule); macOS also joins `é` written two ways (NFC/NFD) | unclear text | Compare with `upper()` (catches the NTFS cases), or allow only names whose letters are ASCII. Say whether names must be NFC. |
| P6 | Full path on Windows: `C:\Users\<name>\Toolbox\tools\<80>\inbox\<64>\<120>` is ~300 characters; programs without long-path support fail above 260 | possibly wrong rule | Lower the maxima (e.g. tool id 60, job id 32, name 80) or say "keep paths under 260". Test on the owner's PC (W4). |
| P7 | 3.4 has no nesting limit; Python 3.11 refuses ~1000 levels, 3.12 and Chrome read 3000+ | languages disagree | "at most 64 levels deep", in both checkers. |
| P8 | Schema: `size` has no maximum; JavaScript cannot count past 2^53−1 (both readers now say `bad-job`) | languages disagree in the schema | `"maximum": 9007199254740991`. |
| P9 | Python warns that `[[`, `--`, `&&`, `\|\|`, `~~` inside a set will change meaning (`FutureWarning`) | future disagreement | Refuse those inside a set. |
| P10 | 3.4 "Each starts with `format`": is key order required? Nobody checks it | unclear text | Say "has", or let the checker warn. |
| P11 | 3.4: are C1 control characters (U+0080–U+009F), U+2028 allowed? Code allows them | unclear text | Say so. |
| P12 | 3.4 times: "thousandths MAY follow" – the code takes 1 to 3 digits (`.5`) | unclear text | "one to three digits". |
| P13 | Schemas hold limits the text does not name: files ≤ 100, actions ≤ 50, types ≤ 50, accepts ≤ 100, `app_version` ≤ 40, `description`/`homepage`/`url` ≤ 300, `label` ≤ 60, `start.program` ≤ 400, `args` ≤ 40 × 400. FORMAT.md says a difference is a bug | unclear text | List them in sections 4 and 6.1. |
| P14 | 5.2 "at most 4 deep": the code allows 3 of all/any/not plus the rule at the bottom | unclear text | Say it that way, with an example. |
| P15 | 5.2 zip: "bytes in front of the zip shift every offset" – both codes ignore the shift for zip64 (both say "not a zip"); "its zip64 form when the record says so" – which fields; names without the UTF-8 flag are read as Latin-1, the zip standard says CP437 (a name with `é` from Windows will not match) | unclear text | Write the steps exactly as the code does them; let rules name ASCII files only. |
| P16 | 5.2 `starts_with`: "spaces, tabs and line breaks" = exactly 0x20, 0x09, 0x0D, 0x0A (not form feed) | unclear text | Say the bytes. |
| P17 | 5.3: a file with a non-ASCII or 17+ character extension gets a type (`ext:é`) that `job.json` may not hold – it can never be sent | unclear text | Say that such files cannot be sent, or map them to `ext:`. |
| P18 | 6.2: may a sender make the receiver's `inbox/` when it is missing (both codes do; section 2 lists only job folders)? Must a sender check `handover`? | unclear text | Say yes / say no. |
| P19 | 6.3: which failure gets which `code` (the codes now agree, but only because both codes chose the same) | unclear text | A small table: name/size/missing → `bad-job`, type → `wrong-type`, … |
| P20 | 6.3 "a file still short MAY get up to a minute": no reference code ends such a job; it waits for ever | missing in code | Add a helper, or drop the sentence. |
| P21 | 7.3: a job cancelled before it is taken – the trial stand-in takes it, writes `working`, then `cancelled` a second later | unclear text | 6.3: a job with `cancel.json` and no status gets `cancelled` at once. |
| P22 | 6.4: "only the copy that wrote the newest" `alive.json` deletes it – a copy cannot know that; `remove_alive()` always deletes | unclear text | Drop the delete for several copies, or add a copy id to `alive.json`. |
| P23 | 7.1: must a `failed` status have a `code`? May `fraction` appear with other states? | unclear text | Say so; the checker warns. |
| P24 | 7.2: what when the reply cannot be sent because the sender lacks the `return` action or does not accept the type (both codes write `done` with a text) | unclear text | Write down what the code does. |
| P25 | 7.4 "older than 30 days" – by the folder's date or `created`? A page cannot read a folder's date | rule a page cannot follow | "by `created`; a folder without `job.json` by its newest file". |
| P26 | 2 vs 9: when a web tool writes its manifest ("at every start" vs "when picked and when its version changes") | unclear text | One sentence for both. |
| P27 | Checker: an unknown folder in `tools/` or an inbox is an ERROR, while 2 says a reader MUST ignore unknown entries | checker vs text | Make it a WARNING (left as is: the author's tests want an error). |
| P28 | 6.3 and the checker: the checker refuses a job whose `reply_to.tool` is not `from` or that has both `reply_to` and `return`; `take()` in both languages takes it (6.3 does not ask for it) | checker vs reader | Add both to 6.3's list, or make them warnings. |
| P29 | The checker does not check: that `icon` is a PNG or SVG; that `failed` has a `code`; key order (P10). All MUSTs about behaviour (`TOOLBOX_HOME`, a page never makes the folder, never change another tool's files, job ids are new, `job.json` appears whole) cannot be checked from files | missing check | Icon and code as warnings. |

**Trial page (Chrome, private file system `?opfs=1`, my own click sequences):** round trip with two sender tabs –
fine (one tab takes the bake; the other stays quiet). Reload of the sender mid-job – the page forgets it showed the
job ("Nothing sent yet.") but takes the bake when it arrives and says so in the report – fine. Reload of the
stand-in mid-bake – the new stand-in ends the job as left over; correct under the current rule. **Second stand-in
tab while the first bakes – P1.** Cancel before the stand-in watches – P21. Cancel after done – ignored, correct.
No page errors in any of them.

**What changed:** `smholte/toolbox-format`, branch `task/0001-independent-review` (not merged): `tbf/names.py`,
`tbf/check.py`, `tbf/detect.py`, `tbf/folder.py`, `web/toolbox-folder.js`; new `tests/test_review.py` (29 tests), 16
new "review" tests in `tests/test_web.py`; `CHANGELOG.md` (0.1.1, not tagged); `CLAUDE.md` (second line as asked,
and a "things learned" entry). `FORMAT.md`, `schemas/`, `types.json`, the samples and the trial page: unchanged.

**Tested and measured** (name the machine, the browser, the version):

- Cloud Linux container (4 × Intel Xeon 2.30 GHz): all 224 tests pass with Python 3.13.18 and Chromium
  157.0.8103.78 (Playwright 1.63). The Python-only tests (`test_review`, `test_check`, `test_folder`, 177) also pass
  with Python 3.11.18 and 3.12.3. Samples up to date, `check.py samples/Toolbox types.json` OK. **GitHub: run 6 on the branch green, 224 passed, Chrome tests included** (Python 3.12).
- Each fix was checked to fail before: the 29 Python tests against the old `tbf/` (one, the pair of surrogates that is fine, is a guard), the 16 Chrome tests against the
  old `web/toolbox-folder.js` (and old `tbf/`).
- My own comparison besides the tests: ~45 hostile jobs, ~10 status files, ~45 zips and odd files, ~50 patterns,
  ~25 file names, run through both languages; after the fixes only system-dependent cases differ (a 230-byte name:
  Linux refuses it, Chrome's private file system does not).
- The pattern timings (P2) are Python 3.13 on the same machine.

**Only on the owner's PC (Windows) – expectations, not results:**

- W1: Can Windows make a file named `con .txt`, `COM¹.txt`, `COM0.txt`, `CONIN$`? I expect `con .txt` and `COM¹`
  to fail or to open the device (P4).
- W2: A junction in an inbox under Python 3.11: `pending()` and `clean()` must skip it (my fix reads the reparse
  tag; I could only test it with a stand-in for Windows).
- W3: The Python stand-in replaces `status.json` every second while the trial page reads it every second. Windows
  refuses a replace while the file is open; the code tries 5 × 50 ms and then raises – the stand-in has no catch for
  that and would stop. I expect it to be rare, but a 40-second bake is the test.
- W4: A path above 260 characters (P6): long tool id + job id + 120-character name, written by Chrome and by Python.
- W5: `ſ.txt` and `s.txt` in one folder on NTFS – I expect Windows to call them one file (P5).

**Open points / follow-up tasks:**

1. **Lead: decide on P1–P8** (P1 and P2 before Fresing Render relies on several copies or own types). They change
   rules → a 0.2 task with the leads' review. P9–P29 can go in the same task or a text-only one.
2. **Lead review of the branch, then merge and tag `v0.1.1`** (the owner makes the tag); tell the leads of House
   Planner and Fresing Render to copy the new `tbf/detect.py` (C2, C3, D2–D4 hit them directly) and
   `web/toolbox-folder.js`.
3. Owner: W1–W5 on the PC (a short task with click-by-click steps; W3 needs Python on the PC).
4. Not done: Python reads the whole compressed entry into memory before checking it (a hostile zip with a huge
   `scene.json` entry can use much memory; JavaScript streams). Same answer in both, so left; a small follow-up.
