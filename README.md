# ToolBox

Make tools work as one set: a file made in one tool arrives in the next without Save and Open dialogs – for the
owner's own tools, any website and any program on the PC. Every tool still works on its own.

This repository is the **home** of the project: the rules, the task list and the task files. Later it also holds
the apps of the next steps.

| Step | What | Where | State |
| --- | --- | --- | --- |
| D | The format only, no app: tools find each other in a folder and hand files over as jobs | [`smholte/toolbox-format`](https://github.com/smholte/toolbox-format) | `v0.1` tagged, the first two tools are being connected |
| B | A background router: drop a file, pick a tool, routes, "Open with" | here | 0.2: tray icon, drop window, installer; the Toolbox folder and a file's type |
| A | The full window: web tools shown inside, a company's logo, colours and tool set | here | not started |

- **CLAUDE.md** – how the work is organised (read first)
- **TASKS.md** – open and finished tasks; one file per task in `tasks/`

Tools that use the format are projects of their own: House Planner, Fresing Render, and later a bolted-joint
calculator.

The plan for step B: [`docs/step-b-router.md`](docs/step-b-router.md).

## Install Fresing ToolBox (Windows)

Version 0.2: an icon next to the clock and a drop window. Drop a file on it (or click it to choose one): it shows the
file's name, size and type – found by its content, not its name – and which tools in the Toolbox folder take it.
Handing files to tools comes in the next versions.

1. Open **github.com/smholte/ToolBox** → **Releases** (right-hand side) → the newest release → under **Assets**
   click **Fresing-ToolBox-Setup-0.2.0.exe**. Your browser downloads it.
2. Open the downloaded file. Windows shows a blue box **"Windows protected your PC"**. This is because the installer
   is **not signed yet**: Windows does not know Fresing as a publisher and warns about every unsigned program from
   the internet. Click **More info**, check that it says *Fresing-ToolBox-Setup-…exe*, then click **Run anyway**.
   (Your browser may also ask whether to keep the file: choose **Keep**.)
3. The installer's first screen repeats why that warning came. Click **Next**, then **Install**. It installs **for
   you only** and asks for no administrator rights. At the end leave **Run Fresing ToolBox** ticked and click
   **Finish**.
4. **Where it is:** a small dark square with a white **Ft** next to the clock, bottom right. If you do not see it,
   click the small arrow **^** next to the clock – Windows hides new icons there at first. To keep it visible, drag
   it from there onto the taskbar. The drop window also opens once by itself after the install.
5. **The menu:** right-click the icon. *Open drop window* · *Start with Windows* (ticked = it starts when you log
   in; click to switch) · *Language* · *About Fresing ToolBox* (shows the version) · *Quit*. A left click opens the
   drop window. Drop any file on it: it shows the file's name, size, type and the tools that take it; nothing
   happens to the file.
6. **The Toolbox folder:** at its first start Fresing ToolBox makes the folder `C:\Users\<you>\Toolbox` where tools
   find each other, and puts its own small folder `tools\nl.fresing.toolbox` in it. If that folder is already there
   from an older version of the toolbox format, ToolBox leaves it alone and the drop window says so in one line.
7. **Uninstall:** Windows **Settings** → **Apps** → **Installed apps** → **Fresing ToolBox** → **⋯** → **Uninstall**.
   It removes the app, its Start-menu entry, its start-with-Windows entry and its settings. The Toolbox folder stays
   (other tools use it).

What it installs: the app in `C:\Users\<you>\AppData\Local\Programs\Fresing ToolBox`, a Start-menu entry
"Fresing ToolBox", a start-with-Windows entry, its settings in `…\AppData\Roaming\Fresing ToolBox`, and the Toolbox
folder `C:\Users\<you>\Toolbox` when it is not there yet.

## Licence

MIT, © 2026 Fresing – see [`LICENSE`](LICENSE).
