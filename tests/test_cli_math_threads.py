"""The CLI must limit OpenBLAS to one thread before NumPy or SciPy are loaded.

PIV starts one process per core, so a thread pool in every process stalls the run.
"""
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

import pytest

REPOSITORY_DIR = Path(__file__).parent.parent

# Prints the setting at the moment NumPy is first imported, which is when OpenBLAS reads it.
PROBE = """
import os
import sys


class NumpyImportSpy:
	def find_spec(self, name, path=None, target=None):
		if name == "numpy":
			sys.meta_path.remove(self)
			print(os.environ.get("OPENBLAS_NUM_THREADS"))
		return None


sys.meta_path.insert(0, NumpyImportSpy())
import river.cli.__main__
os._exit(0)
"""


def _setting_when_numpy_loads(preset: Optional[str]) -> str:
	env = {key: value for key, value in os.environ.items() if key != "OPENBLAS_NUM_THREADS"}
	if preset is not None:
		env["OPENBLAS_NUM_THREADS"] = preset
	env["PYTHONPATH"] = str(REPOSITORY_DIR)

	completed = subprocess.run(
		[sys.executable, "-c", "import sys; sys.stdout.reconfigure(line_buffering=True)\n" + PROBE],
		cwd=REPOSITORY_DIR,
		env=env,
		capture_output=True,
		text=True,
		check=True,
		timeout=120,
	)
	return completed.stdout.splitlines()[0]


@pytest.mark.parametrize("preset, expected", [(None, "1"), ("4", "4")])
def test_cli_sets_one_math_thread_unless_the_user_chose(preset, expected):
	assert _setting_when_numpy_loads(preset) == expected
