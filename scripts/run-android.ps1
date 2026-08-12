# Sync web assets and run the app on a connected device/emulator using JDK 21+.

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Get-JavaMajorVersion {
    param([string]$HomePath)
    $javaExe = Join-Path $HomePath "bin\java.exe"
    if (-not (Test-Path $javaExe)) { return $null }
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $lines = & $javaExe -version 2>&1
    $ErrorActionPreference = $prevEap
    $text = ($lines | ForEach-Object { $_.ToString() }) -join "`n"
    if ($text -match 'version "(\d+)') {
        return [int]$Matches[1]
    }
    return $null
}

$candidates = @(
    $env:JAVA_HOME_21,
    "C:\Program Files\Java\jdk-21.0.10",
    "C:\Program Files\Java\jdk-21",
    "C:\Program Files\Android\Android Studio\jbr",
    (Join-Path $env:LOCALAPPDATA "Programs\Android\Android Studio\jbr"),
    $env:JAVA_HOME
) | Where-Object { $_ }

$jdkHome = $null
foreach ($c in $candidates) {
    $major = Get-JavaMajorVersion $c
    if ($major -ge 21) {
        $jdkHome = $c
        break
    }
}

if (-not $jdkHome) {
    Write-Error "JDK 21+ not found. Install JDK 21 and set JAVA_HOME to it (your shell currently points at an older JDK)."
}

$env:JAVA_HOME = $jdkHome
$env:Path = "$(Join-Path $jdkHome 'bin');$env:Path"
Write-Host "Using JAVA_HOME=$jdkHome"

Push-Location $repoRoot
try {
    npm run android:sync
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    npx cap run android @args
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}
