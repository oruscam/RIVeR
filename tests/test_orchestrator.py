"""Tests for the multi-engine orchestrator: PIV hash skip logic and column stripping."""
import json
from pathlib import Path

import numpy as np
import pytest

import river.core.orchestrator as orch
from river.core.orchestrator import compute_piv_params_hash, run_full_analysis


def test_hash_stable_and_sensitive():
	names = ["f0001.jpg", "f0002.jpg"]
	opts = {"interrogation_area_1": 128, "epsilon": 0.02}
	h1 = compute_piv_params_hash(names, None, [0, 0, 10, 10], opts)
	h2 = compute_piv_params_hash(names, None, [0, 0, 10, 10], dict(opts))
	assert h1 == h2
	assert h1 != compute_piv_params_hash(names + ["f0003.jpg"], None, [0, 0, 10, 10], opts)
	assert h1 != compute_piv_params_hash(names, None, [0, 0, 10, 11], opts)
	assert h1 != compute_piv_params_hash(names, None, [0, 0, 10, 10], {**opts, "epsilon": 0.03})
	mask = np.zeros((4, 4), dtype=np.uint8)
	assert h1 != compute_piv_params_hash(names, mask, [0, 0, 10, 10], opts)


@pytest.fixture
def fake_project(tmp_path, monkeypatch):
	frames = tmp_path / "frames"
	frames.mkdir()
	for i in range(3):
		(frames / f"frame_{i:04d}.jpg").write_bytes(b"fake")
	xsections = {
		"CS1": {"alpha": 0.85, "num_stations": 5, "id": [1, 2], "east": [0, 1], "north": [0, 1],
			"stiv_velocity_profile": [0.1, 0.2], "iwave_velocity_profile": [0.3, 0.4],
			"iwave_quality_profile": [0.9, 0.9], "iwave_depth_profile": [1.0, 1.0],
			"stiv_sigma_profile": [0.1, 0.1], "stiv_angle_profile": [45.0, 50.0],
			"stiv_sign_profile": ["positive", "positive"]},
	}
	(tmp_path / "xsections.json").write_text(json.dumps(xsections))
	(tmp_path / "transformation_matrix.json").write_text(json.dumps([[1, 0, 0], [0, 1, 0], [0, 0, 1]]))

	calls = {"piv": 0, "lspiv": 0, "stiv": 0, "iwave": 0}
	monkeypatch.setattr(orch, "run_analyze_all", lambda *a, **k: calls.__setitem__("piv", calls["piv"] + 1) or {"u": [], "v": []})
	def fake_update(xs, piv, tm, step, fps, i, interpolate, seeding, alpha, ns, stats_cache=None):
		calls["lspiv"] += 1
		return xs
	monkeypatch.setattr(orch, "update_current_x_section", fake_update)
	monkeypatch.setattr(orch, "load_models", lambda: ("m", {}, "s", 256))
	def fake_stiv(**kwargs):
		calls["stiv"] += 1
		return kwargs["xsections"]
	monkeypatch.setattr(orch, "run_stiv_analysis", fake_stiv)
	monkeypatch.setattr(orch, "build_ortho_stack", lambda *a, **k: (np.zeros((2, 4, 4), np.uint8), None))
	def fake_iwave(**kwargs):
		calls["iwave"] += 1
		return kwargs["xsections"]
	monkeypatch.setattr(orch, "run_iwave_analysis", fake_iwave)
	return tmp_path, calls


def _run(tmp_path, **kw):
	return run_full_analysis(
		frames_dir=tmp_path / "frames", workdir=tmp_path,
		xsections_path=tmp_path / "xsections.json",
		transformation_matrix_path=tmp_path / "transformation_matrix.json",
		step=1, fps=30.0, **kw,
	)


def test_piv_runs_then_skips(fake_project):
	tmp_path, calls = fake_project
	out1 = _run(tmp_path)
	assert calls["piv"] == 1 and out1["piv_skipped"] is False
	out2 = _run(tmp_path)
	assert calls["piv"] == 1 and out2["piv_skipped"] is True
	assert calls["lspiv"] == 2  # profiles always rerun


