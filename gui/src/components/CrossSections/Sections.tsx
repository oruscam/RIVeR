import React, { useEffect } from 'react';
import { useSectionSlice, useUiSlice } from '../../hooks';
import { useTranslation } from 'react-i18next';
import { EyeBtn } from '../CustomIcons/EyeBtn';
import { Icons } from '../CustomIcons/Icons';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { scrollBehavior } from '../../helpers/motion';

interface Sections {
  setDeletedSections?: React.Dispatch<React.SetStateAction<any>>;
  canEdit: boolean;
}

export const Sections = ({ setDeletedSections, canEdit }: Sections) => {
  const { onSetActiveSection, sections, activeSection, onAddSection, onDeleteSection } = useSectionSlice();
  const { seeAll, onSetSeeAll } = useUiSlice();
  const { t } = useTranslation();
  const [dialog, confirmDialog] = useConfirmDialog();

  // Set the active section, and logic for scrolling to the next section
  const onClickSection = (index: number) => {
    if (index > activeSection) {
      const section = document.getElementById(sections[index + 1]?.name);
      if (section === null) {
        const element = document.getElementById('scroll-right');
        element?.scrollIntoView({ behavior: scrollBehavior() });
      }
      section?.scrollIntoView({ behavior: scrollBehavior() });
    } else {
      const section = document.getElementById(sections[index - 1]?.name);
      if (section !== null) {
        section?.scrollIntoView({ behavior: scrollBehavior() });
      }
    }
    onSetActiveSection(index);
  };

  const handleAddSection = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onAddSection(sections.length);
  };

  // aria-disabled, not native disabled: Chromium suppresses a native-disabled
  // control's title tooltip, and this button needs its "can't delete the last
  // section" tooltip reachable while inert. aria-disabled is advisory only, so
  // the guard below — reading the same condition — is what actually stops the
  // click.
  const deleteDisabled = sections.length === 1;

  const handleDeleteSection = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (deleteDisabled || !setDeletedSections) return;

    const confirmed = await confirmDialog({
      title: t('CrossSections.title'),
      body: t('CrossSections.warning', {
        section_name: `${t('CrossSections.section', { defaultValue: 'Section' })} ${activeSection + 1}`,
      }),
      confirmLabel: t('CrossSections.deleteConfirm', { defaultValue: 'Delete section' }),
      cancelLabel: t('CrossSections.deleteCancel', { defaultValue: 'Cancel' }),
    });

    if (confirmed) {
      setDeletedSections(sections[activeSection].name);
      onDeleteSection();
    }
  };

  useEffect(() => {
    const element = document.getElementById('scroll-right');
    element?.scrollIntoView({ behavior: scrollBehavior() });
  }, [sections.length]);

  return (
    <>
      <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden', marginTop: 15, marginBottom: 15 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minHeight: 50 }}>
          <div style={{ marginRight: '15px', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <EyeBtn active={seeAll} action={() => onSetSeeAll(!seeAll)} noBorder={true} />
            {canEdit && (
              <button
                type="button"
                className="ibtn ibtn-sm ibtn-danger"
                onClick={handleDeleteSection}
                aria-disabled={deleteDisabled}
                title={
                  deleteDisabled
                    ? t('CrossSections.deleteLastSection', { defaultValue: "Can't delete the last section" })
                    : t('CrossSections.deleteConfirm', { defaultValue: 'Delete section' })
                }
              >
                {Icons.Trash('currentColor')}
              </button>
            )}
          </div>
          {sections.map((section, index: number) => (
            <button
              key={index}
              type="button"
              className="chip"
              id={section.name}
              aria-selected={activeSection === index}
              onClick={() => onClickSection(index)}
            >
              {t('CrossSections.section', { defaultValue: 'Section' })} {index + 1}
            </button>
          ))}
          {canEdit && (
            <button type="button" className="chip" onClick={handleAddSection}>
              + {t('CrossSections.addSection', { defaultValue: 'Add section' })}
            </button>
          )}
          <span id="scroll-right" />
        </div>
      </div>
      {dialog}
    </>
  );
};
