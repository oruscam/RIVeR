import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectSlice, useSectionSlice } from '../hooks';
import { curveToPolylinePoints, SpectrumExtent } from '../helpers';
import { UNIT_CONVERSIONS, UNITS, TECHNIQUE_COLORS } from '../constants/constants';
import type { IwaveSpectraSidecar } from '../../electron/ipcMainHandlers/getIwaveSpectra';
import './components.css';

interface IWaveViewerProps {
  /** Renderer-loadable spectrum image paths, index-aligned with spectrumStations. */
  spectrumPaths: string[];
  /** Station ids parsed from the spectrum filenames, index-aligned with spectrumPaths. */
  spectrumStations: number[];
  /** Axis extents and dispersion curves; null when the sidecar is missing. */
  sidecar: IwaveSpectraSidecar | null;
  /** Index into the station list — which spectrum is currently selected. */
  activeStation: number;
  containerWidth: number;
  containerHeight: number;
}

export const IWaveViewer = ({
  spectrumPaths,
  spectrumStations,
  sidecar,
  activeStation,
  containerWidth,
  containerHeight,
}: IWaveViewerProps) => {
  const { sections, activeSection } = useSectionSlice();
  const { projectDetails } = useProjectSlice();
  const { t } = useTranslation();
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const isImperial = projectDetails.unitSistem === 'imperial';
  const data = sections[activeSection]?.data;

  const stationId = spectrumStations[activeStation];
  const entry = useMemo(
    () =>
      (Array.isArray(sidecar?.stations) ? sidecar.stations.find((s) => s.station === stationId) : null) ?? null,
    [sidecar, stationId]
  );

  // Index the profiles by STATION ID, not by position in the spectrum list.
  // Spectra are only written for stations whose fit succeeded, so a failed
  // station leaves a gap: spectrumStations might be [1,2,4,5] while the
  // profile arrays still have an entry for every station, 0-indexed with
  // station id 1 at index 0 (ids come from np.arange(1, n+1),
  // compute_section.py:567). Using the list position here would show the
  // wrong station's velocity whenever any fit failed.
  const profileIndex = stationId === undefined ? -1 : stationId - 1;
  const velocity = profileIndex >= 0 ? (data?.iwave_velocity_profile?.[profileIndex] ?? null) : null;
  const quality = profileIndex >= 0 ? (data?.iwave_quality_profile?.[profileIndex] ?? null) : null;

  if (spectrumPaths.length === 0) {
    return <p className="sti-empty">{t('Processing.iwaveNoData')}</p>;
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
                <polyline points={gravityPoints} fill="none" stroke={TECHNIQUE_COLORS.iwave} strokeWidth={2} />
              )}
              {turbulencePoints && (
                <polyline
                  points={turbulencePoints}
                  fill="none"
                  stroke={TECHNIQUE_COLORS.iwave}
                  strokeWidth={2}
                  strokeDasharray="5,4"
                  strokeOpacity={0.75}
                />
              )}
            </svg>
          )}
          <div className="sti-badge velocity-readout" style={{ color: TECHNIQUE_COLORS.iwave }}>
            {t('Processing.stiStation')} {stationId ?? activeStation + 1}
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
                <line x1="0" y1="4" x2="18" y2="4" stroke={TECHNIQUE_COLORS.iwave} strokeWidth="2" />
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
                  stroke={TECHNIQUE_COLORS.iwave}
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
