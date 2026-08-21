import torch
import torch.nn as nn
import torch.nn.functional as F


class GELUModel5Block(nn.Module):
	"""GELUModel with a 5th conv+pool block for 256×256 inputs."""
	def __init__(self, input_channels=1, input_height=256, input_width=256, l2_lambda=0.0):
		super().__init__()
		self.conv_layers = nn.Sequential(
			nn.Conv2d(input_channels, 32, kernel_size=3, padding=1),
			nn.GELU(), nn.BatchNorm2d(32), nn.MaxPool2d(2, 2),
			nn.Conv2d(32, 64, kernel_size=3, padding=1),
			nn.GELU(), nn.BatchNorm2d(64), nn.MaxPool2d(2, 2),
			nn.Conv2d(64, 128, kernel_size=3, padding=1),
			nn.GELU(), nn.BatchNorm2d(128), nn.MaxPool2d(2, 2),
			nn.Conv2d(128, 128, kernel_size=3, padding=1),
			nn.GELU(), nn.BatchNorm2d(128), nn.MaxPool2d(2, 2),
			nn.Conv2d(128, 128, kernel_size=3, padding=1),
			nn.GELU(), nn.BatchNorm2d(128), nn.MaxPool2d(2, 2),
		)
		self.gap = nn.AdaptiveAvgPool2d((1, 1))
		self.fc_layers = nn.Sequential(
			nn.Linear(128, 128), nn.GELU(), nn.BatchNorm1d(128), nn.Dropout(0.3),
			nn.Linear(128, 1), nn.Tanh(),
		)

	def forward(self, x):
		x = self.conv_layers(x)
		x = self.gap(x)
		x = x.view(x.size(0), -1)
		return self.fc_layers(x) * 0.5


class SignClassifier5Block(nn.Module):
	"""5-block sign classifier for 256×256 input. Output shape: (B, 3) raw logits."""
	def __init__(self, input_channels=1, input_height=256, input_width=256, l2_lambda=0.0):
		super().__init__()
		self.conv_layers = nn.Sequential(
			nn.Conv2d(input_channels, 32, kernel_size=3, padding=1),
			nn.GELU(), nn.BatchNorm2d(32), nn.MaxPool2d(2, 2),
			nn.Conv2d(32, 64, kernel_size=3, padding=1),
			nn.GELU(), nn.BatchNorm2d(64), nn.MaxPool2d(2, 2),
			nn.Conv2d(64, 128, kernel_size=3, padding=1),
			nn.GELU(), nn.BatchNorm2d(128), nn.MaxPool2d(2, 2),
			nn.Conv2d(128, 128, kernel_size=3, padding=1),
			nn.GELU(), nn.BatchNorm2d(128), nn.MaxPool2d(2, 2),
			nn.Conv2d(128, 128, kernel_size=3, padding=1),
			nn.GELU(), nn.BatchNorm2d(128), nn.MaxPool2d(2, 2),
		)
		self.gap = nn.AdaptiveAvgPool2d((1, 1))
		self.fc_layers = nn.Sequential(
			nn.Linear(128, 128), nn.GELU(), nn.BatchNorm1d(128), nn.Dropout(0.3),
			nn.Linear(128, 3),
		)

	def forward(self, x):
		x = self.conv_layers(x)
		x = self.gap(x)
		x = x.view(x.size(0), -1)
		return self.fc_layers(x)


class BlurPool2d(nn.Module):
	"""Fixed [1,2,1]x[1,2,1] blur, stride 2, depthwise. Use after MaxPool2d(2, stride=1)."""

	def __init__(self, channels):
		super().__init__()
		k = torch.tensor([1.0, 2.0, 1.0])
		k = k[:, None] * k[None, :]
		k = k / k.sum()
		self.register_buffer("kernel", k.expand(channels, 1, 3, 3).clone())
		self.channels = channels

	def forward(self, x):
		return F.conv2d(x, self.kernel, stride=2, padding=1, groups=self.channels)


def _wide5block_aa_layer(cin, cout):
	return [
		nn.Conv2d(cin, cout, kernel_size=3, padding=1), nn.GELU(), nn.BatchNorm2d(cout),
		nn.MaxPool2d(2, stride=1), BlurPool2d(cout),
	]


class Wide5BlockAA(nn.Module):
	"""5-block GELU backbone (32,64,128,192,256 channels) with anti-aliased
	downsampling (Zhang 2019 BlurPool) + GAP + scalar Tanh head (x0.5).

	Ported from sti_training/08_champion256/models256.py — this is the
	`_Scalar5Block` base specialized to the Wide5BlockAA channel plan, since
	only this one arm is deployed here (Control5Block/Wide5Block are not).
	"""

	def __init__(self, input_channels=1, input_height=256, input_width=256, l2_lambda=0.0):
		super().__init__()
		channels = (32, 64, 128, 192, 256)
		layers = []
		cin = input_channels
		for cout in channels:
			layers += _wide5block_aa_layer(cin, cout)
			cin = cout
		self.conv_layers = nn.Sequential(*layers)
		self.gap = nn.AdaptiveAvgPool2d((1, 1))
		self.fc_layers = nn.Sequential(
			nn.Linear(channels[-1], 128),
			nn.GELU(),
			nn.BatchNorm1d(128),
			nn.Dropout(0.3),
			nn.Linear(128, 1),
			nn.Tanh(),
		)

	def forward(self, x):
		x = self.conv_layers(x)
		x = self.gap(x)
		x = x.view(x.size(0), -1)
		return self.fc_layers(x) * 0.5


def get_model(model_name: str, **kwargs):
	"""Instantiate a model by name. Supported: GELUModel5Block, SignClassifier5Block, Wide5BlockAA."""
	h = kwargs.get("input_height", 256)
	w = kwargs.get("input_width", 256)
	c = kwargs.get("input_channels", 1)
	if model_name == "GELUModel5Block":
		return GELUModel5Block(input_channels=c, input_height=h, input_width=w)
	if model_name == "SignClassifier5Block":
		return SignClassifier5Block(input_channels=c, input_height=h, input_width=w)
	if model_name == "Wide5BlockAA":
		return Wide5BlockAA(input_channels=c, input_height=h, input_width=w)
	raise ValueError(f"Unknown model: {model_name!r}")
