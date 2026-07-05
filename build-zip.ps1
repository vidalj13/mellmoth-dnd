<#
    build-zip.ps1 - Construit <version>.zip du plugin mellmoth-dnd.

    - Version : lue depuis mellmoth-dnd/mellmoth-dnd.php (const VERSION),
      ou forcee via -Version 1.2.6.
    - Regles de build (cf. CLAUDE.md) :
        * separateurs '/' dans les chemins (System.IO.Compression, pas Compress-Archive) ;
        * exclusion du dossier .idea/ (outillage IDE) ;
        * l'archive contient le dossier mellmoth-dnd/ a sa racine.

    Usage :
        .\build-zip.ps1                 # version auto (depuis le php)
        .\build-zip.ps1 -Version 1.2.6  # version forcee

    NB : garder ce fichier en ASCII pur (PowerShell 5.1 lit les .ps1 en ANSI).
#>
param([string]$Version)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$repo    = $PSScriptRoot
$srcRoot = Join-Path $repo 'mellmoth-dnd'
$phpMain = Join-Path $srcRoot 'mellmoth-dnd.php'

if (-not $Version) {
    $m = Select-String -Path $phpMain -Pattern "const VERSION\s*=\s*'([^']+)'" | Select-Object -First 1
    if (-not $m) { throw "Version introuvable dans $phpMain (const VERSION)." }
    $Version = $m.Matches[0].Groups[1].Value
}

# Coherence : verifie que l'en-tete "Version:" correspond a la const.
$hdr = Select-String -Path $phpMain -Pattern "^\s*\*\s*Version:\s*(\S+)" | Select-Object -First 1
if ($hdr -and $hdr.Matches[0].Groups[1].Value -ne $Version) {
    Write-Warning ("En-tete Version ({0}) differe de const VERSION ({1}) - bump incomplet ?" -f $hdr.Matches[0].Groups[1].Value, $Version)
}

$zipPath = Join-Path $repo "$Version.zip"
if (Test-Path $zipPath) { [System.IO.File]::Delete($zipPath) }

$ideDir = [char]92 + '.idea' + [char]92   # "\.idea\" sans regex
$files = Get-ChildItem -Path $srcRoot -Recurse -File |
    Where-Object { -not $_.FullName.Contains($ideDir) }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($f in $files) {
        $rel = $f.FullName.Substring($repo.Length + 1).Replace([char]92, '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, $rel) | Out-Null
    }
} finally {
    $zip.Dispose()
}

Write-Output ("{0}.zip cree : {1:N0} octets ({2} fichiers)" -f $Version, (Get-Item $zipPath).Length, $files.Count)
