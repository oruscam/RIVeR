# Third-party licences

RIVeR is distributed under the GNU Affero General Public License v3.0 or later.
See [`LICENSE`](LICENSE). Copyright (C) 2024 ORUS/UNC.

RIVeR bundles and redistributes third-party software. This file lists that software, its licence and its
copyright holders. Nothing here grants or restricts rights beyond what the listed licences already say.
Where a component is dual-licensed, the licence RIVeR elects is stated explicitly.

Licence texts ship inside the installers:

| What | Where in the installed app |
|---|---|
| Python components | `resources/river-cli/python/.../site-packages/<name>.dist-info/` |
| Components without an upstream licence file, fonts, FFmpeg | `resources/licenses/` |
| RIVeR itself | `resources/river-cli/python/.../site-packages/river_cli-*.dist-info/licenses/LICENSE` |

---

## Velocimetry method — IWaVE

RIVeR's **iWave** technique is an integration of the IWaVE package. IWaVE is redistributed
**unmodified**, exactly as published on PyPI. No IWaVE source is vendored into this repository and no
IWaVE file is patched.

- **Package:** `iwave` — IWaVE: Image-based Wave Velocimetry Estimation
- **Version bundled:** 0.4.0
- **Upstream:** https://github.com/DataForWater/IWaVE
- **Copyright:**

  ```
  Copyright (c) 2024 Giulio Dolcetti, Salvador Peña-Haro, Hessel Winsemius
  ```

- **Licence text:** `resources/licenses/MIT-iwave.txt`, and as shipped by upstream in
  `iwave-0.4.0.dist-info/licenses/LICENSE`

### A note on IWaVE's licence

Upstream IWaVE 0.4.0 declares two different licences, and both statements are live as of 2026-08-05:

- the `LICENSE` file — in the GitHub repository and inside the PyPI wheel — is the **MIT** licence;
- the PyPI package metadata carries the classifier
  `License :: OSI Approved :: GNU Affero General Public License v3`.

RIVeR does not attempt to resolve this. Instead **RIVeR satisfies both readings at once**:

