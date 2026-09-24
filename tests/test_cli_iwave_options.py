"""CLI parsing of the --iwave-* options."""
import json
from unittest.mock import patch

from click.testing import CliRunner

from river.cli.__main__ import cli
from river.core.iwave_params import IwaveOptions


def _analyze_all_args(tmp_path, *extra):
	frames = tmp_path / "frames"
	frames.mkdir(exist_ok=True)
	xsections = tmp_path / "xsections.json"
	xsections.write_text("{}")
	matrix = tmp_path / "transformation_matrix.json"
	matrix.write_text("[[1, 0, 0], [0, 1, 0], [0, 0, 1]]")
	return ["analyze-all", str(frames), str(xsections), str(matrix), "-w", str(tmp_path), "-s", "1", "-f", "30", *extra]


def _invoke_analyze_all(tmp_path, *extra):
	with patch("river.cli.commands.orchestrator.run_full_analysis", return_value={}) as mock_run:
		result = CliRunner(mix_stderr=False).invoke(cli, _analyze_all_args(tmp_path, *extra))
	return result, mock_run


def test_cli_defaults_are_auto(tmp_path):
	result, mock_run = _invoke_analyze_all(tmp_path)
	assert json.loads(result.output)["error"] == {}
	assert mock_run.call_args.kwargs["iwave_options"] == IwaveOptions()


def test_cli_overrides_reach_orchestrator(tmp_path):
	result, mock_run = _invoke_analyze_all(
		tmp_path,
		"--iwave-window-size", "2.5", "--iwave-smax", "3", "--iwave-flow-type", "no-waves",
		"--iwave-penalty-weight", "1.5", "--iwave-depth-mode", "fixed",
	)
	assert json.loads(result.output)["error"] == {}
	assert mock_run.call_args.kwargs["iwave_options"] == IwaveOptions(
		window_size=2.5, smax=3.0, flow_type="no-waves", penalty_weight=1.5, depth_mode="fixed",
	)


def test_cli_auto_is_case_insensitive(tmp_path):
	result, mock_run = _invoke_analyze_all(tmp_path, "--iwave-smax", "AUTO")
	assert mock_run.call_args.kwargs["iwave_options"].smax is None


def test_cli_rejects_non_positive_smax(tmp_path):
	for bad in ("0", "-1", "abc"):
		result, mock_run = _invoke_analyze_all(tmp_path, "--iwave-smax", bad)
		assert result.exit_code != 0
		mock_run.assert_not_called()


def test_cli_rejects_unknown_flow_type(tmp_path):
	result, mock_run = _invoke_analyze_all(tmp_path, "--iwave-flow-type", "fast")
	assert result.exit_code != 0
	mock_run.assert_not_called()


def test_iwave_analyze_passes_options(tmp_path):
	frames = tmp_path / "frames"
	frames.mkdir()
	xsections = tmp_path / "xsections.json"
	xsections.write_text("{}")
	matrix = tmp_path / "transformation_matrix.json"
	matrix.write_text("[[1, 0, 0], [0, 1, 0], [0, 0, 1]]")
	with patch("river.cli.commands.iwave_pipeline.run_iwave_analysis", return_value={}) as mock_run:
		result = CliRunner(mix_stderr=False).invoke(cli, [
			"iwave-analyze", str(xsections), str(matrix), "--frames-dir", str(frames),
			"-s", "1", "-f", "30", "-i", "0", "--iwave-window-size", "4",
		])
	assert json.loads(result.output)["error"] == {}
	assert mock_run.call_args.kwargs["options"] == IwaveOptions(window_size=4.0)


def test_cli_rejects_nan_and_inf(tmp_path):
	for option in ("--iwave-smax", "--iwave-window-size"):
		for bad in ("nan", "inf", "-inf", "NaN", "Infinity"):
			result, mock_run = _invoke_analyze_all(tmp_path, option, bad)
			assert result.exit_code != 0, f"{option} {bad} should be rejected"
			mock_run.assert_not_called()


def test_cli_choices_are_case_insensitive(tmp_path):
	result, mock_run = _invoke_analyze_all(tmp_path, "--iwave-flow-type", "No-Waves", "--iwave-depth-mode", "FIXED")
	assert json.loads(result.output)["error"] == {}
	options = mock_run.call_args.kwargs["iwave_options"]
	assert options.flow_type == "no-waves"
	assert options.depth_mode == "fixed"
