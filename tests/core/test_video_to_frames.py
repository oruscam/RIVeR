import cv2
import numpy as np
import pytest

from river.core.video_to_frames import video_to_frames


def _make_video(path, n=12, w=64, h=48):
	writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"MJPG"), 10, (w, h))
	if not writer.isOpened():
		pytest.skip("MJPG writer not available in this OpenCV build")
	for i in range(n):
		writer.write(np.full((h, w, 3), i * 20, dtype=np.uint8))
	writer.release()


def test_extracts_selected_frames_resized(tmp_path):
	video = tmp_path / "v.avi"
	_make_video(video)
	out = tmp_path / "frames"
	out.mkdir()

	first = video_to_frames(
		video, out, start_frame_number=2, end_frame_number=10, every=2, resize_factor=0.5, overwrite=True
	)

	names = sorted(p.name for p in out.glob("*.jpg"))
	assert names == [f"{i:010d}.jpg" for i in (2, 4, 6, 8)]
	assert first.name == "0000000002.jpg"
	assert cv2.imread(str(first)).shape[:2] == (24, 32)


def test_does_not_rewrite_existing_frames_without_overwrite(tmp_path):
	video = tmp_path / "v.avi"
	_make_video(video)
	out = tmp_path / "frames"
	out.mkdir()
	marker = out / "0000000000.jpg"
	marker.write_bytes(b"keep")

	video_to_frames(video, out, start_frame_number=0, end_frame_number=2, every=1, overwrite=False)

	assert marker.read_bytes() == b"keep"
