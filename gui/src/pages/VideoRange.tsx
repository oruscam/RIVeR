import { useRef } from 'react';
import { VideoPlayer } from '../components/VideoPlayer/VideoPlayer';
import { StabilizationCanvas } from '../components/VideoPlayer/StabilizationCanvas';
import { FormVideo } from '../components/Forms/FormVideo';
import { useProjectSlice, useProjectIssues } from '../hooks';
import { FormHeader } from '../components/Forms/Components';
import { useTranslation } from 'react-i18next';
import { FocusOverlay, WizardButtons, ModeHint, StepAlertList, Toast } from '../components';
import { AdvancedToggle } from '../components/AdvancedToggle';

export const VideoRange = () => {
  const {
    video,
    type,
    stabilizationActiveRegionIndex,
    onUpdateStabilizationRegion,
    onDeleteStabilizationRegion,
    onSetStabilizationActiveRegionIndex,
    onToggleVideoExtraFields,
    firstFramePath,
  } = useProjectSlice();
  const { alerts, onAction, videoMissing } = useProjectIssues('video');
  const { path, duration, width: videoWidth, height: videoHeight } = video.data;
  const { stabilization, stabilizationRegions } = video.parameters;
  const { extraFields } = video;
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Stabilization applies to UAV and oblique footage (a moving or handheld camera); an ipcam is
  // fixed. Guards against stale `stabilization: true` left over from switching footage mode.
  const stabilizationOverlay =
    stabilization && type !== 'ipcam'
      ? ({ scale, position }: { scale: number; position: { x: number; y: number } }) => (
          <StabilizationCanvas
            videoWidth={videoWidth}
            videoHeight={videoHeight}
            regions={stabilizationRegions}
            activeRegionIndex={stabilizationActiveRegionIndex}
            onUpdateRegion={onUpdateStabilizationRegion}
            onConfirm={() => onSetStabilizationActiveRegionIndex(null)}
            onDelete={() => {
              if (stabilizationActiveRegionIndex !== null)
                onDeleteStabilizationRegion(stabilizationActiveRegionIndex);
            }}
            zoomScale={scale}
            zoomPosition={position}
          />
        )
      : undefined;

  return (
    <div className="regular-page">
      <div className="media-container">
        {path ? (
          <VideoPlayer ref={videoRef} fileURL={path} duration={duration} overlay={stabilizationOverlay} />
        ) : (
          videoMissing && firstFramePath && <img className="video-missing-still" src={firstFramePath} alt="" />
        )}
        <ModeHint />
      </div>
      <div className="form-container">
        <FormHeader title={t('VideoRange.title')} showSections={false} />
        <StepAlertList extra={alerts} onAction={onAction} />
        <FormVideo duration={duration} extraFields={extraFields} />
        <div className="footer">
          <AdvancedToggle
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
