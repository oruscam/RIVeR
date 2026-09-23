"""Compare iWave against LSPIV in one or more xsections.json files.

Prints, per cross-section: stations compared, median absolute percentage
deviation, Pearson r, and the iWave parameters used. Used to check the
auto-parameter rules against the benchmark cases before/after a change.

Usage:
	python scripts/compare_iwave_vs_lspiv.py before/xsections.json after/xsections.json

Created: 2026-09-23
Author: Antoine Patalano
"""
import json
import sys
from pathlib import Path
from typing import List

import numpy as np

_repo_root = Path(__file__).resolve().parent.parent
if str(_repo_root) not in sys.path:
	sys.path.insert(0, str(_repo_root))

from river.core.iwave_params import get_section_items, to_float_array  # noqa: E402


def compare_file(xsections_path: Path, valid_only: bool) -> List[str]:
	"""Build one report line per cross-section.

	Args:
		xsections_path (Path): Path to an xsections.json.
		valid_only (bool): Keep only stations flagged iwave_valid_profile.

	Returns:
		List[str]: Report lines.
	"""
	xsections = json.loads(xsections_path.read_text())
	lines = []
	for index, section in enumerate(get_section_items(xsections)):
		iwave = to_float_array(section.get("iwave_velocity_profile"))
		lspiv = to_float_array(section.get("streamwise_velocity_magnitude"))
		if iwave is None or lspiv is None:
			lines.append(f"{xsections_path} section {index}: missing iWave or LSPIV columns")
			continue
		keep = np.isfinite(iwave) & np.isfinite(lspiv) & (np.abs(lspiv) > 0.05)
		if valid_only and section.get("iwave_valid_profile") is not None:
			keep &= np.array([flag is True for flag in section["iwave_valid_profile"]])
		if keep.sum() < 3:
			lines.append(f"{xsections_path} section {index}: fewer than 3 comparable stations")
			continue
		deviation = np.abs(np.abs(iwave[keep]) - np.abs(lspiv[keep])) / np.abs(lspiv[keep]) * 100
		correlation = float(np.corrcoef(np.abs(iwave[keep]), np.abs(lspiv[keep]))[0, 1])
		params = section.get("iwave_params", {})
		lines.append(
			f"{xsections_path} section {index}: n={int(keep.sum())} "
			f"medAPE={np.median(deviation):.1f}% r={correlation:.2f} "
			f"window={params.get('window_m', float('nan')):.2f}m smax={params.get('smax', float('nan')):.2f} "
			f"reruns={params.get('smax_reruns', '-')} dry={params.get('skipped_dry', '-')}"
		)
	return lines


if __name__ == "__main__":
	paths = [Path(arg) for arg in sys.argv[1:] if not arg.startswith("--")]
	if not paths:
		print(__doc__)
		sys.exit(1)
	for path in paths:
		for valid_only in (False, True):
			label = "valid only" if valid_only else "all stations"
			print(f"--- {label}")
			print("\n".join(compare_file(path, valid_only)))
