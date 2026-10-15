import json
from pathlib import Path
from unittest.mock import patch

import cv2
import numpy as np

from river.cli.__main__ import cli
from tests.cli_helpers import make_runner


def _sequence(folder: Path, n=4, w=64, h=48):
	folder.mkdir(parents=True, exist_ok=True)
	for i in range(n):
		cv2.imwrite(str(folder / f"frame_{i + 1}.jpg"), np.full((h, w, 3), i * 20, dtype=np.uint8))


def _run(args):
	# make_runner(): progress goes to stderr, the JSON response to stdout.
	result = make_runner().invoke(cli, args)
	return json.loads(result.stdout)


def test_frames_info_reports_the_folder(tmp_path):
	_sequence(tmp_path / "source", n=3)

	response = _run(["frames-info", str(tmp_path / "source")])

	assert response["error"] == {}
	assert response["data"] == {
		"count": 3,
		"width": 64,
		"height": 48,
		"files": ["frame_1.jpg", "frame_2.jpg", "frame_3.jpg"],
	}


def test_frames_info_returns_the_error_code(tmp_path):
	(tmp_path / "source").mkdir()

	response = _run(["frames-info", str(tmp_path / "source")])

	assert response["error"]["message"] == "noFrames"


def test_frames_to_frames_imports_into_the_project(tmp_path):
	_sequence(tmp_path / "source", n=6)
	frames_dir = tmp_path / "frames"

	response = _run([
		"frames-to-frames", str(tmp_path / "source"), str(frames_dir),
		"--start-frame", "0", "--end-frame", "6", "--every", "2", "--overwrite",
	])

	assert response["error"] == {}
	assert response["data"]["initial_frame"] == str(frames_dir / "0000000000.jpg")
	assert sorted(p.name for p in frames_dir.glob("*.jpg")) == [f"{i:010d}.jpg" for i in (0, 2, 4)]


def test_frames_to_frames_reports_a_bad_frame_by_name(tmp_path):
	_sequence(tmp_path / "source", n=3)
	(tmp_path / "source" / "frame_2.jpg").write_text("not an image")

	response = _run(["frames-to-frames", str(tmp_path / "source"), str(tmp_path / "frames"), "--overwrite"])

	assert response["error"]["message"] == "unreadable:frame_2.jpg"


def test_stabilize_without_regions_returns_error(tmp_path):
	_sequence(tmp_path / "source", n=3)

	response = _run(["frames-to-frames", str(tmp_path / "source"), str(tmp_path / "frames"), "--stabilize"])

	assert "stabilization-regions" in response["error"]["message"].lower()


def test_stabilize_runs_on_the_imported_frames(tmp_path):
	_sequence(tmp_path / "source", n=3)
	frames_dir = tmp_path / "frames"
	regions_path = tmp_path / "regions.json"
	regions_path.write_text(json.dumps({"regions": []}))
	stabilized_dir = tmp_path / "frames_stabilized"
	stabilized_dir.mkdir()
	sanity = stabilized_dir / "sanity_check.jpg"
	sanity.write_bytes(b"fake")

	# The stabilization pass lives in the video command module and is shared.
	with patch("river.cli.commands.video_to_frames.stabilize_frames") as mock_stab:
		mock_stab.return_value = sanity
		response = _run([
			"frames-to-frames", str(tmp_path / "source"), str(frames_dir),
			"--overwrite", "--resize-factor", "0.5",
			"--stabilize", "--stabilization-regions", str(regions_path),
		])

	assert response["error"] == {}
	mock_stab.assert_called_once_with(frames_dir, regions_path, stabilized_dir, scale=0.5)
	assert response["data"]["sanity_check"] == str(tmp_path / "sanity_check.jpg")
