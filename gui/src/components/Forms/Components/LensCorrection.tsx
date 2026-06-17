import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectSlice } from '../../../hooks';
import { LensDropdown } from './LensDropdown';

type ProfileGroup = {
  camera: string;
  isLegacy: boolean;
  path?: string;
  lenses?: { name: string; path: string }[];
};

export const LensCorrection = () => {
  const { t } = useTranslation();
  const { video, onSetLensCorrection } = useProjectSlice();
  const { lensCorrection } = video.parameters;

  const [profiles, setProfiles] = useState<ProfileGroup[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');

  useEffect(() => {
    window.ipcRenderer.invoke('calibration-list-profiles').then((result: ProfileGroup[]) => {
      const groups = result ?? [];
      setProfiles(groups);

      if (lensCorrection && groups.length > 0) {
        for (const group of groups) {
          if (group.isLegacy && group.path === lensCorrection) {
            setSelectedCamera(group.camera);
            return;
          }
          if (!group.isLegacy && group.lenses) {
            for (const lens of group.lenses) {
              if (lens.path === lensCorrection) {
                setSelectedCamera(group.camera);
                return;
              }
            }
          }
        }
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const settingsRef = useRef<HTMLDivElement>(null);

  const noProfiles = profiles.length === 0;
  const enabled = lensCorrection !== null;

  useEffect(() => {
    if (enabled) {
      setTimeout(() => settingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  }, [enabled]);
  const selectedGroup = profiles.find((g) => g.camera === selectedCamera) ?? null;

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onSetLensCorrection(null);
      setSelectedCamera('');
      return;
    }
    if (noProfiles) return;
    const first = profiles[0];
    setSelectedCamera(first.camera);
    if (first.isLegacy) {
      onSetLensCorrection(first.path!);
    } else {
      onSetLensCorrection(first.lenses![0].path);
    }
  };

  const handleCameraChange = (camera: string) => {
    setSelectedCamera(camera);
    const group = profiles.find((g) => g.camera === camera);
    if (!group) return;
    if (group.isLegacy) {
      onSetLensCorrection(group.path!);
    } else {
      onSetLensCorrection(group.lenses![0].path);
    }
  };

  return (
    <div className="lens-correction-section mt-1">
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
          <div className="lens-settings" ref={settingsRef}>
            <div className="lens-row">
              <span className="lens-row-label">{t('Calibration.cameraName')}</span>
              <div className="lens-row-right">
                <LensDropdown
                  options={profiles.map((g) => ({ label: g.camera, value: g.camera }))}
                  value={selectedCamera}
                  onChange={(v) => handleCameraChange(v as string)}
                />
              </div>
            </div>
            {selectedGroup && !selectedGroup.isLegacy && (
              <div className="lens-row">
                <span className="lens-row-label">{t('Calibration.lensName')}</span>
                <div className="lens-row-right">
                  <LensDropdown
                    options={selectedGroup.lenses!.map((l) => ({ label: l.name, value: l.path }))}
                    value={lensCorrection ?? ''}
                    onChange={(v) => onSetLensCorrection(v as string)}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
    </div>
  );
};
