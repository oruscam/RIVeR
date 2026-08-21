import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataSlice, useProjectSlice, useSectionSlice, useStivAngleOverride } from '../hooks';
import {
  getStiColorScale,
  isAnglePoorlyConstrained,
  STI_FALLBACK_COLOR,
  thetaToSign,
  thetaToVelocity,
} from '../helpers';
import { UNIT_CONVERSIONS, UNITS } from '../constants/constants';
import { StiAngleTuner } from './StiAngleTuner';
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

/** Height reserved under the frame for the tuner's single slider row, so the frame
 *  plus the row still fit the space the frame alone used to have — anything taller
 *  would push the row down onto the floating colour bar. */
const CONTROLS_HEIGHT = 32;

export const StiViewer = ({
  stiPaths,
  stiStations,
  activeStation,
  containerWidth,
  containerHeight,
}: StiViewerProps) => {
  const { sections, activeSection } = useSectionSlice();
  const { colorbarLimits } = useDataSlice();
  const { projectDetails, video } = useProjectSlice();
  const { t } = useTranslation();

  const isImperial = projectDetails.unitSistem === 'imperial';
  const { parameters, data: videoData } = video;

  const section = sections[activeSection];
  const data = section?.data;

  const [windowStart, setWindowStart] = useState(0);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // Held as state rather than a ref so the tuner re-renders once the element
  // exists and its portalled slider row can mount into it.
  const [viewerEl, setViewerEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setWindowStart(0);
    setOffsetY(0);
  }, [activeStation]);

  // The effective angle: the user's override where there is one, else the fit.
  // Velocity and sign follow from it rather than from the stored profiles, so the
  // badge tracks a drag on the same frame the bars do.
  const { angle } = useStivAngleOverride(activeStation);
  const velocity = angle === null ? null : thetaToVelocity(angle, parameters.step, videoData.fps);
  const sign = angle === null ? '' : thetaToSign(angle);

  // The warning describes an angle somebody chose, so it stays quiet on the
  // neutral fallback the tuner draws for a station STIV never fitted.
  const isAngleWarned = angle !== null && isAnglePoorlyConstrained(angle);

  // Bounds come from the raw profile — exactly what ImageProcessing feeds the
  // ColorBar beside this view, so the two never disagree.
  const { min, max } = useMemo(
    () => getStiColorScale(data?.stiv_velocity_profile, colorbarLimits),
    [data?.stiv_velocity_profile, colorbarLimits]
  );

  // The live colour for this station alone, taken with those bounds locked. Locking
  // them is what keeps a drag from redefining the scale: thetaToVelocity is a tan,
  // so sweeping through 90° passes through hundreds of m/s, and an automatic scale
  // would rescale to that and wash every other station out. Locked, the colour
  // simply saturates at the end of the scale the legend shows.
  const readoutColor = useMemo(() => {
    if (velocity === null || min === null || max === null) return STI_FALLBACK_COLOR;
    const color = getStiColorScale([velocity], { min, max, default: false }).colors[0];
    // Must stay visible where STIV produced no value, so it takes the fallback
    // rather than the ticks' 'transparent'.
    return color && color !== 'transparent' ? color : STI_FALLBACK_COLOR;
  }, [velocity, min, max]);

  if (stiPaths.length === 0) {
    return <p className="sti-empty">{t('Processing.stiNoData')}</p>;
  }

  // Uniform scale on both axes. A non-uniform (stretched) fit would change the
  // apparent angle of the streaks, so the line drawn from stiv_angle_profile
  // would no longer align with the streaks it describes.
  const cropWidth = Math.min(WINDOW_COLUMNS, natural?.w ?? WINDOW_COLUMNS);
  const cropHeight = natural?.h ?? 301;
  const frameHeight = Math.max(1, containerHeight - CONTROLS_HEIGHT);
  const scale = Math.min(containerWidth / cropWidth, frameHeight / cropHeight);
  const viewW = cropWidth * scale;
  const viewH = cropHeight * scale;

  const maxStart = Math.max(0, (natural?.w ?? 0) - cropWidth);
  // Vertical panning only applies if the scaled image is taller than the view.
  // When it isn't — the usual case, since the crop is fitted to height — this
  // clamps to 0 and vertical dragging simply has no effect.
  const maxOffsetY = Math.max(0, (natural?.h ?? 0) * scale - viewH);

  // A plain drag pans the STI; the angle is set by the tuner's slider under it,
  // which stops its own events so a drag of the thumb never reaches here.
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
    <div className="sti-viewer" ref={setViewerEl}>
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
        <StiAngleTuner
          stationIndex={activeStation}
          stationId={stiStations[activeStation] ?? activeStation + 1}
          viewW={viewW}
          viewH={viewH}
          color={readoutColor}
          rowContainer={viewerEl}
        />
        <div className="sti-badge velocity-readout" style={{ color: readoutColor }}>
          {t('Processing.stiStation')} {stiStations[activeStation] ?? activeStation + 1}
          <br />
          {angle === null ? (
            '—'
          ) : (
            <>
              {angle.toFixed(1)}°
              {isAngleWarned && (
                <span className="sti-badge-warn" title={t('Processing.stiAngleWarnExtreme')}>
                  {' '}
                  ⚠
                </span>
              )}
            </>
          )}
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
