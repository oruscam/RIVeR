import { CSSProperties, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataSlice, useUiSlice } from '../../../hooks';
import { FieldError } from '../../index';
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

const FIELD_ERROR: Record<NumberField, string> = {
  windowSize: 'iwave-window-size',
  smax: 'iwave-smax',
};

/**
 * iWave's own settings, hung under its technique row in Advanced mode like
 * LspivSettings (preview 2026-10-01, D9). Flow type, window size and max
 * velocity are all automatic until the user edits any one; then all three are
 * frozen exactly as shown (processing.form.iwaveManual) until "Reset to
 * automatic". Rendered only while iWave is on (rule 6).
 */
export const IwaveSettings = ({ id, defaults }: { id: string; defaults: IwaveDefaults }) => {
  const { t } = useTranslation();
  const { processing, onUpdateProcessing, isBackendWorking } = useDataSlice();
  const { onSetFieldError, onClearFieldError } = useUiSlice();
  const { iwaveManual } = processing.form;
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

  const commit = (change: Partial<IwaveManual>) => {
    onUpdateProcessing({ iwaveManual: freezeIwaveManual(iwaveManual, defaults, change) });
  };

  const handleNumber = (field: NumberField, event: React.SyntheticEvent<HTMLInputElement>) => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key !== 'Enter' && event.type !== 'blur') return;
    event.preventDefault();
    const restore = () => setTexts((prev) => ({ ...prev, [field]: shown[field].toFixed(2) }));
    const value = parseIwaveNumber(field, texts[field]);
    if (value === null) {
      onSetFieldError(
        FIELD_ERROR[field],
        t(field === 'windowSize' ? 'Processing.iwaveInvalidWindow' : 'Processing.iwaveInvalidSmax')
      );
      restore();
      return;
    }
    onClearFieldError(FIELD_ERROR[field]);
    if (!hasIwaveValueChanged(value, shown[field])) {
      restore();
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
    <div className="tech-params" id={id} style={{ '--tech': 'var(--tech-iwave)' } as CSSProperties}>
      <div className="field-row">
        <span className="field-row-label">{t('Processing.iwaveValues', { defaultValue: 'Values' })}</span>
        <span className="field-readonly">
          {t(isManual ? 'Processing.iwaveModeManual' : 'Processing.iwaveModeAuto')}
        </span>
      </div>
      <div className="field-row">
        <label className="field-row-label" htmlFor="iwave-flow-type">
          {t('Processing.iwaveFlowType')}
        </label>
        <select
          id="iwave-flow-type"
          className="field field-select tech-params-select"
          value={shown.flowType}
          disabled={isBackendWorking}
          onChange={handleFlowType}
        >
          <option value="waves">{t('Processing.iwaveFlowWaves')}</option>
          <option value="no-waves">{t('Processing.iwaveFlowNoWaves')}</option>
        </select>
      </div>
      {(['windowSize', 'smax'] as NumberField[]).map((field) => (
        <div key={field}>
          <div className="field-row">
            <label className="field-row-label" htmlFor={`iwave-${field}`}>
              {t(field === 'windowSize' ? 'Processing.iwaveWindowSize' : 'Processing.iwaveSmax')}
            </label>
            <input
              id={`iwave-${field}`}
              className="field"
              type="text"
              inputMode="decimal"
              value={texts[field]}
              disabled={isBackendWorking}
              onChange={(event) => setTexts((prev) => ({ ...prev, [field]: event.target.value }))}
              onKeyDown={(event) => handleNumber(field, event)}
              onBlur={(event) => handleNumber(field, event)}
            />
          </div>
          <FieldError name={FIELD_ERROR[field]} />
        </div>
      ))}

      {hint && <p className="tech-params-note">{hint}</p>}

      {isManual && isIwaveWindowStale(iwaveManual, defaults) && (
        <p className="tech-params-note tech-params-note-warning">
          {t('Processing.iwaveStaleWindow', { window: defaults.windowSize.toFixed(2) })}
        </p>
      )}

      {isManual && (
        <button
          type="button"
          className="btn btn-sm btn-secondary button-with-loader"
          disabled={isBackendWorking}
          // Keep focus in the field: its blur would clear an inline error, the
          // button would move up under the cursor, and the click would miss.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onClearFieldError(FIELD_ERROR.windowSize);
            onClearFieldError(FIELD_ERROR.smax);
            onUpdateProcessing({ iwaveManual: null });
          }}
        >
          {t('Processing.iwaveReset')}
        </button>
      )}
    </div>
  );
};
