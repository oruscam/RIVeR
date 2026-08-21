import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataSlice, useProjectSlice, useSectionSlice } from '../hooks';
import { getStiColorScale, STI_FALLBACK_COLOR } from '../helpers';
import { UNIT_CONVERSIONS, UNITS } from '../constants/constants';
import './components.css';

interface StiViewerProps {
  /** Renderer-loadable STI image paths, index-aligned with stiStations. */
  stiPaths: string[];
  /** Station ids parsed from the STI filenames, index-aligned with stiPaths. */
  stiStations: number[];
  /** Index into the station list — which STI is currently selected. */
  activeStation: number;
  containerWidth: number;
  containerHeight: number;
}

/** Columns of the STI shown at once. The full image is ~5340 columns wide; a
 *  window of this size fills the panel at a legible scale, matching the framing
 *  the offline STIV diagnostic figures use. */
const WINDOW_COLUMNS = 600;

export const StiViewer = ({
  stiPaths,
  stiStations,
  activeStation,
  containerWidth,
  containerHeight,
}: StiViewerProps) => {
  const { sections, activeSection } = useSectionSlice();
  const { colorbarLimits } = useDataSlice();
  const { projectDetails } = useProjectSlice();
  const { t } = useTranslation();

  const isImperial = projectDetails.unitSistem === 'imperial';

  const section = sections[activeSection];
  const data = section?.data;

  const [windowStart, setWindowStart] = useState(0);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setWindowStart(0);
    setOffsetY(0);
  }, [activeStation]);

  const angle = data?.stiv_angle_profile?.[activeStation] ?? null;
  const velocity = data?.stiv_velocity_profile?.[activeStation] ?? null;
  const sign = data?.stiv_sign_profile?.[activeStation] ?? '';

  const { colors: stationColors } = useMemo(
    () => getStiColorScale(data?.stiv_velocity_profile, colorbarLimits),
    [data?.stiv_velocity_profile, colorbarLimits]
  );

  // The lines and the badge must stay visible even where STIV produced no value for
  // this station, so they take the fallback rather than the ticks' 'transparent'.
  const readoutColor =
    stationColors[activeStation] && stationColors[activeStation] !== 'transparent'
      ? stationColors[activeStation]
      : STI_FALLBACK_COLOR;

  if (stiPaths.length === 0) {
    return <p className="sti-empty">{t('Processing.stiNoData')}</p>;
  }

  // Uniform scale on both axes. A non-uniform (stretched) fit would change the
  // apparent angle of the streaks, so the line drawn from stiv_angle_profile
  // would no longer align with the streaks it describes.
  const cropWidth = Math.min(WINDOW_COLUMNS, natural?.w ?? WINDOW_COLUMNS);
  const cropHeight = natural?.h ?? 301;
  const scale = Math.min(containerWidth / cropWidth, containerHeight / cropHeight);
  const viewW = cropWidth * scale;
  const viewH = cropHeight * scale;

  const maxStart = Math.max(0, (natural?.w ?? 0) - cropWidth);
  // Vertical panning only applies if the scaled image is taller than the view.
  // When it isn't — the usual case, since the crop is fitted to height — this
  // clamps to 0 and vertical dragging simply has no effect.
  const maxOffsetY = Math.max(0, (natural?.h ?? 0) * scale - viewH);

  const angleRad = angle === null ? null : (angle * Math.PI) / 180;

  const handlePointerDown = (event: React.MouseEvent<HTMLDivElement>) => {
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: windowStart,
      originY: offsetY,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    // Dragging right should reveal earlier columns, so the offset moves opposite
    // to the pointer. windowStart is in source-image columns, hence dividing by scale.
    const nextStart = drag.originX - (event.clientX - drag.startX) / scale;
    const nextY = drag.originY + (event.clientY - drag.startY);
    setWindowStart(Math.max(0, Math.min(maxStart, nextStart)));
    setOffsetY(Math.max(-maxOffsetY, Math.min(0, nextY)));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  return (
    <div className="sti-viewer">
      <div
        className="sti-frame"
        style={{ width: viewW, height: viewH, cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
      >
        <img
          src={stiPaths[activeStation]}
          className="sti-image"
          draggable={false}
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          style={{
            transform: `translateY(${offsetY}px) scale(${scale}) translateX(${-windowStart}px)`,
            transformOrigin: 'top left',
          }}
        />
        {angleRad !== null && (
          <svg className="sti-overlay" width={viewW} height={viewH}>
            {/* One line per quarter of the frame width, all at the reported angle, so
                the angle can be checked against streaks in more than one region.
                Each keeps the length the single centre line used. Outer lines may run
                past the frame on steep angles; .sti-frame clips them. */}
            {[0.25, 0.5, 0.75].map((fraction) => {
              const halfLength = (Math.min(viewW, viewH) * 0.8) / 2;
              const cx = viewW * fraction;
              const cy = viewH / 2;
              return (
                <line
                  key={fraction}
                  x1={cx - Math.cos(angleRad) * halfLength}
                  y1={cy - Math.sin(angleRad) * halfLength}
                  x2={cx + Math.cos(angleRad) * halfLength}
                  y2={cy + Math.sin(angleRad) * halfLength}
                  stroke={readoutColor}
                  strokeWidth={3}
                />
              );
            })}
          </svg>
        )}
        <div className="sti-badge velocity-readout" style={{ color: readoutColor }}>
          {t('Processing.stiStation')} {stiStations[activeStation] ?? activeStation + 1}
          <br />
          {angle === null ? '—' : `${angle.toFixed(1)}°`}
          <br />
          {velocity === null
            ? '—'
            : `${sign === 'negative' ? '−' : '+'}${Math.abs(
                isImperial ? velocity * UNIT_CONVERSIONS.M_TO_FT : velocity
              ).toFixed(2)} ${isImperial ? UNITS.IMPERIAL.VELOCITY : UNITS.SI.VELOCITY}`}
        </div>
      </div>
    </div>
  );
};
