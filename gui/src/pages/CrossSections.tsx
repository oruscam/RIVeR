import { useState } from 'react';
import { WizardButtons, ImageWithMarks, Error } from '../components';
import { CrossSections as CrossSectionsComponent } from '../components/CrossSections/index';
import { useIpcamSlice, useProjectSlice, useSectionSlice, useUiSlice } from '../hooks';
import { useTranslation } from 'react-i18next';
import { handleDragLeave, handleDragOver } from '../helpers';
import { FormHeader } from '../components/Forms/Components';
import { ButtonLock } from '../components/ButtonLock';

export const CrossSections = () => {
  const { activeSection, sections, onGetBathimetry } = useSectionSlice();
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [deletedSections, setDeletedSections] = useState('');
  const { t } = useTranslation();
  const { onSetErrorMessage } = useUiSlice();
  const { type } = useProjectSlice();
  const { cameraSolution } = useIpcamSlice();

  const handleDrop = ( e: React.DragEvent<HTMLDivElement> ) => {
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
        })
          .then((error) => {
            if (error?.message) {
              const message = 'CrossSections.Errors.' + error.message;
              onSetErrorMessage({
                Bathimetry: {
                  type: 'error',
                  message: t(message, { level: error?.value }),
                },
              });
            }
          })
          .catch((error) => onSetErrorMessage(error.message));
      } else {
        onGetBathimetry({ bathimetryPath: path }).catch((error) => onSetErrorMessage(error.message));
      }
    }
  };

  return (
    <div className="regular-page">
      <div className="media-container">
        <ImageWithMarks />
        <Error></Error>
      </div>
      <div
        className={`form-container-new ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(event) => handleDragOver(event, setDragOver)}
        onDragLeave={(event) => handleDragLeave(event, setDragOver, false)}
        onDrop={handleDrop}>         
          <FormHeader title={t('CrossSections.title')} showProgress={true} showSections={true} setDeletedSections={setDeletedSections} canEdit={true}/>
          <CrossSectionsComponent deletedSections={deletedSections} setDeletedSections={setDeletedSections} />
      
          <div className='footer'>
            <ButtonLock
              disabled={sections[activeSection].bathimetry.width === undefined}
              footerElementID="form-cross-section-footer"
              headerElementID="form-cross-section-header"
            />    
            <WizardButtons formId="form-cross-section" canFollow={sections[0].sectionPoints[0].x !== 0}/>
          </div>
      </div>
    </div>
  );
};