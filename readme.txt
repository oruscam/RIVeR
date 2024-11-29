# RIVeR (Rectification of Image Velocity Results)

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![DOI](https://img.shields.io/badge/DOI-10.1016%2Fj.cageo.2017.05.011-blue)](https://doi.org/10.1016/j.cageo.2017.05.011)

RIVeR is a modern, open-source toolkit for Large Scale Particle Image Velocimetry (LSPIV) and Large Scale Particle Tracking Velocimetry (LSPTV). Built with Python and React, it provides a user-friendly interface for water-surface velocity analysis and flow discharge measurements in rivers and large-scale hydraulic models.

## 📖 Background

Originally introduced in:

> Patalano, A., García, C.M., Rodríguez, A., 2017. Rectification of Image Velocity Results (RIVeR): A simple and user-friendly toolbox for large scale water surface Particle Image Velocimetry (PIV) and Particle Tracking Velocimetry (PTV). *Computers & Geosciences*, 105, 103-114.

**Note:** While this paper introduced the original MATLAB version, the current repository contains a complete rewrite in Python/React with enhanced features and improved performance.

## 📂 Project Structure

```
river/
├── cli/                    # Command line interface
│   ├── commands/          # CLI command implementations
│   └── utils.py           # CLI utilities
└── core/                  # Core processing modules
    ├── piv_fftmulti.py    # FFT-based PIV processing
    ├── piv_loop.py        # PIV processing loop
    ├── image_preprocessing.py  # Image preparation
    ├── coordinate_transform.py # Coordinate system transforms
    └── matlab_smoothn.py  # Smoothing algorithms
```

## ⚙️ Requirements

### Backend Dependencies
- Python 3.8+
- NumPy
_ Numba
- SciPy
- OpenCV
- FFmpeg
- Papaparse (for CSV handling)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:
- Code style guidelines
- Development workflow
- Testing requirements
- Pull request process

## 📄 License

RIVeR is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0).

## 👥 Authors

### Core Team
- **Antoine Patalano** - *Project Lead, Feature Development* - [UNC/ORUS]
- **Leandro Massó** - *Feature Development* - [UNC/ORUS]

### Development Team
- **Nicolas Stefani** - *CLI & Backend Development*
- **Tomas Stefani** - *Frontend Development*

## 🙏 Acknowledgments

- Original MATLAB version (2017)
- UNC/ORUS research team
- Contributing organizations: UNC, ORUS, INA
- [PIVlab project](https://la.mathworks.com/matlabcentral/fileexchange/27659-pivlab-particle-image-velocimetry-piv-tool-with-gui): The pioneering PIV analysis tool that inspired aspects of RIVeR's development

The development of RIVeR has been influenced by several open-source projects in the field of PIV analysis. We would particularly like to acknowledge PIVlab, developed by William Thielicke, which has been a reference in the field of PIV analysis. While RIVeR is a complete rewrite with its own unique features and implementation, the success and usability of PIVlab helped shape our understanding of user needs in PIV analysis software.

## 📚 Citation

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
<p align="center">
Made with ❤️ by the RIVeR team
</p>
