import { FormProvider, useForm } from 'react-hook-form';
import { useDataSlice, useSectionSlice, useUiSlice } from '../../hooks';
import { useTranslation } from 'react-i18next';
import { AnalyzingProgress, HardModeProcessing } from './Components';
import { useState } from 'react';
import { TECHNIQUE_COLORS } from '../../constants/constants';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import type { PreviewMode } from '../../store/ui/types';
import { useStivAngleOverride } from '../../hooks';

export const FormProcessing = ({
  extraFields,
  showMedian,
  setShowMedian,
  previewMode,
  setPreviewMode,
  canToggleSti,
  canToggleIwave,
  canToggleMedian,
}: {
  extraFields: boolean;
  showMedian: boolean;
  setShowMedian: React.Dispatch<React.SetStateAction<boolean>>;
  previewMode: PreviewMode;
  setPreviewMode: (value: PreviewMode) => void;
  canToggleSti: boolean;
  canToggleIwave: boolean;
  canToggleMedian: boolean;
}) => {
  const { t } = useTranslation();
  const { onSetErrorMessage } = useUiSlice();
  const {
    isBackendWorking,
    processing,
    onSetQuiverTest,
    onSetQuiverAll,
    onKillBackend,
    onAddMask,
    onUpdateProcessing,
  } = useDataSlice();
  const { sections, activeSection, onUpdateSection } = useSectionSlice();

  const {
    step1,
    heightRoi,
    removeBackground,
    clahe,
    clipLimit,
    stdFiltering,
    stdThreshold,
    medianTestFiltering,
    medianTestEpsilon,
    medianTestThreshold,
    stiv,
    iwave,
  } = processing.form;
  const { name, numStations } = sections[activeSection];
  // Station index is irrelevant for hasAny/resetAll — they operate on the whole
  // manual-angle array, not one station.
  const { hasAny: hasAnyStivOverride, resetAll: resetAllStivAngles } = useStivAngleOverride(0);

  const [isTesting, setIsTesting] = useState<boolean>(false);

  const [resetProgress, setResetProgress] = useState<boolean>(false);

  const methods = useForm({
    defaultValues: {
      step_1: step1,
      step_2: step1 / 2,
      roi_height: heightRoi,
      remove_background: removeBackground,
      clahe: clahe,
      clip_limit: clipLimit,
      std_filtering: stdFiltering,
      std_threshold: stdThreshold,
      median_test: medianTestFiltering,
      median_epsilon: medianTestEpsilon,
      median_threshold: medianTestThreshold,
    },
  });

  const handleStationsStep = (delta: number) => {
    const next = numStations + delta;
    if (next >= 3) {
      onUpdateSection({ numStations: next }, undefined);
      methods.setValue(`${name}_STATIONS_NUMBER`, next);
    }
  };

  const handleStationsChangeInput = (
    event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>
  ) => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key === 'Enter' || event.type === 'blur') {
      event.preventDefault();
      const value = parseFloat((event.target as HTMLInputElement).value);
      if (isNaN(value) === false && value >= 3) {
        if (value !== numStations) {
          onUpdateSection({ numStations: value }, undefined);
        }
      } else {
        methods.setValue(`${name}_STATIONS_NUMBER`, numStations);
        if (typeof value === 'number') {
          onSetErrorMessage('The number of stations must be greater than 2');
        }
      }
    }
  };

  const handleTab = () => {
    console.log('handle tab');
    // Placeholder for future tab handling logic
  };

  const handleOnClickTest = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsTesting(true);
    setResetProgress(true);
    onSetQuiverTest()
      .then(() => setIsTesting(false))
      .catch((error) => onSetErrorMessage(error.message));
  };

  const handleOnClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const id = event.currentTarget.id;

    if (id === 'analize-button') {
      if (isBackendWorking) return;
      setIsTesting(false);
      onSetQuiverAll()
        .then(() => {
          setShowMedian(true);
        })
        .catch((error) => onSetErrorMessage(error.message));
    }

    if (id === 'stop-button') {
      const result = await onKillBackend();
      if (result === true) setResetProgress(true);
    }

    if (id === 'add-mask-icon') {
      console.log('Add mask icon clicked');
      // Placeholder for future add mask logic
      onAddMask();
    }
  };

  return (
    <div className="body mt-3" id="form-analizing">
      <div className="wrapper">
        <FormProvider {...methods}>
          <form
            id="form-processing"
            style={{ overflowY: `${!extraFields ? 'hidden' : 'auto'}` }}
            onKeyDown={handleTab}
          >
            <span id="processing-header" />
            <div className="switch-container mt-2">
              <h3 className="field-title">{t('Results.stationNumber')}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button type="button" className="btn-step" onClick={() => handleStationsStep(-1)}>
                  −
                </button>
                <input
                  key={name}
                  className="input-field-little"
                  type="number"
                  defaultValue={numStations}
                  {...methods.register(`${name}_STATIONS_NUMBER`)}
                  id="stations-number"
                  onKeyDown={handleStationsChangeInput}
                  onBlur={handleStationsChangeInput}
                />
                <button type="button" className="btn-step" onClick={() => handleStationsStep(1)}>
                  +
                </button>
              </div>
            </div>

            <span className="divider-line mt-2 mb-1" />

            <div className="technique-row-processing">
              <span className="technique-swatch-processing" style={{ background: TECHNIQUE_COLORS.lspiv }} />
              <h3 className="field-title">LSPIV</h3>
              <button
                type="button"
                className={`technique-seed-flag${showMedian ? ' technique-seed-flag-seeded' : ''}${
                  canToggleMedian ? '' : ' technique-flag-off'
                }`}
                title={t('Processing.medianHint')}
                onClick={canToggleMedian ? () => setShowMedian(!showMedian) : undefined}
              >
                {t('Processing.carouselMedia')}
              </button>
              <button
                type="button"
                className={`technique-eye-btn${previewMode === 'frames' ? ' technique-eye-btn-on' : ''}`}
                title={t('Processing.showLspivFrames')}
                onClick={previewMode !== 'frames' ? () => setPreviewMode('frames') : undefined}
              >
                {previewMode === 'frames' ? <LuEye size={15} /> : <LuEyeOff size={15} />}
              </button>
            </div>
            <div className="technique-row-processing">
              <span className="technique-swatch-processing" style={{ background: TECHNIQUE_COLORS.stiv }} />
              <h3 className="field-title">STIV</h3>
              {hasAnyStivOverride && (
                <button
                  type="button"
                  className="sti-angle-reset"
                  title={t('Processing.stiAngleResetAllTitle')}
                  onClick={resetAllStivAngles}
                >
                  {t('Processing.stiAngleResetAll')}
                </button>
              )}
              <label className="switch">
                <input
                  type="checkbox"
                  checked={stiv}
                  onChange={(event) => onUpdateProcessing({ stiv: event.currentTarget.checked })}
                />
                <span className="slider"></span>
              </label>
              <button
                type="button"
                className={`technique-eye-btn${previewMode === 'sti' ? ' technique-eye-btn-on' : ''}${
                  canToggleSti ? '' : ' technique-eye-btn-off'
                }`}
                title={canToggleSti ? t('Processing.showStivStis') : t('Processing.noStisYet')}
                onClick={canToggleSti && previewMode !== 'sti' ? () => setPreviewMode('sti') : undefined}
              >
                {previewMode === 'sti' ? <LuEye size={15} /> : <LuEyeOff size={15} />}
              </button>
            </div>
            <div className="technique-row-processing">
              <span className="technique-swatch-processing" style={{ background: TECHNIQUE_COLORS.iwave }} />
              <h3 className="field-title">iWave</h3>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={iwave}
                  onChange={(event) => onUpdateProcessing({ iwave: event.currentTarget.checked })}
                />
                <span className="slider"></span>
              </label>
              <button
                type="button"
                className={`technique-eye-btn${previewMode === 'iwave' ? ' technique-eye-btn-on' : ''}${
                  canToggleIwave ? '' : ' technique-eye-btn-off'
                }`}
                title={canToggleIwave ? t('Processing.showIwaveSpectra') : t('Processing.noSpectraYet')}
                onClick={canToggleIwave && previewMode !== 'iwave' ? () => setPreviewMode('iwave') : undefined}
              >
                {previewMode === 'iwave' ? <LuEye size={15} /> : <LuEyeOff size={15} />}
              </button>
            </div>

            <span className="divider-line mt-2 mb-1" />

            <div className="input-container-2 mt-1">
              <button
                className="button-with-loader me-1"
                type="button"
                onClick={handleOnClick}
                id="analize-button"
                disabled={isBackendWorking}
              >
                <p className="button-name">{t('Processing.analize')}</p>
              </button>
              <button
                id="stop-button"
                className="danger-button"
                disabled={!isBackendWorking || isTesting === true}
                onClick={handleOnClick}
                type="button"
              >
                <p className="button-name">{t('Processing.stop')}</p>
              </button>
            </div>
            {isBackendWorking && isTesting === false && <AnalyzingProgress resetProgress={resetProgress} />}

            <HardModeProcessing active={extraFields} onClickTest={handleOnClickTest} isTesting={isTesting} />
          </form>
        </FormProvider>
      </div>
    </div>
  );
};
