# Tests con datos reales

Reproducen corridas reales de la GUI a través del CLI (`python -m river.cli ...`, igual que
hace Electron) y comparan cada etapa contra los resultados guardados de esas corridas.
Son opt-in: necesitan datos que viven en tu máquina.

```bash
pytest tests/real_data --realdata                  # todo
pytest tests/real_data --realdata -m "not slow"    # sin el 3D de 840 frames (~1 min)
pytest tests/real_data --realdata -k uav           # un dataset
```

Sin `--realdata` se saltean, así que `pytest tests/` sigue siendo rápido.

## De dónde sale cada cosa

| Variable | Default | Contenido |
|---|---|---|
| `RIVER_TEST_DATA` | `~/Documents/Datos-River` | videos, batimetrías, GRPs, imágenes ChArUco |
| `RIVER_TEST_REFERENCE` | `~/River` | corridas anteriores usadas como referencia |
| `RIVER_TEST_RTOL` | `1e-3` | tolerancia relativa vs. referencia |

Los parámetros de cada corrida (rango de frames, puntos de control, ventanas PIV, fps...)
se leen del `settings.json` de la corrida de referencia, no están hardcodeados.

| Dataset | Video | Corrida de referencia |
|---|---|---|
| oblique | `oblique/P1060716.mp4` | `P1060716/20260805T1224` |
| uav | `uav/Yanuncay_CS1.mp4` | `Yanuncay_CS1/20260828T1039` |
| 3d (slow) | `3d/JUNCAL20260108T1440.mp4` | `JUNCAL20260108T1440/20260808T1530` |

**No borres ni muevas esas carpetas de referencia**: son el "valor esperado". Si querés
actualizar una referencia a propósito, apuntá `DATASETS` en `helpers.py` a una corrida nueva.

## Qué se prueba

- `test_pipeline_regression.py` (por dataset): frames, matriz de transformación, altura de ROI,
  máscara/bbox, vectores PIV, caudal/área/velocidad media y perfiles por estación.
- `test_features.py`: extracción de frames de todos los videos, resize, estabilización,
  transformaciones píxel↔mundo, solución de cámara 3D, `piv-test`, máscaras de usuario y
  `compile-masks`, calibración de cámara ChArUco, STIV + iWave (requiere `torch` e `iwave`).

## Qué NO cubre

La GUI (Electron/React): la construcción de la matriz 3D desde la solución de cámara
(`createMatrix.ts`), el reporte HTML, la conversión de unidades imperiales y los componentes.
Para eso están los tests de Jest en `gui/`.
