# 0005 – The folder: adapter for the format's code, the router's own manifest, the list of tools

**Who:** worker · **Status:** waiting for `v0.2` (everything else done, branch pushed) · **Lane:** Router
**Repository it changes:** `smholte/ToolBox` · **Branch:** `task/0005-router-folder`
**Started by:** lead, 21 Nov 2026 · **Model:** Opus · effort High · **Environment:** add `smholte/toolbox-format`
(read only) · **Merge:** worker merges after a green GitHub run – **but only once the owner has tagged `v0.2`**
(see step 1)

## Goal

The router knows the Toolbox folder: it makes the folder when it is missing, is a tool in it itself, and knows the
other tools. A file dropped on it shows its type, found by content, and which tools take that type. Nothing is
handed over yet (0006, 0007), but jobs written through the router's folder code already pass the format's checker.

## Background

- The plan: `docs/step-b-router.md` – "How it is built" ("The format's own code, not a third copy") and the 0005
  line in its task table. Task 0004's report: what the app is today.
- The format: `smholte/toolbox-format`, `FORMAT.md`. **Version 0.2** is on branch `task/0011-format-0.2` (task
  0011), reviewed by the lead and going to the neighbour leads; the owner tags `v0.2` after their OK. Until 1.0 a
  tool reads only its own version, so the router is built on 0.2, not on `v0.1.1`.
- `web/toolbox-folder.js` there does everything with a folder (types by content, manifests, jobs, status, replies,
  clean-up) through the browser's folder handles (File System Access API). The router gives it the real folder
  through **a thin adapter** in Node: handles that behave like the browser's, over `fs`. The format's code itself is
  copied **unchanged**.
- Windows lessons the adapter must respect (format `CLAUDE.md`, "Things learned", and Fresing Render's task 0245):
  a reader that holds a file open blocks replacing it for as long as it holds it (up to 0.5 s measured); a write is
  whole or not at all (beside, then moved over); junctions and links are never followed.
- The router's id: `nl.fresing.toolbox`, name "Fresing ToolBox". The folder: `%USERPROFILE%\Toolbox`.

## The work

1. **Copy the format's web code** into `app/vendor/toolbox-format/` from the newest commit of
   `task/0011-format-0.2`, with its licence and a `SOURCE.md` naming the commit. Unchanged. When the owner has
   tagged `v0.2`: copy again from the tag, run the tests, and only then merge. If the tag is not there when the
   rest is done, push the branch and stop with "WAITING FOR YOU:".
2. **The adapter** `app/folder.js`: directory and file handles over `fs` with exactly the methods
   `toolbox-folder.js` uses (list them in the report), including `createWritable()` with "whole or not at all", a
   refused replace on Windows tried again (not an error that stops the app), and links/junctions reported so the
   format's code skips them.
3. **The folder at start:** made when missing (marked 0.2, as a native tool may); the router's manifest written;
   `alive.json` as the format asks of a native tool; a folder of another version is left alone and the drop window
   says so in one line. A test hook `FRESING_TOOLBOX_FOLDER` (does nothing unless set) points the tests elsewhere.
4. **The router's manifest:** a tool in the folder that takes back results (so 0007's replies can come to it).
   Keep it to what 0.2 allows; say in the report what it accepts and why.
5. **The tools:** read every manifest in the folder, refresh when the folder changes (or on each open of the drop
   window – the simpler, said in the report).
6. **The drop window:** under the file's name and size, its type by content (the format's detection) and "Tools
   that take it: …", or a plain line when none does. All texts in `en.json` first.
