import sys
from pathlib import Path

import click

from river.cli.commands.utils import render_response
from river.core.camera_calibration import (
    RiverCalibrator,
    _gather_images,
    make_report,
    save_profile,
    write_pattern_png,
)


@click.command(name="camera-calibration", help="Calibrate camera intrinsics from a folder of ChArUco images.")
@click.option("--dir", "images_dir", type=click.Path(exists=True), required=True, help="Folder of calibration images.")
@click.option("--board", type=str, default="20x15", help="ChArUco board as COLSxROWS (e.g. 20x15).")
@click.option("--save", type=click.Path(), default=None, help="Save calibration profile JSON here.")
@click.option("--report", type=click.Path(), default=None, help="Directory to write report (overlays, heatmap, summary).")
@click.option("--save-undistorted", type=click.Path(), default=None, help="Directory to save undistorted images.")
@click.pass_context
@render_response
def camera_calibration(ctx, images_dir, board, save, report, save_undistorted):
    try:
        cols, rows = map(int, board.lower().split("x"))
    except Exception:
        raise Exception("Invalid --board format. Use e.g. 20x15")

    img_list = _gather_images(images_dir, None, "jpg,jpeg,png")
    if not img_list:
        raise Exception("No images found in the specified directory.")

    cal = RiverCalibrator(board_cols_rows=(cols, rows))

    print(f"Found {len(img_list)} images. Calibrating…", file=sys.stderr, flush=True)

    result, used_records, (K, dist, rvecs, tvecs) = cal.run_from_images(img_list)

    print(f"RMS: {result.rms:.3f} px · frames used: {result.frames_used}", file=sys.stderr, flush=True)

    if save:
        Path(save).parent.mkdir(parents=True, exist_ok=True)
        save_profile(result, save)
        print(f"Saved profile → {save}", file=sys.stderr, flush=True)

    summary = {}
    if report or save_undistorted:
        print("Generating report…", file=sys.stderr, flush=True)
        summary = make_report(
            report or "out/report",
            used_records,
            K,
            dist,
            rvecs,
            tvecs,
            cal.board,
            save_undistorted,
        )

    used_paths = [rec.path for rec in used_records]

    return {
        "rms": result.rms,
        "frames_used": result.frames_used,
        "image_size": list(result.image_size),
        "used_images": used_paths,
        "summary": summary,
        "profile_path": save or "",
        "report_dir": report or "",
    }


@click.command(name="write-charuco-board", help="Generate a ChArUco board PNG for display on screen.")
@click.option("--output", type=click.Path(), required=True, help="Output PNG path.")
@click.option("--board", type=str, default="20x15", help="ChArUco board as COLSxROWS (e.g. 20x15).")
@click.pass_context
@render_response
def write_charuco_board(ctx, output, board):
    try:
        cols, rows = map(int, board.lower().split("x"))
    except Exception:
        raise Exception("Invalid --board format. Use e.g. 20x15")

    Path(output).parent.mkdir(parents=True, exist_ok=True)
    write_pattern_png(output, cols_rows=(cols, rows))
    return {"path": output}
