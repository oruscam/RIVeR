
<figure>
    <img src="river/docs/_static/river_logo.svg" width=250 align="center">
</figure>
<br clear="left"/>
<br>


[![DOI](https://img.shields.io/badge/DOI-10.1016%2Fj.cageo.2017.07.009-blue)](https://doi.org/10.1016/j.cageo.2017.07.009)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Python Version](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React Version](https://img.shields.io/badge/react-18.0+-61DAFB.svg)](https://reactjs.org/)


# RIVeR: Rectification of Image Velocity Results

**RIVeR** (Rectification of Image Velocity Results) is a modern, open-source toolkit for Large Scale Particle Image Velocimetry (LSPIV). Built with Python and React, it provides a user-friendly interface for water-surface velocity analysis and flow discharge measurements in rivers and large-scale hydraulic models.


<figure>
    <img src="river/docs/_static/screenshot_results.png" width=500 align="center">
    <figcaption>Example of RIVeR velocimetry analysis of river flow</figcaption>
</figure>

## 💧 Overview
RIVeR is a specialized tool for applying Large Scale Particle Image Velocimetry (LSPIV) techniques as a non-contact method to estimate discharge in rivers and channels from video footage. The software guides the process through intuitive defaults and pre-configured settings, enabling users to generate discharge calculations without extensive prior knowledge of the technique. The workflow guides users through a series of straightforward steps culminating in comprehensive visual reports.

Originally developed in MATLAB in 2015 and well-received by the hydrology community, RIVeR has now been reimplemented in Python and JavaScript to improve accessibility, performance, and cross-platform compatibility.

## ✨ Key Features

* Process footage from multiple sources:
  * UAV/drone aerial imagery
  * Oblique view camera (from riverbank)
  * Fixed station cameras (contiunous monitoring)
* Frame extraction from videos with customizable parameters
* FFT-based PIV analysis with multi-pass support for increased accuracy
* Interactive result visualization with customizable vector fields
* Georeferencing and coordinate transformations
* Multi Cross-sectional flow analysis
* Automated beautiful report generation ([like this one !](river/docs/_static/sample_report.html))

* Multi-platform support (Windows, macOS, Linux)

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- pip package manager
- Git (for cloning the repository)

### Installation
AGREGAR PIP INSTALL RIVER
Clone the repository:
```bash
git clone https://github.com/your-username/river.git
cd river
pip install -r requirements.txt
pip install opencv-python-headless>=4.6 matplotlib>=3.8.4 scipy==1.13.1 \
            click==8.1.7 numba==0.60.0 tqdm==4.67.0 "tablib[xlsx,xls,ods]==3.8.0"
```
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
    │   ├── compute_section.py       # Section computation utilities
    │   ├── coordinate_transform.py   # Coordinate system transformations
    │   ├── define_roi_masks.py      # ROI and mask definitions
    │   ├── exceptions.py            # Custom exceptions
    │   ├── image_preprocessing.py   # Image preparation tools
    │   ├── matlab_smoothn.py        # Smoothing algorithms
    │   ├── piv_fftmulti.py         # FFT-based PIV processing
    │   ├── piv_loop.py             # PIV processing loop
    │   ├── piv_pipeline.py         # Main PIV pipeline
    │   └── video_to_frames.py      # Video frame extraction
    └── docs
```

## 🧩 Dependencies

### Backend Requirements

| Package               | Version   | License                 |
|----------------------|-----------|-------------------------|
| opencv-python-headless| >=4.6     | MIT License            |
| matplotlib           | >=3.8.4   | PSF License            |
| scipy                | ==1.13.1  | BSD License            |
| click                | ==8.1.7   | BSD License            |
| numba                | ==0.60.0  | BSD License            |
| tqdm                 | ==4.67.0  | MIT License            |
| tablib[xlsx,xls,ods] | ==3.8.0   | BSD License            |

## 📚 Jupyter Examples

Browse through our collection of Jupyter Notebook examples to learn how to use RIVeR for various analyses:

- [Introduction to RIVeR](examples/00_introduction.ipynb)
- [Video Frame Extraction](examples/01_video_to_frames.ipynb)
- [UAV/Drone Transformations](examples/02a_nadir_transformation.ipynb)
- [Oblique View Transformations](examples/02b_oblique_transformation.ipynb)
- [Fixed Station Transformations](examples/02c_fixed_station_transformation.ipynb)
- [Cross Section Analysis](examples/03_cross_sections.ipynb)
- [PIV Analysis Workflow](examples/04_piv_analysis.ipynb)
- [Discharge Calculation](examples/05_discharge_calculation.ipynb)

These interactive examples provide step-by-step guidance for common RIVeR workflows.
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

## 👥 Authors

### Core Team
- **Antoine Patalano** - *Project Lead, Feature Development* - [UNC/ORUS]
- **Leandro Massó** - *Feature Development* - [UNC/ORUS]

### Development Team
- **Nicolas Stefani** - *CLI & Backend Development*
- **Tomas Stefani** - *Frontend Development*

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📜 License
RIVeR is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0).

## 💭Acknowledgments

- Original MATLAB version (2017)
- UNC/ORUS research team
- Contributing organizations: UNC, ORUS, INA, CONICET
- [PIVlab project](https://la.mathworks.com/matlabcentral/fileexchange/27659-pivlab-particle-image-velocimetry-piv-tool-with-gui): The pioneering PIV analysis tool that inspired aspects of RIVeR's development