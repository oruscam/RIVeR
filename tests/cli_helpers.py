from click.testing import CliRunner


def make_runner():
	"""CliRunner whose result.stdout holds only stdout (progress goes to stderr).

	click < 8.2 needs mix_stderr=False for that; click >= 8.2 removed the
	argument and always keeps the streams separate.
	"""
	try:
		return CliRunner(mix_stderr=False)
	except TypeError:
		return CliRunner()
