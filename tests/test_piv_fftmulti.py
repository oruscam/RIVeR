"""Tests for the FFT multi-pass PIV (river/core/piv_fftmulti.py).

Dim images are what "Remove background" produces: most pixels end up at zero and
the rest are faint, so the correlation values are small.
"""
import cv2
import numpy as np
import pytest

from river.core.piv_fftmulti import normalize_to_uint8, piv_fftmulti, subpixgauss

IMAGE_SHAPE = (192, 320)
SHIFT_X = 3
SHIFT_Y = 2


def _dim_speckle_image() -> np.ndarray:
	rng = np.random.default_rng(0)
	speckles = (rng.random(IMAGE_SHAPE) > 0.95).astype(np.float32) * 60
	return cv2.GaussianBlur(speckles, (5, 5), 1).astype(np.uint8)


def _run_piv(image_1: np.ndarray, image_2: np.ndarray) -> tuple:
	height, width = image_1.shape
	return piv_fftmulti(
		image_1,
		image_2,
		mask=np.ones_like(image_1),
		bbox=[0, 0, width, height],
		interrogation_area_1=64,
		interrogation_area_2=32,
		standard_filter=False,
		median_test_filter=False,
	)


@pytest.mark.parametrize("correlation_range", [1e1, 1e3, 1e5, 1e9])
def test_normalize_to_uint8_puts_every_window_peak_at_255(correlation_range):
	correlation = np.random.default_rng(0).random((32, 32, 200)) * correlation_range

	normalized = normalize_to_uint8(correlation)

	assert np.all(normalized.max(axis=(0, 1)) == 255)


def test_normalize_to_uint8_keeps_a_flat_window_at_zero():
	correlation = np.full((32, 32, 2), 7.0)

	normalized = normalize_to_uint8(correlation)

	assert np.all(normalized == 0)


def test_piv_recovers_displacement_in_dim_images():
	image_1 = _dim_speckle_image()
	image_2 = np.roll(image_1, (SHIFT_Y, SHIFT_X), axis=(0, 1))

	_, _, utable, vtable, _, _ = _run_piv(image_1, image_2)

	assert np.median(utable) == pytest.approx(SHIFT_X, abs=0.2)
	assert np.median(vtable) == pytest.approx(SHIFT_Y, abs=0.2)


@pytest.mark.filterwarnings("ignore::RuntimeWarning")
def test_piv_does_not_fail_when_no_window_has_a_peak():
	blank = np.zeros(IMAGE_SHAPE, dtype=np.uint8)

	_, _, utable, vtable, _, _ = _run_piv(blank, blank)

	assert np.all(utable == 0)
	assert np.all(vtable == 0)


def test_subpixgauss_keeps_each_vector_at_its_own_window():
	half_ia, subpixoffset = 16, 1
	correlation = np.zeros((32, 32, 3))
	# 1-based peak positions of windows 2 and 3; window 1 has no peak.
	x1, y1, z1 = np.array([20, 12]), np.array([18, 25]), np.array([2, 3])
	for x, y, z in zip(x1 - 1, y1 - 1, z1 - 1):
		correlation[y - 1 : y + 2, x - 1 : x + 2, z] = 100
		correlation[y, x, z] = 255

	vector = subpixgauss(correlation, half_ia, x1, y1, z1, subpixoffset)

	expected = [[0, 0], [20 - 17, 18 - 17], [12 - 17, 25 - 17]]
	np.testing.assert_allclose(vector, expected)


@pytest.mark.filterwarnings("ignore::RuntimeWarning")
def test_piv_keeps_displacement_in_place_next_to_a_blank_area():
	image_1 = _dim_speckle_image()
	image_2 = np.roll(image_1, (SHIFT_Y, SHIFT_X), axis=(0, 1))
	image_1[:, :128] = 0
	image_2[:, :128] = 0

	xtable, _, utable, vtable, _, _ = _run_piv(image_1, image_2)

	textured = xtable > 200
	np.testing.assert_allclose(utable[textured], SHIFT_X, atol=0.3)
	np.testing.assert_allclose(vtable[textured], SHIFT_Y, atol=0.3)
