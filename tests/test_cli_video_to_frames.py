import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from click.testing import CliRunner

from river.cli.__main__ import cli


def test_stabilize_without_regions_returns_error():
	runner = CliRunner()
	with runner.isolated_filesystem():
		Path("frames").mkdir()
		# Create a dummy video file so the path exists check passes
		Path("video.mp4").write_bytes(b"")
		result = runner.invoke(cli, [
			"video-to-frames", "video.mp4", "frames", "--stabilize"
		])
	response = json.loads(result.output)
	assert response["error"] != {}
	assert "stabilization-regions" in response["error"]["message"].lower()


def test_stabilize_flag_calls_stabilize_frames(tmp_path):
	frames_dir = tmp_path / "frames"
	frames_dir.mkdir()
	video_path = tmp_path / "video.mp4"
	video_path.write_bytes(b"")
	regions_path = tmp_path / "regions.json"
	regions_path.write_text(json.dumps({
		"regions": [
			{"center": [30.0, 30.0], "rect": [25, 25, 35, 35], "win_size": [11, 11]},
			{"center": [70.0, 30.0], "rect": [65, 25, 75, 35], "win_size": [11, 11]},
		]
	}))

	mock_sanity = tmp_path / "frames_stabilized" / "sanity_check.jpg"

	with patch("river.cli.commands.video_to_frames.vtf") as mock_vtf, \
		 patch("river.cli.commands.video_to_frames.stabilize_frames") as mock_stab:
		mock_vtf.return_value = frames_dir / "0000000000.jpg"
		mock_stab.return_value = mock_sanity

		runner = CliRunner()
		result = runner.invoke(cli, [
			"video-to-frames", str(video_path), str(frames_dir),
			"--stabilize", "--stabilization-regions", str(regions_path),
		])

	response = json.loads(result.output)
	assert response["error"] == {}

	expected_stabilized_dir = frames_dir.parent / (frames_dir.name + "_stabilized")
	mock_stab.assert_called_once_with(frames_dir, regions_path, expected_stabilized_dir)

	assert "stabilized_dir" in response["data"]
	assert "sanity_check" in response["data"]


def test_no_stabilize_flag_does_not_call_stabilize_frames(tmp_path):
	frames_dir = tmp_path / "frames"
	frames_dir.mkdir()
	video_path = tmp_path / "video.mp4"
	video_path.write_bytes(b"")

	with patch("river.cli.commands.video_to_frames.vtf") as mock_vtf, \
		 patch("river.cli.commands.video_to_frames.stabilize_frames") as mock_stab:
		mock_vtf.return_value = frames_dir / "0000000000.jpg"

		runner = CliRunner()
		result = runner.invoke(cli, [
			"video-to-frames", str(video_path), str(frames_dir),
		])

	mock_stab.assert_not_called()
	response = json.loads(result.output)
	assert "stabilized_dir" not in response.get("data", {})
