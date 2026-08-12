# Creates an upload keystore for Google Play App Signing (upload key).
# Output (gitignored):
#   android/upload-keystore.jks
#   android/keystore.properties
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File scripts/create-upload-keystore.ps1
#
# Back up the .jks and passwords in a password manager before the first Play upload.

$ErrorActionPreference = "Stop"

$androidDir = (Resolve-Path (Join-Path $PSScriptRoot "..\android")).Path
$keystorePath = Join-Path $androidDir "upload-keystore.jks"
$propsPath = Join-Path $androidDir "keystore.properties"
$keytoolPath = $null

if (Test-Path $keystorePath) {
    Write-Error "Keystore already exists at $keystorePath. Move/backup it before regenerating."
}

$keytool = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $keytool) {
    $javaHome = $env:JAVA_HOME
    if ($javaHome) {
        $candidate = Join-Path $javaHome "bin\keytool.exe"
        if (Test-Path $candidate) { $keytoolPath = $candidate }
    }
    if (-not $keytoolPath) {
        Write-Error "keytool not found. Install a JDK 21+ and ensure keytool is on PATH (or set JAVA_HOME)."
    }
} else {
    $keytoolPath = $keytool.Source
}

function New-RandomPassword {
    param([int]$Length = 32)
    $chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*-_=+"
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] $Length
    $rng.GetBytes($bytes)
    -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

$storePassword = New-RandomPassword
$keyPassword = $storePassword
$alias = "upload"
$dname = "CN=Texta Upload, OU=Mobile, O=Texta, L=Unknown, ST=Unknown, C=US"

Write-Host "Generating upload keystore with keytool..."
& $keytoolPath -genkeypair `
    -v `
    -keystore $keystorePath `
    -alias $alias `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -storepass $storePassword `
    -keypass $keyPassword `
    -dname $dname

@"
storeFile=upload-keystore.jks
storePassword=$storePassword
keyAlias=$alias
keyPassword=$keyPassword
"@ | Set-Content -Path $propsPath -Encoding ascii

Write-Host ""
Write-Host "Created:"
Write-Host "  $keystorePath"
Write-Host "  $propsPath"
Write-Host ""
Write-Host "IMPORTANT: Back up upload-keystore.jks and keystore.properties in at least two secure locations."
Write-Host "Losing the upload key blocks Play updates until Google approves an upload-key reset."
Write-Host ""
Write-Host "Fingerprint (SHA-256):"
& $keytoolPath -list -v -keystore $keystorePath -alias $alias -storepass $storePassword |
    Select-String -Pattern "SHA256:"
