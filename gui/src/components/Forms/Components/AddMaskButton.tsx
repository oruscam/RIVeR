import { useTranslation } from 'react-i18next';
import { useDataSlice } from '../../../hooks';

export const AddMaskButton = () => {
  const { t } = useTranslation();
  const { onAddMask, onUpdateActiveMask, processing } = useDataSlice();
  const { activeMaskIndex } = processing;

  // When in mask mode, clicking the button again deselects the active mask (exits mask mode)
  const handleClick = () => {
    if (activeMaskIndex !== null) {
      onUpdateActiveMask(activeMaskIndex);
    } else {
      onAddMask();
    }
  };

  const editing = activeMaskIndex !== null;
  const label = editing
    ? t('CrossSections.doneEditingMask', { defaultValue: 'Done editing' })
    : `+ ${t('CrossSections.addMask', { defaultValue: 'Add mask' })}`;

  return (
    <button
      type="button"
      className="btn btn-sm btn-tertiary panel-add"
      onClick={handleClick}
      title={
        editing
          ? t('CrossSections.exitMaskMode', { defaultValue: 'Exit mask editing' })
          : t('CrossSections.addMask', { defaultValue: 'Add mask' })
      }
    >
      {label}
    </button>
  );
};
