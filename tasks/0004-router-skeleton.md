# 0004 – The router's skeleton: tray app, drop window, installer, tests

**Who:** worker · **Status:** open – can start (its condition is met: Fresing Render's task 0217 was released in 0.2.173, 19 Nov 2026); the owner starts it · **Lane:** Router
**Repository it changes:** `smholte/ToolBox` · **Branch:** `task/0004-router-skeleton`
**Started by:** lead, 18 Nov 2026 · **Model:** Opus · effort High · **Environment:** add `smholte/Fresing` (read only) · **Merge:** worker merges after a green GitHub run

## Goal

The owner installs "Fresing ToolBox" on his PC and sees its icon next to the clock, with a small drop window that
opens from it. It does nothing with a file yet. Everything later tasks need is in place: the app's frame, the
installer, the tests on GitHub (also on Windows), the texts in a language file, the icon.

## Background

- The plan: `docs/step-b-router.md` – read it first, with its "Decided by the owner".
- Electron, plain JavaScript, no build step beyond packaging. Windows only for users; development and most tests
  on Linux.
- Fresing Render's installer (`smholte/CAD-render-animation`, `installer/`, public) installs per user without
  admin rights and updates from GitHub Releases. Read how it does it; do not copy its code without its lead's OK
  (it is GPL-3.0-or-later, this repository is MIT) – the same behaviour with Electron's own tools is the aim.
- **The icon (decided by the owner, 18 Nov 2026): "Ft"** – the rule for every Fresing app mark is F + the app's
  lowercase initial. The F (stem and green swoosh) comes unchanged from the master outlines. The **t is drawn new to
  the word mark's construction**: stems 35, horizontal strokes 30, outer radius 52, inner radius 16, x-height 171
  (master units), free stroke ends cut at 22.8° from vertical; drawn beside the master r so the weight matches. White
  letters, Fresing Green `#479B29` swoosh, on the rounded Deep Charcoal `#1A2027` square of the Fresing app icon (same
  square, corner radius and padding); readable at 16 px. The specification and the logo files are in
  **`smholte/Fresing`**, `brand/Fresing-Brand-Specification.md` §4.6–4.7 and `brand/logo/` – read them there (that
  repository must be in this task's environment, read only). Once the owner approves the t, its outline goes into the
  report for the Fresing lead (the ToolBox lead sends it on).

## The work

1. **Repository layout** for the app (`app/` for its code, `tests/`, `tools/`, `brand/`), written into `CLAUDE.md`
   section 3 as a short table.
2. **The app's frame:** starts, shows a tray icon with a menu (Open drop window · Start with Windows ✓ · Language ·
   About with the version · Quit), one instance only (a second start brings up the first), a small drop window that
   accepts a dropped file and for now only shows its name and size.
3. **Texts:** every text the user sees comes from `app/lang/en.json`; a language setting in the tray menu that lists
   the language files present; a test that no text is written straight into the code and that every key is used.
4. **Icon drafts for the owner to choose from:** "Ft" with three drafts of the t (all within the construction
   above, e.g. different crossbar length or top), as SVG and as a picture in the report. After his choice: the `.ico` (16 to 256 px), the tray icon (16,
   20, 24, 32 px, drawn on whole pixels), PNGs for the page. **Stop for the owner here** ("WAITING FOR YOU:") with
   the picture; go on with a placeholder so the rest is not blocked.
5. **The installer:** per user, no admin rights, into the user's own app folder, with a Start-menu entry and an
   uninstaller that removes only what it installed. "Start with Windows" is on after install and follows the tray
   switch. Not signed; the installer's first screen and the README say what Windows will show and why.
6. **Tests on GitHub at every push:** on Linux the app's own tests (the frame started without a screen); on Windows
   a run that installs the app, starts it, checks the tray process and the autostart entry, uninstalls it and
   checks nothing is left. About 5 minutes; say in the report how long it takes.
7. **A release run** on GitHub that builds the installer from `main` and attaches it to a draft release (the owner
   publishes it). Updates from Releases are task 0008, not here.
8. **Steps for the owner**, click by click: download, the Windows warning, install, where the icon is, the menu,
   uninstall.

## Done when

- [ ] The installed app shows its tray icon on GitHub's Windows machine (the test) and on the owner's PC (his steps)
- [ ] One instance only; the drop window shows a dropped file's name and size; Quit really quits
- [ ] Start with Windows can be switched off and stays off after a restart of the app
- [ ] All texts come from `en.json`; the two text tests pass
- [ ] The owner has chosen the icon; the chosen icon is in the app, the installer and `brand/`
- [ ] Install and uninstall leave nothing behind on GitHub's Windows machine
- [ ] Windows-only code reviewed by a helper or chat that did not write it
- [ ] `CLAUDE.md` section 3 (layout) and a new section on tests are current; report below filled in

## Not in this task

Anything with the Toolbox folder, file types, the popup, routes, jobs (0005–0007); "Open with" in Explorer and
updates (0008); signing; macOS and Linux installers; the window with web tools (step A).

---

## Report (filled in by the chat that did the task)

**Chat / date:**

**What changed:**

**Tested and measured** (name the machine, the browser, the version):

**Open points / follow-up tasks:**
