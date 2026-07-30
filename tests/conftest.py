"""
Pytest configuration for the test suite.

Several C-extension / optional dependencies (pyfftw, numba, tablib) are either
not installed or incompatible with the Python / NumPy version in the development
environment.  We stub them out here so that modules that import them at
load-time do not crash during test collection.  Only the CLI integration tests
require this; the core-level tests do not import the CLI entry-point.
"""
import sys
import types

# ---------------------------------------------------------------------------
# Stub pyfftw
# pyfftw.interfaces.scipy_fft must expose __ua_domain__ so that
# scipy.fft.set_global_backend() accepts it without error.
# ---------------------------------------------------------------------------
if "pyfftw" not in sys.modules:
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
if "numba" not in sys.modules:
	numba_mod = types.ModuleType("numba")
	# Provide a no-op @jit decorator
	numba_mod.jit = lambda *args, **kwargs: (lambda f: f) if not args else args[0]
	sys.modules["numba"] = numba_mod

# ---------------------------------------------------------------------------
# Stub tablib
# tablib is not installed in the dev environment; compute_section imports
# tablib.Dataset at module level.
# ---------------------------------------------------------------------------
if "tablib" not in sys.modules:
	tablib_mod = types.ModuleType("tablib")
	tablib_mod.Dataset = object
	sys.modules["tablib"] = tablib_mod