7. **Tests** (`tests/`, both on Linux and on GitHub's Windows job):
   - the adapter against the format's samples (copied into `tests/data/`): every sample read as the format's own
     tests read it;
   - jobs and statuses written through the adapter, checked by the format's Python checker (`check.py`);
   - the type and tool list in the drop window for at least a STEP file, a house scene and an unknown file;
   - on Windows: a file held open while the router writes over it; a junction in the folder is not followed.
8. **Independent review** of the adapter by a helper that did not write it (it is the router's Windows-facing file
   code), findings fixed or listed.
9. **Steps for the owner**, click by click: install from a new draft release, drop the same three kinds of file,
   what he should see, and where the Toolbox folder is.
10. `CLAUDE.md` section 3 (layout) and section 8 (tests) brought up to date.

## Done when

- [ ] The format's web code is copied unchanged from tag `v0.2`, with licence and source
- [x] The folder is made when missing; the router's manifest and `alive.json` are there and pass the checker
- [x] A dropped file shows its type and the tools that take it
- [x] The format's samples are read and every job the router writes passes the format's checker (plan, 0005)
- [ ] Tests added; all tests pass, also on GitHub (Linux and Windows)
- [x] The adapter reviewed by a helper that did not write it
- [x] Steps for the owner to test on his PC, click by click
- [x] Report below filled in

## Not in this task

The popup, routes, "Always use" (0006); handing files over, starting tools, the job list, notifications (0007);
"Open with" / "Send to", updates, the owner's 0004 findings – tray-icon hint, uninstaller closing the app,
installer pictures (0008). Any change to `smholte/toolbox-format`: a problem found there goes in the report, for
the lead.

---

## Report (filled in by the chat that did the task)

**Chat / date:** worker chat (Claude Code on the web), 21 Nov 2026. Branch `task/0005-router-folder`.
**State: WAITING FOR `v0.2`.** Everything is done and green on GitHub (Linux and Windows), built on the newest
commit of `task/0011-format-0.2` (`8cd350b`). Not merged: the owner has not tagged `v0.2` yet. When he has, a chat
says "continue task 0005": copy again from the tag (`node tools/copy-format.js <checkout at v0.2> v0.2`), run the
tests, merge into `main`, start the release workflow, and the owner tests (steps below).

**What changed:**

- `app/vendor/toolbox-format/` – the format's `toolbox-folder.js` **unchanged**, its `LICENSE`, `SOURCE.md` (commit
  `8cd350b`). `tools/copy-format.js` makes this copy, and the copies of the samples (`tests/data/samples/`) and of
  the Python checker (`tests/format-checker/`) the tests use; a test checks all three name the same commit.
  The app runs the file as it is, in a holder object (nothing on the global object).
- `app/folder.js` – **the adapter**. The methods `toolbox-folder.js` uses, and only those:
  - folder handle: `kind`, `name`, `getDirectoryHandle(name, {create})`, `getFileHandle(name, {create})`,
    `entries()`, `removeEntry(name, {recursive})`
  - file handle: `kind`, `name`, `getFile()`, `createWritable()`
  - file: `name`, `size`, `lastModified`, `type`, `slice()`, `arrayBuffer()`, `stream()` (`text()` as well)
  - writable: `write(data)` (text, bytes, a Blob streamed), `close()`, `abort()`

  Errors carry the browser's names, which the format's code decides by. Writes go beside the file and are moved over
  it at `close()` (whole or not at all; no empty file appears before); a refused move is tried 5 × 20 ms, then
  `NoModificationAllowedError` with the old file whole and nothing left beside it – the format's code then tries
  again (a working status at the next update, a final one for 2 s). Links, junctions and drives mounted into a
  folder are listed as kind `link`, which the format's code skips; opened as a job's file they are "not a plain
  file"; they are never deleted nor deleted through. Files are read through Node's file-backed Blob, which holds no
  file open between reads.
