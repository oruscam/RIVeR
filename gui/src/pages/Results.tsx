import { Error, ImageResults, Results as ResultsComponent, WizardButtons } from '../components';
import { useDataSlice, useUiSlice } from '../hooks';
import { FormHeader } from '../components/Forms/Components';
import { useTranslation } from 'react-i18next';

export const Results = () => {
  const { screenSizes, onSetErrorMessage } = useUiSlice();
  const { imageWidth: width, imageHeight: height, factor } = screenSizes;
  const { t } = useTranslation();
  const { onGetResultData, isBackendWorking } = useDataSlice();

  if (!width || !height || !factor) return null;

  const handleOnClickApplyChanges = () => {
    onGetResultData('single').catch((error) => onSetErrorMessage(error.message));
  };

  return (
    <div className="regular-page">
      <div className="media-container">
        <ImageResults />
        <Error />
      </div>
      <div className="form-container">
        <FormHeader title={t('Results.title')} canEdit={false} showSections={true} />
        <ResultsComponent />
        <div className="footer">
          <button
            className={`wizard-button form-button ${isBackendWorking ? 'wizard-button-active' : ''}`}
            onClick={handleOnClickApplyChanges}
            id="apply-changes"
            type="button"
          >
            {t('Results.applyChanges')}
          </button>
          <WizardButtons formId="form-result" canFollow={true} />
        </div>
      </div>
    </div>
  );
};
