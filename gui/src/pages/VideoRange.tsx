import { useRef } from 'react';
import { VideoPlayer } from '../components/VideoPlayer/VideoPlayer';
import { StabilizationCanvas } from '../components/VideoPlayer/StabilizationCanvas';
import { FormVideo } from '../components/Forms/FormVideo';
import { Error } from '../components/Error';
import { Info } from '../components/Info';
import { Warning } from '../components/Warning';
import { useProjectSlice } from '../hooks';
import { FormHeader } from '../components/Forms/Components';
import { useTranslation } from 'react-i18next';
import { FocusOverlay, WizardButtons } from '../components';
import { useState } from 'react';
import { LockBtn } from '../components/CustomIcons/LockBtn';

export const VideoRange = () => {
  const {
    video,
    stabilizationActiveRegionIndex,
    onUpdateStabilizationRegion,
    onSetStabilizationActiveRegionIndex,
  } = useProjectSlice();
  const { path, duration, width: videoWidth, height: videoHeight } = video.data;
  const { stabilization, stabilizationRegions } = video.parameters;
  const { t } = useTranslation();
  const [extraFields, setExtraFields] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const stabilizationOverlay = stabilization ? (
    <StabilizationCanvas
      videoWidth={videoWidth}
      videoHeight={videoHeight}
      regions={stabilizationRegions}
      activeRegionIndex={stabilizationActiveRegionIndex}
      onUpdateRegion={onUpdateStabilizationRegion}
      onConfirm={() => onSetStabilizationActiveRegionIndex(null)}
    />
  ) : undefined;

  return (
    <div className="regular-page">
      <div className="media-container">
        {path && <VideoPlayer ref={videoRef} fileURL={path} duration={duration} overlay={stabilizationOverlay} />}
        <div className="message-stack">
          <Error />
          <Info />
          <Warning />
        </div>
      </div>
      <div className="form-container">
        <FormHeader title={t('VideoRange.title')} showSections={false} />
        <FormVideo duration={duration} extraFields={extraFields} />
        <div className="footer">
          <LockBtn
            localExtraFields={extraFields}
            setLocalExtraFields={setExtraFields}
            disabled={false}
            headerElementID="start"
            footerElementID="video-resolution"
          />
          <WizardButtons formId="form-video" canFollow={true} />
        </div>
        <FocusOverlay active={stabilizationActiveRegionIndex !== null} />
      </div>
    </div>
  );
};
