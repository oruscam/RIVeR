import { useTranslation } from 'react-i18next';
import { Icons } from './CustomIcons/Icons';

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
 * mode-hint pill (spec section 2). Built to be shared by masks and regions:
 * before 6c, masks had a three-button toolbar and regions had a single green
 * tick, so a region could be confirmed but never undone or deleted from the
 * canvas. Today only regions consume it (StabilizationCanvas.tsx); masks are
 * still on the separate, pre-existing MaskToolbar.tsx, with its own
 * .mask-toolbar* CSS and CrossSections.* keys. Moving masks onto this
 * component is deferred debt (spec §9, after A10), not something 6c did, so
 * the two can still diverge until it happens.
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
          {Icons.Undo('currentColor')}
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
        {Icons.Trash('currentColor')}
      </button>
      <button
        type="button"
        className="ibtn ibtn-sm"
        onClick={onDone}
        title={t('Canvas.done', { defaultValue: 'Done' })}
      >
        {Icons.Check('currentColor')}
      </button>
    </div>
  );
};
