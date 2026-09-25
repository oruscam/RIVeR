import { useTranslation } from 'react-i18next';
import { StabilizationRegion } from '../../../store/project/types';

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

  return (
    <div className="mt-1">
      {regions.map((_region, index) => (
        <div key={index} className="list-row" aria-selected={index === activeRegionIndex}>
          <span className="list-row-label">
            {t('VideoRange.stabilizationRegion', { defaultValue: 'Region' })} {index + 1}
          </span>
          <div className="list-row-actions">
            <button
              type="button"
              className="ibtn ibtn-sm"
              onClick={() => onEdit(index)}
              title={t('VideoRange.editRegion', { defaultValue: 'Edit region' })}
            >
              &#9998;
            </button>
            <button
              type="button"
              className="ibtn ibtn-sm ibtn-danger"
              onClick={() => onDelete(index)}
              title={t('VideoRange.deleteRegion', { defaultValue: 'Delete region' })}
            >
              &#128465;
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="chip chip-sm mt-1"
        onClick={onAdd}
        disabled={activeRegionIndex !== null}
        title={t('VideoRange.addRegion', { defaultValue: 'Add region' })}
      >
        + {t('VideoRange.addRegion', { defaultValue: 'Add region' })}
      </button>
    </div>
  );
};