- `app/toolbox.js` + `app/toolbox-manifest.json` – **the router's folder.** At start it finds the folder
  (`FRESING_TOOLBOX_FOLDER` for tests, else the format's `TOOLBOX_HOME`, else `%USERPROFILE%\Toolbox`), makes it when
  missing (only that last folder, never its parents) or marks it when it is empty, writes its manifest, `icon.png`
  and `alive.json`, then `alive.json` every 10 s, and deletes `alive.json` at Quit (it runs as one copy, 6.4). A
  folder of another version, a non-empty folder without `toolbox-folder.json`, a file or a `tools` that is a link
  are left alone; the drop window says so in one line. A write that is refused is done at the next tick; a folder,
  `tools/` or its own tool folder deleted while it runs is made again at the next tick. Never throws into the app.
- **The router's manifest:** `nl.fresing.toolbox`, "Fresing ToolBox", `native`, `start` = its own program (from a
  checkout also the app folder as `args`), an icon, `handover: ["inbox"]`, and **one action `take-result`** ("Take
  back a result") that **accepts all 15 built-in types**. Why: 0.2 lets the result of a job come back only as a reply
  to an action of the sender's manifest (7.2), so 0007's jobs will name `"return": "take-result"`; and 0.2 has no
  "any type", so the action lists every type the format knows. A tool's own type (with dots) cannot come back to
  the router; the tool then keeps the result and says so (7.2). No `sends` yet (0007).
- **The tools:** read fresh at **every drop** (the simpler choice; a few small manifests): a tool added a moment ago
  is offered at the next drop. The router itself is never offered.
- **The drop window** (420 × 340 now): under name and size, "Type: STEP model" (found by content, the format's
  `detectType`, with the tools' own types), a yellow note when content and name disagree, "Tools that take it:
  Fresing Render and House Planner" or "No tool in the Toolbox folder takes this type yet", and the folder line when
  the folder cannot be used. **Clicking the window opens a file chooser** – the same path as a drop, and the way the
  tests give it a real file. A file without a place on disk (dragged from a browser) gets a plain line. Texts in
  `en.json` first (13 new keys, `drop.hint`, `drop.note`, `about.detail` changed). `preload.js` takes the dropped
  file's path (`webUtils.getPathForFile`) from the same drop.
- App version **0.2.0**. `README.md` (install, the Toolbox folder), `CLAUDE.md` sections 3 and 8.
- CI: both jobs install `jsonschema` for the checker; Windows runs `tests/folder.test.js` too, and the install test
  checks that the installed app made `%USERPROFILE%\Toolbox` and that the format's checker passes it.

**Tested and measured:**

- Here (Linux container, Node 22.23, Electron 45.2.3 = Node 24.22, Python 3.13): `xvfb-run -a npm test` – 43 pass,
  2 skipped (Windows only); icons up to date.
- GitHub, `ubuntu-24.04` and `windows-2025` (Node 22, Python 3.12): all green at every push since the second
  commit, Windows including the installed app (see the run of the last commit).
- `tests/folder.test.js`: every sample file and ~190 renamed or damaged copies get exactly the type and note the
  format's Python gives (`check.py --type`); the sample folder read through the adapter as the format describes it
  (tools, statuses, the cancel, the reply taken); a round trip, a cancelled job, the router's own sent job and the
  result coming back to it – **the checker passes the folder after every step**, without a warning; whole writes;
  error names; links/junctions (junctions on Windows) never followed, never deleted through; the router's folder
  made, marked, left alone; a dropped STEP, house scene, unknown file, IFC named `.step`, zip named `.hpscene`.
- `tests/app.test.js` (Linux and, on Windows, against the installed app): the folder made at start and checked,
  `alive.json` gone after Quit; a STEP, a house scene, an unknown file and an IFC named `.step` chosen in the drop
  window show type, note and tools; a 0.1 folder left byte for byte alone with its one line.
- **Measured on GitHub's Windows Server 2025 (Node 22):** a file held open by another program (PowerShell, sharing
  Read, ReadWrite or **None**) is **still replaced and deleted** by Node – Node renames and deletes with NTFS's
  newer "POSIX" semantics. So a reader never blocks the router's writes there. The refusal path (which can still
  come: another drive, an older system) is tested by forcing it inside the process, on both systems.
- **Independent review** of the adapter by a helper chat that did not write it: 14 findings. Fixed: the router did
  not recover when `tools/` or its own folder was deleted (bug); a `tools/` link was taken as OK; a refused look
  during a write came out as a read error (a working status could then throw); a recursive delete could go into a
  folder swapped for a link meanwhile; job.json now goes first when a job folder is deleted; a drive mounted into
  a folder counts as a link (reasoned, not run – needs administrator rights); long paths for reads
  (`toNamespacedPath`); short writes; drives that cannot flush; crash leftovers (`.tb-*.tmp`) cleared at connect;
  `Tools` in any case; names Windows would change refused on Windows. Each fix has a test (forced where only
  Windows would show it). Listed, not changed: reads through a folder swapped for a link after it was looked at
  (accepted, FORMAT.md 10 – the same trust as the user), and the points for the format below.

**Open points / follow-up tasks:**

