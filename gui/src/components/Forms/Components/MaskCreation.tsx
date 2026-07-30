import { useEffect } from 'react';
import { useDataSlice, useUiSlice } from '../../../hooks';
import { useTranslation } from 'react-i18next';
import { EyeBtn } from '../../CustomIcons/EyeBtn';
import { TrashBtn } from '../../CustomIcons/TrashBtn';
import { EditMaskBtn } from '../../CustomIcons/EditMaskBtn';

export const MaskCreation = () => {
  const { t } = useTranslation();
  const { processing, onToggleMaskVisibility, onDeleteMask, onUpdateActiveMask } = useDataSlice();
  const { onSetWarningMessage, onClearWarningMessage } = useUiSlice();
  const { masks, visibleMaskIndices, activeMaskIndex } = processing;

  // Persistent yellow "editing mask N" status while a mask is being edited,
  // same behavior as the stabilization regions' editing warning.
  useEffect(() => {
    if (activeMaskIndex === null) {
      onClearWarningMessage();
      return;
    }

    onSetWarningMessage(
      t('CrossSections.editingMaskWarning', { defaultValue: 'Editing mask {{n}}', n: activeMaskIndex + 1 })
    );

    return () => {
      onClearWarningMessage();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMaskIndex]);

  return (
    <div className="hard-mode-processing">
      {masks !== undefined &&
        masks.map((_mask, index) => (
          <div key={index} className="switch-container mt-1">
            <h3 className="field-title">
              {' '}
              {t('CrossSections.mask')} {index + 1}{' '}
            </h3>
            <div className="mask-actions">
              <EyeBtn
                key={index}
                action={onToggleMaskVisibility}
                active={visibleMaskIndices.includes(index)}
                index={index}
              />
              <EditMaskBtn action={onUpdateActiveMask} active={activeMaskIndex === index} index={index} />
              <TrashBtn onClickFunction={() => onDeleteMask(index)} />
            </div>
          </div>
        ))}
    </div>
  );
};
