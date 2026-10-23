"""
Pack GUI reference runs into the portable test-data bundle used by the
multi-OS smoke CI (.github/workflows/smoke.yml).

    python scripts/pack_test_data.py \
        --oblique ~/River/<project>/<run> \
        --uav     ~/River/<project>/<run> \
        --3d      ~/River/<project>/<run> \
        --out river-test-data.zip

Each run is a folder the GUI wrote under ~/River, processed with PIV, STIV and
iWave enabled (the tests replay all three). The source video is read from
its settings.json and trimmed with ffmpeg stream copy (no re-encode, so the
decoded frames match the reference). Keep runs short (~20-60 frames).

Check the bundle before uploading it:

    RIVER_TEST_MANIFEST=<extracted>/manifest.json \
        pytest tests/real_data --realdata --fail-on-skip -m portable
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path, PureWindowsPath

# Files build_workspace() and the tests read from a reference run (optional ones may be absent).
REQUIRED = ["settings.json", "xsections.json"]
OPTIONAL = [
    "transformation_matrix.json", "bbox.json", "mask.npy", "piv_results.json",
    "grp_3d.json", "camera_solution_3d.json",
]
MARGIN_SECONDS = 2  # extra video after the last used frame, so B-frames still decode
MAX_FRAMES = 100


def fail(msg: str) -> None:
    sys.exit(f"error: {msg}")


def strip_paths(value):
    """Absolute paths -> file name, so the bundle does not publish the author's folders."""
    if isinstance(value, dict):
        return {k: strip_paths(v) for k, v in value.items()}
    if isinstance(value, list):
        return [strip_paths(v) for v in value]
    if isinstance(value, str) and (value.startswith("/") or value[1:3] in (":\\", ":/")):
        return PureWindowsPath(value).name  # splits on both / and \
    return value


def pack_run(run: Path, kind: str, dest: Path) -> dict:
    for name in REQUIRED:
        if not (run / name).exists():
            fail(f"{run} has no {name}: is it a GUI run folder?")
    dest.mkdir(parents=True)
    settings = json.loads((run / "settings.json").read_text(encoding="utf-8"))
    vr = settings["video_range"]
    n_frames = (vr["end"] - vr["start"]) // vr["step"]
    if n_frames > MAX_FRAMES:
        print(f"warning: {run.name} uses {n_frames} frames; CI runs 3 OSes, keep it short")

    for name in REQUIRED[1:] + OPTIONAL:
        if (run / name).exists():
            shutil.copy2(run / name, dest / name)
    if kind == "3d" and not (dest / "grp_3d.json").exists():
        fail(f"{run} is a 3D run without grp_3d.json")

    # Bathymetry: ship it next to the run and keep only its file name (the tests resolve it there).
    xs = json.loads((run / "xsections.json").read_text(encoding="utf-8"))
    for key, section in xs.items():
        if key == "summary" or "bath" not in section:
            continue
        src = Path(section["bath"])
        if not src.exists():
            src = run / src.name
        if not src.exists():
            fail(f"bathymetry {section['bath']} not found")
        shutil.copy2(src, dest / src.name)
        section["bath"] = src.name
    (dest / "xsections.json").write_text(json.dumps(xs, indent=2), encoding="utf-8")

    # All frames: the tests feed them to PIV (decoding differs slightly across OSes).
    frames = sorted((run / "frames").glob("*.jpg"))
    if len(frames) != n_frames:
        fail(f"{run} has {len(frames)} frames, settings.json implies {n_frames}")
    shutil.copytree(run / "frames", dest / "frames", ignore=shutil.ignore_patterns(".*"))

    (dest / "settings.json").write_text(json.dumps(settings, indent=2), encoding="utf-8")
    for path in dest.glob("*.json"):
        if path.name != "piv_results.json":  # numbers only, and large
            data = json.loads(path.read_text(encoding="utf-8"))
            path.write_text(json.dumps(strip_paths(data), indent=2), encoding="utf-8")
    return settings


def trim_video(src: Path, dst: Path, last_frame: int, fps: float) -> None:
    if not src.exists():
        fail(f"video {src} not found (path taken from settings.json)")
    dst.parent.mkdir(parents=True, exist_ok=True)
    n = last_frame + int(MARGIN_SECONDS * fps) + 1
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-map", "0:v:0", "-c", "copy",
         "-frames:v", str(n), str(dst)],
        check=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--oblique", type=Path, required=True)
    parser.add_argument("--uav", type=Path, required=True)
    parser.add_argument("--3d", dest="three_d", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=Path("river-test-data.zip"))
    args = parser.parse_args()

    if shutil.which("ffmpeg") is None:
        fail("ffmpeg not found in PATH")

    runs = {"oblique": (args.oblique, "oblique"), "uav": (args.uav, "uav"), "3d": (args.three_d, "3d")}

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp) / "river-test-data"
        manifest: dict = {"version": 1, "datasets": {}}
        videos: dict[Path, tuple[str, int, float]] = {}  # source -> (bundle path, last frame, fps)

        for key, (run, kind) in runs.items():
            reference = f"{key}/reference"
            settings = pack_run(run.expanduser().resolve(), kind, root / reference)
            src = Path(settings["video"]["filepath"])
            rel, last, fps = videos.get(src, (f"videos/{src.name}", 0, settings["video"]["fps"]))
            videos[src] = (rel, max(last, settings["video_range"]["end"]), fps)
            manifest["datasets"][key] = {"kind": kind, "video": rel, "reference": reference}

        for src, (rel, last, fps) in videos.items():
            trim_video(src, root / rel, last, fps)

        (root / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        out = args.out.expanduser().resolve()
        shutil.make_archive(str(out.with_suffix("")), "zip", root.parent, root.name)

    print(f"wrote {out} ({out.stat().st_size / 1e6:.1f} MB)")
    print(f"sha256: {hashlib.sha256(out.read_bytes()).hexdigest()}  (TEST_DATA_SHA256 in smoke.yml)")


if __name__ == "__main__":
    main()
