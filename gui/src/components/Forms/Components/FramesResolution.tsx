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
    <div className="lens-correction-section mt-1" id="video-resolution">
      <h3 className="field-title" style={{ padding: '6px 0' }}>
        {t('VideoRange.framesResolution')}
      </h3>
      <div className="lens-settings">
        <div className="lens-row" style={{ borderBottom: 'none' }}>
          <span className="lens-row-label">{t('VideoRange.ExtraInfo.resolution').replace(':', '').trim()}</span>
          <div className="lens-row-right">
            <LensDropdown
              options={resolutions}
              value={readOnly ? 1 : factor}
              onChange={(v) => onChangeFramesResolution(v as number)}
              disabled={readOnly}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
