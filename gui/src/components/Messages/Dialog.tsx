import './messages.css';

export interface DialogOptions {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
}

export const Dialog = ({
  options,
  onConfirm,
  onCancel,
}: {
  options: DialogOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <b id="dialog-title">{options.title}</b>
        <p>{options.body}</p>
        <div className="dialog-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {options.cancelLabel ?? 'Cancel'}
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} autoFocus>
            {options.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
