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
import { isLowConfidence } from '../helpers/lowConfidence';
import { isStationTuned } from '../helpers/stivAngle';
import { UNIT_CONVERSIONS, UNITS } from '../constants/constants';
import { StiAngleTuner } from './StiAngleTuner';
import './components.css';
import './Graphs/graphs.css';

interface StiViewerProps {
  /** Renderer-loadable STI image paths, one slot per station (station id k at
   *  index k − 1), '' where STIV skipped the station and wrote no STI. */
  stiPaths: string[];
  /** Why the active station has no STI, shown in place of the image. */
  emptyLabel: string;
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

/** Height reserved above the frame for the station's readout strip and the gap
 *  under it, with enough slack that the strip clears the mode switch floating
 *  at the top of the canvas. */
const STRIP_BAND = 44;

/** Fewest columns the window narrows to on a small canvas; below this the
 *  streaks are too short to judge an angle. */
const MIN_WINDOW_COLUMNS = 200;

export const StiViewer = ({
  stiPaths,
  emptyLabel,
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

  // Both early returns stay below every hook, so switching between a computed and
  // a skipped station never changes the hook count.
  if (stiPaths.every((p) => !p)) {
    return <p className="sti-empty">{t('Processing.stiNoData')}</p>;
  }

  if (!stiPaths[activeStation]) {
    return (
      <div className="sti-viewer">
        <p className="sti-empty">
          {t('Processing.stiStation')} {activeStation + 1} · {emptyLabel}
        </p>
      </div>
    );
  }

  // Uniform scale on both axes. A non-uniform (stretched) fit would change the
  // apparent angle of the streaks, so the line drawn from stiv_angle_profile
  // would no longer align with the streaks it describes.
  //
  // The window is WINDOW_COLUMNS wide where the canvas has room for it. Where
  // it has not, the window shows fewer columns rather than a smaller image:
  // the STI keeps its height, and a drag pans to the rest.
  const stageWidth = Math.max(1, containerWidth);
  const cropHeight = natural?.h ?? 301;
  const frameHeight = Math.max(1, containerHeight - CONTROLS_HEIGHT - STRIP_BAND);
  const columnsThatFit = Math.floor(stageWidth / (frameHeight / cropHeight));
  const cropWidth = Math.min(
    Math.max(MIN_WINDOW_COLUMNS, Math.min(WINDOW_COLUMNS, columnsThatFit)),
    natural?.w ?? WINDOW_COLUMNS
  );
  const scale = Math.min(stageWidth / cropWidth, frameHeight / cropHeight);
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

  const tuned = isStationTuned(data?.stiv_angle_manual_profile, activeStation);
  // sigma describes the automatic fit, so it says nothing about an angle the
  // user set by hand.
  const sigma = tuned ? null : (data?.stiv_sigma_profile?.[activeStation] ?? null);
  const isLowConf = !tuned && isLowConfidence(data?.stiv_velocity_profile?.[activeStation], sigma);
  const lengthFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const velocityUnit = isImperial ? UNITS.IMPERIAL.VELOCITY : UNITS.SI.VELOCITY;

  const warnings = [
    isAngleWarned ? t('Processing.stiAngleWarnExtreme') : null,
    isLowConf ? t('Processing.stiAngleLowConfidence') : null,
  ]
    .filter((warning): warning is string => warning !== null)
    .join(' · ');

  return (
    <div className="sti-viewer" ref={setViewerEl}>
      {/* The station's readout, one line resting on the frame and exactly as
          wide as it. The swatch is the station's colour on the bar below, which
          the bars over the STI are drawn in too. */}
      <div className="readout-strip" style={{ width: viewW }}>
        <b className="readout-strip-title">
          {t('Processing.stiStation')} {activeStation + 1}
        </b>
        <span className="readout-strip-item">
          <span>{t('Graphs.velocity')}</span>
          {velocity !== null && <span className="readout-swatch" style={{ background: readoutColor }} />}
          <b>
            {velocity === null
              ? '—'
              : `${sign === 'negative' ? '−' : '+'}${Math.abs(velocity * lengthFactor).toFixed(2)} ${velocityUnit}`}
          </b>
        </span>
        <span className="readout-strip-item">
          <i>θ</i>
          <b>{angle === null ? '—' : `${angle.toFixed(1)}°`}</b>
        </span>
        <span className="readout-strip-item">
          <i>σ</i>
          <b>{sigma === null ? '—' : `±${(sigma * lengthFactor).toFixed(2)} ${velocityUnit}`}</b>
        </span>
        {tuned && <span className="readout-strip-flag">{t('Processing.stiAngleTuned')}</span>}
        {warnings !== '' && (
          <span className="readout-strip-note readout-strip-warn" title={warnings}>
            {warnings}
          </span>
        )}
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
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          style={{
            transform: `translateY(${offsetY}px) scale(${scale}) translateX(${-windowStart}px)`,
            transformOrigin: 'top left',
          }}
        />
        <StiAngleTuner
          stationIndex={activeStation}
          stationId={activeStation + 1}
          viewW={viewW}
          viewH={viewH}
          color={readoutColor}
          rowContainer={viewerEl}
        />
      </div>
    </div>
  );
};
