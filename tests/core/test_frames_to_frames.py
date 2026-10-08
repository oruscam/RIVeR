import cv2
import numpy as np
import pytest

from river.core.exceptions import RiverCoreException
from river.core.frames_to_frames import (
	frames_to_frames,
	inspect_frames,
	list_source_frames,
	selected_indices,
)


def _image(path, w=64, h=48, value=0, channels=3):
	shape = (h, w) if channels == 1 else (h, w, channels)
	assert cv2.imwrite(str(path), np.full(shape, value, dtype=np.uint8))


def _sequence(folder, n=10, **kwargs):
	folder.mkdir(parents=True, exist_ok=True)
	for i in range(n):
		_image(folder / f"frame_{i + 1}.jpg", value=i * 20, **kwargs)


def test_natural_order_and_accepted_extensions(tmp_path):
	_image(tmp_path / "frame_10.jpg")
	_image(tmp_path / "frame_2.JPG")
	_image(tmp_path / "frame_1.png")
	_image(tmp_path / ".hidden.jpg")
	(tmp_path / "notes.txt").write_text("x")
	(tmp_path / "sub").mkdir()
	_image(tmp_path / "sub" / "frame_0.jpg")

	names = [p.name for p in list_source_frames(tmp_path)]

	assert names == ["frame_1.png", "frame_2.JPG", "frame_10.jpg"]


def test_inspect_reports_count_size_and_ordered_files(tmp_path):
	_sequence(tmp_path, n=3)

	info = inspect_frames(tmp_path)

	assert info == {
		"count": 3,
		"width": 64,
		"height": 48,
		"files": ["frame_1.jpg", "frame_2.jpg", "frame_3.jpg"],
	}


def test_inspect_rejects_fewer_than_two_images(tmp_path):
	_image(tmp_path / "only.jpg")
	with pytest.raises(RiverCoreException, match="^noFrames$"):
		inspect_frames(tmp_path)


def test_inspect_rejects_first_and_last_of_different_size(tmp_path):
	_image(tmp_path / "a_1.jpg")
	_image(tmp_path / "a_2.jpg", w=32, h=24)
	with pytest.raises(RiverCoreException, match="^mixedSizes$"):
		inspect_frames(tmp_path)


# The same cases live in gui/commons/framesSource.test.ts (selectedFrameCount):
# the summary line must count exactly what is written here.
@pytest.mark.parametrize(
	"start,end,every,expected",
	[
		(0, 10, 1, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
		(4, 10, 2, [4, 6, 8]),
		(5, 10, 2, [6, 8]),
		(0, 10, 3, [0, 3, 6, 9]),
		(1, 2, 5, []),
		(0, None, 4, [0, 4, 8]),
		(0, 50, 5, [0, 5]),
	],
)
def test_selected_indices(start, end, every, expected):
	assert selected_indices(start, end, every, count=10) == expected


def test_imports_range_and_step_in_source_order(tmp_path):
	source = tmp_path / "source"
	_sequence(source, n=10)
	out = tmp_path / "frames"
	out.mkdir()

	first = frames_to_frames(source, out, start_frame_number=2, end_frame_number=8, every=2, overwrite=True)

	assert sorted(p.name for p in out.glob("*")) == [f"{i:010d}.jpg" for i in (2, 4, 6)]
	assert first == out / "0000000002.jpg"
	# frame_5.jpg (index 4) was written with value 80: order is natural, not lexical.
	assert abs(float(cv2.imread(str(out / "0000000004.jpg")).mean()) - 80) < 3


def test_resize_factor_scales_output(tmp_path):
	source = tmp_path / "source"
	_sequence(source, n=3)
	out = tmp_path / "frames"
	out.mkdir()

	first = frames_to_frames(source, out, resize_factor=0.5, overwrite=True)

	assert cv2.imread(str(first)).shape[:2] == (24, 32)


def test_end_beyond_folder_is_clamped(tmp_path):
	source = tmp_path / "source"
	_sequence(source, n=4)
	out = tmp_path / "frames"
	out.mkdir()

	frames_to_frames(source, out, start_frame_number=0, end_frame_number=240, overwrite=True)

	assert len(list(out.glob("*.jpg"))) == 4


def test_range_with_nothing_left_fails(tmp_path):
	source = tmp_path / "source"
	_sequence(source, n=4)
	out = tmp_path / "frames"
	out.mkdir()

	with pytest.raises(RiverCoreException, match="^emptySelection$"):
		frames_to_frames(source, out, start_frame_number=100, end_frame_number=240)
	assert list(out.glob("*")) == []


def test_a_frame_of_another_size_stops_the_import(tmp_path):
	source = tmp_path / "source"
	_sequence(source, n=4)
	_image(source / "frame_3.jpg", w=32, h=24)
	out = tmp_path / "frames"
	out.mkdir()

	with pytest.raises(RiverCoreException, match=r"^mixedSizes:frame_3\.jpg$"):
		frames_to_frames(source, out, overwrite=True)


def test_an_unreadable_frame_stops_the_import(tmp_path):
	source = tmp_path / "source"
	_sequence(source, n=3)
	(source / "frame_2.jpg").write_text("not an image")
	out = tmp_path / "frames"
	out.mkdir()

	with pytest.raises(RiverCoreException, match=r"^unreadable:frame_2\.jpg$"):
		frames_to_frames(source, out, overwrite=True)


@pytest.mark.parametrize("channels", [1, 4])
def test_grayscale_and_alpha_png_become_three_channel_jpeg(tmp_path, channels):
	source = tmp_path / "source"
	source.mkdir()
	for i in range(2):
		_image(source / f"f_{i}.png", value=120, channels=channels)
	out = tmp_path / "frames"
	out.mkdir()

	first = frames_to_frames(source, out, overwrite=True)

	written = cv2.imread(str(first), cv2.IMREAD_UNCHANGED)
	assert written.shape == (48, 64, 3)
