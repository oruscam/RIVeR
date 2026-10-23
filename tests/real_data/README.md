# Real-data tests

They replay real GUI runs through the CLI (`python -m river.cli ...`, exactly as
Electron does) and compare each stage against the results saved from those runs.
They are opt-in: they need data that lives on your machine.

```bash
pytest tests/real_data --realdata                  # everything
pytest tests/real_data --realdata -m portable      # only what the multi-OS CI runs
pytest tests/real_data --realdata -k uav           # a single dataset
```

Without `--realdata` they are skipped, so `pytest tests/` stays fast.

## Where everything comes from

| Variable | Default | Contents |
|---|---|---|
| `RIVER_TEST_DATA` | `~/Documents/Datos-River` | videos, bathymetries, GRPs, ChArUco images |
| `RIVER_TEST_REFERENCE` | `~/River` | previous runs used as reference |
| `RIVER_TEST_RTOL` | `1e-3` | relative tolerance vs. reference |

The parameters of each run (frame range, control points, PIV windows, fps...)
are read from the reference run's `settings.json`; they are not hardcoded.

| Dataset | Video | Reference run |
|---|---|---|
| oblique | `oblique/P1060716.mp4` | `P1060716/20261022T1223` |
| uav | `uav/Yanuncay_CS1.mp4` | `Yanuncay_CS1/20261022T1222` |
| 3d | `3d/JUNCAL20260108T1440.mp4` | `JUNCAL20260108T1440/20261022T1226` |

They were processed with PIV, STIV and iWave and OpenCV 5.0 (the version pinned in
`pyproject.toml`), and are the same runs packed in the CI bundle.

**Do not delete or move those reference folders**: they are the "expected value". To
update a reference on purpose, point `DATASETS` in `helpers.py` to a new run.

## Multi-OS smoke CI (portable bundle)

`.github/workflows/smoke.yml` runs the tests marked `portable` on Linux, Windows and
macOS, with Python and dependencies installed exactly like the installers. It uses a
self-contained zip instead of the folders above:

1. In the GUI, make one short run (~20-60 frames) per footage type: oblique, UAV and 3D,
   with PIV, STIV and iWave enabled (15 stations).
2. Pack them (the videos are trimmed without re-encoding):
   ```bash
   python scripts/pack_test_data.py --oblique ~/River/<proj>/<run> --uav ~/River/<proj>/<run> \
       --3d ~/River/<proj>/<run> --out river-test-data.zip
   ```
3. Check it locally:
   ```bash
   python -m zipfile -e river-test-data.zip /tmp/td
   RIVER_TEST_MANIFEST=/tmp/td/river-test-data/manifest.json \
       pytest tests/real_data --realdata --fail-on-skip -m portable
   ```
4. Upload it to the private S3 bucket `river-e2e-tests-data` under a new name
   (`river-test-data-v2.zip`, ...) and set `TEST_DATA_S3` and `TEST_DATA_SHA256` in
   `smoke.yml` (the script prints the hash). Never overwrite an uploaded file: CI
   checks the hash and would fail. CI reads the bucket with the `AWS_ACCESS_KEY_ID`
   and `AWS_SECRET_ACCESS_KEY` repository secrets.

PRs to `main` run every `portable` test; other runs skip the `slow` ones (STIV + iWave
on oblique and 3D; UAV always runs).

`--fail-on-skip` turns skips into failures: in CI a missing dependency (e.g. iWave
failing to import) must fail, not be skipped.

## What is tested

- `test_pipeline_regression.py` (per dataset): frames, transformation matrix, ROI height,
  mask/bbox, PIV vectors, discharge/area/mean velocity and per-station profiles.
- `test_features.py`: frame extraction for all videos, resize, stabilization,
  pixel↔world transformations, 3D camera solution, `piv-test`, user masks and
  `compile-masks`, ChArUco camera calibration, STIV + iWave for every footage type
  (requires `torch` and `iwave`).

## What is NOT covered

The GUI (Electron/React): building the 3D matrix from the camera solution
(`createMatrix.ts`), the HTML report, imperial unit conversion and the components.
Those are covered by the Jest tests in `gui/`.
