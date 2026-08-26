#!/usr/bin/env bash
# Downloads and installs the STIV weights (angle ensemble + sign classifier)
# from Zenodo into the checkout, so pyproject.toml's
# [tool.setuptools.package-data] picks them up on the `pip install` step that
# follows this one. Linux/macOS build jobs only — see
# download_stiv_weights.ps1 for the Windows equivalent.
#
# Run from the repo root (GitHub Actions' default working directory).
set -euo pipefail

WEIGHTS_URL="https://zenodo.org/records/22050810/files/angle.zip?download=1"
DEST_DIR="river/core/stiv_model"
WORK_DIR="$(mktemp -d)"
TMP_ZIP="$WORK_DIR/angle.zip"
EXTRACT_DIR="$WORK_DIR/extract"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "Downloading STIV angle weights from Zenodo..."
if ! curl -fSL --retry 3 --retry-delay 5 -o "$TMP_ZIP" "$WEIGHTS_URL"; then
  echo "::error::Failed to download STIV weights from $WEIGHTS_URL"
  exit 1
fi

# Some failure modes (maintenance pages, rate limiting, auth walls) come back
# as a 200 with an HTML body rather than a real HTTP error — `curl -f` alone
# won't catch that, so confirm the payload is actually a zip before trusting it.
if ! unzip -tq "$TMP_ZIP" >/dev/null 2>&1; then
  echo "::error::Downloaded STIV weights file is not a valid zip (likely an HTML error page). First 300 bytes:"
  head -c 300 "$TMP_ZIP" || true
  echo
  exit 1
fi

mkdir -p "$EXTRACT_DIR"
unzip -q "$TMP_ZIP" -d "$EXTRACT_DIR"

if [ ! -d "$EXTRACT_DIR/angle" ]; then
  echo "::error::angle.zip did not contain the expected top-level 'angle/' directory"
  exit 1
fi

mkdir -p "$DEST_DIR/angle"
cp -R "$EXTRACT_DIR/angle/." "$DEST_DIR/angle/"

missing=0
for seed in seed1 seed2 seed3; do
  f="$DEST_DIR/angle/$seed/best_model.pth"
  if [ ! -f "$f" ]; then
    echo "::error::Missing $f after extraction"
    missing=1
  fi
done
if [ "$missing" = "1" ]; then
  echo "::error::STIV angle weights incomplete after extracting angle.zip — failing the build rather than shipping a broken STIV option."
  exit 1
fi

# angle.zip now also ships the sign classifier (river/core/stiv_model/sign/)
# alongside the angle ensemble — load_models() requires both, and
# river.core.stiv_pipeline.stiv_weights_available() greys out STIV in the GUI
# if either is missing. Copy it the same way as angle/.
if [ ! -d "$EXTRACT_DIR/sign" ]; then
  echo "::error::angle.zip did not contain the expected top-level 'sign/' directory"
  exit 1
fi

mkdir -p "$DEST_DIR/sign"
cp -R "$EXTRACT_DIR/sign/." "$DEST_DIR/sign/"

if [ ! -f "$DEST_DIR/sign/sign_model.pth" ]; then
  echo "::error::Missing $DEST_DIR/sign/sign_model.pth after extraction"
  exit 1
fi

echo "STIV weights installed:"
find "$DEST_DIR/angle" -name best_model.pth -exec ls -la {} \;
ls -la "$DEST_DIR/sign/sign_model.pth"
