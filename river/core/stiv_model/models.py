import torch.nn as nn


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


def get_model(model_name: str, **kwargs):
	"""Instantiate a model by name. Supported: GELUModel5Block, SignClassifier5Block."""
	h = kwargs.get("input_height", 256)
	w = kwargs.get("input_width", 256)
	c = kwargs.get("input_channels", 1)
	if model_name == "GELUModel5Block":
		return GELUModel5Block(input_channels=c, input_height=h, input_width=w)
	if model_name == "SignClassifier5Block":
		return SignClassifier5Block(input_channels=c, input_height=h, input_width=w)
	raise ValueError(f"Unknown model: {model_name!r}")
