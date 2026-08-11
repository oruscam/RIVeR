import { useTranslation } from 'react-i18next';
import { useDataSlice } from '../../../hooks';
import { MaskBtn } from '../../CustomIcons/MaskBtn';

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

  return (
    <MaskBtn
      onClick={handleClick}
      title={
        activeMaskIndex !== null
          ? t('CrossSections.exitMaskMode', { defaultValue: 'Exit mask editing' })
          : t('CrossSections.addMask', { defaultValue: 'Add mask' })
      }
    />
  );
};
