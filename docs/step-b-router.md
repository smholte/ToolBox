# Step B – the router: plan for its first version

Written by the lead, 18 Nov 2026 (task 0003). **The owner answered its questions the same evening; they are at the end.**

## What the owner gets

A small app that sits next to the clock. Drop any file on it – or right-click a file and choose "Open with
Toolbox" – and it asks which tool should open it, remembers the answer, and hands the file over. For tools that
follow the toolbox format the file arrives by itself and the result comes back; for any other program or website
it does what a double-click would do, but with your choice of tool.

## What the first version does

1. **Lives in the tray**, starts with Windows (can be switched off), no main window. A small drop window opens from
   the tray icon.
2. **Makes the Toolbox folder** when it is missing (`C:\Users\<name>\Toolbox`), as a native tool may, and is a tool
   in it itself (`nl.fresing.toolbox`), so results can come back to it.
3. **Knows the tools**: every tool with a manifest in the folder, plus the programs and websites the user adds.
4. **Takes a file** three ways: dropped on the drop window, "Open with" / "Send to" in Windows Explorer, or as an
   argument (for scripts).
5. **Recognises the file's type by its content**, with the format's own rules.
6. **Open with popup**: the tools that accept this type, the user's own routes, a tick box "Always use this for
   .step files", and **Add a route…** (a tool, a program on this PC, or a website). A type with a default route
   opens at once, with a small "Opened in … · change" note.
7. **Hands the file over**:
   - to a tool of the format: a job in its inbox. When the tool is closed, the router starts it (the first time it
     shows the exact command and asks);
   - to another program: starts it with the file;
   - to a website without a manifest: opens it in the browser and shows the file ready to drag in (a browser lets
     no one push a file into a page).
8. **Shows the jobs**: waiting, working with progress, done, failed, with a Windows notification when one
   finishes. A result that comes back to the router is offered the same way as a dropped file ("The bake is ready –
   open with House Planner / save as…").
9. **Updates itself** from GitHub Releases, as Fresing Render does.

## What it leaves out (step A and later)

The window with web tools inside it; a company's logo, colours and tool set; a routes file shared by an
organisation; installing tools from a catalogue; chains and converters; macOS and Linux.

## How it is built

- **Electron**, plain JavaScript. A tray app alone would also fit a smaller framework, but step A needs several
  web tools inside one window, which Electron does today; one app from B to A, no rewrite.
- **The format's own code, not a third copy.** `web/toolbox-folder.js` of `toolbox-format` already does everything
  with a folder (types, jobs, status, replies). The router gives it the real folder through a thin adapter, so the
  router judges every file and job exactly as the checker does. The adapter is tested against the format's
  samples and checker.
- **Routes and settings** are the router's own (in its app-data folder), not part of the shared format. Nothing in
  the format has to change for this version.
- **Installer** per user, no admin rights. Tests on GitHub, including a Windows machine that installs it, drops
  the format's sample files and checks the jobs it wrote with the format's checker.

## Tasks (lane Router, one after the other)

| No. | Title | Done when |
| --- | --- | --- |
| 0004 | Skeleton: tray app, drop window, Windows installer, tests on GitHub (Linux and Windows) | the installed app shows its tray icon on GitHub's Windows machine and on the owner's PC |
| 0005 | The folder: adapter for `toolbox-folder.js`, the router's own manifest, the list of tools | the format's samples are read and every job the router writes passes the format's checker |
| 0006 | The popup and routes: type by content, Open with, Always use, Add a route (tool, program, website) | a dropped `.step` offers Fresing Render and Inventor and opens in the one picked |
| 0007 | Jobs: starting a closed tool, the job list, notifications, results that come back | a house scene dropped on the router is baked by the stand-in and the bake is offered back |
| 0008 | Windows: "Open with" and "Send to", start with Windows, updates from GitHub Releases | right-click → Open with Toolbox works on the owner's PC; an update installs itself |
| 0009 | Independent review of all Windows-only code, and the owner's test list click by click | the review's findings are fixed or listed; the owner has run the list |

## Decided by the owner (18 Nov 2026)

1. **Windows only** at first.
2. **Name: "Fresing ToolBox"**, for now. Its icon is made like Fresing Render's "Fr" mark, with **Ft** or **FT**:
   the owner picks from drafts (task 0004).
3. **Not signed at first.** The installer shows Windows' "Windows protected your PC" warning (More info → Run
   anyway); the download page says so. Fresing Render is not signed yet either. A signature, when it comes, is one
   for both apps (see below).
4. **Starts with Windows** by default, with a switch in the tray menu.
5. **A language setting from the start, English first.** Every text the user sees comes from one file per
   language; English is complete in every release, other languages are added to it.
6. **Start** task 0004 once Fresing Render's task 0217 is under way; the owner says when.

### Signing, when the time comes (looked up 18 Nov 2026)

A code-signing certificate names a publisher, not an app: one covers Fresing Render, Fresing ToolBox and
anything else Fresing publishes. Three ways, none of which removes the warning on day one – Windows trusts a new
publisher's files only after enough people have downloaded them:

| Way | Cost | Whose name Windows shows | Note |
| --- | --- | --- | --- |
| A certificate from a certificate seller | about 150–300 USD a year | Fresing | the key must live on a token or a signing service, which decides how GitHub can sign |
| Microsoft's Azure Artifact Signing | about 10 USD a month | Fresing | **not open to Fresing for now** (Fresing lead, 18 Nov 2026): organisations younger than three years are refused, and the regions have been narrowed; check Microsoft's current terms before deciding |
| SignPath Foundation | free for open-source projects | SignPath Foundation | each project applies; open-source licence required; conditions on who may release |

Sources: [Microsoft, code signing options](https://learn.microsoft.com/windows/apps/package-and-deploy/code-signing-options),
[SignPath Foundation, conditions](https://signpath.org/terms).
