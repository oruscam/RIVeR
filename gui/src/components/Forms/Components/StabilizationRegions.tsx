import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectSlice, useUiSlice } from '../../../hooks';
import { EditMaskBtn } from '../../CustomIcons/EditMaskBtn';
import { TrashBtn } from '../../CustomIcons/TrashBtn';
import { MaskBtn } from '../../CustomIcons/MaskBtn';

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
  const { onSetInfoMessage, onSetWarningMessage, onClearWarningMessage } = useUiSlice();

  const { stabilization, stabilizationRegions } = video.parameters;

  // While stabilization is on: briefly show the green "add 2 regions" hint,
  // then hand off to a persistent yellow "editing regions" status until the
  // user turns stabilization off (or leaves this step).
  useEffect(() => {
    if (!stabilization) {
      onClearWarningMessage();
      return;
    }

    onSetInfoMessage(
      t('VideoRange.minRegionsWarning', { defaultValue: 'Add at least 2 regions for stabilization' })
    );

    const timer = setTimeout(() => {
      onSetWarningMessage(
        t('VideoRange.editingRegionsWarning', { defaultValue: 'Editing stabilization regions' })
      );
    }, 5000);

    return () => {
      clearTimeout(timer);
      onClearWarningMessage();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stabilization]);

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
        <>
          {stabilizationRegions.map((_region, index) => (
            <div key={index} className="switch-container mt-1">
              <h3 className="field-title">
                {t('VideoRange.stabilizationRegion', { defaultValue: 'Region' })} {index + 1}
              </h3>
              <div className="mask-actions">
                <EditMaskBtn
                  action={handleEditClick}
                  active={stabilizationActiveRegionIndex === index}
                  index={index}
                />
                <TrashBtn onClickFunction={() => onDeleteStabilizationRegion(index)} />
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <MaskBtn
              onClick={handleAddClick}
              disabled={stabilizationActiveRegionIndex !== null}
              title={t('VideoRange.addRegion', { defaultValue: 'Add region' })}
            />
          </div>
        </>
      )}
    </div>
  );
};
