import { useEffect } from 'react';
import { useDataSlice, useUiSlice } from '../../../hooks';
import { useTranslation } from 'react-i18next';

/**
 * Drawing-mode concern only: shows a persistent "Editing mask N" mode-hint
 * pill while a mask is being edited on the canvas, mirroring the
 * stabilization regions' editing warning. The mask list itself moved to
 * MaskList.tsx, rendered unconditionally outside Advanced — masks are no
 * longer gated behind extraFields, but the editing-warning side effect
 * still belongs with the drawing controls, not the list.
 */
export const MaskCreation = () => {
  const { t } = useTranslation();
  const { processing } = useDataSlice();
  const { onSetModeHint, onClearModeHint } = useUiSlice();
  const { activeMaskIndex } = processing;

  // Persistent yellow "editing mask N" status while a mask is being edited,
  // same behavior as the stabilization regions' editing warning.
  useEffect(() => {
    if (activeMaskIndex === null) {
      onClearModeHint();
      return;
    }

    onSetModeHint(
      t('CrossSections.editingMaskWarning', { defaultValue: 'Editing mask {{n}}', n: activeMaskIndex + 1 })
    );

    return () => {
      onClearModeHint();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMaskIndex]);

  return null;
};
