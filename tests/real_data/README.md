# Real-data tests

They replay real GUI runs through the CLI (`python -m river.cli ...`, exactly as
Electron does) and compare each stage against the results saved from those runs.
They are opt-in: they need data that lives on your machine.

```bash
pytest tests/real_data --realdata                  # everything
pytest tests/real_data --realdata -m "not slow"    # skip the 840-frame 3D run (~1 min)
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
| oblique | `oblique/P1060716.mp4` | `P1060716/20260805T1224` |
| uav | `uav/Yanuncay_CS1.mp4` | `Yanuncay_CS1/20260828T1039` |
| 3d (slow) | `3d/JUNCAL20260108T1440.mp4` | `JUNCAL20260108T1440/20260808T1530` |

**Do not delete or move those reference folders**: they are the "expected value". To
update a reference on purpose, point `DATASETS` in `helpers.py` to a new run.

## What is tested

- `test_pipeline_regression.py` (per dataset): frames, transformation matrix, ROI height,
  mask/bbox, PIV vectors, discharge/area/mean velocity and per-station profiles.
- `test_features.py`: frame extraction for all videos, resize, stabilization,
  pixel↔world transformations, 3D camera solution, `piv-test`, user masks and
  `compile-masks`, ChArUco camera calibration, STIV + iWave (requires `torch` and `iwave`).

## What is NOT covered

The GUI (Electron/React): building the 3D matrix from the camera solution
(`createMatrix.ts`), the HTML report, imperial unit conversion and the components.
Those are covered by the Jest tests in `gui/`.
