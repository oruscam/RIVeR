interface ProgressReadoutProps {
  /** 0–100, or null until the backend reports its first percentage. */
  percentage: number | null;
  /** Footer, left: what is running (stage, station, note). */
  label: string;
  /** Footer, right: remaining time, or the estimating placeholder. */
  time: string;
}

/**
 * A large percentage over a hairline that fills to it. Every row renders from
 * the first frame, so nothing moves when the first number arrives.
 */
export const ProgressReadout = ({ percentage, label, time }: ProgressReadoutProps) => {
  const pending = percentage === null;
  return (
    <div
      className="progress-readout"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pending ? undefined : percentage}
    >
      <span className={`progress-readout-value${pending ? ' is-pending' : ''}`}>{pending ? '–' : `${percentage}%`}</span>
      <div className="progress-readout-track">
        <div className="progress-readout-fill" style={{ transform: `scaleX(${(percentage ?? 0) / 100})` }} />
      </div>
      <div className="progress-readout-foot">
        <span>{label}</span>
        <span>{time}</span>
      </div>
    </div>
  );
};
