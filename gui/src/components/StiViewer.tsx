import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataSlice, useProjectSlice, useSectionSlice } from '../hooks';
import { createColorMap, Normalize } from '../../commons/vectors';
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

  const stationColors = useMemo(() => {
    const profile = data?.stiv_velocity_profile;
    if (!profile) return [];
    const values = profile.filter((v): v is number => v !== null);
    if (values.length === 0) return [];
    const min = colorbarLimits.default === false ? colorbarLimits.min! : Math.min(...values);
    const max = colorbarLimits.default === false ? colorbarLimits.max! : Math.max(...values);
    const norm = new Normalize(min, max);
    const colorMap = createColorMap();
    return profile.map((v) => {
      if (v === null) return 'transparent';
      const clamped = Math.max(min, Math.min(max, v));
      const index = Math.max(
        0,
        Math.min(Math.floor(norm.normalize(clamped) * (colorMap.length - 1)), colorMap.length - 1)
      );
      return colorMap[index];
    });
  }, [data?.stiv_velocity_profile, colorbarLimits.default, colorbarLimits.min, colorbarLimits.max]);

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
      <div className="sti-context">
        {stationColors.map((color, i) => (
          <span
            key={i}
            className={`sti-context-tick${i === activeStation ? ' sti-context-tick-active' : ''}`}
            style={{ background: color }}
          />
        ))}
      </div>

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
          onLoad={(e) =>
            setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
          }
          style={{
            transform: `translateY(${offsetY}px) scale(${scale}) translateX(${-windowStart}px)`,
            transformOrigin: 'top left',
          }}
        />
        {angleRad !== null && (
          <svg className="sti-overlay" width={viewW} height={viewH}>
            <line
              x1={viewW / 2 - (Math.cos(angleRad) * Math.min(viewW, viewH) * 0.8) / 2}
              y1={viewH / 2 - (Math.sin(angleRad) * Math.min(viewW, viewH) * 0.8) / 2}
              x2={viewW / 2 + (Math.cos(angleRad) * Math.min(viewW, viewH) * 0.8) / 2}
              y2={viewH / 2 + (Math.sin(angleRad) * Math.min(viewW, viewH) * 0.8) / 2}
              stroke="var(--accent-color)"
              strokeWidth={2}
            />
          </svg>
        )}
        <div className="sti-badge">
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
