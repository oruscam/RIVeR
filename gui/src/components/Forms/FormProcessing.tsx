import { FormProvider, useForm } from 'react-hook-form';
import { useDataSlice, useUiSlice } from '../../hooks';
import { useTranslation } from 'react-i18next';
import { AnalyzingProgress, HardModeProcessing } from './Components';
import { useState } from 'react';

export const FormProcessing = ({
  extraFields,
  setShowMedian,
}: {
  extraFields: boolean;
  showMedian: boolean;
  setShowMedian: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { t } = useTranslation();
  const { onSetErrorMessage } = useUiSlice();
  const { isBackendWorking, processing, onSetQuiverTest, onSetQuiverAll, onKillBackend, onAddMask } =
    useDataSlice();

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
  } = processing.form;

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
            <div className="input-container-2">
              <button
                className={`button-with-loader me-1 ${isBackendWorking && isTesting ? 'button-with-loader-active' : ''}`}
                onClick={handleOnClickTest}
                type="button"
                id="test-button"
                disabled={isBackendWorking && isTesting === false}
              >
                <p className="button-name"> {t('Processing.test')} </p>
                {isBackendWorking && isTesting && <span className="loader-little" />}
              </button>
              <div className="spacer-div" />
            </div>
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

            <HardModeProcessing active={extraFields} />
          </form>
        </FormProvider>
      </div>
    </div>
  );
};
