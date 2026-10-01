import { CSSProperties } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useDataSlice, useUiSlice } from '../../../hooks';
import { WINDOW_SIZES } from '../../../constants/constants';
import { EyeBtn } from '../../CustomIcons/EyeBtn';

/**
 * LSPIV's own settings, hung under its technique row in Advanced mode and tied
 * to it by a thread in its colour (preview 2026-10-01, rule 7). Every value
 * that needs a switch renders only while that switch is on (rule 6). Nothing
 * here can change mid-run.
 */
export const LspivSettings = ({
  id,
  onClickTest,
  isTesting,
}: {
  id: string;
  onClickTest: (event: React.MouseEvent<HTMLButtonElement>) => void;
  isTesting: boolean;
}) => {
  const { register, setValue } = useFormContext();
  const { processing, onUpdateProcessing, isBackendWorking } = useDataSlice();
  const { showInterrogationWindow, onSetShowInterrogationWindow } = useUiSlice();
  const { medianTestFiltering, clahe, stdFiltering, step1 } = processing.form;
  const { t } = useTranslation();

  const removeBackground = register('remove_background');
  const claheField = register('clahe');
  const clipLimit = register('clip_limit');
  const stdField = register('std_filtering');
  const stdThreshold = register('std_threshold');
  const medianField = register('median_test');
  const medianEpsilon = register('median_epsilon');
  const medianThreshold = register('median_threshold');
  const step1Field = register('step_1');

  /** The typed number, or null for an empty or partial entry the store must not see. */
  const numberOf = (event: React.ChangeEvent<HTMLInputElement>): number | null => {
    const value = parseFloat(event.currentTarget.value);
    return Number.isNaN(value) ? null : value;
  };

  return (
    <div className="tech-params" id={id} style={{ '--tech': 'var(--tech-lspiv)' } as CSSProperties}>
      <p className="panel-group">{t('Processing.preProcessing', { defaultValue: 'Pre-processing' })}</p>
      <div className="field-row">
        <span className="field-row-label">{t('Processing.removeBackground')}</span>
        <label className="switch switch-sm">
          <input
            type="checkbox"
            {...removeBackground}
            disabled={isBackendWorking}
            onChange={(event) => {
              removeBackground.onChange(event);
              onUpdateProcessing({ removeBackground: event.currentTarget.checked });
            }}
          />
          <span className="slider"></span>
        </label>
      </div>
      <div className="field-row">
        <span className="field-row-label">{t('Processing.clahe')}</span>
        <label className="switch switch-sm">
          <input
            type="checkbox"
            {...claheField}
            disabled={isBackendWorking}
            onChange={(event) => {
              claheField.onChange(event);
              onUpdateProcessing({ clahe: event.currentTarget.checked });
            }}
          />
          <span className="slider"></span>
        </label>
      </div>
      {clahe && (
        <div className="field-row field-row-child">
          <label className="field-row-label" htmlFor="processing-clip-limit">
            {t('Processing.clipLimit')}
          </label>
          <input
            id="processing-clip-limit"
            className="field"
            type="number"
            {...clipLimit}
            disabled={isBackendWorking}
            onChange={(event) => {
              clipLimit.onChange(event);
              const value = numberOf(event);
              if (value !== null) onUpdateProcessing({ clipLimit: value });
            }}
          />
        </div>
      )}

      <p className="panel-group">{t('Processing.filtering', { defaultValue: 'Filtering' })}</p>
      <div className="field-row">
        <span className="field-row-label">{t('Processing.stdFiltering')}</span>
        <label className="switch switch-sm">
          <input
            type="checkbox"
            {...stdField}
            disabled={isBackendWorking}
            onChange={(event) => {
              stdField.onChange(event);
              onUpdateProcessing({ stdFiltering: event.currentTarget.checked });
            }}
          />
          <span className="slider"></span>
        </label>
      </div>
      {stdFiltering && (
        <div className="field-row field-row-child">
          <label className="field-row-label" htmlFor="processing-std-threshold">
            {t('Processing.threshold')}
          </label>
          <input
            id="processing-std-threshold"
            className="field"
            type="number"
            {...stdThreshold}
            disabled={isBackendWorking}
            onChange={(event) => {
              stdThreshold.onChange(event);
              const value = numberOf(event);
              if (value !== null) onUpdateProcessing({ stdThreshold: value });
            }}
          />
        </div>
      )}
      <div className="field-row">
        <span className="field-row-label">{t('Processing.medianTestFiltering')}</span>
        <label className="switch switch-sm">
          <input
            type="checkbox"
            {...medianField}
            disabled={isBackendWorking}
            onChange={(event) => {
              medianField.onChange(event);
              onUpdateProcessing({ medianTestFiltering: event.currentTarget.checked });
            }}
          />
          <span className="slider"></span>
        </label>
      </div>
      {medianTestFiltering && (
        <>
          <div className="field-row field-row-child">
            <label className="field-row-label" htmlFor="processing-median-epsilon">
              {t('Processing.epsilon')}
            </label>
            <input
              id="processing-median-epsilon"
              className="field"
              type="number"
              step="0.01"
              {...medianEpsilon}
              disabled={isBackendWorking}
              onChange={(event) => {
                medianEpsilon.onChange(event);
                const value = numberOf(event);
                if (value !== null) onUpdateProcessing({ medianTestEpsilon: value });
              }}
            />
          </div>
          <div className="field-row field-row-child">
            <label className="field-row-label" htmlFor="processing-median-threshold">
              {t('Processing.threshold')}
            </label>
            <input
              id="processing-median-threshold"
              className="field"
              type="number"
              {...medianThreshold}
              disabled={isBackendWorking}
              onChange={(event) => {
                medianThreshold.onChange(event);
                const value = numberOf(event);
                if (value !== null) onUpdateProcessing({ medianTestThreshold: value });
              }}
            />
          </div>
        </>
      )}

      <p className="panel-group">
        {t('Processing.interrogationWindow', { defaultValue: 'Interrogation window' })}
      </p>
      <div className="field-row">
        <label className="field-row-label" htmlFor="processing-STEP_1">
          {t('Processing.windowSize', { defaultValue: 'Window size' })}
        </label>
        <span className="tech-params-inline">
          <EyeBtn
            active={showInterrogationWindow}
            action={() => onSetShowInterrogationWindow(!showInterrogationWindow)}
            noBorder={true}
          />
          <select
            id="processing-STEP_1"
            className="field field-wide field-select"
            {...step1Field}
            disabled={isBackendWorking}
            onChange={(event) => {
              step1Field.onChange(event);
              const value = parseInt(event.currentTarget.value);
              onUpdateProcessing({ step1: value });
              setValue('step_1', value);
            }}
          >
            <option value="512">{WINDOW_SIZES.BIG}</option>
            <option value="256">{WINDOW_SIZES.MEDIUM}</option>
            <option value="128">{WINDOW_SIZES.SMALL}</option>
            <option value="64">{WINDOW_SIZES.TINY}</option>
          </select>
        </span>
      </div>
      <div className="field-row field-row-child">
        <span className="field-row-label">{t('Processing.secondPass', { defaultValue: 'Second pass' })}</span>
        <span className="field-readonly" id="processing-STEP_2">
          {step1 / 2} px
        </span>
      </div>

      <button
        id="test-button"
        type="button"
        className="btn btn-sm btn-secondary button-with-loader"
        aria-busy={(isBackendWorking && isTesting) || undefined}
        aria-disabled={(isBackendWorking && !isTesting) || undefined}
        onClick={(event) => {
          if (isBackendWorking) return;
          onClickTest(event);
        }}
      >
        {t('Processing.test')}
        {isBackendWorking && isTesting && <span className="btn-progress-sweep" aria-hidden="true" />}
      </button>
    </div>
  );
};
