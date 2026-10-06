import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectSlice, useSectionSlice } from '../hooks';
import { curveToPolylinePoints, SpectrumExtent } from '../helpers';
import { UNIT_CONVERSIONS, UNITS } from '../constants/constants';
import type { IwaveSpectraSidecar } from '../../electron/ipcMainHandlers/getIwaveSpectra';
import './components.css';

interface IWaveViewerProps {
  /** Renderer-loadable spectrum image paths, one slot per station (station id k
   *  at index k − 1), '' where iWave skipped the station or its fit failed. */
  spectrumPaths: string[];
  /** Why the active station has no spectrum, shown in place of the plot. */
  emptyLabel: string;
  /** Axis extents and dispersion curves; null when the sidecar is missing. */
  sidecar: IwaveSpectraSidecar | null;
  /** Index into the station list — which spectrum is currently selected. */
  activeStation: number;
  containerWidth: number;
  containerHeight: number;
}

export const IWaveViewer = ({
  spectrumPaths,
  emptyLabel,
  sidecar,
  activeStation,
  containerWidth,
  containerHeight,
}: IWaveViewerProps) => {
  const { sections, activeSection } = useSectionSlice();
  const { projectDetails } = useProjectSlice();
  const { t } = useTranslation();
  const iwaveColor = 'var(--tech-iwave)';
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const isImperial = projectDetails.unitSistem === 'imperial';
  const data = sections[activeSection]?.data;

  const stationId = activeStation + 1;
  const entry = useMemo(
    () =>
      (Array.isArray(sidecar?.stations) ? sidecar.stations.find((s) => s.station === stationId) : null) ?? null,
    [sidecar, stationId]
  );

  // Index the profiles by STATION ID. Spectra are only written for stations
  // iWave fitted, so the files alone leave gaps; Processing lays them out one
  // slot per station (alignStationImages), which makes the list position the
  // station index too. The profile arrays have an entry for every station,
  // 0-indexed with station id 1 at index 0 (ids come from np.arange(1, n+1),
  // compute_section.py:567).
  const profileIndex = stationId - 1;
  const velocity = data?.iwave_velocity_profile?.[profileIndex] ?? null;
  const quality = data?.iwave_quality_profile?.[profileIndex] ?? null;

  if (spectrumPaths.every((p) => !p)) {
    return <p className="sti-empty">{t('Processing.iwaveNoData')}</p>;
  }

  if (!spectrumPaths[activeStation]) {
    return (
      <div className="sti-viewer">
        <p className="sti-empty">
          {t('Processing.stiStation')} {stationId} · {emptyLabel}
        </p>
      </div>
    );
  }

  // Fit the spectrum into the panel. Unlike the STI, a non-uniform fit is fine
  // here: the axes are independent physical quantities (wavenumber vs
  // frequency), so stretching one does not misrepresent the other — and the
  // curves are mapped through the same extent, so they stay aligned.
  const aspect = natural ? natural.w / natural.h : 1;
  const viewW = Math.min(containerWidth, containerHeight * aspect);
  const viewH = viewW / (aspect || 1);

  const extent: SpectrumExtent | null = entry
    ? { kxMin: entry.kx_min, kxMax: entry.kx_max, ktMin: entry.kt_min, ktMax: entry.kt_max }
    : null;

  const gravityPoints = extent ? curveToPolylinePoints(entry!.curves.gravity, extent, viewW, viewH) : '';
  const turbulencePoints = extent ? curveToPolylinePoints(entry!.curves.turbulence, extent, viewW, viewH) : '';

  return (
    <div className="sti-viewer">
      <div className="iwave-plot">
        <div className="sti-frame iwave-frame" style={{ width: viewW, height: viewH }}>
          <img
            src={spectrumPaths[activeStation]}
            className="iwave-spectrum-image"
            draggable={false}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            style={{ width: viewW, height: viewH }}
          />
          {extent && (
            <svg className="sti-overlay" width={viewW} height={viewH}>
              {gravityPoints && (
                <polyline points={gravityPoints} fill="none" stroke={iwaveColor} strokeWidth={2} />
              )}
              {turbulencePoints && (
                <polyline
                  points={turbulencePoints}
                  fill="none"
                  stroke={iwaveColor}
                  strokeWidth={2}
                  strokeDasharray="5,4"
                  strokeOpacity={0.75}
                />
              )}
            </svg>
          )}
          <div className="sti-badge velocity-readout" style={{ color: iwaveColor }}>
            {t('Processing.stiStation')} {stationId}
            <br />
            {velocity === null
              ? '—'
              : `${(isImperial ? velocity * UNIT_CONVERSIONS.M_TO_FT : velocity).toFixed(2)} ${
                  isImperial ? UNITS.IMPERIAL.VELOCITY : UNITS.SI.VELOCITY
                }`}
            <br />
            {t('Processing.spectrumQuality')}: {quality === null ? '—' : quality.toFixed(2)}
          </div>
          <div className="iwave-legend velocity-readout">
            <span>
              <svg width="18" height="8">
                <line x1="0" y1="4" x2="18" y2="4" stroke={iwaveColor} strokeWidth="2" />
              </svg>
              {t('Processing.spectrumGravity')}
            </span>
            <span>
              <svg width="18" height="8">
                <line
                  x1="0"
                  y1="4"
                  x2="18"
                  y2="4"
                  stroke={iwaveColor}
                  strokeWidth="2"
                  strokeDasharray="5,4"
                  strokeOpacity="0.75"
                />
              </svg>
              {t('Processing.spectrumTurbulence')}
            </span>
          </div>
        </div>
        <div className="iwave-axis iwave-axis-x">{t('Processing.spectrumKx')}</div>
        <div className="iwave-axis iwave-axis-y">{t('Processing.spectrumKt')}</div>
      </div>
    </div>
  );
};
