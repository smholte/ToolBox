; Fresing ToolBox – additions to electron-builder's Windows installer (task 0004). Windows only.
; Texts come from app/lang/en.json through texts.nsh, written by tools/installer-texts.js before each build.
!include "${BUILD_RESOURCES_DIR}\texts.nsh"

; The first screen says what Windows showed before it, and why (the installer is not signed).
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "${TOOLBOX_WELCOME_TITLE}"
  !define MUI_WELCOMEPAGE_TEXT "${TOOLBOX_WELCOME_TEXT}"
  !insertmacro MUI_PAGE_WELCOME
!macroend

; "Start with Windows" is on after a fresh install. The value's name is the one app/autostart.js uses. Once the app
; has run it has a settings file and alone owns the switch: a new installer run over it (an update by hand) leaves
; the user's choice alone. (electron-builder's ${isUpdated} is only set by electron-updater, which we do not use.)
!macro customInstall
  ${IfNot} ${FileExists} "$APPDATA\Fresing ToolBox\settings.json"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "nl.fresing.toolbox" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --autostart'
  ${EndIf}
!macroend

; Uninstall (not an update): remove the Run value and what Task Manager may have written about it, and the copy of
; the installer electron-builder keeps for updates (%LOCALAPPDATA%\fresing-toolbox-updater). The install folder,
; Start-menu entry, the uninstall entry and the app's own data folder are removed by electron-builder's uninstaller
; (deleteAppDataOnUninstall in package.json).
!macro customUnInstall
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "nl.fresing.toolbox"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "nl.fresing.toolbox"
    RMDir /r "$LOCALAPPDATA\fresing-toolbox-updater"
  ${endIf}
!macroend

; Always for the current user only: no "for all users" page, never administrator rights.
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend
