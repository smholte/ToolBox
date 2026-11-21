# 0005 – The folder: adapter for the format's code, the router's own manifest, the list of tools

**Who:** worker · **Status:** open – can start · **Lane:** Router
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
- [ ] The folder is made when missing; the router's manifest and `alive.json` are there and pass the checker
- [ ] A dropped file shows its type and the tools that take it
- [ ] The format's samples are read and every job the router writes passes the format's checker (plan, 0005)
- [ ] Tests added; all tests pass, also on GitHub (Linux and Windows)
- [ ] The adapter reviewed by a helper that did not write it
- [ ] Steps for the owner to test on his PC, click by click
- [ ] Report below filled in

## Not in this task

The popup, routes, "Always use" (0006); handing files over, starting tools, the job list, notifications (0007);
"Open with" / "Send to", updates, the owner's 0004 findings – tray-icon hint, uninstaller closing the app,
installer pictures (0008). Any change to `smholte/toolbox-format`: a problem found there goes in the report, for
the lead.

---

## Report (filled in by the chat that did the task)

**Chat / date:**

**What changed:**

**Tested and measured** (name the machine, the browser, the version):

**Open points / follow-up tasks:**
