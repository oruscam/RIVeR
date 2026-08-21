"""Orchestrator: run PIV, LSPIV profiles, STIV, and iWave in one pass.

Populates piv_results.json and xsections.json so the Results step is
display-only. The PIV field is skipped when its parameter hash matches the
existing piv_results.json; every other stage always reruns.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Optional

import numpy as np
from tqdm import tqdm

from river.core.compute_section import update_current_x_section
from river.core.iwave_pipeline import IWAVE_COLUMNS, build_ortho_stack, run_iwave_analysis
from river.core.piv_pipeline import run_analyze_all
from river.core.stiv_pipeline import STIV_COLUMNS, load_models, run_stiv_analysis

PIV_HASH_KEY = "_piv_params_hash"


def compute_piv_params_hash(
	image_names: list[str],
	mask: Optional[np.ndarray],
	bbox: Optional[list],
	piv_options: dict,
) -> str:
	"""Hash of everything the PIV field depends on: options, mask, bbox, frame list."""
	h = hashlib.md5()
	h.update(json.dumps(piv_options, sort_keys=True, default=str).encode())
	h.update(json.dumps(bbox).encode() if bbox is not None else b"nobbox")
	h.update(mask.tobytes() if mask is not None else b"nomask")
	h.update(json.dumps(sorted(image_names)).encode())
	return h.hexdigest()


def _strip_columns(xsections: dict, columns: list[str]) -> None:
	for key, section in xsections.items():
		if key == "summary" or not isinstance(section, dict):
			continue
		for col in columns:
			section.pop(col, None)


def _log(msg: str) -> None:
	print(msg, file=sys.stderr, flush=True)


def run_full_analysis(
	frames_dir: Path,
	workdir: Path,
	xsections_path: Path,
	transformation_matrix_path: Path,
	step: int,
	fps: float,
	num_stations_list: Optional[list[int]] = None,
	stiv: bool = True,
	iwave: bool = True,
	interpolate: bool = True,
	mask: Optional[np.ndarray] = None,
	bbox: Optional[list] = None,
	piv_options: Optional[dict] = None,
	height_roi_stiv: float = 6.0,
) -> dict:
	frames_dir = Path(frames_dir)
	workdir = Path(workdir)
	xsections_path = Path(xsections_path)
	piv_options = dict(piv_options or {})
	results_path = workdir / "piv_results.json"
	errors: dict[str, str] = {}

	# ── Stage 1: PIV field (hash-skipped) ───────────────────────────────────
	image_names = sorted(p.name for p in frames_dir.glob("*.jpg"))
	params_hash = compute_piv_params_hash(image_names, mask, bbox, piv_options)
	piv_skipped = False
	if results_path.exists():
		try:
			existing = json.loads(results_path.read_text())
			piv_skipped = existing.get(PIV_HASH_KEY) == params_hash
		except (json.JSONDecodeError, OSError):
			piv_skipped = False
	if piv_skipped:
		_log("PIV: parameters unchanged, reusing existing piv_results.json")
		piv_results = json.loads(results_path.read_text())
	else:
		_log("PIV: computing displacement field")
		piv_results = run_analyze_all(frames_dir, mask, bbox, **piv_options)
		piv_results[PIV_HASH_KEY] = params_hash
		results_path.write_text(json.dumps(piv_results))

	# ── Stage 2: LSPIV per-station profiles ─────────────────────────────────
	xsections = json.loads(xsections_path.read_text())
	transformation_matrix = json.loads(Path(transformation_matrix_path).read_text())
	section_keys = [k for k in xsections if k != "summary"]
	stats_cache_path = xsections_path.parent / "_stats_cache.json"
	stats_cache = json.loads(stats_cache_path.read_text()) if stats_cache_path.exists() else {}
	for i, _key in enumerate(tqdm(section_keys, desc="LSPIV profiles", file=sys.stderr)):
		ns = num_stations_list[i] if num_stations_list and i < len(num_stations_list) else None
		xsections = update_current_x_section(
			xsections, piv_results, transformation_matrix, step, fps, i,
			interpolate, False, None, ns,
			stats_cache=stats_cache,
		)
	stats_cache_path.write_text(json.dumps(stats_cache))

	# ── Stage 3: STIV ───────────────────────────────────────────────────────
	if stiv:
		try:
			models = load_models()
			stis_root = frames_dir.parent / "stis"
			total_stiv_stations = sum(len(xsections[k]["id"]) for k in section_keys)
			with tqdm(total=total_stiv_stations, desc="STIV", file=sys.stderr) as pbar:
				def stiv_progress(current, total):
					pbar.update(1)
				for i, _key in enumerate(section_keys):
					# One folder per cross-section: a flat shared folder made each
					# section overwrite the previous one's sti_<id>.png.
					xsections = run_stiv_analysis(
						xsections=xsections,
						transformation_matrix=transformation_matrix,
						frames_dir=str(frames_dir),
						step=step,
						fps=fps,
						id_section=i,
						height_roi_m=height_roi_stiv,
						models=models,
						stis_dir=str(stis_root / _key),
						progress=stiv_progress,
					)
		except Exception as err:  # noqa: BLE001 — engine failure must not kill the run
			errors["stiv"] = str(err)
			_strip_columns(xsections, STIV_COLUMNS)
			_log(f"STIV failed, continuing without it: {err}")
	else:
		_strip_columns(xsections, STIV_COLUMNS)

	# ── Stage 4: iWave ──────────────────────────────────────────────────────
	if iwave:
		try:
			_log("iWave: warping frames onto ortho grid")
			stack, grid = build_ortho_stack(
				str(frames_dir), transformation_matrix, xsections, bbox=None,
				save_dir=str(frames_dir.parent / "rectified"),
			)
			total_iwave_stations = sum(len(xsections[k]["id"]) for k in section_keys)
			with tqdm(total=total_iwave_stations, desc="iWave", file=sys.stderr) as pbar:
				def iwave_progress(current, total):
					pbar.update(1)
				for i, _key in enumerate(section_keys):
					xsections = run_iwave_analysis(
						xsections=xsections,
						transformation_matrix=transformation_matrix,
						frames_dir=str(frames_dir),
						step=step,
						fps=fps,
						id_section=i,
						stack=stack,
						grid=grid,
						progress=iwave_progress,
					)
		except Exception as err:  # noqa: BLE001
			errors["iwave"] = str(err)
			_strip_columns(xsections, IWAVE_COLUMNS)
			_log(f"iWave failed, continuing without it: {err}")
	else:
		_strip_columns(xsections, IWAVE_COLUMNS)

	xsections_path.write_text(json.dumps(xsections))
	return {"results_path": str(results_path), "piv_skipped": piv_skipped, "errors": errors}
