import { useMemo } from 'react';
import { ColorBar, Error, ImageResults, Results as ResultsComponent, WizardButtons } from '../components';
import { useProjectSlice, useSectionSlice, useUiSlice } from '../hooks';
import { getVelocityLimits } from '../helpers';
import { FormHeader } from '../components/Forms/Components';
import { useTranslation } from 'react-i18next';

// No "Apply Changes" button — every control in this step (technique, interpolate, alpha,
// artificial seeding, station check/uncheck) recomputes live client-side (see
// getEffectiveTechniqueData), matching the validated design preview. Nothing here needs a
// backend round-trip anymore.
export const Results = () => {
  const { screenSizes, seeAll } = useUiSlice();
  const { imageWidth: width, imageHeight: height, factor } = screenSizes;
  const { t } = useTranslation();

  if (!width || !height || !factor) return null;

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
          <WizardButtons formId="form-result" canFollow={true} />
        </div>
      </div>
    </div>
  );
};