def test_engines_off_strip_columns(fake_project):
	tmp_path, calls = fake_project
	_run(tmp_path, stiv=False, iwave=False)
	xs = json.loads((tmp_path / "xsections.json").read_text())
	for col in orch.STIV_COLUMNS + orch.IWAVE_COLUMNS:
		assert col not in xs["CS1"]
	assert calls["stiv"] == 0 and calls["iwave"] == 0


def test_stats_cache_sidecar_read_once_write_once(fake_project, monkeypatch):
	"""Stage 2's `_stats_cache.json` sidecar wiring: read exactly once
	before the loop starts (verified by counting `Path.read_text` calls
	targeting the sidecar, not just by inspecting the values the loop
	body observes — those would look identical whether the sidecar was
	read once before the loop or re-read unchanged on every iteration),
	and written back exactly once after the loop — not per-section."""
	tmp_path, calls = fake_project

	# A second section makes "written once, not per-section" a meaningful
	# assertion (with only one section the two are indistinguishable).
	xsections = json.loads((tmp_path / "xsections.json").read_text())
	xsections["CS2"] = dict(xsections["CS1"])
	(tmp_path / "xsections.json").write_text(json.dumps(xsections))

	seeded_cache = {"CS1": {"geometry_hash": "preexisting-hash", "dense_distances": [1.0, 2.0]}}
	sidecar_path = tmp_path / "_stats_cache.json"
	sidecar_path.write_text(json.dumps(seeded_cache))

	seen_stats_cache = []
	write_calls = []
	read_calls = []
	original_write_text = Path.write_text
	original_read_text = Path.read_text

	def counting_write_text(self, data, *a, **k):
		if self.name == "_stats_cache.json":
			write_calls.append(data)
		return original_write_text(self, data, *a, **k)
	monkeypatch.setattr(Path, "write_text", counting_write_text)

	def counting_read_text(self, *a, **k):
		if self.name == "_stats_cache.json":
			read_calls.append(self)
		return original_read_text(self, *a, **k)
	monkeypatch.setattr(Path, "read_text", counting_read_text)

	def fake_update(xs, piv, tm, step, fps, i, interpolate, seeding, alpha, ns, stats_cache=None):
		calls["lspiv"] += 1
		seen_stats_cache.append(dict(stats_cache))
		return xs
	monkeypatch.setattr(orch, "update_current_x_section", fake_update)

	_run(tmp_path)

	# Sidecar was read once before the loop: every call sees the same
	# pre-existing content (not progressively empty/re-read per section).
	assert calls["lspiv"] == 2  # sanity: loop actually ran once per section
	assert len(seen_stats_cache) == 2
	assert all(sc == seeded_cache for sc in seen_stats_cache)

	# Sidecar was read back exactly once, before the loop. (This is the
	# assertion that actually distinguishes "read once before the loop"
	# from "re-read unchanged on every iteration" — the seen_stats_cache
	# check above cannot, since an unmutated file returns identical
	# content on every re-read.)
	assert len(read_calls) == 1

	# Sidecar was written back exactly once, after the loop.
	assert len(write_calls) == 1
	assert json.loads(write_calls[0]) == seeded_cache


def test_engine_failure_strips_and_continues(fake_project, monkeypatch):
	tmp_path, calls = fake_project
	def boom(**kwargs):
		raise RuntimeError("stiv exploded")
	monkeypatch.setattr(orch, "run_stiv_analysis", boom)
	out = _run(tmp_path)
	assert "stiv" in out["errors"]
	assert calls["iwave"] >= 1  # iWave still ran
	xs = json.loads((tmp_path / "xsections.json").read_text())
	for col in orch.STIV_COLUMNS:
		assert col not in xs["CS1"]
	for col in orch.IWAVE_COLUMNS:
		assert col in xs["CS1"]
