import './messages.css';
import { useUiSlice } from '../../hooks/useUiSlice';

/**
 * Bottom-of-window toast, auto-dismissing after 4s (started by onShowToast,
 * Task 2). `onAction` is provided by the caller that showed the toast — this
 * component has no idea what "Undo" means for copy-to-clipboard vs. an STIV
 * angle reset (Tasks 11–12); it only renders the label and forwards the click.
 */
export const Toast = ({ onAction }: { onAction?: () => void }) => {
  const { toast, onClearToast } = useUiSlice();

  if (toast === null) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{toast.text}</span>
      {toast.actionLabel && onAction && (
        <button
          type="button"
          className="toast-action"
          onClick={() => {
            onAction();
            onClearToast();
          }}
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  );
};