- the MIT reading is satisfied because the MIT text and its copyright notice are reproduced above and
  shipped with every copy (MIT's only condition);
- the AGPL reading is satisfied because RIVeR is itself AGPL-3.0-or-later, redistributes IWaVE
  unmodified, and makes the corresponding-source offer below available to every recipient.

No further action is required of anyone receiving RIVeR. A clarification has been requested upstream.

### Method citation

The iWave technique implements the method of:

> Dolcetti, G., Hortobágyi, B., Perks, M., Tait, S. J., & Dervilis, N. (2022).
> Using Noncontact Measurement of Water Surface Dynamics to Estimate River Discharge.
> *Water Resources Research*, 58(9), e2022WR032829. https://doi.org/10.1029/2022WR032829

RIVeR is not affiliated with, nor endorsed by, the IWaVE authors or the DataForWater organisation.
"IWaVE" is used descriptively to identify the method and the package RIVeR depends on.

---

## Python components

Bundled inside the portable Python interpreter shipped as `resources/river-cli/`.

| Package | Version | Licence |
|---|---|---|
| iwave | 0.4.0 | see above |
| numpy | 2.0.2 | BSD-3-Clause |
| scipy | 1.13.1 | BSD-3-Clause |
| numba | 0.60.0 | BSD-2-Clause (also ships `LICENSES.third-party`) |
| llvmlite | 0.43.0 | BSD-2-Clause |
| rocket-fft | 0.3.1 | BSD-3-Clause |
| numexpr | 2.14.1 | MIT |
| pyFFTW | 0.15.0 | BSD-3-Clause |
| torch | 2.12.0 | BSD-3-Clause |
| sympy | 1.14.0 | BSD-3-Clause |
| mpmath | 1.3.0 | BSD-3-Clause |
| networkx | 3.6.1 | BSD-3-Clause |
| fsspec | 2026.6.0 | BSD-3-Clause |
| filelock | 3.29.4 | Unlicense |
| typing_extensions | 4.15.0 | PSF-2.0 |
| Jinja2 | 3.1.6 | BSD-3-Clause |
| MarkupSafe | 3.0.3 | BSD-3-Clause |
| opencv-python-headless | 4.10.0.84 | Apache-2.0 for the wrapper. The wheel bundles third-party native libraries under separate terms — see `LICENSE-3RD-PARTY.txt` in its `.dist-info/` |
| matplotlib | 3.10.8 | Matplotlib License (PSF-based) |
| contourpy | 1.3.3 | BSD-3-Clause |
| cycler | 0.12.1 | BSD-3-Clause |
| fonttools | 4.62.1 | MIT |
| kiwisolver | 1.5.0 | BSD-3-Clause |
| pillow | 12.2.0 | MIT-CMU |
| pyparsing | 3.3.2 | MIT |
| python-dateutil | 2.9.0 | Apache-2.0 / BSD-3-Clause |
| six | 1.17.0 | MIT |
| packaging | 26.0 | Apache-2.0 OR BSD-2-Clause |
| click | 8.1.7 | BSD-3-Clause |
| tqdm | 4.67.0 | MPL-2.0 AND MIT. Upstream's wheel ships no licence file, so the text accompanies RIVeR as `resources/licenses/tqdm-LICENCE.txt` |
| tablib | 3.8.0 | MIT |
| openpyxl | 3.1.5 | MIT |
| et_xmlfile | 2.0.0 | MIT |
| odfpy | 1.4.1 | Apache-2.0 (dual with GPL-2.0+; **RIVeR elects Apache-2.0**) |
| xlrd | 2.0.2 | BSD-3-Clause |
| xlwt | 1.3.0 | BSD-3-Clause |
| defusedxml | 0.7.1 | PSF-2.0 |

### Python interpreter

CPython 3.12.1 (Linux, Windows) and 3.11 (macOS), redistributed via the `astral-sh/uv` portable builds.
Python Software Foundation License 2.0. Copyright (c) 2001-2024 Python Software Foundation.

---

## JavaScript / Electron components

Bundled into the application archive.

| Package | Licence | Note |
|---|---|---|
| electron | MIT | |
| react, react-dom | MIT | |
| @reduxjs/toolkit, react-redux | MIT | |
| d3, d3-fetch | ISC | |
| i18next, react-i18next | MIT | |
| react-hook-form, react-datepicker, react-window, react-data-grid, react-use-wizard, react-svg, use-image | MIT | |
| react-icons | MIT | Bundled icon sets carry their own upstream licences; see the package's `LICENSE` |
| @theme-toggles/react | MIT | |
| skia-canvas | MIT | |
| fluent-ffmpeg | MIT | Wrapper only. The FFmpeg binaries are listed separately below |
| tree-kill | MIT | |
| xlsx (SheetJS) | Apache-2.0 | |
| jszip | MIT | Dual-licensed `MIT OR GPL-3.0-or-later`; **RIVeR elects MIT** |
| sanitize-filename | ISC | Dual-licensed `WTFPL OR ISC`; **RIVeR elects ISC** |
| truncate-utf8-bytes, utf8-byte-length | WTFPL / MIT | |

### Fonts

**Inter**, bundled via `@fontsource/inter` — SIL Open Font License 1.1.

```
Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)
```

Licence text: `resources/licenses/OFL-1.1-Inter.txt`. Inter is bundled unmodified, is not sold on its own,
and is not distributed under a reserved font name.

### Icons

- Portions of RIVeR's inline SVG icon path data are derived from **Lucide** (https://lucide.dev),
  ISC License, Copyright (c) 2022 Lucide Contributors. Lucide is itself derived from **Feather**
  (https://feathericons.com), MIT License, Copyright (c) 2013-2022 Cole Bemis.
- The GitHub logo marks (`github-mark.svg`, `github-mark-white.svg`) are trademarks of GitHub, Inc.,
  used solely to link to RIVeR's own repository. RIVeR is not affiliated with or endorsed by GitHub, Inc.

---

## Bundled binaries

### FFmpeg

RIVeR bundles prebuilt static `ffmpeg` and `ffprobe` executables and invokes them as separate processes.
They are not linked into RIVeR and are aggregated with it on the installation medium.

- **Licence: GPL-3.0.** All three upstream builds are GPL-3.0:
  - Linux — https://johnvansickle.com/ffmpeg/ ("All static builds available here are licensed under the
    GNU General Public License version 3")
  - Windows — https://www.gyan.dev/ffmpeg/builds/ (`release-essentials`; "All builds are 64-bit, static
    and licensed as GPLv3")
  - macOS — https://evermeet.cx/ffmpeg/ (published configure line includes `--enable-gpl` and
    `--enable-version3`)
- None of the three builds uses `--enable-nonfree`, so all are redistributable.
- **Upstream project:** https://ffmpeg.org — Copyright (c) 2000-2026 the FFmpeg developers
- **Licence text:** `resources/licenses/GPL-3.0-ffmpeg.txt`
- **Corresponding source:** FFmpeg source is at https://git.ffmpeg.org/ffmpeg.git and from each build's
  distributor at the URLs above. RIVeR will also supply the corresponding source of the exact bundled
  builds on request — see "Source code" below.

---

## Source code

RIVeR is free software under the AGPL-3.0-or-later. The complete corresponding source for this release
is available at:

- **https://github.com/oruscam/RIVeR** — see the tag matching the version shown in the application.

For the corresponding source of any bundled third-party component, including the exact FFmpeg builds,
or for a copy on a physical medium, write to **contact@orus.cam**. We will provide it for no more than
our cost of distribution, for at least three years from the date of this release.
