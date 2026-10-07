import { useTranslation } from 'react-i18next';
import { useProjectSlice } from '../../../hooks';

/** The source file's facts: read-only text, so quiet that it never competes with a field (rules 3, 7). */
export const VideoMetadata = () => {
  const { t } = useTranslation();
  const { video } = useProjectSlice();
  const { name, width, height, duration, fps } = video.data;

  const rows: Array<[string, string]> = [
    [t('VideoRange.ExtraInfo.fileName'), name],
    [t('VideoRange.ExtraInfo.totalLength'), `${Number(duration).toFixed(2)} s`],
    [t('VideoRange.ExtraInfo.resolution'), `${width} × ${height}`],
    ['FPS', `${fps}`],
  ];

  return (
    <div className="panel-section">
      <hr className="panel-rule" />
      <p className="panel-group">{t('VideoRange.sourceVideo', { defaultValue: 'Source video' })}</p>
      {rows.map(([label, value]) => (
        <div className="field-row" key={label}>
          <span className="field-row-label">{label.replace(/:\s*$/, '')}</span>
          <span className="field-readonly">{value}</span>
        </div>
      ))}
    </div>
  );
};
