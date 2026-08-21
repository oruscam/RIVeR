# iWave Spectrum Preview — Design

**Date:** 2026-08-11
**Branch:** `feat/iwave-spectrum-preview`
**Status:** approved design, ready for planning

## Problem

Each velocimetry technique in Processing has a preview that shows *how* it
reached its answer — except iWave.

| Technique | Preview | Shows |
|---|---|---|
| LSPIV | quiver / vector field over the frame | the displacement vectors |
| STIV | `StiViewer` — space-time image per station | the streaks **and the fitted angle line** |
| iWave | none | — |

`FormProcessing.tsx:224-227` hardcodes iWave's eye button as permanently
disabled, titled `Processing.iwaveNoPreview`. The slot exists; nothing fills it.

Without a preview there is no way to judge whether an iWave station's velocity
is trustworthy. `iwave_quality_profile` gives a scalar, but a number does not
tell you *why* a fit failed.

## What iWave's diagnostic should be

STIV's viewer answers "did the fitted angle land on the actual streaks?" by
drawing the fit on top of the raw evidence. iWave's equivalent is the
**wavenumber–frequency spectrum with the fitted dispersion curves overlaid**:
curves sitting on the bright energy ridge mean a trustworthy fit; curves off
the ridge mean a suspect station.

This is not an invention. The `iwave` package author documented exactly this
plot in `iwave/plots.py:47-59`:

```python
plot(kx, kt, measured_spectrum[iw, ky==0, :, :])  # x-t spectrum cross-section
hold on; plot(kx, kt_gw[ky==0, :])    # gravity-wave relation, optimised params
hold on; plot(kx, kt_turb[ky==0, :])  # turbulence-forced relation
```

So: the **`ky=0` slice** (kx × kt), with **two** overlay curves.

## Constraint driving the architecture

`iwave_pipeline.py:_process_station` computes the preprocessed spectrum `spec`
and the full fit, then returns only `vy/vx/d/quality`. The spectrum and the
2D velocity components are discarded. Any preview therefore requires backend
changes — there is no client-side-only version.

`dispersion()` needs the 2D velocity `(vy, vx)`, which `run_iwave_analysis`
currently collapses into the streamwise scalar and drops.

**Decision: the backend emits the curves as plain polylines; the GUI does no
physics.** The curves are static once the fit converges, so duplicating the
Dolcetti et al. (2022) dispersion equations in TypeScript would buy nothing and
risk the GUI's formula drifting from the fitting code. The GUI draws an image
and two polylines.

## Design

### Backend — `river/core/iwave_pipeline.py`

`_process_station` additionally returns, per station:

- the `ky=0` slice of `spec` as a 2D array (kt × kx)
- `kt_gw` and `kt_turb` at `ky=0`, from `dispersion(ky, kx, (vy, vx), d, alpha)`
  using the optimised parameters
- the `kx` and `kt` axis extents

`run_iwave_analysis` gains an optional `spectra_dir` parameter, mirroring the
existing `stis_dir` on `run_stiv_analysis` (`stiv_pipeline.py:553`). When
provided it writes, per station:

- `spectrum_<station_id>.png` — the slice normalised to uint8 via min/max and
  written with `cv2.imwrite`, exactly the STI convention
  (`stiv_pipeline.py:574-578`). A bare data image: no axes, no decoration,
  no colormap.
- one `spectra.json` sidecar for the section, holding per station: the axis
  extents and the two curves as point arrays.

The sidecar keeps the curve data out of the project xsections file, matching
how STI images already live in their own directory tree.

### Electron — `gui/electron/ipcMainHandlers/`

New `getIwaveSpectra.ts` handler on channel `get-iwave-spectra`, closely
mirroring `getStis.ts`: reads `<project>/iwave_spectra/<section>/`, matches
`spectrum_<id>.png`, sorts numerically (not lexicographically — the bug
`getStis.ts:34` calls out), returns `{ stations, paths, curves }`, and returns
an empty result rather than an error when the directory is absent, since that
is the normal state before iWave has run.

### Frontend

**`IWaveViewer.tsx`** — new component mirroring `StiViewer.tsx`:

- spectrum PNG as the base layer
- the two dispersion curves as themed SVG polylines on top, scaled from the
  axis extents to view coordinates
- kx / kt axis labels
- station badge reusing `.velocity-readout` (as the STI badge does), showing
  station id, velocity, and quality
- a legend distinguishing the gravity-wave curve from the turbulence curve

**Preview mode** — `stiMode: boolean` generalises to
`previewMode: 'frames' | 'sti' | 'iwave'`, threaded through `Processing.tsx`,
`FormProcessing.tsx`, and `ImageProcessing.tsx`. The three technique eye
buttons become mutually exclusive selectors over one mode value rather than a
boolean plus a dead placeholder.

**`FormProcessing.tsx`** — the iWave eye button becomes live, enabled when
spectra exist for the active section, disabled with the existing
`Processing.iwaveNoPreview` title when they do not — matching how
`canToggleSti` already gates STIV's button.

## Boundaries

- **Backend owns** all physics: the spectrum slice, the dispersion curves,
  normalisation. It emits pixels and polylines.
- **Electron owns** file discovery, and returns empty rather than throwing
  when nothing has been written yet.
- **GUI owns** presentation only: display an image, draw polylines, scale
  axes, render a badge. No spectral or dispersion math in TypeScript.

This keeps the physics in one place and makes `IWaveViewer` testable with
plain fixture data.

## Out of scope

- `iwave_depth_profile` visualisation and any depth-vs-bathymetry comparison.
  The data exists and is unused, but it is a separate concern from the
  Processing preview.
- Any change to the Results module.
- Re-running or caching strategy for iWave analysis: spectra are written on the
  same run that produces the profiles, as STI images already are.

## Testing

- **Backend:** the slice extraction and normalisation produce a correctly
  shaped uint8 image; the sidecar round-trips; `spectra_dir=None` leaves
  behaviour unchanged (the existing profile outputs must not regress).
- **Electron:** numeric station ordering (`spectrum_10` after `spectrum_2`);
  a missing directory yields an empty result, not a throw.
- **GUI:** curve points map correctly from axis extents to view coordinates;
  the viewer renders with no curves and with missing stations; preview-mode
  switching is mutually exclusive across the three eye buttons.

## Open questions

None blocking. The station-window size (`WIN_MIN`/`WIN_MAX`, 32–64) sets the
curve resolution at roughly 32–64 points per curve, which is ample for a
smooth polyline at display scale.