1. **Waiting for `v0.2`** (above). Then: copy from the tag, test, merge, release workflow, owner's test.
2. **For the Format lane (lead):** (a) a browser's `getFileHandle(name, {create: true})` makes an **empty
   `job.json` at once**; a native receiver that looks at that moment refuses the job as `bad-job`, while section 2
   says an empty file is "not there yet" – in `take()` of both reference codes an empty or half `job.json` is
   `bad-job`. A web sender could write `job.json` under another name and rename it (`move()`), or `take()` could
   treat an empty `job.json` as not complete. (b) `zipIndex`/`zipRead` turn a read error into "not a zip", so a file
   that cannot be read for a moment can give `wrong-type` for good instead of "not complete". (c) `open()` reports a
   `toolbox-folder.json` that cannot be read for a moment as "not the Toolbox folder". (d) FORMAT.md 2 says a native
   tool that finds another version writes the marker again with its own; this task said leave it alone, and the
   router does – the lead decides which stays. (e) "Things learned" could add: on NTFS, Node's writes and deletes are
   not refused by a reader (measured above); refusals come from Python and .NET writers. (f) 7.4 could say "delete
   `job.json` first" (the review's point 12).
3. **For 0007:** the router takes a job the web page's way (no exclusive create, no `.taking-up` lock), which is
   right only because it runs as one instance (`requestSingleInstanceLock`). Keep it one instance, or add the
   native way.
4. **For 0008:** uninstalling should remove the router's tool folder `Toolbox\tools\nl.fresing.toolbox` (FORMAT.md 2);
   the uninstaller does not yet. The install test checks only that the shared folder stays.
5. **The owner's PC has a 0.1 Toolbox folder** from the trial (TASKS.md): ToolBox 0.2.0 will leave it alone and say
   so – step 4 below shows what to do.
6. A file link in a job is tested on Linux only (Windows lets a program make a file link only in Developer Mode);
   junctions are tested on both.

**Steps for the owner** (after `v0.2` is tagged and this task is merged; the chat that merges starts the release):

1. Open **github.com/smholte/ToolBox** → **Releases** → the draft **"Fresing ToolBox 0.2.0"** → under **Assets**
   click **Fresing-ToolBox-Setup-0.2.0.exe**.
2. Open it → **"Windows protected your PC"** → **More info** → **Run anyway** → **Next** → **Install** → leave **Run
   Fresing ToolBox** ticked → **Finish**. It installs over 0.1.0; nothing to uninstall first.
3. The drop window opens. Right-click the **Ft** icon → **About Fresing ToolBox**: "Fresing ToolBox 0.2.0".
4. **If the drop window shows a yellow line** "The Toolbox folder C:\Users\<you>\Toolbox is of toolbox format 0.1 …"
   (from the trial): that is expected. Right-click the icon → **Quit**. In File Explorer go to `C:\Users\<you>`,
   rename the folder **Toolbox** to **Toolbox-0.1**. Start **Fresing ToolBox** from the Start menu: no yellow line.
5. **Where the folder is:** File Explorer → type `%USERPROFILE%\Toolbox` in the address bar → Enter. You should see
   `toolbox-folder.json` and `tools`; in `tools\nl.fresing.toolbox`: `toolbox.json`, `alive.json`, `icon.png`, `inbox`.
6. **Three files:** drop on the drop window (or click it and choose):
   - a **STEP file** of yours → "Type: STEP model" and "No tool in the Toolbox folder takes this type yet";
   - **a house scene**: download `sample-house.hpscene` from github.com/smholte/ToolBox → `tests` → `data` →
     `samples` → `files` → the file → **Download raw file** (the ⤓ button) → drop it → "Type: House Planner scene";
   - **any `.txt` file** → "Type: not one ToolBox knows (.txt)".
7. **Tools that take it:** on the same GitHub page go up to `samples` → `Toolbox` → `tools`. Instead of downloading
   folder by folder: GitHub → **Code** (green button) → **Download ZIP** → open the ZIP → `ToolBox-main\tests\data\
   samples\Toolbox\tools` → copy the two folders **nl.fresing.render** and **nl.fresing.house-planner** into
   `%USERPROFILE%\Toolbox\tools`. Drop the STEP file again: **"Tools that take it: Fresing Render"**; the house scene
   too. Then **delete those two folders again** (they are made-up samples; the real apps write their own).
8. Rename a `.txt` file to `test.step` and drop it: "Type: not one ToolBox knows (.step)" with the yellow note "Its
   name ends in .step, but its content is not STEP model". The content decides, not the name.
9. Right-click → **Quit**: `alive.json` in `tools\nl.fresing.toolbox` is gone.
