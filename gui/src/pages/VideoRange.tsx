import { VideoPlayer } from '../components/VideoPlayer/VideoPlayer';
import { FormVideo } from '../components/Forms/FormVideo';
import { Error } from '../components/Error';
import { useProjectSlice } from '../hooks';
import { FormHeader } from '../components/Forms/Components';
import { useTranslation } from 'react-i18next';
import { WizardButtons } from '../components';
import { useState } from 'react';
import { LockBtn } from '../components/CustomIcons/LockBtn';

export const VideoRange = () => {
  const { video } = useProjectSlice();
  const { path } = video.data;
  const { duration } = video.data;
  const { t } = useTranslation();
  const [extraFields, setExtraFields] = useState(false);

  return (
    <div className="regular-page">
      <div className="media-container">
        {path && <VideoPlayer fileURL={path} duration={duration} />}
        <Error />
      </div>
      <div className='form-container'>
        <FormHeader title={t('VideoRange.title')} showSections={false} />
        <FormVideo duration={duration} extraFields={extraFields} />
        <div className='footer'>
          <LockBtn
            localExtraFields={extraFields}
            setLocalExtraFields={setExtraFields}
            disabled={false}
            headerElementID="start"
            footerElementID="video-resolution"
          />
          <WizardButtons formId="form-video" canFollow={true} />
        </div>
      </div>
    </div>
  );
};