import { Error, ImageWithData, WizardButtons } from '../components';
import { Carousel } from '../components/index';
import { FormProcessing } from '../components/Forms';
import { useDataSlice } from '../hooks';
import { FormHeader } from '../components/Forms/Components';
import { useTranslation } from 'react-i18next';
import { ButtonLock } from '../components/ButtonLock';
import { useState } from 'react';

export const Processing = () => {
  const [extraFields, setExtraFields] = useState(false);
  const { images, onSetActiveImage, isBackendWorking } = useDataSlice();
  const { paths, active } = images;

  const { t } = useTranslation(); 

  return (
    <div className="regular-page">
      <div className="media-container">
        <ImageWithData />
        <Carousel images={paths} active={active} setActiveImage={onSetActiveImage} mode="processing" />
        <Error />
      </div>
      <div className='form-container-new'>
        <FormHeader title={t('Processing.title')} showSections={false}/>
        <FormProcessing extraFields={extraFields} />
        <div className='footer'>
          <ButtonLock
            setLocalExtraFields={setExtraFields}
            localExtraFields={extraFields}
            footerElementID="processing-footer"
            headerElementID="processing-header"
            disabled={isBackendWorking}
          />
          <WizardButtons canFollow={true} formId="form-processing"/>
        </div>
      </div>
    </div>
  );
}