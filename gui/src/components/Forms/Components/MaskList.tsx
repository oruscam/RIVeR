import { useTranslation } from 'react-i18next';
import { useDataSlice } from '../../../hooks';
import { EyeBtn } from '../../CustomIcons/EyeBtn';
import { EditMaskBtn } from '../../CustomIcons/EditMaskBtn';
import { TrashBtn } from '../../CustomIcons/TrashBtn';

/**
 * Numbered list of masks — "Mask 1" style per D6, never an inline rename
 * (masks, like stabilization regions, are numbered rather than named). Each
 * row carries eye + edit + delete: a mask also has a visibility/eye state
 * that a stabilization region does not, so it takes three controls where a
 * region's row (see RegionList.tsx, the sibling pattern) takes two. Hidden
 * masks are distinguished by the eye control's own state, not by dimming
 * the label.
 *
 * Rendered unconditionally in the Cross Sections form panel — masks no
 * longer live behind Advanced. Editing state and its mode-hint pill remain
 * a drawing-mode concern, handled by MaskCreation.tsx.
 */
export const MaskList = () => {
  const { t } = useTranslation();
  const { processing, onToggleMaskVisibility, onDeleteMask, onUpdateActiveMask } = useDataSlice();
  const { masks, visibleMaskIndices, activeMaskIndex } = processing;

  return (
    <div>
      {masks !== undefined &&
        masks.map((_mask, index) => (
          <div key={index} className="list-row list-row-field" aria-selected={index === activeMaskIndex}>
            <span className="list-row-label">
              {t('CrossSections.mask')} {index + 1}
            </span>
            <div className="list-row-actions">
              <EyeBtn
                action={onToggleMaskVisibility}
                active={visibleMaskIndices.includes(index)}
                index={index}
                size="sm"
              />
              <EditMaskBtn
                action={onUpdateActiveMask}
                active={activeMaskIndex === index}
                index={index}
                size="sm"
              />
              <TrashBtn onClickFunction={() => onDeleteMask(index)} size="sm" />
            </div>
          </div>
        ))}
    </div>
  );
};
