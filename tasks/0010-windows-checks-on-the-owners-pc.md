# 0010 – Windows checks on the owner's PC (file names, long paths)

**Who:** worker, then the owner · **Status:** waiting for the owner · **Lane:** Format
**Repository it changes:** `smholte/toolbox-format` · **Branch:** `task/0010-windows-checks`
**Started by:** lead, 19 Nov 2026 · **Model:** Sonnet · effort Medium · **Merge:** worker merges after a green GitHub run

## Goal

The owner runs one small script on his Windows PC, pastes its output back, and the format's rules for file names
and path lengths (task 0011) rest on what Windows really does, not on guesses.

## Background

Task 0001's report (`tasks/0001-independent-review-of-the-format.md`, "Only on the owner's PC") lists checks that
only Windows can answer. This task does W1, W4 and W5; W2 and W3 need Python on Windows and go to Fresing Render's
own Windows tests instead (the lead tells that lead).

- **W1** Which of these names can be made as a file in a normal folder, and does it really make a file (not open a
  device): `con .txt`, `COM0.txt`, `LPT0.txt`, `COM¹.txt`, `COM².txt`, `COM³.txt`, `LPT¹.txt`, `LPT².txt`,
  `LPT³.txt`, `CONIN$`, `CONOUT$`, `CLOCK$`, `con.txt.txt`, `aux`. (`CLOCK$` and the other superscript digits added
  20 Nov 2026, from Fresing Render's task 0217; task 0011's P4 uses all of them.)
- **W4** A path longer than 260 characters: make
  `%USERPROFILE%\Toolbox-check\tools\<80 characters>\inbox\<64 characters>\<120 characters>.txt`, write and read it,
  delete it. Also report whether "long paths" are switched on in Windows.
- **W5** In one folder: make `ſ.txt`, then `s.txt` – one file or two? The same for `µ.txt` / `μ.txt`, `ı.txt` /
  `I.txt`, and `é.txt` written as one character and as `e` + accent.

The owner is not a programmer. He may not have Python. **Use PowerShell** (built into Windows), one `.ps1` file.

## The work

1. `tools/windows-checks.ps1`: does W1, W4, W5 in a new folder `%USERPROFILE%\Toolbox-check`, prints one line per
   check (`W1 con .txt: made a file` / `refused: …`), deletes everything it made, and touches nothing else.
2. Steps for the owner, click by click, in the task report and in `README.md` under "Windows checks": download
   the file, how to run it once even though Windows blocks scripts by default (the exact command, with
   `-ExecutionPolicy Bypass` for this one run only), what to copy back.
3. Try the script on GitHub's Windows machine in the workflow (a separate job that only runs it and prints its
   output). Put that output in the report.
4. **Stop for the owner** ("WAITING FOR YOU:") with his steps. When he has pasted the output, write it into the
   report and into `CLAUDE.md` "Things learned" (one line per finding), then merge.

If the existing web test in `tests/test_web.py` around line 433 fails once with `NotFoundError`, re-run it: it is
a known timing fault (fixed in 0011), not caused by this task.

## Done when

- [ ] The script runs on GitHub's Windows machine and cleans up after itself
- [ ] The owner has run it; his output is in the report and in "Things learned"
- [ ] Report below filled in

## Not in this task

Changing any rule of the format (that is task 0011); Python on Windows (W2, W3).

---

## Report (filled in by the chat that did the task)

**Chat / date:** worker, Claude Code on the web, 20 Nov 2026 (first half; the second half follows the owner's output)

**What changed:** on branch `task/0010-windows-checks` of `smholte/toolbox-format` (not merged yet): `tools/windows-checks.ps1`
(W1, W4, W5; works only in `%USERPROFILE%\Toolbox-check`, deletes it, prints one line per check and copies the text to
the clipboard), a "Windows checks" section in `README.md`, and a second job `windows-checks` in the workflow.

**Tested and measured:** GitHub's Windows machine (Windows 10.0.26100, PowerShell 5.1), run 44815888755, both jobs green.
Its output – **not the owner's PC and not a rule yet**: W1 all 14 names made a real file (listed and read back);
W4 path of 317 characters written, read and deleted (but "LongPathsEnabled" was 1 there, so this says nothing about
the owner's PC); W5 all four pairs gave two files; clean-up done. Of note: even `aux` and `COM¹` made files – so the
owner's output decides, because the .NET calls the script uses may differ from what Edge, Blender or Python do.

**Steps for the owner** (also in `toolbox-format/README.md`, "Windows checks"):
1. Open https://github.com/smholte/toolbox-format/blob/task/0010-windows-checks/tools/windows-checks.ps1 , click the
   download arrow ("Download raw file", top right of the file), save it in `Downloads`.
2. Windows key, type `powershell`, click **Windows PowerShell** (not as administrator).
3. Paste this line, press Enter:
   `powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\windows-checks.ps1"`
4. You should see about 40 lines starting `W1`, `W4`, `W5` and last `Clean up: done`. The text is on your clipboard:
   paste it into the chat of this task.

**Open points / follow-up tasks:** owner's output → this report, `toolbox-format/CLAUDE.md` "Things learned", merge
(a worker continues "task 0010 from its branch"). W2/W3 go to Fresing Render's own Windows tests (the lead tells that lead).
