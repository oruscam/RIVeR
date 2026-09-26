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

  // aria-disabled, not native disabled: Chromium suppresses a native-disabled
  // control's title tooltip, and this chip needs its tooltip reachable while
  // inert. aria-disabled is advisory only, so the guard below — reading the
  // same condition — is what actually stops the click.
  const addDisabled = activeRegionIndex !== null;
  const handleAdd = () => {
    if (addDisabled) return;
    onAdd();
  };

  return (
    <div className="mt-1">
      {regions.map((_region, index) => (
        <div key={index} className="list-row" aria-selected={index === activeRegionIndex}>
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
        className="chip chip-sm mt-1"
        onClick={handleAdd}
        aria-disabled={addDisabled}
        title={t('VideoRange.addRegion', { defaultValue: 'Add region' })}
      >
        + {t('VideoRange.addRegion', { defaultValue: 'Add region' })}
      </button>
    </div>
  );
};
