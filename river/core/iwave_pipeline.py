"""iWave pipeline: ortho-warped frame stack and per-station spectral velocimetry.

Port of the validated station method in
/Users/antoine/iwave/analysis/iwave_stations.py (which produced the raw
IWaVE profiles in the 65-case benchmark). The spectral fit itself comes
from the `iwave` package; this module owns the geometry (ortho grid,
frame warping, station windows) and the RIVeR xsections integration.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional, Tuple
import json

import cv2
import numpy as np

from river.core.stiv_pipeline import _collect_frames
from river.core.iwave_params import (
    DEPTH_FALLBACK,
    MAX_GRID,
    SMAX_FALLBACK,
    SMAX_MAX,
    IwaveOptions,
    SceneParams,
    VelocityEstimate,
    build_params_record,
    estimate_velocity,
    get_depth_bounds,
    get_quality_flags,
    get_section_gravity_waves,
    get_window_depth_reference,
    is_depth_at_bound,
    is_dry_window,
    needs_smax_rerun,
    resolve_scene_params,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_FRAMES = 512
EXTENT_MARGIN_M = 2.0
# Fixed seed for iWave's differential evolution: without it the same project gave
# velocities up to 20 % apart between identical runs (2026-09-23 benchmark).
OPTIMIZER_SEED = 0

IWAVE_COLUMNS = [
    "iwave_velocity_profile",
    "iwave_quality_profile",
    "iwave_depth_profile",
    "iwave_valid_profile",
]
# Per-section dict (not a per-station list), stripped together with IWAVE_COLUMNS.
IWAVE_PARAMS_KEY = "iwave_params"

# ---------------------------------------------------------------------------
# Ortho grid geometry
# ---------------------------------------------------------------------------


@dataclass
class Extent:
    east_min: float
    east_max: float
    north_min: float
    north_max: float


@dataclass
class OrthoGrid:
    extent: Extent
    resolution: float

    @property
    def width_px(self) -> int:
        return int(round((self.extent.east_max - self.extent.east_min) / self.resolution))

    @property
    def height_px(self) -> int:
        return int(round((self.extent.north_max - self.extent.north_min) / self.resolution))

    def real_to_pixel(self, east, north):
        col = (np.asarray(east, dtype=float) - self.extent.east_min) / self.resolution
        row = (self.extent.north_max - np.asarray(north, dtype=float)) / self.resolution
        return col, row


def _project_h(matrix: np.ndarray, x, y):
    """Apply a 3x3 homography to coordinate arrays."""
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    pts = np.stack([x, y, np.ones_like(x)], axis=0)
    out = np.tensordot(np.asarray(matrix, dtype=float), pts, axes=([1], [0]))
    return out[0] / out[2], out[1] / out[2]


def compute_extent(
    xsections: dict,
    transformation_matrix: list,
    bbox: Optional[list] = None,
    margin: float = EXTENT_MARGIN_M,
) -> Extent:
    """Real-world bounding box covering all cross-sections and the pixel-space ROI bbox."""
    all_east: list[float] = []
    all_north: list[float] = []
    for section in xsections.values():
        if isinstance(section, dict) and "east" in section:
            all_east.extend(float(e) for e in section["east"])
            all_north.extend(float(n) for n in section["north"])
    if bbox is not None:
        x0, y0, x1, y1 = bbox
        be, bn = _project_h(np.asarray(transformation_matrix), [x0, x1, x0, x1], [y0, y0, y1, y1])
        all_east.extend(np.asarray(be).tolist())
        all_north.extend(np.asarray(bn).tolist())
    if not all_east:
        raise ValueError("compute_extent: no station coordinates found in xsections")
    return Extent(
        east_min=min(all_east) - margin,
        east_max=max(all_east) + margin,
        north_min=min(all_north) - margin,
        north_max=max(all_north) + margin,
    )


def pick_resolution(extent: Extent, max_grid: int = MAX_GRID) -> float:
    span = max(extent.east_max - extent.east_min, extent.north_max - extent.north_min)
    return span / max_grid


def build_warp_matrix(grid: OrthoGrid, transformation_matrix: list) -> np.ndarray:
    """3x3 matrix mapping ortho-grid pixel (col, row) -> raw-frame pixel (x, y).

    Use with cv2.warpPerspective(frame, matrix, size, flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP).
    """
    res = grid.resolution
    ext = grid.extent
    grid_to_real = np.array([
        [res, 0.0, ext.east_min],
        [0.0, -res, ext.north_max],
        [0.0, 0.0, 1.0],
    ])
    h_inv = np.linalg.inv(np.asarray(transformation_matrix, dtype=float))
    return h_inv @ grid_to_real


def build_ortho_stack(
    frames_dir: str,
    transformation_matrix: list,
    xsections: dict,
    bbox: Optional[list] = None,
    max_frames: int = MAX_FRAMES,
    save_dir: Optional[str] = None,
    resolution: Optional[float] = None,
) -> tuple[np.ndarray, OrthoGrid]:
    """Warp frames onto an ortho grid. Returns (stack uint8 (n, H, W), grid).

    resolution (m/px) normally comes from resolve_scene_params; when omitted the
    grid falls back to the ROI-size rule of pick_resolution. If save_dir is
    provided, each warped (rectified) frame is also written to that directory
    as a zero-padded JPEG (e.g. "000000.jpg").
    """
    frames = _collect_frames(frames_dir)
    if not frames:
        raise FileNotFoundError(f"No frames (.jpg) found in {frames_dir}")
    frames = frames[:max_frames]

    extent = compute_extent(xsections, transformation_matrix, bbox)
    grid = OrthoGrid(extent=extent, resolution=resolution if resolution is not None else pick_resolution(extent))
    matrix = build_warp_matrix(grid, transformation_matrix)
    size = (grid.width_px, grid.height_px)

    if save_dir is not None:
        Path(save_dir).mkdir(parents=True, exist_ok=True)

    stack = np.empty((len(frames), grid.height_px, grid.width_px), dtype=np.uint8)
    for i, fpath in enumerate(frames):
        raw = cv2.imread(fpath, cv2.IMREAD_GRAYSCALE)
        if raw is None:
            stack[i] = 0
            continue
        stack[i] = cv2.warpPerspective(raw, matrix, size, flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
        if save_dir is not None:
            cv2.imwrite(str(Path(save_dir) / f"{i:06d}.jpg"), stack[i])
    return stack, grid


def prepare_iwave_scene(
    frames_dir: str,
    transformation_matrix: list,
    xsections: dict,
    step: int,
    fps: float,
    bbox: Optional[list] = None,
    options: Optional[IwaveOptions] = None,
) -> Tuple[VelocityEstimate, SceneParams]:
    """Resolve the scene-wide iWave parameters before any frame is warped.

    Must run after the LSPIV and STIV stages have filled xsections, since the
    velocity estimate is read from their profiles.

    Args:
        frames_dir (str): Directory of extracted frames.
        transformation_matrix (list): 3x3 pixel -> real-world homography.
        xsections (dict): Cross-sections.
        step (int): Frame step used at extraction.
        fps (float): Source video frame rate.
        bbox (Optional[list]): Pixel-space ROI bbox.
        options (Optional[IwaveOptions]): User overrides.

    Returns:
        Tuple[VelocityEstimate, SceneParams]: Estimate and resolved parameters.
    """
    n_frames_total = len(_collect_frames(frames_dir))
    n_frames = min(n_frames_total, MAX_FRAMES)
    if n_frames == 0:
        raise FileNotFoundError(f"No frames (.jpg) found in {frames_dir}")
    extent = compute_extent(xsections, transformation_matrix, bbox)
    span_m = max(extent.east_max - extent.east_min, extent.north_max - extent.north_min)
    # Effective fps of the extracted frames is raw fps divided by the frame step.
    fps_eff = float(fps) / float(step or 1)
    estimate = estimate_velocity(xsections)
    scene = resolve_scene_params(
        estimate, n_frames, fps_eff, span_m, options or IwaveOptions(),
        clip_duration_s=n_frames_total / fps_eff,
    )
    return estimate, scene


def _station_window(stack: np.ndarray, grid: OrthoGrid, east: float, north: float, win: int) -> np.ndarray:
    col, row = grid.real_to_pixel(east, north)
    half = win // 2
    r0 = int(round(float(row))) - half
    c0 = int(round(float(col))) - half
    r0 = min(max(r0, 0), stack.shape[1] - win)
    c0 = min(max(c0, 0), stack.shape[2] - win)
    return np.array(stack[:, r0:r0 + win, c0:c0 + win], dtype=np.float64)


# ---------------------------------------------------------------------------
# Direction conventions (validated against LSPIV in the 65-case benchmark)
# ---------------------------------------------------------------------------


def _flow_direction_from_margins(east_l: float, north_l: float, east_r: float, north_r: float):
    """Unit downstream direction: +90deg CCW rotation of the left->right margin vector."""
    d_east = north_l - north_r
    d_north = east_r - east_l
    norm = float(np.hypot(d_east, d_north))
    return d_east / norm, d_north / norm


def _crosswise_streamwise_unit(section: dict):
    """Unit vectors along the cross-section and perpendicular (downstream) to it."""
    d_east = float(section["dir_east_r"]) - float(section["dir_east_l"])
    d_north = float(section["dir_north_r"]) - float(section["dir_north_l"])
    u_cross = np.array([d_east, d_north], dtype=float)
    u_cross = u_cross / np.linalg.norm(u_cross)
    u_stream = np.array([-u_cross[1], u_cross[0]])
    return u_cross, u_stream


# ---------------------------------------------------------------------------
# Spectrum preview (pure numpy — no iwave import, so this stays testable)
# ---------------------------------------------------------------------------


def extract_ky0_slice(spec: np.ndarray, ky: np.ndarray) -> np.ndarray:
    """The ky=0 cross-section of a (n_kt, n_ky, n_kx) spectrum.

    This is the slice the iwave package's own diagnostic plots use
    (iwave/plots.py), the one the dispersion curves are drawn against.
    ky rarely contains an exact 0.0, so take the row nearest to it.
    """
    idx = int(np.argmin(np.abs(ky)))
    # .copy(): a basic-slice index like this returns a VIEW whose .base is
    # the full 4-D spectrum, so without copying, every retained slice would
    # pin the entire (much larger) spectrum array in memory until
    # write_spectra runs.
    return np.asarray(spec)[:, idx, :].copy()


def normalize_to_uint8(arr: np.ndarray) -> np.ndarray:
    """Min/max normalise to 0-255, matching how STI images are written
    (stiv_pipeline.py). The 1e-12 guard keeps a constant slice from
    dividing by zero."""
    arr = np.nan_to_num(np.asarray(arr, dtype=np.float32), nan=0.0)
    amin, amax = arr.min(), arr.max()
    return ((arr - amin) / (amax - amin + 1e-12) * 255).astype(np.uint8)


def _curve_points(kx: np.ndarray, kt_curve: np.ndarray) -> list:
    """Pair kx with a curve's frequencies, dropping non-finite points.

    Dropped rather than emitted as null: the GUI renders these as a single
    SVG polyline, which has no way to express a gap.
    """
    pts = []
    for x, t in zip(np.asarray(kx).ravel(), np.asarray(kt_curve).ravel()):
        if np.isfinite(x) and np.isfinite(t):
            pts.append([float(x), float(t)])
    return pts


def build_spectra_sidecar(entries: list) -> dict:
    """JSON-serialisable description of one section's spectrum previews.

    Everything is converted to plain Python scalars: json.dumps cannot
    serialise numpy types.
    """
    stations = []
    for e in entries:
        kx = np.asarray(e["kx"])
        kt = np.asarray(e["kt"])
        stations.append(
            {
                "station": int(e["station"]),
                "kx_min": float(kx.min()),
                "kx_max": float(kx.max()),
                "kt_min": float(kt.min()),
                "kt_max": float(kt.max()),
                "curves": {
                    "gravity": _curve_points(kx, e["kt_gw"]),
                    "turbulence": _curve_points(kx, e["kt_turb"]),
                },
            }
        )
    return {"version": 1, "stations": stations}


def write_spectra(spectra_dir: str, entries: list) -> None:
    """Write one section's spectrum previews: a bare grayscale PNG per
    station plus a spectra.json sidecar.

    Stale spectrum images (from a prior run with more stations) are deleted
    so a re-run with fewer stations cannot leave old spectrum_*.png files
    behind. However, this uses targeted cleanup (deleting only spectrum_*.png
    and spectra.json) rather than a recursive rmtree, because the path is
    caller-supplied. This ensures that if a caller mistakenly points at a
    directory containing unrelated content, we only remove the files we own.
    """
    out = Path(spectra_dir)
    out.mkdir(parents=True, exist_ok=True)

    # Clean up stale spectrum files from prior runs (targeted, not recursive)
    if out.exists():
        for stale in out.glob("spectrum_*.png"):
            stale.unlink()
        sidecar = out / "spectra.json"
        if sidecar.exists():
            sidecar.unlink()

    for e in entries:
        # Flip vertically: iwave's kt (river/../iwave/spectral.py) is built
        # from np.fft.fftfreq and truncated to positive frequencies, so it
        # ascends from zero and is never fftshifted -- row 0 of the raw
        # slice is the LOWEST frequency. Flipping puts the HIGHEST frequency
        # in row 0 (the PNG's top edge), which is the conventional
        # orientation for a spectrum plot and matches the GUI's y-axis
        # inversion in spectrumGeometry.ts (SVG y grows downward while
        # frequency grows upward). These two must be changed together.
        img = normalize_to_uint8(e["slice"][::-1])
        cv2.imwrite(str(out / f"spectrum_{int(e['station'])}.png"), img)

    (out / "spectra.json").write_text(json.dumps(build_spectra_sidecar(entries)))


# ---------------------------------------------------------------------------
# Spectral fit (iwave package)
# ---------------------------------------------------------------------------


def _process_station(
    crop: np.ndarray,
    resolution: float,
    fps_eff: float,
    alpha: float,
    time_size: int,
    time_overlap: int,
    smax: float = SMAX_FALLBACK,
    depth_bounds: Tuple[float, float] = DEPTH_FALLBACK,
    gravity_waves: bool = True,
    penalty_weight: float = 1.0,
) -> dict:
    """Spectral velocity fit for one station window. Returns vy/vx/d/quality
    (None on failure), plus the ky=0 spectrum slice, its kx/kt axes, and the
    two theoretical dispersion curves for the preview."""
    from iwave import spectral, window as iw_window, optimise, dispersion as iw_dispersion
    from iwave.iwave import OPTIM_KWARGS_SADE

    empty = dict(
        vy=None, vx=None, d=None, quality=None,
        slice=None, kx=None, kt=None, kt_gw=None, kt_turb=None,
    )

    win = crop.shape[-1]
    if not np.any(crop):
        return empty
    # normalize over time like LazyWindowArray(norm="time"), then flip y so +y = north
    w = iw_window.normalize(crop[None, ...], mode="time")
    w = w[:, :, ::-1, :]
    spec = spectral.sliding_window_spectrum(w, time_size, time_overlap)
    window_dims = (time_size, win, win)
    kt, ky, kx = spectral.wave_numbers(window_dims, resolution, fps_eff)
    spec = spectral.spectrum_preprocessing(spec, kt, ky, kx, smax * 3, spectrum_threshold=1.0)
    bnds = ((-smax, smax), (-smax, smax), tuple(depth_bounds))
    vy, vx, d, cost, quality, status, msg = optimise.optimize_single_spectrum_velocity(
        spec[0], bnds, alpha, window_dims, resolution, fps_eff,
        penalty_weight=penalty_weight, gravity_waves_switch=gravity_waves, turbulence_switch=True,
        pass_downsampling=[2, 1], gauss_width=1, kwargs=dict(OPTIM_KWARGS_SADE, seed=OPTIMIZER_SEED),
    )

    # Preview: the ky=0 cross-section with the fitted dispersion relations on
    # top — the diagnostic the iwave package documents in iwave/plots.py.
    # dispersion() needs the 2D velocity, which the caller collapses away.
    kt_gw, kt_turb = iw_dispersion.dispersion(ky, kx, (vy, vx), d, alpha)
    ky0 = int(np.argmin(np.abs(ky)))

    return dict(
        vy=float(vy), vx=float(vx), d=float(d), quality=float(quality),
        slice=extract_ky0_slice(spec[0], ky),
        kx=kx,
        kt=kt,
        kt_gw=np.asarray(kt_gw)[0, ky0, :],
        kt_turb=np.asarray(kt_turb)[0, ky0, :],
    )


def run_iwave_analysis(
    xsections: dict,
    transformation_matrix: list,
    frames_dir: str,
    step: int,
    fps: float,
    id_section: int,
    bbox: Optional[list] = None,
    stack: Optional[np.ndarray] = None,
    grid: Optional[OrthoGrid] = None,
    spectra_dir: Optional[str] = None,
    progress: Optional[Callable[[int, int], None]] = None,
    scene: Optional[SceneParams] = None,
    estimate: Optional[VelocityEstimate] = None,
    options: Optional[IwaveOptions] = None,
) -> dict:
    """Run iWave spectral velocimetry for one cross-section's stations.

    Adds 4 per-station lists: iwave_velocity_profile (signed streamwise, m/s),
    iwave_quality_profile, iwave_depth_profile, iwave_valid_profile, plus the
    iwave_params dict of parameters actually used. Pass a prebuilt (stack, grid)
    pair together with its scene to reuse the warped frames across sections;
    without them everything is resolved here. If spectra_dir is given, each
    station's ky=0 spectrum preview is saved there as spectrum_<station_id>.png
    alongside a spectra.json sidecar.
    """
    options = options or IwaveOptions()
    if (stack is None) != (grid is None):
        raise ValueError("run_iwave_analysis: pass both stack and grid, or neither")
    if stack is not None and scene is None:
        raise ValueError("run_iwave_analysis: a prebuilt stack needs the scene it was built with")
    if scene is None:
        estimate, scene = prepare_iwave_scene(
            frames_dir, transformation_matrix, xsections, step, fps, bbox, options,
        )
    elif estimate is None:
        estimate = estimate_velocity(xsections)

    section_keys = [k for k in xsections if k != "summary"]
    current_key = section_keys[id_section]
    cs = xsections[current_key]

    if stack is None:
        stack, grid = build_ortho_stack(
            frames_dir, transformation_matrix, xsections, bbox, resolution=scene.resolution,
        )

    resolution = grid.resolution
    time_size = min(scene.time_size, stack.shape[0] - stack.shape[0] % 2)
    time_overlap = time_size // 2
    win = min(scene.window_px, (min(stack.shape[1], stack.shape[2]) // 2) * 2)
    # Rules that look at neighbouring stations use the window actually cut, which
    # can be smaller than the target on a small grid.
    window_m = win * resolution

    east = [float(e) for e in cs["east"]]
    north = [float(n) for n in cs["north"]]
    n = len(east)
    alpha = float(cs.get("alpha", 0.85))
    gravity_waves = get_section_gravity_waves(cs, estimate, options.flow_type)

    _, u_stream = _crosswise_streamwise_unit(cs)
    dir_e, dir_n = _flow_direction_from_margins(
        east_l=float(cs["east_l"]) if not isinstance(cs["east_l"], (list, tuple)) else float(cs["east_l"][0]),
        north_l=float(cs["north_l"]) if not isinstance(cs["north_l"], (list, tuple)) else float(cs["north_l"][0]),
        east_r=float(cs["east_r"]) if not isinstance(cs["east_r"], (list, tuple)) else float(cs["east_r"][-1]),
        north_r=float(cs["north_r"]) if not isinstance(cs["north_r"], (list, tuple)) else float(cs["north_r"][-1]),
    )

    vel: list[Optional[float]] = [None] * n
    quality: list[Optional[float]] = [None] * n
    depth: list[Optional[float]] = [None] * n
    spectra_entries: list = []
    skipped_dry = 0
    smax_reruns = 0
    depth_at_bound = 0

    for i in range(n):
        if is_dry_window(cs, i, window_m):
            skipped_dry += 1
            if progress is not None:
                progress(i + 1, n)
            continue

        depth_reference = get_window_depth_reference(cs, i, window_m)
        depth_bounds = get_depth_bounds(depth_reference, options.depth_mode)
        crop = _station_window(stack, grid, east[i], north[i], win)
        station_kwargs = dict(
            depth_bounds=depth_bounds, gravity_waves=gravity_waves, penalty_weight=scene.penalty_weight,
        )
        r = _process_station(
            crop, resolution, scene.fps_eff, alpha, time_size, time_overlap, smax=scene.smax, **station_kwargs,
        )
        if r["vy"] is not None and needs_smax_rerun(r["vx"], r["vy"], scene):
            # Pinned against an auto bound: LSPIV and STIV probably both underestimated.
            smax_reruns += 1
            r = _process_station(
                crop, resolution, scene.fps_eff, alpha, time_size, time_overlap, smax=SMAX_MAX, **station_kwargs,
            )

        if r["vy"] is not None:
            # pipeline convention (run_iwave.grid_to_real): v_north = -vy, v_east = vx
            v_e, v_n = r["vx"], -r["vy"]
            if v_e * dir_e + v_n * dir_n < 0:
                v_e, v_n = -v_e, -v_n
            vel[i] = float(v_e * u_stream[0] + v_n * u_stream[1])
            quality[i] = r["quality"]
            depth[i] = r["d"]
            if options.depth_mode == "range" and depth_reference is not None and is_depth_at_bound(r["d"], depth_bounds):
                depth_at_bound += 1
            if spectra_dir is not None and r["slice"] is not None:
                spectra_entries.append(
                    {
                        "station": int(cs["id"][i]),
                        "slice": r["slice"],
                        "kx": r["kx"],
                        "kt": r["kt"],
                        "kt_gw": r["kt_gw"],
                        "kt_turb": r["kt_turb"],
                    }
                )
        if progress is not None:
            progress(i + 1, n)

    if spectra_dir is not None:
        write_spectra(spectra_dir, spectra_entries)

    xsections[current_key]["iwave_velocity_profile"] = vel
    xsections[current_key]["iwave_quality_profile"] = quality
    xsections[current_key]["iwave_depth_profile"] = depth
    xsections[current_key]["iwave_valid_profile"] = get_quality_flags(quality)
    xsections[current_key][IWAVE_PARAMS_KEY] = build_params_record(
        scene, estimate, options,
        window_px=win, window_m=window_m, time_size=time_size, gravity_waves=gravity_waves,
        depth_at_bound=depth_at_bound, smax_reruns=smax_reruns, skipped_dry=skipped_dry,
    )
    return xsections
