import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useStivAngleOverride } from '../hooks';
import { ANGLE_MAX, ANGLE_MIN, nextAngleFromSlider } from '../helpers';
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
  /**
   * Where the slider row is mounted — `.sti-viewer`, so the row is a sibling of
   * `.sti-frame` rather than a child of it. The frame clips its overflow (it has
   * to, for the panned image), which would swallow the row; the bars themselves
   * still render inside the frame, over the image they describe. A portal is what
   * lets one component own both halves.
   */
  rowContainer: HTMLElement | null;
}

/** Fraction of the frame width each bar is centred on. */
const BAR_FRACTIONS = [0.25, 0.5, 0.75];
/** Where the bars start on a station STIV never fitted. 90° is the midpoint of the
 *  0–180° range, so it is a neutral place to start from rather than a guess at the
 *  real angle — the same default the labelling tool's slider opens on
 *  (~/sti_training/02_labeling/static/index.html:66, value="90"). */
const DEFAULT_ANGLE = 90;

/**
 * Manual fine-tuning of one station's STIV angle.
 *
 * The slider under the frame is the only way in: the bars over the STI are a
 * read-out of it, drawn where the streaks are so the two can be compared. The
 * image itself stays a plain drag-to-pan, as it was before the tuner existed.
 */
export const StiAngleTuner = ({
  stationIndex,
  stationId,
  viewW,
  viewH,
  color,
  rowContainer,
}: StiAngleTunerProps) => {
  const { t } = useTranslation();
  const { angle, autoAngle, isTuned, setAngle, reset } = useStivAngleOverride(stationIndex);

  const centres = useMemo(() => BAR_FRACTIONS.map((fraction) => viewW * fraction), [viewW]);
  const cy = viewH / 2;
  const half = (Math.min(viewW, viewH) * 0.8) / 2;

  // A station STIV gave up on is a prime candidate for a human read, so the tuner
  // stays fully usable there: the bars sit at the neutral default until the first
  // slider move writes a real override. Only the geometry and the controls use this
  // fallback — the velocity readouts stay on the real angle, so they keep showing
  // '—' rather than a number nobody measured.
  const displayAngle = angle ?? DEFAULT_ANGLE;

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

  return (
    <>
      <svg className="sti-overlay sti-angle-overlay" width={viewW} height={viewH}>
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
              <line {...line} style={{ stroke: color }} strokeWidth={3} strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
      {rowContainer !== null &&
        createPortal(
          // The row is portalled out of .sti-frame in the DOM, but a portal still
          // bubbles along the React tree, where this component sits inside the
          // frame. Stopping the event here keeps a drag of the slider thumb off the
          // frame's pan handler, which a plain drag would otherwise trigger.
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
                style={{ accentColor: color }}
                onChange={(event) => setAngle(nextAngleFromSlider(parseFloat(event.target.value), displayAngle))}
              />
              <button type="button" className="sti-angle-reset" disabled={!isTuned} onClick={reset}>
                {t('Processing.stiAngleReset')}
              </button>
            </div>
          </div>,
          rowContainer
        )}
    </>
  );
};
