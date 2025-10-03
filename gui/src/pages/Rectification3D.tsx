import { useWizard } from "react-use-wizard";
import { FormRectification3D } from "../components/Forms/FormRectification3D.tsx";
import {
  Carousel,
  Error,
  ImageRectification3D,
  Progress,
  WizardButtons,
} from "../components/index";
import { useMatrixSlice } from "../hooks/useMatrixSlice.ts";
import { useState } from "react";
import { handleDragLeave, handleDragOver } from "../helpers/handleDragEvents.ts";
import { useUiSlice } from "../hooks/useUiSlice.ts";

export const Rectification3D = () => {
  const { ipcam, onChangeActiveImage, onGetPoints, onGetImages } = useMatrixSlice();
  const { importedImages, activeImage } = ipcam;
  const { onSetErrorMessage } = useUiSlice();
  const { nextStep } = useWizard();

  const [dragOver, setDragOver] = useState<boolean>(false);

  const handleOnClickNext = () => {
    nextStep();
  };

  const handleDrop = ( event: React.DragEvent<HTMLDivElement> ) => {
    event.preventDefault();
    setDragOver(false);
    console.log('drop in rectification 3d')

    const files = event.dataTransfer.files;

    if (files.length > 0) {
      const file = files[0]
      const path = window.webUtils.getPathForFile(file);

      if (!file.type){
        onGetImages(path).catch((error) => {
          onSetErrorMessage(error.message)
        })
      } else {
          onGetPoints(path).catch((error) => {
          onSetErrorMessage(error.message)
        })
      }
    }
  }

  return (
    <div className="regular-page">
      <div className="media-container">
        <ImageRectification3D />
        {importedImages !== undefined && (
          <Carousel
            images={importedImages}
            active={activeImage!}
            setActiveImage={onChangeActiveImage}
            mode="ipcam"
          />
        )}
        <Error />
      </div>
      <div className={`form-container ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => handleDragOver(e, setDragOver)}
        onDragLeave={(e) => handleDragLeave(e, setDragOver, false)}
        onDrop={handleDrop}
      >
        <Progress />
        <FormRectification3D />
        <WizardButtons
          canFollow={ipcam.cameraSolution !== undefined}
          onClickNext={handleOnClickNext}
        />
      </div>
    </div>
  );
};
