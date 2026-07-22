import { useState, useEffect } from 'react';
import { Carousel, Error, ImageProcessing, WizardButtons } from '../components';
import { useDataSlice, useUiSlice } from '../hooks';
import { FormHeader } from '../components/Forms/Components';
import { useTranslation } from 'react-i18next';
import { useWizard } from 'react-use-wizard';
import { FormProcessing } from '../components/Forms';
import { LockBtn } from '../components/CustomIcons/LockBtn';
import { ExportMp4 } from '../components/Forms/Components';

export const Processing = () => {
  const { t } = useTranslation();
  const { nextStep } = useWizard();
  const { onSetErrorMessage, onSetSeeAll } = useUiSlice();
  const { images, quiver, isBackendWorking, onSetActiveImage, onGetResultData } = useDataSlice();
  const [showMedian, setShowMedian] = useState(quiver !== null && quiver.test === false);
  const [extraFields, setExtraFields] = useState(false);

  useEffect(() => {
    if (quiver !== null && quiver.test === false) {
      setShowMedian(true);
    }
  }, [quiver?.test]);

  const { paths, active } = images;

  const handleNext = async () => {
    nextStep();

    try {
      await onGetResultData('all');
      onSetSeeAll(false);
      nextStep();
    } catch (error) {
      onSetErrorMessage((error as Error).message);
    }
  };

  return (
    <div className="regular-page">
      <div className="media-container">
        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 1000 }}>
          <ExportMp4 />
        </div>
        <ImageProcessing showMedian={showMedian} extraFields={extraFields} />
        <Carousel
          images={paths}
          active={active}
          setActiveImage={onSetActiveImage}
          showMedian={showMedian && quiver?.test === false}
          setShowMedian={setShowMedian}
          mode="analize"
        />
        <Error />
      </div>
      <div className="form-container">
        <FormHeader title={t('Processing.title')} showSections={false} />
        <FormProcessing extraFields={extraFields} setShowMedian={setShowMedian} showMedian={showMedian} />
        <div className="footer">
          <LockBtn
            setLocalExtraFields={setExtraFields}
            localExtraFields={extraFields}
            footerElementID="processing-footer"
            headerElementID="processing-header"
            disabled={isBackendWorking}
          />
          <WizardButtons onClickNext={handleNext} canFollow={quiver !== null && quiver.test === false} />
        </div>
      </div>
    </div>
  );
};
