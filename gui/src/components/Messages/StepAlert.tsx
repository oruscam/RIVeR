import './messages.css';
import { useUiSlice } from '../../hooks/useUiSlice';

/** Pure so the level→class mapping is unit-tested without rendering. */
export const stepAlertClassName = (level: 'info' | 'warning' | 'error'): string => `step-alert step-alert-${level}`;

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const linkify = (text: string) => {
  const parts = text.split(URL_REGEX);
  return parts.map((part, index) =>
    URL_REGEX.test(part) ? (
      <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="step-alert-link">
        {part}
      </a>
    ) : (
      <span key={index}>{part}</span>
    )
  );
};

/**
 * Every current step alert, stacked in the panel. Replaces Error.tsx — every
 * former onSetErrorMessage call site becomes either this (multi-field or
 * non-field conditions) or FieldError (Task 4, one specific field).
 */
export const StepAlertList = () => {
  const { stepAlerts } = useUiSlice();

  if (stepAlerts.length === 0) return null;

  return (
    <div className="step-alert-list" aria-live="assertive">
      {stepAlerts.map((alert) => (
        <div key={alert.id} className={stepAlertClassName(alert.level)} role="alert">
          {linkify(alert.text)}
        </div>
      ))}
    </div>
  );
};
