import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import { Error, ImageRectification2D, Progress, WizardButtons } from '../components';
import { FormRectification2D } from '../components/Forms';
import { useObliqueSlice, useUiSlice } from '../hooks';
import { useWizard } from 'react-use-wizard';
import { useEffect, useState } from 'react';
import { handleDragLeave, handleDragOver } from '../helpers';

export const Rectification2D = () => {
  const { solution, distances, onGetObliqueTransformationMatrix, onGetDistances } = useObliqueSlice();
  const { onSetErrorMessage } = useUiSlice();
  const { nextStep } = useWizard();

  const [dragOver, setDragOver] = useState<boolean>(false);

  const methods = useForm({
    defaultValues: {
      distance_12: distances.d12.toFixed(2),
      distance_23: distances.d23.toFixed(2),
      distance_34: distances.d34.toFixed(2),
      distance_41: distances.d41.toFixed(2),
      distance_13: distances.d13.toFixed(2),
      distance_24: distances.d24.toFixed(2),
    },
  });

  const onSubmit = (values: FieldValues, event?: React.BaseSyntheticEvent) => {
    const id = event?.nativeEvent?.submitter?.id;

    if (id === 'solve-oblique') {
      onGetObliqueTransformationMatrix(values).catch((error) => onSetErrorMessage(error.message));
      return;
    }

    nextStep();
  };

  const onError = (error: string) => {
    onSetErrorMessage(error);
  };

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
    methods.reset({
      distance_12: distances.d12.toFixed(2),
      distance_23: distances.d23.toFixed(2),
      distance_34: distances.d34.toFixed(2),
      distance_41: distances.d41.toFixed(2),
      distance_13: distances.d13.toFixed(2),
      distance_24: distances.d24.toFixed(2),
    });
  }, [distances, methods]);

  return (
    <div className="regular-page">
      <div className="media-container">
        <ImageRectification2D />
        <Error />
      </div>
      <div
        className={`form-container ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(event) => handleDragOver(event, setDragOver)}
        onDragLeave={(event) => handleDragLeave(event, setDragOver, false)}
        onDrop={handleDrop}
      >
        <Progress />
        <FormProvider {...methods}>
          <FormRectification2D onSubmit={methods.handleSubmit(onSubmit, onError)} onError={onError} />
        </FormProvider>
        <WizardButtons formId="form-control-points" canFollow={solution !== undefined} />
      </div>
    </div>
  );
};
