import { useRef } from 'react';
import { VideoPlayer } from '../components/VideoPlayer/VideoPlayer';
import { StabilizationCanvas } from '../components/VideoPlayer/StabilizationCanvas';
import { FormVideo } from '../components/Forms/FormVideo';
import { useProjectSlice } from '../hooks';
import { FormHeader } from '../components/Forms/Components';
import { useTranslation } from 'react-i18next';
import { FocusOverlay, WizardButtons, ModeHint, StepAlertList, Toast } from '../components';
import { LockBtn } from '../components/CustomIcons/LockBtn';

export const VideoRange = () => {
  const {
    video,
    type,
    stabilizationActiveRegionIndex,
    onUpdateStabilizationRegion,
    onSetStabilizationActiveRegionIndex,
    onToggleVideoExtraFields,
  } = useProjectSlice();
  const { path, duration, width: videoWidth, height: videoHeight } = video.data;
  const { stabilization, stabilizationRegions } = video.parameters;
  const { extraFields } = video;
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Stabilization only applies to UAV footage — oblique/ipcam cameras are fixed.
  // Guards against stale `stabilization: true` left over from switching footage
  // mode after having enabled it on a UAV project.
  const stabilizationOverlay =
    stabilization && type === 'uav'
      ? ({ scale }: { scale: number }) => (
          <StabilizationCanvas
            videoWidth={videoWidth}
            videoHeight={videoHeight}
            regions={stabilizationRegions}
            activeRegionIndex={stabilizationActiveRegionIndex}
            onUpdateRegion={onUpdateStabilizationRegion}
            onConfirm={() => onSetStabilizationActiveRegionIndex(null)}
            zoomScale={scale}
          />
        )
      : undefined;

  return (
    <div className="regular-page">
      <div className="media-container">
        {path && <VideoPlayer ref={videoRef} fileURL={path} duration={duration} overlay={stabilizationOverlay} />}
        <ModeHint />
      </div>
      <div className="form-container">
        <FormHeader title={t('VideoRange.title')} showSections={false} />
        <StepAlertList />
        <FormVideo duration={duration} extraFields={extraFields} />
        <div className="footer">
          <LockBtn
            localExtraFields={extraFields}
            setLocalExtraFields={onToggleVideoExtraFields}
            disabled={false}
            headerElementID="start"
            footerElementID="video-resolution"
          />
          <WizardButtons formId="form-video" canFollow={true} />
        </div>
        <FocusOverlay active={stabilizationActiveRegionIndex !== null} />
      </div>
      <Toast />
    </div>
  );
};
