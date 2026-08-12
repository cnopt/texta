# Builds a signed release AAB using JDK 21+ (required by Capacitor 8 / AGP).
# Prefer an explicit JAVA_HOME_21, else common install paths, else existing JAVA_HOME if it is 21+.

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$androidDir = Join-Path $repoRoot "android"

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
    Write-Error "JDK 21+ not found. Install JDK 21 and/or set JAVA_HOME_21 to its path."
}

$env:JAVA_HOME = $jdkHome
$env:Path = "$(Join-Path $jdkHome 'bin');$env:Path"
Write-Host "Using JAVA_HOME=$jdkHome"

Push-Location $androidDir
try {
    & .\gradlew.bat bundleRelease @args
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}

$aab = Join-Path $androidDir "app\build\outputs\bundle\release\app-release.aab"
if (Test-Path $aab) {
    Write-Host "AAB ready: $aab"
}
