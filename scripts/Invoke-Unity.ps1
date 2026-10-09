[CmdletBinding()]
param(
    [ValidateSet('Validate','EditMode','PlayMode','Windows','Web')]
    [string]$Operation = 'Validate',
    [string]$Project = 'unity/IceCourier',
    [string]$Editor = $env:UNITY_EDITOR_PATH
)
$ErrorActionPreference = 'Stop'
# This PC's ICU loader crashes inside Unity netcorerun. Limit the workaround
# to this process and its children; it does not change Windows configuration.
$env:DOTNET_SYSTEM_GLOBALIZATION_USENLS = '1'
$repoRoot = Split-Path $PSScriptRoot -Parent
$projectPath = [IO.Path]::GetFullPath((Join-Path $repoRoot $Project))
$unityRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot 'unity')) + [IO.Path]::DirectorySeparatorChar
if (-not $projectPath.StartsWith($unityRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Project must be inside unity/' }
$versionFile = Join-Path $projectPath 'ProjectSettings/ProjectVersion.txt'
$version = (Select-String -Path $versionFile -Pattern '^m_EditorVersion: (.+)$').Matches[0].Groups[1].Value
if (-not $Editor) { $Editor = "C:\Program Files\Unity\Hub\Editor\$version\Editor\Unity.exe" }
if (-not (Test-Path -LiteralPath $Editor)) { throw "Install Unity $version or set UNITY_EDITOR_PATH" }
$installed = (Get-Item -LiteralPath $Editor).VersionInfo.ProductVersion
if (-not $installed.StartsWith($version)) { throw "Expected $version; found $installed" }
$output = Join-Path $repoRoot "artifacts/unity/$(Split-Path $projectPath -Leaf)"
New-Item -ItemType Directory -Force $output | Out-Null
$log = Join-Path $output "$Operation.log"
$arguments = @('-batchmode','-force-d3d11','-projectPath',"`"$projectPath`"",'-logFile',"`"$log`"")
if ($Operation -in @('EditMode','PlayMode')) {
    $result = Join-Path $output "$Operation.xml"
    if (Test-Path -LiteralPath $result) { Remove-Item -LiteralPath $result }
    $arguments += @('-runTests','-testPlatform',$Operation,'-testResults',"`"$result`"")
} else {
    $method = @{Validate='Validate'; Windows='BuildWindows'; Web='BuildWeb'}[$Operation]
    $arguments += @('-quit','-executeMethod',"Kihamda.Editor.StudioBuild.$method")
    if ($Operation -eq 'Windows') { $arguments += @('-buildTarget','StandaloneWindows64') }
    if ($Operation -eq 'Web') { $arguments += @('-buildTarget','WebGL') }
}
# One Editor per project; it exits itself after tests. Do not suppress license failures.
$process = Start-Process -FilePath $Editor -ArgumentList $arguments -WindowStyle Hidden -PassThru
if (-not $process.WaitForExit(1800000)) { $process.Kill(); throw 'Unity timed out; inspect log before retrying' }
if ($process.ExitCode -ne 0) { throw "Unity failed ($($process.ExitCode)). Log: $log" }
if (-not (Test-Path -LiteralPath $log)) { throw 'Unity produced no log' }
if ($Operation -in @('EditMode','PlayMode')) {
    if (-not (Test-Path -LiteralPath $result)) { throw 'Unity produced no test result' }
    [xml]$xml = Get-Content -LiteralPath $result -Raw
    if ($xml.'test-run'.result -ne 'Passed' -or [int]$xml.'test-run'.total -lt 1) { throw "Tests failed or empty: $result" }
}
Write-Output "Unity $Operation passed. Log: $log"
