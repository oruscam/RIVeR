# Changelog

All notable changes to the RIVeR project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


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
