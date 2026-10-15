import { useTranslation } from 'react-i18next';
import { StabilizationRegion } from '../../../store/project/types';
import { EditMaskBtn } from '../../CustomIcons/EditMaskBtn';
import { TrashBtn } from '../../CustomIcons/TrashBtn';

interface RegionListProps {
  regions: StabilizationRegion[];
  activeRegionIndex: number | null;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onAdd: () => void;
}

/**
 * Numbered list of stabilization regions — "Region 1" style per D6, never an
 * inline rename (regions, like masks, are numbered rather than named). Each
 * row carries edit + delete only: a region has no visibility/eye state, so it
 * takes two controls where a mask's row takes three.
 */
export const RegionList = ({ regions, activeRegionIndex, onEdit, onDelete, onAdd }: RegionListProps) => {
  const { t } = useTranslation();

  const editing = activeRegionIndex !== null;
  const label = editing
    ? t('VideoRange.doneEditingRegion', { defaultValue: 'Done editing' })
    : `+ ${t('VideoRange.addRegion', { defaultValue: 'Add region' })}`;

  return (
    <div>
      <p className="panel-group">{t('VideoRange.regions', { defaultValue: 'Regions' })}</p>
      {regions.map((_region, index) => (
        <div key={index} className="list-row list-row-field" aria-selected={index === activeRegionIndex}>
          <span className="list-row-label">
            {t('VideoRange.stabilizationRegion', { defaultValue: 'Region' })} {index + 1}
          </span>
          <div className="list-row-actions">
            <EditMaskBtn action={onEdit} active={index === activeRegionIndex} index={index} size="sm" />
            <TrashBtn onClickFunction={() => onDelete(index)} size="sm" />
          </div>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-sm btn-tertiary panel-add"
        onClick={onAdd}
        title={
          editing
            ? t('VideoRange.exitRegionEditing', { defaultValue: 'Exit region editing' })
            : t('VideoRange.addRegion', { defaultValue: 'Add region' })
        }
      >
        {label}
      </button>

      {regions.length < 2 && (
        <p className="field-readonly panel-hint">
          {t('VideoRange.minRegionsHint', { defaultValue: 'Add at least 2 regions to stabilize' })}
        </p>
      )}
    </div>
  );
};
