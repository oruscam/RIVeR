# Changelog
All notable changes to the RIVeR project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
