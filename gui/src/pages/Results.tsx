import { useMemo } from 'react';
import { ColorBar, Error, ImageResults, Results as ResultsComponent, WizardButtons } from '../components';
import { useDataSlice, useProjectSlice, useSectionSlice, useUiSlice } from '../hooks';
import { getVelocityLimits } from '../helpers';
import { FormHeader } from '../components/Forms/Components';
import { useTranslation } from 'react-i18next';

export const Results = () => {
  const { screenSizes, seeAll, onSetErrorMessage } = useUiSlice();
  const { imageWidth: width, imageHeight: height, factor } = screenSizes;
  const { firstFramePath } = useProjectSlice();
  const { sections, activeSection } = useSectionSlice();
  const { t } = useTranslation();
  const { onGetResultData, isBackendWorking } = useDataSlice();

  const { max, min } = useMemo(() => {
    return getVelocityLimits(sections, activeSection);
  }, [sections, activeSection]);

  if (!width || !height || !factor) return null;

  const handleOnClickApplyChanges = () => {
    onGetResultData('single').catch((error) => onSetErrorMessage(error.message));
  };

  return (
    <div className="regular-page">
      <div className="media-container">
        <ImageResults />
        {/* <img src={firstFramePath} width={width} height={height} /> */}
        {/* <VelocityVector height={height} width={width} factor={factor} seeAll={seeAll} /> */}
        {/* <ColorBar min={min} max={max} /> */}
        <Error />
      </div>
      <div className="form-container">
        <FormHeader title={t('Results.title')} canEdit={false} showSections={true} />
        <ResultsComponent />
        <div className='footer'>
          <button
            className={`wizard-button form-button ${isBackendWorking ? 'wizard-button-active' : ''}`}
            onClick={handleOnClickApplyChanges}
            id="apply-changes"
            type="button">
            {t('Results.applyChanges')}
          </button>
          <WizardButtons formId="form-result" canFollow={true} />
        </div>
      </div>
    </div>
  );
};
