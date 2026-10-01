import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useDataSlice, useUiSlice } from '../../../hooks';

/**
 * ROI height applies to the whole cross-section, not to one technique, so it
 * sits beside Station number at the top (Advanced only), not under LSPIV.
 */
export const RoiHeightRow = () => {
  const { register, setValue } = useFormContext();
  const { processing, onUpdateProcessing, onReCalculateMask, isBackendWorking } = useDataSlice();
  const { onAddStepAlert, onClearStepAlert } = useUiSlice();
  const { heightRoi } = processing.form;
  const { t } = useTranslation();

  const commit = async (event: React.SyntheticEvent<HTMLInputElement>) => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key !== 'Enter' && event.type !== 'blur') return;
    event.preventDefault();
    const value = parseInt((event.target as HTMLInputElement).value);
    if (Number.isNaN(value) || value <= 0) {
      setValue('roi_height', heightRoi);
      return;
    }
    if (value === heightRoi) return;
    onClearStepAlert('processing-roi-recalc-error');
    try {
      await onReCalculateMask(value);
      onUpdateProcessing({ heightRoi: value });
    } catch (error) {
      onAddStepAlert('processing-roi-recalc-error', 'error', (error as Error).message);
    }
  };

  return (
    <div className="field-row field-row-top">
      <label className="field-row-label" htmlFor="processing-roi-height">
        {t('Processing.roiHeight')}
      </label>
      <input
        id="processing-roi-height"
        className="field"
        type="number"
        {...register('roi_height')}
        disabled={isBackendWorking}
        onKeyDown={commit}
        onBlur={commit}
      />
    </div>
  );
};
