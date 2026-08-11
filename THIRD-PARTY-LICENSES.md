# Third-party licences

RIVeR is distributed under the GNU Affero General Public License v3.0 or later.
See [`LICENSE`](LICENSE). Copyright (C) 2024 ORUS/UNC.

RIVeR bundles and redistributes third-party software inside its installers. This file lists that
software, its licence and its copyright holders. Nothing here grants or restricts rights beyond what the
listed licences already say. Where a component is dual-licensed, the licence RIVeR elects is stated
explicitly.

Licence texts ship inside the installers:

| What | Where in the installed app |
|---|---|
| Python components | `resources/river-cli/python/.../site-packages/<name>.dist-info/` |
| Components without an upstream licence file, fonts, FFmpeg | `resources/licenses/` |
| RIVeR itself | `resources/licenses/LICENSE`, and in `river_cli-*.dist-info/licenses/LICENSE` |

---

## Python components

Bundled inside the portable Python interpreter shipped as `resources/river-cli/`. Direct dependencies
are declared in `pyproject.toml`; the rest are pulled in transitively.

| Package | Licence |
|---|---|
| click | BSD-3-Clause |
| opencv-python-headless | Apache-2.0 for the wrapper. The wheel bundles third-party native libraries under separate terms — see `LICENSE-3RD-PARTY.txt` in its `.dist-info/` |
| matplotlib | Matplotlib License (PSF-based) |
| scipy | BSD-3-Clause |
| numpy | BSD-3-Clause |
| numba | BSD-2-Clause (also ships `LICENSES.third-party`) |
| llvmlite | BSD-2-Clause |
| pyFFTW | BSD-3-Clause |
| tqdm | MPL-2.0 AND MIT. Upstream's wheel ships no licence file, so the text accompanies RIVeR as `resources/licenses/tqdm-LICENCE.txt` |
| tablib | MIT |
| openpyxl | MIT |
| et_xmlfile | MIT |
| odfpy | Apache-2.0 (dual with GPL-2.0+; **RIVeR elects Apache-2.0**) |
| xlrd | BSD-3-Clause |
| xlwt | BSD-3-Clause |
| defusedxml | PSF-2.0 |
| pillow | MIT-CMU |
| fonttools | MIT |
| contourpy | BSD-3-Clause |
| cycler | BSD-3-Clause |
| kiwisolver | BSD-3-Clause |
| pyparsing | MIT |
| python-dateutil | Apache-2.0 / BSD-3-Clause |
| six | MIT |
| packaging | Apache-2.0 OR BSD-2-Clause |

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
