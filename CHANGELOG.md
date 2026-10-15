# Changelog

All notable changes to the RIVeR project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


# [3.8.0] - 2026-10-15

## GUI

### Added

- Redesigned interface with a refreshed look across the dark, light and Dracula themes: new button, chip and segmented-control styles, a labelled and clickable step bar, and a Home screen with recent projects
- Start a project from a folder of frames, with the range, step and resize rules of a video, an editable interval and a source-folder scrubber in the Video Range step
- Open moved projects and projects with missing inputs: missing videos, bathymetries or frames folders show a card on their step with a Locate button
- Automatic iWave parameters, editable in Processing as automatic or manual, with a toggle to include low-quality iWave stations in the discharge
- Stations that fall under the analysis mask are skipped by STIV and iWave, and listed in Processing, Results and the report
- Control Points redesign for fixed stations: choose the solve method on a switch, solve from the footer, and see each point's reprojection error graded in a sortable table
- Stabilization for oblique and IP camera footage, with its check on a canvas view switch and on Control Points
- Swap a cross section's left and right banks
- Show or hide the section, STIV lines and vectors on the Processing canvas, and turn techniques on or off with switches
- Drag magnifier for the Oblique and IP camera control points
- Results: crosshair across the charts, a docked station tag you can pin, expandable technique rows with per-technique totals, and a velocity profile drawn with one encoding and a key
- Processing readouts as a strip over the plot, with cursor tips and paired kx-w and ky-w iWave spectra
- New report built on A4 pages: cover with total discharge, one block per cross section with its profile plot and station table, calibration and parameter sheets for each footage type, and a fixed light palette for export
- Camera calibration opens on a Prepare screen and ends with a saved block in the report
- Frames import and the new interface copy translated into all twelve languages

### Changed

- Technique colours are azure, orange and orchid in every theme
- Masks, stabilization regions, section lines and pins share one overlay style, with pins leaning inward at the image border
- Messages are split into mode hints, field errors, step alerts, toasts and in-app dialogs, replacing the old error, warning and info bars
- Panels use one row layout, and Advanced settings is a labelled row that stays open between steps
- Cases are kept in a RIVeR folder inside the chosen workspace folder
- Displayed values show at most 2 decimals
- Progress is shown as a number with a hairline or a top-edge bar instead of ring loaders
- Motion respects the system's reduced-motion setting

### Fixed

- Quick status calls no longer kill a running analysis
- A bathymetry import no longer overwrites another section's file, and a section with no profile draws no chart
- Frame names whose digits cannot be read as integers, and frame files with `#`, `?` or `%` in their names, now load
- Reports open for footage without a creation time
- Each project loads its own PIV results

## CLI

### Added

- `frames-info` and `frames-to-frames` commands for folders of frames
- `iwave-defaults` command returning the automatic iWave parameters
- `--iwave-*` options in `analyze-all` and `iwave-analyze`

### Changed

- iWave parameters are derived from the LSPIV and STIV results and from the full clip duration, and its optimizer is seeded so identical runs give identical results
- Both iWave spectrum planes, the fit and the energy shares are written to the iWave sidecar


# [3.7.0] - 2026-08-27

Experimental build: the multi-technique GUI, published as a snapshot.

## GUI

### Added

- STIV (space-time image velocimetry) as a second technique next to LSPIV, with a 3-seed angle model and a manual angle override and tuner in the STI viewer
- iWave (spectral analysis) as a third technique, with a spectrum preview in Processing
- Multi-technique Results view: computation zone pill row, per-technique eye toggles, per-section STIs with drag-to-pan, a shared velocity colour scale and an animated chevron velocity overlay
- Multi-technique analysis progress in Processing, with a stage breadcrumb
- STIV toggle greyed out when the model weights are missing

### Changed

- Reworked light theme and sharper image overlays
- Station Number moved to Processing
- GUI builds are marked as experimental

### Fixed

- Derived results not cleared when a cross section was edited
- STIV data files (configs, weights) dropped from packaged builds

## CLI

### Added

- `analyze-all` command running LSPIV, STIV and iWave from one orchestrator
- STIV options and a cheap STIV weight-availability check
- Cross-section statistics cache

## Other

- License compliance: AGPL text, third-party licences, citation file and source offer
- CI publishes experimental snapshot builds and downloads the STIV weights from Zenodo


# [3.6.0] - 2026-08-07

## GUI

### Added

- Camera calibration tool (ChArUco board) for lens distortion correction, with camera/lens profile management and undistorted image preview
- UAV video stabilization with interactive region selection
- Frame carousel in the Pixel Size and Cross Sections steps
- Warning and dimmed UI while moving or drawing control points in UAV, Oblique and IPCam
- Warning while drawing or modifying a cross-section's direction

