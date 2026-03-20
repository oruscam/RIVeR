import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDataSlice } from '../../../hooks';
import { MaskBtn } from '../../CustomIcons/MaskBtn';

export const AddMaskButton = () => {
    const { t } = useTranslation();
    const { onAddMask } = useDataSlice();

    return (
        <MaskBtn onClick={() => onAddMask()} />
    );
};
