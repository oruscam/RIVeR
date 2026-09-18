// src/components/MaskToolbar.tsx
import { useTranslation } from 'react-i18next';
import { Icons } from './CustomIcons/Icons';
import './components.css';

interface MaskToolbarProps {
  style?: React.CSSProperties;
  onDone: () => void;
  onUndoPoint: () => void;
  onDelete: () => void;
  /** Disabled once there's nothing left to undo (0 or 1 point placed). */
  canUndo: boolean;
}

/**
 * Floating Done / Undo point / Delete pill next to the mask being drawn or
 * edited, replacing the single ConfirmMaskBtn tick for masks (stabilization
 * regions keep their own single-button ConfirmMaskBtn — see the audit's
 * comparison table, which doesn't propose a toolbar for regions).
 */
export const MaskToolbar = ({ style, onDone, onUndoPoint, onDelete, canUndo }: MaskToolbarProps) => {
  const { t } = useTranslation();

  return (
    <div className="mask-toolbar" style={style} onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="mask-toolbar-btn"
        onClick={onUndoPoint}
        disabled={!canUndo}
        title={t('CrossSections.undoPoint', { defaultValue: 'Undo point' })}
      >
        {Icons.Undo('currentColor')}
      </button>
      <button
        type="button"
        className="mask-toolbar-btn mask-toolbar-btn-danger"
        onClick={onDelete}
        title={t('CrossSections.deleteMask', { defaultValue: 'Delete mask' })}
      >
        {Icons.Trash('currentColor')}
      </button>
      <button
        type="button"
        className="mask-toolbar-btn mask-toolbar-btn-done"
        onClick={onDone}
        title={t('CrossSections.confirmMask', { defaultValue: 'Confirm mask' })}
      >
        {Icons.Check('currentColor')}
      </button>
    </div>
  );
};
