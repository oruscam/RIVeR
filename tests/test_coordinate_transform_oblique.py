import cv2
import numpy as np
import pytest

from river.core.coordinate_transform import oblique_view_transformation_matrix

# Real control points/distances measured for a steep, ground-level oblique
# river-bank camera. The reconstructed real-world quadrilateral for these
# points only spans north (Y) in roughly [0, 4], but the buggy extent
# calculation derives the output canvas from the axis-aligned pixel bounding
# box's corners (two of which aren't real observed points), which for this
# steep an oblique view get projected far outside the actual scene.
PIX_COORDS = (
	427.9439485009069, 635.3594050085358,
	1066.4188924849734, 41.27040233110751,
	558.8256041440676, 116.08635345164846,
	124.05306398264395, 489.38362953795746,
)
RW_DISTANCES = (7.13, 4.12, 6.64, 0.73, 7.3, 6.76)


@pytest.fixture
def sample_frame(tmp_path):
	image_path = tmp_path / "frame.jpg"
	frame = np.full((720, 1280, 3), (60, 90, 40), dtype=np.uint8)
	cv2.imwrite(str(image_path), frame)
	return str(image_path)


def test_oblique_rectification_covers_most_of_the_control_point_quadrilateral(sample_frame):
	result = oblique_view_transformation_matrix(
		*PIX_COORDS,
		*RW_DISTANCES,
		image_path=sample_frame,
		roi_padding=0.0,
	)

	transformed_img = result["transformed_img"]
	valid_fraction = (transformed_img[:, :, 3] > 0).mean()

	assert valid_fraction > 0.5, (
		f"Only {valid_fraction:.1%} of the rectified canvas contains real image data; "
		"the output extent is likely dominated by synthetic bounding-box corners "
		"instead of the actual control-point quadrilateral."
	)
