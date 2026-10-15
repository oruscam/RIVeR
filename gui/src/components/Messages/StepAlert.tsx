import './messages.css';
import { useUiSlice } from '../../hooks/useUiSlice';
import type { StepAlert } from '../../store/ui/types';
import { stepAlertClassName } from './stepAlertClassName';

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
 * Every current step alert, stacked in the panel. `extra` holds cards derived for this
 * step only (project issues); a card with an `action` gets a button that calls `onAction`.
 */
export const StepAlertList = ({
  extra = [],
  onAction,
}: {
  extra?: StepAlert[];
  onAction?: (action: string) => void;
} = {}) => {
  const { stepAlerts } = useUiSlice();
  const alerts = [...extra, ...stepAlerts];

  if (alerts.length === 0) return null;

  return (
    <div className="step-alert-list" aria-live="assertive">
      {alerts.map((alert) => (
        <div key={alert.id} className={stepAlertClassName(alert.level)} role="alert">
          <span className="step-alert-text">{linkify(alert.text)}</span>
          {alert.action && onAction && (
            <button
              type="button"
              className="btn btn-tertiary btn-sm step-alert-action"
              onClick={() => onAction(alert.action!.action)}
            >
              {alert.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
