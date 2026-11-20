# Fresing ToolBox – the install test on GitHub's Windows machine (task 0004). Windows only.
# Installs the built installer without questions (/S), checks what it installed, starts the app as Windows would at
# login, starts it a second time, runs the app tests against the installed app, uninstalls it and checks that
# nothing is left behind. Ends with the number of failed checks as its exit code.
$ErrorActionPreference = 'Stop'
$started = Get-Date
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$setup = Get-ChildItem (Join-Path $root 'dist\Fresing-ToolBox-Setup-*.exe') | Select-Object -First 1
$installDir = Join-Path $env:LOCALAPPDATA 'Programs\fresing-toolbox'
$exe = Join-Path $installDir 'Fresing ToolBox.exe'
$uninstaller = Join-Path $installDir 'Uninstall Fresing ToolBox.exe'
$startMenuLink = Join-Path ([Environment]::GetFolderPath('Programs')) 'Fresing ToolBox.lnk'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$approvedKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run'
$runName = 'nl.fresing.toolbox'
$appData = Join-Path $env:APPDATA 'Fresing ToolBox'
$status = Join-Path $env:RUNNER_TEMP 'toolbox-status.json'
$script:failed = 0

function Check([bool]$ok, [string]$what) {
  if ($ok) { Write-Host "ok    $what" } else { Write-Host "FAIL  $what"; $script:failed++ }
}

function RegValue([string]$key, [string]$name) {
  $item = Get-ItemProperty -Path $key -Name $name -ErrorAction SilentlyContinue
  if ($item) { return $item.$name } else { return $null }
}

function UninstallEntries([string]$hive) {
  Get-ChildItem "$($hive):\Software\Microsoft\Windows\CurrentVersion\Uninstall" -ErrorAction SilentlyContinue |
    Where-Object { (Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue).DisplayName -like 'Fresing ToolBox*' }
}

function MainProcesses {
  # Electron runs helper processes under the same name; the app itself is the one without --type=
  @(Get-CimInstance Win32_Process -Filter "Name = 'Fresing ToolBox.exe'" |
    Where-Object { $_.CommandLine -notmatch '--type=' })
}

