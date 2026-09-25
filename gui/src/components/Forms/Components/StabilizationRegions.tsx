import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectSlice, useUiSlice } from '../../../hooks';
import { RegionList } from './RegionList';

export const StabilizationRegions = () => {
  const { t } = useTranslation();
  const {
    video,
    stabilizationActiveRegionIndex,
    onSetStabilization,
    onAddStabilizationRegion,
    onDeleteStabilizationRegion,
    onSetStabilizationActiveRegionIndex,
  } = useProjectSlice();
  const { onSetModeHint, onClearModeHint } = useUiSlice();

  const { stabilization, stabilizationRegions } = video.parameters;

  // While a region is actively being placed/edited: show a persistent mode hint
  // with the live region count as meta. When editing is exited, clear the hint.
  useEffect(() => {
    if (!stabilization || stabilizationActiveRegionIndex === null) {
      onClearModeHint();
      return;
    }

    onSetModeHint(
      t('VideoRange.editingRegionsWarning', { defaultValue: 'Editing regions' }),
      t('VideoRange.minRegionsCount', {
        defaultValue: '{{count}} of 2 min.',
        count: stabilizationRegions.length,
      })
    );

    return () => onClearModeHint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stabilization, stabilizationActiveRegionIndex, stabilizationRegions.length]);

  const handleToggle = (checked: boolean) => {
    onSetStabilization(checked);
  };

  const handleEditClick = (index: number) => {
    onSetStabilizationActiveRegionIndex(stabilizationActiveRegionIndex === index ? null : index);
  };

  const handleAddClick = () => {
    onAddStabilizationRegion();
  };

  return (
    <div className="lens-correction-section mt-1">
      <div className="switch-container">
        <h3 className="field-title">{t('VideoRange.stabilizeVideo', { defaultValue: 'Stabilize video' })}</h3>
        <label className="switch">
          <input type="checkbox" checked={stabilization} onChange={(e) => handleToggle(e.target.checked)} />
          <span className="slider"></span>
        </label>
      </div>

      {stabilization && (
        <RegionList
          regions={stabilizationRegions}
          activeRegionIndex={stabilizationActiveRegionIndex}
          onEdit={handleEditClick}
          onDelete={onDeleteStabilizationRegion}
          onAdd={handleAddClick}
        />
      )}
    </div>
  );
};
