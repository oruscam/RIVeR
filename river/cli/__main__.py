import click

import river.cli.commands.coordinate_transform as ct
import river.cli.commands.define_roi_masks as rm
from river.cli.commands import piv_pipeline
from river.cli.commands.camera_calibration import camera_calibration, write_charuco_board
from river.cli.commands.compute_section import update_xsection
from river.cli.commands.stiv_pipeline import stiv_analyze
from river.cli.commands.iwave_pipeline import iwave_analyze
from river.cli.commands.orchestrator import analyze_all
from river.cli.commands.video_to_frames import video_to_frames

from multiprocessing import freeze_support

@click.group
@click.option("-v", "--verbose", is_flag=True, help="Activate verbose mode.")
@click.pass_context
def cli(ctx: click.Context, verbose: bool):
	ctx.ensure_object(dict)
	ctx.obj["verbose"] = verbose


cli.add_command(video_to_frames)
cli.add_command(ct.get_uav_transformation_matrix)
cli.add_command(ct.get_oblique_transformation_matrix)
cli.add_command(ct.transform_pixel_to_real_world)
cli.add_command(ct.transform_real_world_to_pixel)
cli.add_command(ct.get_camera_solution)
cli.add_command(rm.recommend_height_roi)
cli.add_command(rm.create_mask_and_bbox)
cli.add_command(rm.create_user_mask)
cli.add_command(rm.compile_masks)
cli.add_command(camera_calibration)
cli.add_command(piv_pipeline.piv_test)
cli.add_command(piv_pipeline.piv_analyze)
cli.add_command(update_xsection)
cli.add_command(write_charuco_board)
cli.add_command(stiv_analyze)
cli.add_command(iwave_analyze)
cli.add_command(analyze_all)

if __name__ == "__main__":
	freeze_support()  # For Windows compatibility with multiprocessing
	cli()