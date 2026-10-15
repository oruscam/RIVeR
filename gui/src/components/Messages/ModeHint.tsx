import './messages.css';
import { useUiSlice } from '../../hooks/useUiSlice';
import { buildModeHintAriaLabel } from './modeHintText';

/**
 * Persistent canvas-adjacent hint: "what mode you're in and how to leave it."
 * Replaces the old Warning.tsx bar (and VideoRange's one Info.tsx use, whose
 * "add 2 regions" copy is now StabilizationRegions's `meta`, see Task 9).
 * Always mounted; renders nothing when there's no active hint, matching
 * Warning.tsx's existing "reserve no layout at all" behavior.
 */
export const ModeHint = () => {
  const { modeHint } = useUiSlice();

  if (modeHint === null) return null;

  return (
    <div className="mode-hint" role="status" aria-live="polite" aria-label={buildModeHintAriaLabel(modeHint)}>
      <span className="mode-hint-text">{modeHint.text}</span>
      {modeHint.meta && <span className="mode-hint-meta">{modeHint.meta}</span>}
    </div>
  );
};
