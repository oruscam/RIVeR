
<div align="center">
  <img src="https://raw.githubusercontent.com/oruscam/RIVeR/main/river/docs/_static/river_logo.svg" width="350px">
  <br />
  <br />

  <p>
    <strong>Modern LSPIV toolkit for water-surface velocity analysis and flow discharge measurements</strong>
</div>

[![Status](https://img.shields.io/badge/status-active-brightgreen)]()
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Python Version](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![React Version](https://img.shields.io/badge/react-18.0+-61DAFB.svg)](https://reactjs.org/)
[![PyPI version](https://img.shields.io/pypi/v/river-cli.svg)](https://pypi.org/project/river-cli/)
[![DOI](https://img.shields.io/badge/DOI-10.1016%2Fj.cageo.2017.07.009-blue)](https://doi.org/10.1016/j.cageo.2017.07.009)
[![YouTube](https://img.shields.io/badge/YouTube-Subscribe-red?logo=youtube)](https://www.youtube.com/@orus-xm3dn)

---

# RIVeR: Rectification of Image Velocity Results

**RIVeR** (Rectification of Image Velocity Results) is a modern, open-source toolkit for Large Scale Particle Image Velocimetry (**LSPIV**) distributed by [ORUS](https://orus.cam). Built with **Python** and **React**, it provides a user-friendly interface for water-surface velocity analysis and flow discharge measurements in rivers and large-scale hydraulic models.


<figure>
    <img src="https://raw.githubusercontent.com/oruscam/RIVeR/main/river/docs/_static/screenshot_results.png" width=500>
    <p ><i>Example of RIVeR velocimetry analysis of river flow</i></p>
</figure>

---

## 💧 Overview
RIVeR is a specialized tool for applying Large Scale Particle Image Velocimetry (LSPIV) techniques as a non-contact method to estimate discharge in rivers and channels from video footage. The software guides the process through intuitive defaults and pre-configured settings, enabling users to generate discharge calculations without extensive prior knowledge of the technique. The workflow guides users through a series of straightforward steps culminating in comprehensive visual reports.

Originally developed in MATLAB in 2015 and well-received by the hydrology community, RIVeR has now been reimplemented in Python and JavaScript to improve accessibility, performance, and cross-platform compatibility.
<figure>
    <img src="https://raw.githubusercontent.com/oruscam/RIVeR/main/river/docs/_static/oblique_rectification.gif" width=500>
    <p><i>Demonstration of interactive oblique image rectification process in RIVeR</i></p>
</figure>

---


## 📖 User Manual

For a detailed step-by-step guide on using RIVeR's GUI (Graphical User Interface),
please refer to the **[User Manual](user-manual.md)**.

---


## ✨ Key Features

* Process footage from multiple sources:
  * UAV/drone aerial imagery
  * Oblique view camera (from riverbank)
  * Fixed station cameras (continous monitoring)
* Drag-and-drop interface for quick video and data imports
* Frame extraction from videos with customizable parameters
* FFT-based PIV analysis with multi-pass support for increased accuracy
* Interactive result visualization with customizable vector fields
* Georeferencing and coordinate transformations
* Multi Cross-sectional flow analysis
* Camera calibration tool for lens distortion correction, with reusable camera/lens profiles
* UAV video stabilization to counter camera shake before analysis
* Automated beautiful report generation ([like this one !](https://oruscam.github.io/RIVeR/sample_report.html))
* Multi-platform support (**Windows**, **macOS**, **Linux**)
* Multi-units support (SI, imperial)


---

## 🌍 Multi-Language Support

RIVeR is available in 12 languages, with technical terminology reviewed for hydrology, PIV and bathymetry domains:

| | | | |
|:---|:---|:---|:---|
| 🇬🇧 English | 🇯🇵 Japanese | 🇸🇦 Arabic | 🇷🇺 Russian |
| 🇦🇷 Spanish | 🇨🇳 Chinese | 🇰🇷 Korean | 🇮🇳 Hindi |
| 🇫🇷 French | 🇩🇪 German | 🇮🇹 Italian | 🇧🇷 Portuguese |

Want to contribute a new language? Translation files are located in `gui/src/translations/` — add a new folder with a `global.json` file following the existing structure and open a Pull Request!

---
## 📥 Download Compiled Releases

If you don't want to bother with code at all (we get it, sometimes you just want things to work!), pre-compiled standalone versions are available:

| ⊞ Windows | ⌘ macOS | ◆ Linux |
|:---:|:---:|:---:|
| [EXE](https://github.com/oruscam/RIVeR/releases/download/v3.5.2/RIVeR-Windows-3.5.2-Setup.exe) | [DMG](https://github.com/oruscam/RIVeR/releases/download/v3.5.2/RIVeR-Mac-3.5.2-Installer.dmg) | [DEB](https://github.com/oruscam/RIVeR/releases/download/v3.5.2/RIVeR-Linux-3.5.2.deb) |

These packages include both the GUI and CLI tools in a ready-to-use application. Simply download, extract (if needed), and run the application — no Python or JavaScript knowledge required!

> **macOS users:** If Gatekeeper blocks the app after installing, open a terminal and run:
> ```bash
> xattr -rd com.apple.quarantine /Applications/RIVeR.app
> ```
> Or right-click the app → Open → Open anyway.

---
## 🧑‍💻 Developer Installation & Usage

For those who prefer to work with the source code or contribute to RIVeR's development, here's how to get started:

### Prerequisites

- Python 3.12+
- pip package manager
- Git (for cloning the repository)

### Development Installation
```bash
git clone https://github.com/oruscam/RIVeR.git
cd RIVeR
pip install -e .
```
### CLI Installation
RIVeR CLI provides a comprehensive set of commands for performing LSPIV analysis through the command line.

```bash
pip install river-cli
```
#### Basic Usage
```bash
river-cli [OPTIONS] COMMAND [ARGS]...
```
To see all available commands and options:
```bash
river-cli --help
```
#### Example Workflow
```bash
# 1. Extract frames from video
river-cli video-to-frames river_video.mp4 ./frames --every 2

# 2. Generate transformation matrix
river-cli get-uav-transformation-matrix 100 200 300 400 0 0 10 10 \
--image-path ./frames/frame_001.jpg

# 3. Create ROI mask from cross-sections
# This writes mask.npy, bbox.json and mask.png into --workdir
river-cli create-mask-and-bbox 3 \
./frames/frame_001.jpg \
./xsections.json \
./transformation_matrix.json \
--workdir ./workdir \
--save-png-mask

# 4. (Optional) Create one or more user masks from polygon coordinates
river-cli create-user-mask ./frames/frame_001.jpg \
--workdir ./workdir \
--index 1 \
--point 120 340 --point 220 500 --point 400 420

river-cli create-user-mask ./frames/frame_001.jpg \
--workdir ./workdir \
--index 2 \
--point 600 300 --point 750 600 --point 900 450

# 5. Compile ROI mask and user masks into a final mask
# 0 is dominant: final = ROI AND all user masks
river-cli compile-masks \
--workdir ./workdir \
--roi ./workdir/mask.npy \
--usr ./workdir/usr_mask_1.npy \
--usr ./workdir/usr_mask_2.npy \
--out final_mask.npy \
--save-png-mask

# 6. Run PIV analysis using the final mask
river-cli piv-analyze ./frames \
--mask ./workdir/final_mask.npy \
--workdir ./results

# 7. Calculate discharge
river-cli update-xsection \
./xsections.json \
./results/piv_results.json \
./transformation_matrix.json \
--step 2 --fps 30 --id-section 0

# 8. (Optional) Generate a ChArUco calibration board to print/display
river-cli write-charuco-board --output ./board.png --board 20x15

# 9. (Optional) Calibrate camera intrinsics from a folder of board photos,
# then reuse the profile to undistort frames during extraction
river-cli camera-calibration --dir ./calibration_photos --save ./profile.json

river-cli video-to-frames river_video.mp4 ./frames --every 2 \
--undistort --profile-path ./profile.json

# 10. (Optional, UAV footage only) Stabilize extracted frames against camera shake
river-cli video-to-frames river_video.mp4 ./frames --every 2 \
--stabilize --stabilization-regions ./stabilization_regions.json

```

### Graphical User Interface (GUI)

RIVeR also provides a user-friendly graphical interface built with React. The GUI offers an intuitive way to perform LSPIV analysis without using command-line tools.

Key GUI features include:
- Interactive workflow interface
- Visual cross-section creation
- Real-time PIV analysis visualization
- Camera calibration tool with reusable camera/lens profiles
- UAV video stabilization with a sanity-check view
- Result export capabilities

For detailed information about installation, usage, and features of the GUI, please see the dedicated [GUI documentation](gui/README.md).

---

## 📂 Project Structure

```
river/
.
├── LICENSE
├── examples       # Jupyter examples
│   ├── 00_introduction.ipynb
│   ├── 01_video_to_frames.ipynb
│   ├── 02a_nadir_transformation.ipynb
│   ├── 02b_oblique_transformation.ipynb
│   ├── 02c_fixed_station_transformation.ipynb
│   ├── 03_cross_sections.ipynb
│   ├── 04_piv_analysis.ipynb
│   ├── 05_discharge_calculation.ipynb
│   ├── data
│   ├── results
│   └── utils
├── gui
├── pyproject.toml
├── readme.md
├── requirements.txt
└── river
    ├── cli
    ├── core
    │   ├── camera_calibration.py    # Intrinsic lens calibration from ChArUco images
    │   ├── compute_section.py       # Section computation utilities
    │   ├── coordinate_transform.py   # Coordinate system transformations
    │   ├── define_roi_masks.py      # ROI and mask definitions
    │   ├── exceptions.py            # Custom exceptions
    │   ├── image_preprocessing.py   # Image preparation tools
    │   ├── matlab_smoothn.py        # Smoothing algorithms
    │   ├── piv_fftmulti.py         # FFT-based PIV processing
    │   ├── piv_loop.py             # PIV processing loop
    │   ├── piv_pipeline.py         # Main PIV pipeline
    │   ├── stabilize_frames.py     # UAV frame stabilization via LK point tracking
    │   └── video_to_frames.py      # Video frame extraction
    └── docs
```
---

## 📚 Jupyter Examples

Browse through our collection of Jupyter Notebook examples to learn how to use RIVeR for various analyses (requires development installation with the `examples` extra):

```bash
pip install -e ".[examples]"
```

- [Introduction to RIVeR](examples/00_introduction.ipynb)
- [Video Frame Extraction](examples/01_video_to_frames.ipynb)
- [UAV/Drone Transformations](examples/02a_nadir_transformation.ipynb)
- [Oblique View Transformations](examples/02b_oblique_transformation.ipynb)
- [Fixed Station Transformations](examples/02c_fixed_station_transformation.ipynb)
- [Cross Section Analysis](examples/03_cross_sections.ipynb)
- [PIV Analysis Workflow](examples/04_piv_analysis.ipynb)
- [Discharge Calculation](examples/05_discharge_calculation.ipynb)

These interactive examples provide step-by-step guidance for common RIVeR workflows. To run them, make sure you've completed the development installation with the `examples` extra shown above.
## 🔬 Citation

If you use RIVeR in your research, please cite:

```bibtex
@article{patalano2017river,
    title={Rectification of Image Velocity Results (RIVeR): A simple and user-friendly toolbox
           for large scale water surface Particle Image Velocimetry (PIV) and
           Particle Tracking Velocimetry (PTV)},
    author={Patalano, Antoine and García, Carlos Marcelo and Rodríguez, Andrés},
    journal={Computers \& Geosciences},
    volume={105},
    pages={103--114},
    year={2017},
    publisher={Elsevier}
}
```
---
## 👥 Authors

### Core Team
- **Antoine Patalano** - *Project Lead, Feature Development* - [UNC/ORUS]
- **Leandro Massó** - *Feature Development* - [UNC/ORUS]

### Development Team
- **Nicolas Stefani** - *CLI & Backend Development*
- **Tomas Stefani** - *Frontend Development*
- **Agustín Patrito** - *Frontend Development*

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please [open an issue](https://github.com/oruscam/RIVeR/issues) first to discuss what you would like to change.

---

## 📜 License
RIVeR is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0).

---

## 💭Acknowledgments
- Contributing organizations:
  - [UNC (National University of Córdoba)](https://www.unc.edu.ar/) - [Faculty of Exact, Physical and Natural Sciences](https://fcefyn.unc.edu.ar/)
  - [INA (National Institute of Water, Argentina)](https://www.argentina.gob.ar/ina)
  - [CONICET (National Scientific and Technical Research Council)](https://www.conicet.gov.ar/)


- [WMO HydroHub](https://wmo.int/media/update/winner-of-wmo-hydrohub-innovation-call-latin-america-and-caribbean?book=21576): For funding the development of RIVeR 3 (2024-2025)
- [PIVlab project](https://la.mathworks.com/matlabcentral/fileexchange/27659-pivlab-particle-image-velocimetry-piv-tool-with-gui): The pioneering PIV analysis tool that inspired aspects of RIVeR's development
