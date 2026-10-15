import cv2 as cv
import numpy as np

from river.core.camera_calibration import RiverCalibrator


def _synthetic_views(cal, size=(1600, 1000), n=8):
	board_img = cal.board.generateImage((1400, 1000), marginSize=20)
	w, h = size
	rng = np.random.default_rng(0)
	views = []
	for _ in range(n):
		dx, dy = rng.uniform(-60, 60, 2)
		src = np.float32([[0, 0], [1400, 0], [1400, 1000], [0, 1000]])
		dst = np.float32([[100 + dx, 0 + dy], [1500 - dx, 40 + dy], [1500 + dx, 960 - dy], [100 - dx, 1000 - dy]])
		M = cv.getPerspectiveTransform(src, dst)
		views.append(cv.warpPerspective(board_img, M, (w, h), borderValue=255))
	return views


def test_profile_is_saved_at_original_resolution(tmp_path):
	cal = RiverCalibrator(max_side=800, min_ids=6, blur_threshold=0.0)
	paths = []
	for i, v in enumerate(_synthetic_views(cal)):
		p = tmp_path / f"v{i}.png"
		cv.imwrite(str(p), v)
		paths.append(str(p))

	result, _, (K_small, _, _, _) = cal.run_from_images(paths)

	assert tuple(result.image_size) == (1600, 1000)
	assert np.allclose(result.K[:2, :], K_small[:2, :] * 2.0)
