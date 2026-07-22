import { useTranslation } from 'react-i18next';
import { useProjectSlice } from '../../../hooks';

export const VideoMetadata = ({
  timeBetweenFrames,
  numberOfFrames,
}: {
  timeBetweenFrames: string;
  numberOfFrames: number;
}) => {
  const { t } = useTranslation();
  const { video } = useProjectSlice();
  const { name, width, height, duration, fps } = video.data;

  return (
    <div className="form-video-extra-info">
      <div className="form-video-extra-info-row mt-1 frames-info">
        <p>{t('VideoRange.ExtraInfo.timeBetweenFrame')}</p>
        <p>{timeBetweenFrames}ms</p>
      </div>
      <div className="form-video-extra-info-row frames-info">
        <p>{t('VideoRange.ExtraInfo.numberOfFrames')}</p>
        <p>{numberOfFrames > 0 ? numberOfFrames : 0}</p>
      </div>
      <div className="form-video-extra-info-row">
        <p>{t('VideoRange.ExtraInfo.fileName')}</p>
        <p>{name}</p>
      </div>
      <div className="form-video-extra-info-row">
        <p>{t('VideoRange.ExtraInfo.totalLength')}</p>
        <p>{duration.toFixed(2)}s</p>
      </div>

      <div className="form-video-extra-info-row">
        <p>{t('VideoRange.ExtraInfo.resolution')}</p>
        <p>{`${width} x ${height}`}</p>
      </div>
      <div className="form-video-extra-info-row">
        <p> FPS: </p>
        <p>{fps}</p>
      </div>
    </div>
  );
};
