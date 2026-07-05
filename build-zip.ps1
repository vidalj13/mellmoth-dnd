<#
    build-zip.ps1 - Bump de version + packaging du plugin mellmoth-dnd.

    Par defaut : incremente le patch, met a jour la version dans le php
    (en-tete "Version:" + const VERSION) et le marqueur de CLAUDE.md,
    puis construit <version>.zip.

    Parametres :
        -Version 1.3.0   version cible explicite (au lieu d'incrementer)
        -Bump patch|minor|major   type d'increment (defaut: patch)
        -NoBump          ne pas incrementer : builder la version courante

    Usage :
        .\build-zip.ps1                 # patch +1 puis build (ex 1.2.5 -> 1.2.6)
        .\build-zip.ps1 -Bump minor     # 1.2.5 -> 1.3.0
        .\build-zip.ps1 -Version 2.0.0  # force 2.0.0
        .\build-zip.ps1 -NoBump         # rebuild du zip courant, sans bump

    Regles de build (cf. CLAUDE.md) :
        * separateurs '/' (System.IO.Compression, pas Compress-Archive) ;
        * exclusion du dossier .idea/ ;
        * archive contenant le dossier mellmoth-dnd/ a sa racine.

    NB : garder ce fichier en ASCII pur (PowerShell 5.1 lit les .ps1 en ANSI).
#>
param(
    [string]$Version,
    [ValidateSet('patch', 'minor', 'major')][string]$Bump = 'patch',
    [switch]$NoBump
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$repo    = $PSScriptRoot
$srcRoot = Join-Path $repo 'mellmoth-dnd'
$phpMain = Join-Path $srcRoot 'mellmoth-dnd.php'
$mdPath  = Join-Path $repo 'CLAUDE.md'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)  # pas de BOM (sinon php casse)

function Get-CurrentVersion {
    $m = Select-String -Path $phpMain -Pattern "const VERSION\s*=\s*'([^']+)'" | Select-Object -First 1
    if (-not $m) { throw "Version introuvable dans $phpMain (const VERSION)." }
    return $m.Matches[0].Groups[1].Value
}

function Step-Version([string]$v, [string]$part) {
    $p = @($v.Split('.'))
    while ($p.Count -lt 3) { $p += '0' }
    [int]$maj = $p[0]; [int]$min = $p[1]; [int]$pat = $p[2]
    switch ($part) {
        'major' { $maj++; $min = 0; $pat = 0 }
        'minor' { $min++; $pat = 0 }
        default { $pat++ }
    }
    return "$maj.$min.$pat"
}

$current = Get-CurrentVersion

if ($NoBump) {
    $target = $current
} elseif ($Version) {
    $target = $Version
} else {
    $target = Step-Version $current $Bump
}

# --- Bump des fichiers si la cible differe ---
if ($target -ne $current) {
    $php = [System.IO.File]::ReadAllText($phpMain)
    $php = $php -replace "(\*\s*Version:\s*)\S+", ('${1}' + $target)
    $php = $php -replace "(const VERSION\s*=\s*')[^']+'", ('${1}' + $target + "'")
    [System.IO.File]::WriteAllText($phpMain, $php, $utf8NoBom)

    if (Test-Path $mdPath) {
        $bt = [char]96  # backtick de la code-span `mellmoth-dnd`
        $md = [System.IO.File]::ReadAllText($mdPath)
        $mdNew = $md -replace ('mellmoth-dnd' + $bt + ' v\d+\.\d+\.\d+'), ('mellmoth-dnd' + $bt + ' v' + $target)
        if ($mdNew -ne $md) {
            [System.IO.File]::WriteAllText($mdPath, $mdNew, $utf8NoBom)
        } else {
            Write-Warning "Marqueur de version non trouve dans CLAUDE.md - a verifier a la main."
        }
    }
    Write-Output ("Bump : {0} -> {1}" -f $current, $target)
} else {
    Write-Output ("Pas de bump (version courante : {0})" -f $target)
}

# --- Construction du zip ---
$zipPath = Join-Path $repo "$target.zip"
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

Write-Output ("{0}.zip cree : {1:N0} octets ({2} fichiers)" -f $target, (Get-Item $zipPath).Length, $files.Count)