### Changed

- Video Range form fields realigned and buttons resized for consistency

### Fixed

- Report Total Q showing NaN with 2 or more cross sections
- Cross Sections validation reading the wrong section's data
- HTML report rendering with broken styles on some machines
- Islands within a channel not excluded from the PIV velocity search mask/ROI
- Crash on rectangular (flat) bathymetry profiles
- Negative and depth-based bathymetry handling, including rejecting depth bathymetry in 3D mode
- Mask hatch fill not rendering when navigating back to an already-loaded project
- Mask and stabilization region editing bugs, including missing region labels
- Crash on bathymetry files outside the control points' Z range
- Frames being re-extracted unnecessarily when settings were reverted to their original value
- Running Test after a full Analyze no longer wipes existing results
- Buttons and labels now shrink instead of truncating text on narrow widths
- Stabilization line thickness increasing when zooming in

## CLI

### Added

- `camera_calibration` and `write_charuco_board` commands for lens calibration from ChArUco images
- `--stabilize`, `--stabilization-regions` and `--replace` options in `video_to_frames`


# [3.5.2] - 2026-07-21

## GUI

### Fixed

- Bathymetry files where the deepest point was near a bank were misclassified as elevation profiles and not inverted
- Non-CSV bathymetry files with locale-formatted decimals (e.g. "0,542") failed during PIV analysis; they're now always normalized to CSV on import


# [3.5.0] - 2026-05-21

## GUI

### Added

- Mute/unmute toggle in the VideoRange video player
- Settings option to choose the RIVeR data folder location
- First launch no longer prompts for folder selection — uses the default path automatically
- Mask confirmation button now appears outside the mask polygon for easier access
- Three new system themes: dark, dracula and light
- Keyboard shortcuts to cycle theme (Cmd/Ctrl+T) and language (Cmd/Ctrl+L)

### Changed

- Station number moved above the velocity plots in the results view
- Homogenized labels and button sizes across control point and cross-section forms
- Mask storage migrated to .npy format
- Export video button moved from Results page to Processing page



### Fixed

- Results, charts, report, and MP4 export not respecting the selected unit system
- Zoom interaction breaking station markers in the results view
- Control point pins overlapping the mask area; masks now have an individual edit mode
- App getting stuck on the loading screen after dismissing the directory selector dialog
- Graph unit labels, hover tooltips, and language not updating live when changed
- Fixed colorbar limits that didn’t work
- Exported video didn’t respect the colorBarLimits set by the user.


# [3.4.0] - 2026-02-09

## GUI

### Added

- GIF generation
- User mask creation

### Changed

- Processing and Analyze steps merged into one unified step
- Color Bar with editable value limits

# [3.3.0] - 2025-10-08

## GUI

### Added

- Drag and drop support for input files such as Bathymetry/Depth, Distances, GRPs and Videos
- New advanced coordinate edit form for oblique footage

### Changed

- Velocity-colored vectors with color bar and tooltips in processing and analyze module

# [3.2.0] - 2025-07-31

## GUI

### Added

- New "Copy to clipboard" functionality with an animated icon in results table content
- New User Manual in documentation
- New metadata keys in settings.json aligned with the WMO Core Metadata Profile 2.0 (WCMP2) standard
- New language support:
  - Italian
  - German
  - Portuguese

### Changed

- Load project always goes to the default folder for RIVeR

### Fixed

- Pixel size not updating in UAV mode
- Incorrect display of control points
- Incorrect display of cross-section names
- Incorrect values in the report

## CLI

### Changed

- New optimized solutions for PIV processing and statistics calculations

# [3.1.0] - 2025-05-08

## GUI

### Added

- Information about current user version in Home Page

### Fixed

- Videos with vertical resolution
- Missing translations
- Report results

# [3.0.1] - 2025-03-31

## GUI

### Fixed

- Cross Sections Input Level
- Rectification 2d report translations
- Rectification Footer Links

## CLI

### Changed

- Updated min required Python version to 3.11

# [3.0.0] - 2025-03-29

### Added

- Complete rewrite of the application in Python and JavaScript
- New tree-based navigation system with step sidebar
- Interactive real-time progress indicators during processing
- Enhanced error handling with user-friendly suggestions
- Improved result visualization with downloadable reports
- Support for UAV, Oblique, and 3D footage types with specialized workflows
- Ability to save and resume analysis sessions

### Changed

- Migrated codebase from MATLAB to Python/JavaScript
- Redesigned user interface with improved accessibility
- Optimized LSPIV processing algorithms for better performance
- Enhanced cross-section definition with visual guidance
- Upgraded Pixel-to-Real-World calibration workflow

### Removed

- Legacy MATLAB dependencies
- Deprecated processing methods from previous versions
