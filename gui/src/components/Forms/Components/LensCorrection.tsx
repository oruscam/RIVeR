import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectSlice } from '../../../hooks';

export const LensCorrection = () => {
  const { t } = useTranslation();
  const { video, onSetLensCorrection } = useProjectSlice();
  const { lensCorrection } = video.parameters;

  const [profiles, setProfiles] = useState<{ name: string; path: string }[]>([]);

  useEffect(() => {
    window.ipcRenderer.invoke('calibration-list-profiles').then((result: { name: string; path: string }[]) => {
      setProfiles(result ?? []);
    });
  }, []);

  const noProfiles = profiles.length === 0;
  const enabled = lensCorrection !== null;

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onSetLensCorrection(null);
    } else if (!noProfiles) {
      onSetLensCorrection(profiles[0].path);
    }
  };

  return (
    <div className="mt-1">
      <div className="switch-container">
        <h3 className="field-title">{t('VideoRange.lensCorrection')}</h3>
        <label className="switch">
          <input
            type="checkbox"
            checked={enabled}
            disabled={noProfiles && !enabled}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          <span className="slider"></span>
        </label>
      </div>
      {enabled &&
        (noProfiles ? (
          <p className="mt-1" style={{ color: 'var(--secondary-text-color)', fontSize: '14px' }}>
            {t('VideoRange.noProfiles')}
          </p>
        ) : (
          <select
            className="input-field-oblique input-field-select mt-1"
            value={lensCorrection ?? ''}
            onChange={(e) => onSetLensCorrection(e.target.value)}
          >
            {profiles.map((p) => (
              <option key={p.path} value={p.path}>
                {p.name}
              </option>
            ))}
          </select>
        ))}
    </div>
  );
};
