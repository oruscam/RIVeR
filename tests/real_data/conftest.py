"""
Real-data regression suite.

Opt-in: these tests need the field data and the reference results that live on
the developer's machine, so they are skipped unless ``--realdata`` is passed.

    pytest tests/real_data --realdata                  # everything
    pytest tests/real_data --realdata -m "not slow"    # skip the 840-frame 3D run
    pytest tests/real_data --realdata -k oblique       # one dataset
"""
import pytest

from tests.real_data.helpers import DATA_DIR, DATASETS, REFERENCE_DIR, build_workspace


def pytest_addoption(parser):
    parser.addoption("--realdata", action="store_true", default=False, help="Run the real-data regression tests.")


def pytest_configure(config):
    config.addinivalue_line("markers", "realdata: needs real field data and reference results (use --realdata)")
    config.addinivalue_line("markers", "slow: takes several minutes")


def pytest_collection_modifyitems(config, items):
    if config.getoption("--realdata"):
        return
    skip = pytest.mark.skip(reason="real-data tests are opt-in: pass --realdata")
    for item in items:
        if "real_data" in item.nodeid.replace("\\", "/"):
            item.add_marker(skip)


@pytest.fixture(scope="session", autouse=True)
def _require_data_dirs(request):
    if not request.config.getoption("--realdata"):
        return
    for path in (DATA_DIR, REFERENCE_DIR):
        if not path.exists():
            pytest.skip(f"{path} not found (set RIVER_TEST_DATA / RIVER_TEST_REFERENCE)")


def _dataset_params():
    return [
        pytest.param(key, id=key, marks=[pytest.mark.slow] if ds.slow else [])
        for key, ds in DATASETS.items()
    ]


@pytest.fixture(scope="session")
def workspaces(tmp_path_factory):
    """Factory ``workspaces("uav")``: runs that dataset's pipeline once per session."""
    cache = {}

    def get(key):
        if key not in cache:
            ds = DATASETS[key]
            if not ds.available:
                pytest.skip(f"missing data for {key}: {ds.video_path} / {ds.ref_dir}")
            cache[key] = build_workspace(ds, tmp_path_factory.mktemp(f"river_{key}"))
        return cache[key]

    return get


@pytest.fixture(params=_dataset_params())
def workspace(request, workspaces):
    """The processed pipeline of each footage type (oblique, uav, 3d)."""
    return workspaces(request.param)
