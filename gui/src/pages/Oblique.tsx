import { FormProvider, useForm } from 'react-hook-form';
import { Error, ImageOblique, ImageObliqueNew, WizardButtons } from '../components';
import { FormOblique } from '../components/Forms';
import { useGlobalSlice, useObliqueSlice, useUiSlice } from '../hooks';
import { useWizard } from 'react-use-wizard';
import { useEffect, useState } from 'react';
import { handleDragLeave, handleDragOver } from '../helpers';
import { ButtonLock } from '../components/ButtonLock';
import { Point } from '../types';
import { FormHeader } from '../components/Forms/Components';
import { useTranslation } from 'react-i18next';

const createDefaultState = (distances: any, coordinates: Point[], rwCoordinates: Point[]) => {
  const defaultValues = {
    distance12: distances.d12.toFixed(2),
    distance23: distances.d23.toFixed(2),
    distance34: distances.d34.toFixed(2),
    distance41: distances.d41.toFixed(2),
    distance13: distances.d13.toFixed(2),
    distance24: distances.d24.toFixed(2),
    oblique_xPoint1: coordinates[0].x.toFixed(2),
    oblique_yPoint1: coordinates[0].y.toFixed(2),
    oblique_xPoint2: coordinates[1].x.toFixed(2),
    oblique_yPoint2: coordinates[1].y.toFixed(2),
    oblique_xPoint3: coordinates[2].x.toFixed(2),
    oblique_yPoint3: coordinates[2].y.toFixed(2),
    oblique_xPoint4: coordinates[3].x.toFixed(2),
    oblique_yPoint4: coordinates[3].y.toFixed(2),
    oblique_eastPoint1: rwCoordinates[0].x.toFixed(2),
    oblique_northPoint1: rwCoordinates[0].y.toFixed(2),
    oblique_eastPoint2: rwCoordinates[1].x.toFixed(2),
    oblique_northPoint2: rwCoordinates[1].y.toFixed(2),
    oblique_eastPoint3: rwCoordinates[2].x.toFixed(2),
    oblique_northPoint3: rwCoordinates[2].y.toFixed(2),
    oblique_eastPoint4: rwCoordinates[3].x.toFixed(2),
    oblique_northPoint4: rwCoordinates[3].y.toFixed(2),
  }

  return defaultValues;
}

export const Oblique = () => {
  const { solution, distances, coordinates, rwCoordinates, extraFields, onChangeExtraFields, onGetObliqueTransformationMatrix, onGetDistances, isDefaultCoordinates } = useObliqueSlice();
  const { isBackendWorking } = useGlobalSlice();
  const { onSetErrorMessage } = useUiSlice();
  const { nextStep } = useWizard();
  const { t } = useTranslation();

  const [dragOver, setDragOver] = useState<boolean>(false);

  const methods = useForm({ defaultValues: createDefaultState(distances, coordinates, rwCoordinates) });

  const onSubmit = () => {
    nextStep();
  };

  const onError = (error: string) => {
    onSetErrorMessage(error);
  };

  const onClickSolveButton = () => {
    onGetObliqueTransformationMatrix(methods.getValues()).catch((error) => onSetErrorMessage(error.message));
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const path = window.webUtils.getPathForFile(file);

      onGetDistances(path).catch((error) => onSetErrorMessage(error.message));
    }
  };

  useEffect(() => {
    methods.reset(createDefaultState(distances, coordinates, rwCoordinates));
  }, [distances, methods, coordinates]);

  return (
    <div className="regular-page">
      <div className="media-container">
        <ImageOblique/>
        <Error />
      </div>
      <div
        className={`form-container ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(event) => handleDragOver(event, setDragOver)}
        onDragLeave={(event) => handleDragLeave(event, setDragOver, false)}
        onDrop={handleDrop}
      >
        <FormHeader title={t('ControlPoints.title')} showSections={false}/>
        
        <FormProvider {...methods}>
          <FormOblique onSubmit={methods.handleSubmit(onSubmit, onError)} onError={onError} />
        </FormProvider>

        <div className='footer'>
          <button
            className="wizard-button form-button solver-button"
            id="solve-oblique"
            disabled={isDefaultCoordinates || isBackendWorking}
            onClick={onClickSolveButton}
          >
            {t('Commons.solve')}
          </button>
          <ButtonLock
            footerElementID="span-footer"
            headerElementID="draw-coordinates"
            disabled={coordinates[0].x === 0}
            localExtraFields={extraFields}
            setLocalExtraFields={onChangeExtraFields}
          />
          <WizardButtons formId="form-control-points" canFollow={solution !== null} />
        </div>
      </div>
    </div>
  );
};