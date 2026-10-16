import ctypes
import glob
import importlib.util
import os
import sys

__version__ = "3.8.1"

# rocket_fft loads its .pyd through llvmlite, which ignores the os.add_dll_directory() that
# delvewheel relies on; preload its vendored DLLs so numba can compile np.fft (needed by iWave).
if sys.platform == "win32" and (_spec := importlib.util.find_spec("rocket_fft")):
    for _dll in glob.glob(os.path.join(os.path.dirname(_spec.origin), "..", "rocket_fft.libs", "*.dll")):
        try:
            ctypes.WinDLL(_dll)
        except OSError:
            pass  # only iWave fails then; never block the other engines
