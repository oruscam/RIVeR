"""
Benchmark: old (always recompute) vs new (cached) stats in update_current_x_section.

Usage:
    python scripts/benchmark_xsection.py /path/to/session/

The session folder must contain:
    piv_results.json, transformation_matrix.json, xsections.json, settings.json
"""

import copy
import json
import sys
import time
from pathlib import Path

import numpy as np

# Ensure we import from the local repo, not an installed package that may point elsewhere.
_repo_root = Path(__file__).resolve().parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

# Force the local river package by removing any previously cached version
for _mod in list(sys.modules):
    if _mod == "river" or _mod.startswith("river."):
        del sys.modules[_mod]

from river.core.compute_section import update_current_x_section


def load_session(session_path: Path) -> tuple[dict, dict, dict, int, float]:
    xsections = json.loads((session_path / "xsections.json").read_text())
    piv_results = json.loads((session_path / "piv_results.json").read_text())
    transformation_matrix = json.loads((session_path / "transformation_matrix.json").read_text())
    settings = json.loads((session_path / "settings.json").read_text())
    step = settings["video_range"]["step"]
    fps = settings["video"]["fps"]
    return xsections, piv_results, transformation_matrix, step, fps


def strip_cache(xsections: dict) -> dict:
    """Remove _stats_cache and computed stats from all sections."""
    result = copy.deepcopy(xsections)
    stats_keys = [
        "_stats_cache", "minus_std", "plus_std", "5th_percentile",
        "95th_percentile", "seeded_vel_profile",
    ]
    for section_name, section in result.items():
        if isinstance(section, dict):
            for key in stats_keys:
                section.pop(key, None)
    return result


def run_call(xsections, piv_results, transformation_matrix, step, fps, num_stations) -> tuple[dict, float]:
    xs = copy.deepcopy(xsections)
    t0 = time.perf_counter()
    result = update_current_x_section(
        xs, piv_results, transformation_matrix,
        step=step, fps=fps, id_section=0,
        interpolate=False, artificial_seeding=False,
        alpha=None, num_stations=num_stations,
    )
    elapsed = time.perf_counter() - t0
    return result, elapsed


def compare_results(old: dict, new: dict, section_name: str, num_stations: int) -> bool:
    keys_to_check = [
        "streamwise_velocity_magnitude",
        "minus_std",
        "plus_std",
        "5th_percentile",
        "95th_percentile",
        "seeded_vel_profile",
        "total_Q",
    ]
    all_close = True
    print(f"\nCorrectness check (second call, num_stations={num_stations}):")
    print(f"  {'Key':<38} {'max diff':>12}  {'status':>6}")
    print(f"  {'-'*38} {'-'*12}  {'-'*6}")

    old_sec = old.get(section_name, {})
    new_sec = new.get(section_name, {})

    for key in keys_to_check:
        if key not in old_sec or key not in new_sec:
            print(f"  {key:<38} {'N/A':>12}  {'SKIP':>6}")
            continue

        old_val = np.array(old_sec[key])
        new_val = np.array(new_sec[key])

        if old_val.shape != new_val.shape:
            print(f"  {key:<38} {'shape mismatch':>12}  {'FAIL':>6}")
            all_close = False
            continue

        diff = float(np.nanmax(np.abs(old_val - new_val)))
        status = "✓" if diff < 0.01 else "✗"
        if diff >= 0.01:
            all_close = False
        print(f"  {key:<38} {diff:>12.6f}  {status:>6}")

    return all_close


def main():
    if len(sys.argv) != 2:
        print("Usage: python scripts/benchmark_xsection.py /path/to/session/")
        sys.exit(1)

    session_path = Path(sys.argv[1])
    if not session_path.exists():
        print(f"Error: {session_path} does not exist")
        sys.exit(1)

    print(f"\nProject: {session_path}")

    xsections, piv_results, transformation_matrix, step, fps = load_session(session_path)
    n_frames = len(piv_results.get("u", []))
    print(f"Frames:  {n_frames}")

    section_name = next(k for k, v in xsections.items() if isinstance(v, dict) and "east_l" in v)

    NUM_STATIONS_1 = 15
    NUM_STATIONS_2 = 25

    print(f"\nRunning benchmark (first call: {NUM_STATIONS_1} stations, second call: {NUM_STATIONS_2} stations)...\n")

    # OLD path: strip cache before every call to force full recompute
    xs_clean = strip_cache(xsections)
    _, old_first = run_call(xs_clean, piv_results, transformation_matrix, step, fps, NUM_STATIONS_1)

    xs_clean2 = strip_cache(xsections)
    old_result, old_second = run_call(xs_clean2, piv_results, transformation_matrix, step, fps, NUM_STATIONS_2)

    # NEW path: first call computes and stores cache, second call reuses it
    xs_new = strip_cache(xsections)
    new_first_result, new_first = run_call(xs_new, piv_results, transformation_matrix, step, fps, NUM_STATIONS_1)
    new_second_result, new_second = run_call(new_first_result, piv_results, transformation_matrix, step, fps, NUM_STATIONS_2)

    col1, col2, col3 = 22, 12, 12
    header = f"{'':>{col1}} | {'First call':>{col2}} | {'Second call':>{col3}}"
    sep    = f"  {'-'*col1}-+-{'-'*col2}-+-{'-'*col3}"
    print(header)
    print(sep)
    print(f"  {'Old (no cache)':>{col1}} | {old_first:>{col2}.2f}s | {old_second:>{col3}.2f}s")
    print(f"  {'New (cached)':>{col1}} | {new_first:>{col2}.2f}s | {new_second:>{col3}.2f}s")

    speedup_first  = old_first  / new_first  if new_first  > 0 else float("inf")
    speedup_second = old_second / new_second if new_second > 0 else float("inf")
    print(f"  {'Speedup':>{col1}} | {speedup_first:>{col2}.1f}x | {speedup_second:>{col3}.1f}x")

    all_close = compare_results(old_result, new_second_result, section_name, NUM_STATIONS_2)

    print(f"\nOverall correctness: {'PASS ✓' if all_close else 'FAIL ✗ — differences exceed 0.01'}")
    sys.exit(0 if all_close else 1)


if __name__ == "__main__":
    main()
