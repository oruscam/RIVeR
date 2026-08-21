import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useStivAngleOverride } from '../hooks';
import { ANGLE_MAX, ANGLE_MIN, angleFromPointer, isAnglePoorlyConstrained } from '../helpers';
import { UNIT_CONVERSIONS, UNITS } from '../constants/constants';
import './components.css';

interface StiAngleTunerProps {
  /** Index into the profile arrays — the station being tuned. */
  stationIndex: number;
  /** Station id as printed on the STI, for the slider's accessible name. */
  stationId: number;
  viewW: number;
  viewH: number;
  /** Velocity colour for the current angle, from getStiColorScale. */
  color: string;
  velocity: number | null;
  isImperial: boolean;
  /**
   * Where the slider row is mounted — `.sti-viewer`, so the row is a sibling of
   * `.sti-frame` rather than a child of it. The frame clips its overflow (it has
   * to, for the panned image), which would swallow the row; the overlay itself
   * still renders inside the frame so that Shift+drag bubbles to the frame's pan
   * handlers. A portal is what lets one component own both halves.
   */
  rowContainer: HTMLElement | null;
}

/** Fraction of the frame width each bar is centred on. */
const BAR_FRACTIONS = [0.25, 0.5, 0.75];
/** Keyboard nudge in degrees: coarse, and fine while Shift is held. */
const NUDGE_COARSE = 0.5;
const NUDGE_FINE = 0.1;
/** Where the bars start on a station STIV never fitted. 90° is the midpoint of the
 *  0–180° range, so it is a neutral place to grab from rather than a guess at the
 *  real angle — the same default the labelling tool's slider opens on
 *  (~/sti_training/02_labeling/static/index.html:66, value="90"). */
const DEFAULT_ANGLE = 90;

/**
 * Manual fine-tuning of one station's STIV angle.
 *
 * Two ways in, sharing one value: grab the bars and rotate them over the STI, or
 * use the slider under the frame. Rotation is the plain drag because it is the
 * gesture the streaks invite; panning the STI keeps the Shift modifier.
 */
