"""
Pytest configuration for the test suite.

Several C-extension / optional dependencies (pyfftw, numba, tablib) may be
missing or incompatible with the Python / NumPy version in some development
environments. We stub them out here, but only when a real import genuinely
fails — checking `name not in sys.modules` alone (the previous approach) is
not a "not installed" check: it's true for every module nothing has imported
yet, so it stubbed these unconditionally even in environments where all three
are properly installed, silently shadowing the real packages for the rest of
the test session. Only the CLI integration tests require the stubs; the
core-level tests do not import the CLI entry-point.
"""
import importlib
import os
import sys
import types

# river.cli.commands.utils.render_response calls os._exit(0) after every CLI
# command, to work around a native segfault-on-teardown bug (see that file's
# comment) — safe when each invocation is its own OS subprocess (production),
# fatal to the whole test run when a command is invoked in-process via
# Click's CliRunner (tests). Setting this once here, before any test imports
# river.cli, lets render_response skip the hard exit under pytest.
os.environ["RIVER_CLI_TESTING"] = "1"


def _real_import_ok(name: str) -> bool:
	"""True if `name` can actually be imported in this environment."""
	try:
		importlib.import_module(name)
		return True
	except Exception:
		return False


# ---------------------------------------------------------------------------
# Stub pyfftw
# pyfftw.interfaces.scipy_fft must expose __ua_domain__ so that
# scipy.fft.set_global_backend() accepts it without error.
# ---------------------------------------------------------------------------
if not _real_import_ok("pyfftw"):
	pyfftw_mod = types.ModuleType("pyfftw")

	interfaces_mod = types.ModuleType("pyfftw.interfaces")
	cache_mod = types.ModuleType("pyfftw.interfaces.cache")
	cache_mod.enable = lambda: None

	scipy_fft_mod = types.ModuleType("pyfftw.interfaces.scipy_fft")
	scipy_fft_mod.__ua_domain__ = "numpy.scipy.fft"

	interfaces_mod.cache = cache_mod
	interfaces_mod.scipy_fft = scipy_fft_mod

	pyfftw_mod.interfaces = interfaces_mod
	pyfftw_mod.config = types.SimpleNamespace(NUM_THREADS=1)

	sys.modules["pyfftw"] = pyfftw_mod
	sys.modules["pyfftw.interfaces"] = interfaces_mod
	sys.modules["pyfftw.interfaces.cache"] = cache_mod
	sys.modules["pyfftw.interfaces.scipy_fft"] = scipy_fft_mod

# ---------------------------------------------------------------------------
# Stub numba
# numba raises ImportError when NumPy > 2.1 is present.
# We only need the `jit` decorator for import-time use in compute_section.
# ---------------------------------------------------------------------------
if not _real_import_ok("numba"):
	numba_mod = types.ModuleType("numba")
	# Provide a no-op @jit decorator
	numba_mod.jit = lambda *args, **kwargs: (lambda f: f) if not args else args[0]
	sys.modules["numba"] = numba_mod

# ---------------------------------------------------------------------------
# Stub tablib
# tablib is not installed in some dev environments; compute_section imports
# tablib.Dataset at module level.
# ---------------------------------------------------------------------------
if not _real_import_ok("tablib"):
	tablib_mod = types.ModuleType("tablib")
	tablib_mod.Dataset = object
	sys.modules["tablib"] = tablib_mod
