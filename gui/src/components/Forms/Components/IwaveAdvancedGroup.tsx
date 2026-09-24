import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAutoShrinkFont, useDataSlice, useUiSlice } from '../../../hooks';
import {
  freezeIwaveManual,
  getShownIwaveValues,
  hasIwaveValueChanged,
  isIwaveWindowStale,
  parseIwaveNumber,
  type IwaveDefaults,
  type IwaveFlowType,
  type IwaveManual,
} from '../../../../commons/iwave';

type NumberField = 'windowSize' | 'smax';

/**
 * Flow type, window size and max velocity for iWave. All automatic until the user edits any one;
 * then all three are frozen exactly as shown (processing.form.iwaveManual) until "Reset to
 * automatic". Lives in the advanced (locked) part of Processing.
 */
export const IwaveAdvancedGroup = ({ defaults, active }: { defaults: IwaveDefaults; active: boolean }) => {
  const { t } = useTranslation();
  const { processing, onUpdateProcessing } = useDataSlice();
  const { onSetErrorMessage } = useUiSlice();
  const { iwave, iwaveManual } = processing.form;
  const shown = getShownIwaveValues(iwaveManual, defaults);
  const isManual = iwaveManual !== null;

  const [texts, setTexts] = useState<Record<NumberField, string>>({
    windowSize: shown.windowSize.toFixed(2),
    smax: shown.smax.toFixed(2),
  });

  // Keep the inputs in sync when the defaults arrive or the mode changes.
  useEffect(() => {
    setTexts({ windowSize: shown.windowSize.toFixed(2), smax: shown.smax.toFixed(2) });
  }, [shown.windowSize, shown.smax]);

  // Mounted but hidden until the advanced section opens; re-fit labels once visible.
  const titleRef = useAutoShrinkFont<HTMLHeadingElement>([t, active]);

  const commit = (change: Partial<IwaveManual>) => {
    onUpdateProcessing({ iwaveManual: freezeIwaveManual(iwaveManual, defaults, change) });
  };

  const handleNumber = (field: NumberField, event: React.SyntheticEvent<HTMLInputElement>) => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key !== 'Enter' && event.type !== 'blur') return;
    event.preventDefault();
    const value = parseIwaveNumber(field, texts[field]);
    if (value === null) {
      onSetErrorMessage(
        t(field === 'windowSize' ? 'Processing.iwaveInvalidWindow' : 'Processing.iwaveInvalidSmax')
      );
      setTexts((prev) => ({ ...prev, [field]: shown[field].toFixed(2) }));
      return;
    }
    if (!hasIwaveValueChanged(value, shown[field])) {
      setTexts((prev) => ({ ...prev, [field]: shown[field].toFixed(2) }));
      return;
    }
    commit({ [field]: value });
  };

  const handleFlowType = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const flowType = event.target.value as IwaveFlowType;
    if (flowType !== shown.flowType) commit({ flowType });
  };

  const hint = isManual
    ? null
    : defaults.estimatedFrom === 'none'
      ? t('Processing.iwaveHintPending')
      : t('Processing.iwaveHintEstimated');

  return (
    <div className={`iwave-advanced-group${iwave ? '' : ' iwave-advanced-group-disabled'}`}>
      <div className="iwave-advanced-header mt-2">
        <h2 ref={titleRef} className="field-title">
          {t('Processing.iwaveGroupTitle')}
        </h2>
        <span className={`iwave-mode-tag${isManual ? ' iwave-mode-tag-manual' : ''}`}>
          {t(isManual ? 'Processing.iwaveModeManual' : 'Processing.iwaveModeAuto')}
        </span>
      </div>

      <div className="input-container-2 mt-1">
        <label className="read-only me-1" htmlFor="iwave-flow-type">
          {t('Processing.iwaveFlowType')}
        </label>
        <select
          id="iwave-flow-type"
          className="input-field"
          value={shown.flowType}
          disabled={!iwave}
          onChange={handleFlowType}
        >
          <option value="waves">{t('Processing.iwaveFlowWaves')}</option>
          <option value="no-waves">{t('Processing.iwaveFlowNoWaves')}</option>
        </select>
      </div>

      {(['windowSize', 'smax'] as NumberField[]).map((field) => (
        <div key={field} className="input-container-2 mt-1">
          <label className="read-only me-1" htmlFor={`iwave-${field}`}>
            {t(field === 'windowSize' ? 'Processing.iwaveWindowSize' : 'Processing.iwaveSmax')}
          </label>
          <input
            id={`iwave-${field}`}
            className="input-field"
            type="text"
            inputMode="decimal"
            value={texts[field]}
            disabled={!iwave}
            onChange={(event) => setTexts((prev) => ({ ...prev, [field]: event.target.value }))}
            onKeyDown={(event) => handleNumber(field, event)}
            onBlur={(event) => handleNumber(field, event)}
          />
        </div>
      ))}

      {hint && <p className="iwave-advanced-hint">{hint}</p>}

      {isManual && isIwaveWindowStale(iwaveManual, defaults) && (
        <p className="iwave-advanced-warning">
          {t('Processing.iwaveStaleWindow', { window: defaults.windowSize.toFixed(2) })}
        </p>
      )}

      {isManual && (
        <div className="input-container-2 mt-1">
          <button
            type="button"
            className="button-with-loader"
            disabled={!iwave}
            onClick={() => onUpdateProcessing({ iwaveManual: null })}
          >
            <p className="button-name">{t('Processing.iwaveReset')}</p>
          </button>
        </div>
      )}
    </div>
  );
};
