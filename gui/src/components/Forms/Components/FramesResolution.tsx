import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectSlice } from '../../../hooks';
import { LensDropdown } from './LensDropdown';

export const FramesResolution = () => {
  const { t } = useTranslation();
  const { video, onChangeFramesResolution, type } = useProjectSlice();
  const { data, parameters } = video;
  const { factor } = parameters;
  const { width, height } = data;

  const readOnly = type === 'ipcam';

  useEffect(() => {
    if (readOnly) onChangeFramesResolution(1);
  }, [readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolutions = readOnly
    ? [{ label: `${width}x${height}`, value: 1 }]
    : [
        { label: `${width}x${height}`, value: 1 },
        { label: `${width / 2}x${height / 2}`, value: 0.5 },
        { label: `${width / 4}x${height / 4}`, value: 0.25 },
      ];

  return (
    <div id="video-resolution">
      <p className="panel-group">{t('VideoRange.framesResolution')}</p>
      <div className="field-row">
        <span className="field-row-label">{t('VideoRange.ExtraInfo.resolution').replace(':', '').trim()}</span>
        <LensDropdown
          options={resolutions}
          value={readOnly ? 1 : factor}
          onChange={(v) => onChangeFramesResolution(v as number)}
          disabled={readOnly}
        />
      </div>
    </div>
  );
};
