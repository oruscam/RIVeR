import { useTranslation } from 'react-i18next';
import { useProjectSlice } from '../../../hooks';

/** The source file's facts: read-only text, so quiet that it never competes with a field (rules 3, 7).
 *  A frames project adds one editable row, the time between frames, passed in by the form that owns it. */
export const VideoMetadata = ({ intervalField }: { intervalField?: React.ReactNode }) => {
  const { t } = useTranslation();
  const { video } = useProjectSlice();
  const { name, width, height, duration, fps, source, frameCount } = video.data;
  const frames = source === 'frames';

  const rows: Array<[string, string]> = frames
    ? [
        [t('VideoRange.ExtraInfo.folderName'), name ?? ''],
        [t('VideoRange.ExtraInfo.frameCount'), `${frameCount ?? 0}`],
        [t('VideoRange.ExtraInfo.resolution'), `${width} × ${height}`],
      ]
    : [
        [t('VideoRange.ExtraInfo.fileName'), name ?? ''],
        [t('VideoRange.ExtraInfo.totalLength'), `${Number(duration).toFixed(2)} s`],
        [t('VideoRange.ExtraInfo.resolution'), `${width} × ${height}`],
        ['FPS', `${fps}`],
      ];

  return (
    <div className="panel-section">
      <hr className="panel-rule" />
      <p className="panel-group">
        {frames ? t('VideoRange.sourceFrames') : t('VideoRange.sourceVideo', { defaultValue: 'Source video' })}
      </p>
      {rows.map(([label, value]) => (
        <div className="field-row" key={label}>
          <span className="field-row-label">{label.replace(/:\s*$/, '')}</span>
          <span className="field-readonly">{value}</span>
        </div>
      ))}
      {frames && intervalField}
    </div>
  );
};
