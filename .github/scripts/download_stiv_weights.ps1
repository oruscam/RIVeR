# Downloads and installs the STIV angle-ensemble weights from Zenodo into the
# checkout, so pyproject.toml's [tool.setuptools.package-data] picks them up
# on the `pip install` step that follows this one. Windows build job only —
# see download_stiv_weights.sh for the Linux/macOS equivalent.
#
# Run from the repo root (GitHub Actions' default working directory).
$ErrorActionPreference = "Stop"

$weightsUrl = "https://zenodo.org/records/22050810/files/angle.zip?download=1"
$destDir = "river\core\stiv_model"
$workDir = Join-Path $env:RUNNER_TEMP "stiv-weights"
$tmpZip = Join-Path $workDir "angle.zip"
$extractDir = Join-Path $workDir "extract"

if (Test-Path $workDir) { Remove-Item -Recurse -Force $workDir }
New-Item -ItemType Directory -Force -Path $workDir | Out-Null

Write-Host "Downloading STIV angle weights from Zenodo..."
$downloaded = $false
for ($attempt = 1; $attempt -le 3; $attempt++) {
  try {
    Invoke-WebRequest -Uri $weightsUrl -OutFile $tmpZip -UseBasicParsing
    $downloaded = $true
    break
  } catch {
    Write-Host "Attempt $attempt failed: $_"
    Start-Sleep -Seconds 5
  }
}
if (-not $downloaded) {
  Write-Host "::error::Failed to download STIV weights from $weightsUrl"
  exit 1
}

# Some failure modes (maintenance pages, rate limiting, auth walls) come back
# as a 200 with an HTML body rather than a real HTTP error, so confirm the
# payload is actually a zip before trusting it.
try {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $testArchive = [System.IO.Compression.ZipFile]::OpenRead($tmpZip)
  $testArchive.Dispose()
} catch {
  Write-Host "::error::Downloaded STIV weights file is not a valid zip (likely an HTML error page). First bytes:"
  Get-Content -Path $tmpZip -TotalCount 5 -ErrorAction SilentlyContinue
  exit 1
}

Expand-Archive -Path $tmpZip -DestinationPath $extractDir

if (-not (Test-Path "$extractDir\angle")) {
  Write-Host "::error::angle.zip did not contain the expected top-level 'angle\' directory"
  exit 1
}

New-Item -ItemType Directory -Force -Path "$destDir\angle" | Out-Null
Copy-Item -Path "$extractDir\angle\*" -Destination "$destDir\angle" -Recurse -Force

$missing = $false
foreach ($seed in @("seed1", "seed2", "seed3")) {
  $p = "$destDir\angle\$seed\best_model.pth"
  if (-not (Test-Path $p)) {
    Write-Host "::error::Missing $p after extraction"
    $missing = $true
  }
}
if ($missing) {
  Write-Host "::error::STIV angle weights incomplete after extracting angle.zip — failing the build rather than shipping a broken STIV option."
  exit 1
}

# NOTE: as of this writing, the Zenodo record only ships the angle ensemble.
# The sign classifier (river\core\stiv_model\sign\sign_model.pth) is a
# separate file that load_models() also requires; without it,
# river.core.stiv_pipeline.stiv_weights_available() still reports STIV as
# unavailable and the GUI keeps it greyed out. That's a known, non-fatal gap
# (not a download/extraction failure) — flag it loudly but don't fail the
# build over it, since LSPIV/iWave must still ship.
if (-not (Test-Path "$destDir\sign\sign_model.pth")) {
  Write-Host "::warning::sign_model.pth is not present (the Zenodo angle.zip record does not include it) — STIV will ship disabled in this build until sign-classifier weights are published and this script is updated to fetch them."
}

Write-Host "STIV angle weights installed."
Remove-Item -Recurse -Force $workDir -ErrorAction SilentlyContinue
