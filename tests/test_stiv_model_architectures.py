"""Tests for river.core.stiv_model.models architecture additions."""
import torch

from river.core.stiv_model.models import get_model


def test_wide5blockaa_forward_shape():
	model = get_model("Wide5BlockAA", input_channels=1, input_height=256, input_width=256)
	model.eval()
	x = torch.zeros(2, 1, 256, 256)
	with torch.no_grad():
		out = model(x)
	assert out.shape == (2, 1)


def test_wide5blockaa_output_in_tanh_half_range():
	model = get_model("Wide5BlockAA", input_channels=1, input_height=256, input_width=256)
	model.eval()
	x = torch.randn(4, 1, 256, 256)
	with torch.no_grad():
		out = model(x)
	assert bool((out >= -0.5).all() and (out <= 0.5).all())


def test_unknown_model_name_raises():
	import pytest
	with pytest.raises(ValueError):
		get_model("NotAModel")
