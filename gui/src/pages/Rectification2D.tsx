import { FieldValues, FormProvider, useForm } from "react-hook-form";
import {
  Error,
  ImageRectification2D,
  Progress,
  WizardButtons,
} from "../components";
import { FormRectification2D } from "../components/Forms";
import { useMatrixSlice, useUiSlice } from "../hooks";
import { useWizard } from "react-use-wizard";
import { useEffect } from "react";

export const Rectification2D = () => {
  const { obliquePoints, onGetTransformationMatrix } = useMatrixSlice();
  const { distances } = obliquePoints;
  const { onSetErrorMessage } = useUiSlice();
  const { nextStep } = useWizard();

  const { solution } = obliquePoints;

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

  const onSubmit = (values: FieldValues, event: React.BaseSyntheticEvent) => {
    const id = event.nativeEvent.submitter.id;

    if (id === "solve-oblique") {
      onGetTransformationMatrix("oblique", values).catch((error) =>
        onSetErrorMessage(error.message),
      );
      return;
    }

    nextStep();
  };

  const onError = (error: string) => {
    onSetErrorMessage(error);
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
      <div className="form-container">
        <Progress />
        <FormProvider {...methods}>
          <FormRectification2D
            onSubmit={methods.handleSubmit(onSubmit, onError)}
            onError={onError}
          />
        </FormProvider>
        <WizardButtons
          formId="form-control-points"
          canFollow={solution !== undefined}
        />
      </div>
    </div>
  );
};
