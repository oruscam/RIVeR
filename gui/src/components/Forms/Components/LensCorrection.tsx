import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectSlice } from '../../../hooks';
import { LensDropdown } from './LensDropdown';
import { scrollBehavior } from '../../../helpers/motion';

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
      setTimeout(() => settingsRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' }), 50);
    }
  }, [enabled]);
  const selectedGroup = profiles.find((g) => g.camera === selectedCamera) ?? null;

  const scrollBodyToBottom = () => {
    const body = settingsRef.current?.closest('.body') as HTMLElement | null;
    if (body) body.scrollTo({ top: body.scrollHeight, behavior: scrollBehavior() });
  };

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
    <div>
      <div className="field-row">
        <label className="field-row-label" htmlFor="lens-correction-toggle">
          {t('VideoRange.lensCorrection')}
        </label>
        <label className="switch switch-sm">
          <input
            id="lens-correction-toggle"
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
          <p className="field-row field-row-child field-row-label">{t('VideoRange.noProfiles')}</p>
        ) : (
          <div ref={settingsRef}>
            <div className="field-row field-row-child">
              <span className="field-row-label">{t('Calibration.cameraName')}</span>
              <LensDropdown
                options={profiles.map((g) => ({ label: g.camera, value: g.camera }))}
                value={selectedCamera}
                onChange={(v) => handleCameraChange(v as string)}
                onOpen={scrollBodyToBottom}
              />
            </div>
            {selectedGroup && !selectedGroup.isLegacy && (
              <div className="field-row field-row-child">
                <span className="field-row-label">{t('Calibration.lensName')}</span>
                <LensDropdown
                  options={selectedGroup.lenses!.map((l) => ({ label: l.name, value: l.path }))}
                  value={lensCorrection ?? ''}
                  onChange={(v) => onSetLensCorrection(v as string)}
                  onOpen={scrollBodyToBottom}
                />
              </div>
            )}
          </div>
        ))}
    </div>
  );
};