export const StiAngleTuner = ({
  stationIndex,
  stationId,
  viewW,
  viewH,
  color,
  velocity,
  isImperial,
  rowContainer,
}: StiAngleTunerProps) => {
  const { t } = useTranslation();
  const { angle, autoAngle, isTuned, setAngle, reset } = useStivAngleOverride(stationIndex);

  const rotatingRef = useRef(false);
  const [isRotating, setIsRotating] = useState(false);

  const centres = useMemo(() => BAR_FRACTIONS.map((fraction) => viewW * fraction), [viewW]);
  const cy = viewH / 2;
  const half = (Math.min(viewW, viewH) * 0.8) / 2;

  // A station STIV gave up on is a prime candidate for a human read, so the tuner
  // stays fully interactive there: the bars sit at the neutral default until the
  // first drag or slider move writes a real override. Only the geometry and the
  // controls use this fallback — the velocity readouts stay on the real angle, so
  // they keep showing '—' rather than a number nobody measured.
  const displayAngle = angle ?? DEFAULT_ANGLE;

  // The warning describes an angle somebody chose, so it stays quiet on the neutral
  // fallback: "STIV produced nothing here" and "your angle is questionable" are the
  // two states this screen most needs to keep apart.
  const isWarned = angle !== null && isAnglePoorlyConstrained(displayAngle);
  const strokeColor = isWarned ? 'var(--warning-color)' : color;

  /** Endpoints of the bar centred on `cx`, drawn at `deg`. */
  const bar = (cx: number, deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x1: cx - Math.cos(rad) * half,
      y1: cy - Math.sin(rad) * half,
      x2: cx + Math.cos(rad) * half,
      y2: cy + Math.sin(rad) * half,
    };
  };

  const applyPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const next = angleFromPointer(event.clientX - rect.left, event.clientY - rect.top, centres, cy);
    // Quantised to the tenth of a degree the readout shows, and dropped when it
    // lands on the value already held: every setAngle writes xsections.json, so a
    // drag that changes nothing should not spend a file write on it.
    const rounded = Math.round(next * 10) / 10;
    // The `angle !== null` half matters on a station with no automatic fit: there
    // the bars sit at a fallback nothing is stored for, so a first grab landing
    // exactly on it still has an override to create.
    if (angle !== null && rounded === displayAngle) return;
    setAngle(rounded);
  };

  // Shift belongs to the viewer's pan, so every pointer handler here declines the
  // event rather than consuming it: it still bubbles up to .sti-frame.
  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.shiftKey) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    // Focus follows the grab so the arrow-key nudge works straight after a drag.
    event.currentTarget.focus();
    rotatingRef.current = true;
    setIsRotating(true);
    applyPointer(event);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!rotatingRef.current || event.shiftKey) return;
    applyPointer(event);
  };

  const handlePointerUp = () => {
    rotatingRef.current = false;
    setIsRotating(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.shiftKey ? NUDGE_FINE : NUDGE_COARSE;
    const next = displayAngle + (event.key === 'ArrowLeft' ? -step : step);
    // Rounded so a run of fine nudges cannot drift into 45.300000000000004.
    setAngle(Math.round(next * 10) / 10);
  };

  const displayVelocity =
    velocity === null
      ? '—'
      : `${velocity < 0 ? '−' : '+'}${Math.abs(isImperial ? velocity * UNIT_CONVERSIONS.M_TO_FT : velocity).toFixed(2)} ${
          isImperial ? UNITS.IMPERIAL.VELOCITY : UNITS.SI.VELOCITY
        }`;

  return (
    <>
      <svg
        className={`sti-overlay sti-angle-overlay${isRotating ? ' is-rotating' : ''}`}
        width={viewW}
        height={viewH}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        {/* Where the automatic fit put the angle, so the correction can always be
            read against it — and undone by eye, not just by the reset button. */}
        {isTuned &&
          autoAngle !== null &&
          centres.map((cx) => {
            const ghost = bar(cx, autoAngle);
            return (
              <g key={`ghost-${cx}`}>
                <line {...ghost} stroke="rgba(0,0,0,0.45)" strokeWidth={4} strokeDasharray="6 5" />
                <line {...ghost} stroke="rgba(255,255,255,0.65)" strokeWidth={2} strokeDasharray="6 5" />
              </g>
            );
          })}
        {/* One bar per quarter of the frame width, all at the same angle, so it can
            be checked against streaks in more than one region. Each is drawn twice:
            a dark casing under the coloured line keeps it legible over any STI. */}
        {centres.map((cx) => {
          const line = bar(cx, displayAngle);
          return (
            <g key={cx}>
              <line {...line} stroke="rgba(0,0,0,0.55)" strokeWidth={6} strokeLinecap="round" />
              <line {...line} style={{ stroke: strokeColor }} strokeWidth={3} strokeLinecap="round" />
              <circle className="sti-angle-handle" cx={line.x1} cy={line.y1} r={5} style={{ fill: strokeColor }} />
              <circle className="sti-angle-handle" cx={line.x2} cy={line.y2} r={5} style={{ fill: strokeColor }} />
            </g>
          );
        })}
      </svg>
      {rowContainer !== null &&
        createPortal(
          // Events are stopped here because a portal still bubbles along the React
          // tree — without this, a Shift+click on the slider would start a pan.
          <div className="sti-angle-controls" style={{ width: viewW }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="sti-angle-row">
              <input
                type="range"
                className="sti-angle-slider"
                min={ANGLE_MIN}
                max={ANGLE_MAX}
                step={0.5}
                value={displayAngle}
                aria-label={`${t('Processing.stiStation')} ${stationId} θ`}
                style={{ accentColor: strokeColor }}
                onChange={(event) => setAngle(parseFloat(event.target.value))}
              />
              <span className="sti-angle-value" style={{ color: strokeColor }}>
                {displayAngle.toFixed(1)}° · {displayVelocity}
              </span>
              <button type="button" className="sti-angle-reset" disabled={!isTuned} onClick={reset}>
                {t('Processing.stiAngleReset')}
              </button>
            </div>
            <div className="sti-angle-meta">
              <span className="sti-angle-hint">{t('Processing.stiAngleDragHint')}</span>
              {isWarned && <span className="sti-angle-warning">{t('Processing.stiAngleWarnExtreme')}</span>}
              {isTuned && autoAngle !== null && (
                <span className="sti-angle-tuned">
                  {t('Processing.stiAngleTuned')} · {t('Processing.stiAngleAuto', { angle: autoAngle.toFixed(1) })}
                </span>
              )}
            </div>
          </div>,
          rowContainer
        )}
    </>
  );
};
