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
from typing import Callable, Optional

import cv2
import numpy as np

from river.core.stiv_pipeline import _collect_frames

# ---------------------------------------------------------------------------
# Constants (tuned values from analysis/iwave_stations.py)
# ---------------------------------------------------------------------------

MAX_FRAMES = 512
MAX_GRID = 700
EXTENT_MARGIN_M = 2.0
WIN_TARGET_M = 2.5
WIN_MIN = 32
WIN_MAX = 64
SMAX = 4.0
DMIN, DMAX = 0.01, 3.0

IWAVE_COLUMNS = [
    "iwave_velocity_profile",
    "iwave_quality_profile",
    "iwave_depth_profile",
]

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
) -> tuple[np.ndarray, OrthoGrid]:
    """Warp frames onto an ortho grid. Returns (stack uint8 (n, H, W), grid).

    If save_dir is provided, each warped (rectified) frame is also written to
    that directory as a zero-padded JPEG (e.g. "000000.jpg").
    """
    frames = _collect_frames(frames_dir)
    if not frames:
        raise FileNotFoundError(f"No frames (.jpg) found in {frames_dir}")
    frames = frames[:max_frames]

    extent = compute_extent(xsections, transformation_matrix, bbox)
    grid = OrthoGrid(extent=extent, resolution=pick_resolution(extent))
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
# Spectral fit (iwave package)
# ---------------------------------------------------------------------------


def _process_station(
    crop: np.ndarray,
    resolution: float,
    fps_eff: float,
    alpha: float,
    time_size: int,
    time_overlap: int,
) -> dict:
    """Spectral velocity fit for one station window. Returns vy/vx/d/quality (None on failure)."""
    from iwave import spectral, window as iw_window, optimise
    from iwave.iwave import OPTIM_KWARGS_SADE

    win = crop.shape[-1]
    if not np.any(crop):
        return dict(vy=None, vx=None, d=None, quality=None)
    # normalize over time like LazyWindowArray(norm="time"), then flip y so +y = north
    w = iw_window.normalize(crop[None, ...], mode="time")
    w = w[:, :, ::-1, :]
    spec = spectral.sliding_window_spectrum(w, time_size, time_overlap)
    window_dims = (time_size, win, win)
    kt, ky, kx = spectral.wave_numbers(window_dims, resolution, fps_eff)
    spec = spectral.spectrum_preprocessing(spec, kt, ky, kx, SMAX * 3, spectrum_threshold=1.0)
    bnds = ((-SMAX, SMAX), (-SMAX, SMAX), (DMIN, DMAX))
    vy, vx, d, cost, quality, status, msg = optimise.optimize_single_spectrum_velocity(
        spec[0], bnds, alpha, window_dims, resolution, fps_eff,
        penalty_weight=1, gravity_waves_switch=True, turbulence_switch=True,
        pass_downsampling=[2, 1], gauss_width=1, kwargs=dict(OPTIM_KWARGS_SADE),
    )
    return dict(vy=float(vy), vx=float(vx), d=float(d), quality=float(quality))


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
    progress: Optional[Callable[[int, int], None]] = None,
) -> dict:
    """Run iWave spectral velocimetry for one cross-section's stations.

    Adds 3 per-station lists: iwave_velocity_profile (signed streamwise, m/s),
    iwave_quality_profile, iwave_depth_profile. Pass a prebuilt (stack, grid)
    pair to reuse the warped frames across sections.
    """
    section_keys = [k for k in xsections if k != "summary"]
    current_key = section_keys[id_section]
    cs = xsections[current_key]

    if stack is None or grid is None:
        stack, grid = build_ortho_stack(frames_dir, transformation_matrix, xsections, bbox)

    # Effective fps of the extracted frames is raw fps divided by the frame step.
    fps_eff = float(fps) / float(step or 1)
    resolution = grid.resolution
    time_size = min(256, stack.shape[0])
    time_overlap = time_size // 2
    win = int(np.clip(round(WIN_TARGET_M / resolution / 2) * 2, WIN_MIN, WIN_MAX))
    win = min(win, (min(stack.shape[1], stack.shape[2]) // 2) * 2)

    east = [float(e) for e in cs["east"]]
    north = [float(n) for n in cs["north"]]
    n = len(east)
    alpha = float(cs.get("alpha", 0.85))

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

    for i in range(n):
        crop = _station_window(stack, grid, east[i], north[i], win)
        r = _process_station(crop, resolution, fps_eff, alpha, time_size, time_overlap)
        if r["vy"] is not None:
            # pipeline convention (run_iwave.grid_to_real): v_north = -vy, v_east = vx
            v_e, v_n = r["vx"], -r["vy"]
            if v_e * dir_e + v_n * dir_n < 0:
                v_e, v_n = -v_e, -v_n
            vel[i] = float(v_e * u_stream[0] + v_n * u_stream[1])
            quality[i] = r["quality"]
            depth[i] = r["d"]
        if progress is not None:
            progress(i + 1, n)

    xsections[current_key]["iwave_velocity_profile"] = vel
    xsections[current_key]["iwave_quality_profile"] = quality
    xsections[current_key]["iwave_depth_profile"] = depth
    return xsections