# Everything an install could leave: folders, shortcuts, registry keys and values the current user can write.
function Snapshot {
  $out = @()
  foreach ($dir in @($env:LOCALAPPDATA, (Join-Path $env:LOCALAPPDATA 'Programs'), $env:APPDATA,
                     [Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('Desktop'),
                     [Environment]::GetFolderPath('Startup'))) {
    if (Test-Path $dir) { Get-ChildItem -Force $dir | ForEach-Object { $out += "file: $($_.FullName)" } }
  }
  foreach ($key in @('HKCU:\Software', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall',
                     'HKCU:\Software\Classes', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings')) {
    Get-ChildItem $key -ErrorAction SilentlyContinue | ForEach-Object { $out += "key: $($_.Name)" }
  }
  foreach ($key in @($runKey, $approvedKey)) {
    $props = Get-ItemProperty $key -ErrorAction SilentlyContinue
    if ($props) {
      $props.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object { $out += "value: $key\$($_.Name)" }
    }
  }
  return $out
}

Write-Host "Installer: $($setup.Name) ($([math]::Round($setup.Length / 1MB, 1)) MB)"
Check (-not (Test-Path $installDir)) 'not installed before the test'
$before = Snapshot

# 1. Install, for this user only, without questions.
$t0 = Get-Date
$p = Start-Process -FilePath $setup.FullName -ArgumentList '/S' -Wait -PassThru
Write-Host "Install took $([math]::Round(((Get-Date) - $t0).TotalSeconds, 1)) s"
Check ($p.ExitCode -eq 0) "the installer ends with 0 (got $($p.ExitCode))"
Check (Test-Path $exe) "the app is in the user's own app folder ($installDir)"
Check (Test-Path $uninstaller) 'the uninstaller is next to it'
Check (Test-Path $startMenuLink) 'a Start-menu entry "Fresing ToolBox"'
$run = RegValue $runKey $runName
Check ($run -eq "`"$exe`" --autostart") "Start with Windows is on after install ($run)"
Check (@(UninstallEntries 'HKCU').Count -eq 1) 'one entry in Settings > Apps, for this user'
Check (@(UninstallEntries 'HKLM').Count -eq 0) 'nothing for all users (no administrator rights used)'

# 2. Start it as Windows does at login, and see the tray icon made.
$env:FRESING_TOOLBOX_STATUS = $status
$proc = Start-Process -FilePath $exe -ArgumentList '--autostart' -PassThru
$state = $null
for ($i = 0; $i -lt 60 -and -not ($state -and $state.tray); $i++) {
  Start-Sleep -Milliseconds 500
  if (Test-Path $status) { try { $state = Get-Content $status -Raw | ConvertFrom-Json } catch { $state = $null } }
}
Check ($state -and $state.tray) 'the installed app shows its tray icon'
Check (-not $proc.HasExited) 'the tray process runs'
Check ($state -and $state.autostartRegistered -eq $true) 'the app sees its own Start with Windows entry'
Check ($state -and $state.dropWindowVisible -eq $false) 'started at login: no window, only the tray icon'

# A second start ends at once and brings up the first one's drop window.
$second = Start-Process -FilePath $exe -PassThru
$ended = $second.WaitForExit(20000)
Check $ended 'a second start ends by itself'
Start-Sleep -Seconds 1
$state = Get-Content $status -Raw | ConvertFrom-Json
Check ($state.secondInstances -eq 1 -and $state.dropWindowVisible) 'the first instance shows its drop window instead'
Check ((MainProcesses).Count -eq 1) "one instance only ($((MainProcesses).Count) running)"
Stop-Process -Id $proc.Id -Force
Start-Sleep -Seconds 2
Remove-Item env:FRESING_TOOLBOX_STATUS

# 3. The app tests, against the installed app: menu, drop window, one instance, the switch in the registry, Quit.
$env:TOOLBOX_EXE = $exe
Push-Location $root
node --test --test-concurrency=1 tests/app.test.js
$code = $LASTEXITCODE
Pop-Location
Remove-Item env:TOOLBOX_EXE
Check ($code -eq 0) 'the app tests pass against the installed app'
Check ((MainProcesses).Count -eq 0) 'Quit leaves no process'
Check ((RegValue $runKey $runName) -ne $null) 'Start with Windows is on again for the uninstall check'

# 4. Uninstall, without questions. The uninstaller copies itself away and returns at once: wait for it.
$t0 = Get-Date
Start-Process -FilePath $uninstaller -ArgumentList '/S' -Wait
for ($i = 0; $i -lt 120 -and (Test-Path $installDir); $i++) { Start-Sleep -Milliseconds 500 }
Start-Sleep -Seconds 2
Write-Host "Uninstall took $([math]::Round(((Get-Date) - $t0).TotalSeconds, 1)) s"
Check (-not (Test-Path $installDir)) 'the app folder is gone'
Check (-not (Test-Path $startMenuLink)) 'the Start-menu entry is gone'
Check ((RegValue $runKey $runName) -eq $null) 'the Start with Windows entry is gone'
Check ((RegValue $approvedKey $runName) -eq $null) 'no Task Manager note about it is left'
Check (@(UninstallEntries 'HKCU').Count -eq 0) 'the entry in Settings > Apps is gone'
Check (-not (Test-Path $appData)) "the app's own data folder is gone"
Check ((MainProcesses).Count -eq 0) 'no process left'

$after = Snapshot
$left = @($after | Where-Object { $before -notcontains $_ })
foreach ($l in $left) { Write-Host "      left behind: $l" }
Check ($left.Count -eq 0) "nothing new is left behind ($($left.Count) items)"

Write-Host "The install test took $([math]::Round(((Get-Date) - $started).TotalSeconds)) s; $script:failed failed."
exit $script:failed
