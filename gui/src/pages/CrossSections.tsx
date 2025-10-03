import { useState } from 'react';
import { WizardButtons, ImageWithMarks, Error, Progress } from '../components';
import { CrossSections as CrossSectionsComponent } from '../components/CrossSections/index';
import { useIpcamSlice, useProjectSlice, useSectionSlice, useUiSlice } from '../hooks';
import { useTranslation } from 'react-i18next';
import { handleDragLeave, handleDragOver } from '../helpers';

export const CrossSections = () => {
  const { activeSection, sections, onGetBathimetry } = useSectionSlice();
  const [dragOver, setDragOver] = useState<boolean>(false);
  const { t } = useTranslation();
  const { onSetErrorMessage } = useUiSlice();
  const { type } = useProjectSlice();
  const { cameraSolution } = useIpcamSlice();

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
        className={`form-container ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(event) => handleDragOver(event, setDragOver)}
        onDragLeave={(event) => handleDragLeave(event, setDragOver, false)}
        onDrop={handleDrop}
      >
        <Progress />
        <CrossSectionsComponent />
        <WizardButtons formId="form-cross-section" />
      </div>
    </div>
  );
};
