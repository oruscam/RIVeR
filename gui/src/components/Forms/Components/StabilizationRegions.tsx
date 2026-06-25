import { useTranslation } from 'react-i18next';
import { useProjectSlice } from '../../../hooks';
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

  const { stabilization, stabilizationRegions } = video.parameters;

  const handleToggle = (checked: boolean) => {
    onSetStabilization(checked);
  };

  const handleEditClick = (index: number) => {
    onSetStabilizationActiveRegionIndex(stabilizationActiveRegionIndex === index ? null : index);
  };

  const handleAddClick = () => {
    if (stabilizationActiveRegionIndex !== null) {
      onSetStabilizationActiveRegionIndex(null);
    } else {
      onAddStabilizationRegion();
    }
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
            {stabilizationActiveRegionIndex !== null && (
              <span style={{ fontSize: '13px', color: 'var(--secondary-text-color)', fontStyle: 'italic' }}>
                {t('VideoRange.editingRegion', {
                  defaultValue: 'Editing region {{n}}',
                  n: stabilizationActiveRegionIndex + 1,
                })}
              </span>
            )}
            <MaskBtn
              onClick={handleAddClick}
              title={
                stabilizationActiveRegionIndex !== null
                  ? t('VideoRange.exitRegionMode', { defaultValue: 'Exit region editing' })
                  : t('VideoRange.addRegion', { defaultValue: 'Add region' })
              }
            />
          </div>

          {stabilization && stabilizationRegions.length < 2 && (
            <p
              style={{
                fontSize: '13px',
                color: 'var(--secondary-text-color)',
                marginTop: '6px',
                fontStyle: 'italic',
              }}
            >
              {t('VideoRange.minRegionsWarning', {
                defaultValue: 'Add at least 2 regions for stabilization',
              })}
            </p>
          )}
        </>
      )}
    </div>
  );
};
