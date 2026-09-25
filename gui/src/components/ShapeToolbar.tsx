import { useTranslation } from 'react-i18next';

interface ShapeToolbarProps {
  /** Remove the most recently placed point. Mask-only: a region is a plain
   *  rect with no point history, so the undo button doesn't render for
   *  kind === 'region' and this is never called. Required rather than
   *  optional because masks always need it. */
  onUndo: () => void;
  /** Discard the whole shape. */
  onDelete: () => void;
  /** Finish editing this shape. */
  onDone: () => void;
  /** Mask-only, see onUndo. */
  canUndo: boolean;
  /** What the shape is called, for the tooltips: 'mask' or 'region'. Also
   *  gates the undo button, which only makes sense for a mask's polygon. */
  kind: 'mask' | 'region';
}

/**
 * The only control cluster allowed to sit over an image canvas besides the
 * mode-hint pill (spec section 2). Shared by masks and regions deliberately:
 * before 6c, masks had a three-button toolbar and regions had a single green
 * tick, so a region could be confirmed but never undone or deleted from the
 * canvas. One component is what stops them diverging again.
 */
export const ShapeToolbar = ({ onUndo, onDelete, onDone, canUndo, kind }: ShapeToolbarProps) => {
  const { t } = useTranslation();

  return (
    <div className="shape-toolbar">
      {kind === 'mask' && (
        <button
          type="button"
          className="ibtn ibtn-sm"
          onClick={onUndo}
          aria-disabled={!canUndo}
          title={t('Canvas.undoPoint', { defaultValue: 'Undo last point' })}
        >
          {/* Placeholder glyph: swap for the project's own icon component. */}
          &#8630;
        </button>
      )}
      <button
        type="button"
        className="ibtn ibtn-sm ibtn-danger"
        onClick={onDelete}
        title={
          kind === 'mask'
            ? t('Canvas.deleteMask', { defaultValue: 'Delete mask' })
            : t('Canvas.deleteRegion', { defaultValue: 'Delete region' })
        }
      >
        &#128465;
      </button>
      <button
        type="button"
        className="ibtn ibtn-sm"
        onClick={onDone}
        title={t('Canvas.done', { defaultValue: 'Done' })}
      >
        &#10003;
      </button>
    </div>
  );
};
