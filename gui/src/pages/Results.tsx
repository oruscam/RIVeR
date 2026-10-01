import { StepAlertList, Toast, ImageResults, Results as ResultsComponent, WizardButtons } from '../components';
import { useUiSlice } from '../hooks';
import { FormHeader } from '../components/Forms/Components';
import { useTranslation } from 'react-i18next';

// No "Apply Changes" button — every control in this step (technique, interpolate, alpha,
// artificial seeding, station check/uncheck) recomputes live client-side (see
// getEffectiveTechniqueData), matching the validated design preview. Nothing here needs a
// backend round-trip anymore.
export const Results = () => {
  const { screenSizes } = useUiSlice();
  const { imageWidth: width, imageHeight: height, factor } = screenSizes;
  const { t } = useTranslation();

  if (!width || !height || !factor) return null;

  return (
    <div className="regular-page">
      <div className="media-container">
        <ImageResults />
      </div>
      <div className="form-container results-wash">
        <FormHeader title={t('Results.title')} canEdit={false} showSections={true} />
        <StepAlertList />
        <ResultsComponent />
        <div className="footer">
          <WizardButtons formId="form-result" canFollow={true} />
        </div>
      </div>
      <Toast />
    </div>
  );
};
