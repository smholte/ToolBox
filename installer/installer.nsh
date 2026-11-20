; Fresing ToolBox – additions to electron-builder's Windows installer (task 0004). Windows only.
; Texts come from app/lang/en.json through texts.nsh, written by tools/installer-texts.js before each build.
!include "${BUILD_RESOURCES_DIR}\texts.nsh"

; The first screen says what Windows showed before it, and why (the installer is not signed).
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "${TOOLBOX_WELCOME_TITLE}"
  !define MUI_WELCOMEPAGE_TEXT "${TOOLBOX_WELCOME_TEXT}"
  !insertmacro MUI_PAGE_WELCOME
!macroend

; "Start with Windows" is on after a fresh install. The value's name is the one app/autostart.js uses, and the app
; sets it to match its own switch at every start. An update leaves the user's choice alone.
!macro customInstall
  ${ifNot} ${isUpdated}
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "nl.fresing.toolbox" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --autostart'
  ${endIf}
!macroend

; Uninstall (not an update): remove the Run value and what Task Manager may have written about it. The install
; folder, Start-menu entry, the uninstall entry and the app's own data folder are removed by electron-builder's
; uninstaller (deleteAppDataOnUninstall in package.json).
!macro customUnInstall
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "nl.fresing.toolbox"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "nl.fresing.toolbox"
  ${endIf}
!macroend

; Always for the current user only: no "for all users" page, never administrator rights.
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend
