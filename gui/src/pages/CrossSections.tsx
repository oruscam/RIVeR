import { useState } from 'react';
import { WizardButtons, Error, Warning, FocusOverlay } from '../components';
import { CrossSections as CrossSectionsComponent } from '../components/CrossSections/index';
import { useDataSlice, useIpcamSlice, useProjectSlice, useSectionSlice, useUiSlice } from '../hooks';
import { useTranslation } from 'react-i18next';
import { handleDragLeave, handleDragOver } from '../helpers';
import { FormHeader } from '../components/Forms/Components';
import { ImageCrossSections } from '../components/CrossSections/ImageCrossSections';
import { LockBtn } from '../components/CustomIcons/LockBtn';
import { AddMaskButton } from '../components/Forms/Components';
import { UNIT_CONVERSIONS } from '../constants/constants';
export const CrossSections = () => {
  const { activeSection, sections, isDraggingPoint, onGetBathimetry } = useSectionSlice();
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [deletedSections, setDeletedSections] = useState('');
  const { t } = useTranslation();
  const { onSetErrorMessage } = useUiSlice();
  const { type, projectDetails } = useProjectSlice();
  const { cameraSolution } = useIpcamSlice();
  const { processing } = useDataSlice();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    const bathimetry = sections[activeSection].bathimetry;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];

      const path = window.webUtils.getPathForFile(file);

      if (type === 'ipcam') {
        onGetBathimetry({
          bathimetryPath: path,
          cameraMatrix: cameraSolution?.cameraMatrix,
          zLimits: { min: bathimetry.yMin ?? 0, max: bathimetry.yMax ?? 0 },
          unitSistem: projectDetails.unitSistem,
        })
          .then((error) => {
            if (error?.message) {
              const message = 'CrossSections.Errors.' + error.message;
              const displayLevel =
                error?.value !== undefined
                  ? (projectDetails.unitSistem === 'imperial'
                    ? error.value * UNIT_CONVERSIONS.M_TO_FT
                    : error.value
                  ).toFixed(2)
                  : error?.value;
              onSetErrorMessage({
                Bathimetry: {
                  type: 'error',
                  message: t(message, { level: displayLevel }),
                },
              });
            }
          })
          .catch((error) => onSetErrorMessage(error.message));
      } else {
        onGetBathimetry({ bathimetryPath: path, unitSistem: projectDetails.unitSistem }).catch((error) => onSetErrorMessage(error.message));
      }
    }
  };

  return (
    <div className="regular-page">
      <div className="media-container">
        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10 }}>
          <AddMaskButton />
        </div>
        <div style={{ position: 'relative', margin: 'auto 0' }}>
          <ImageCrossSections />
        </div>
        <div className="message-stack">
          <Error />
          <Warning />
        </div>
      </div>
      <div
        className={`form-container ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(event) => handleDragOver(event, setDragOver)}
        onDragLeave={(event) => handleDragLeave(event, setDragOver, false)}
        onDrop={handleDrop}>
        <FormHeader title={t('CrossSections.title')} showProgress={true} showSections={true} setDeletedSections={setDeletedSections} canEdit={true} />
        <CrossSectionsComponent deletedSections={deletedSections} setDeletedSections={setDeletedSections} />

        <div className='footer'>
          <LockBtn
            disabled={sections[activeSection].bathimetry.width === undefined}
            footerElementID="form-cross-section-footer"
            headerElementID="form-cross-section-header"
          />
          <WizardButtons formId="form-cross-section" canFollow={sections[0].sectionPoints[0].x !== 0} />
        </div>
        <FocusOverlay
          active={sections[activeSection].drawLine || isDraggingPoint || processing.activeMaskIndex !== null}
        />
      </div>
    </div>
  );
};