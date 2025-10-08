import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import { useWizard } from 'react-use-wizard';
import { FormUav } from '../components/Forms/index';
import { WizardButtons, Error, Progress, ImageUav } from '../components/index';
import { useUavSlice, useUiSlice } from '../hooks/index';

import './pages.css';
import { useEffect } from 'react';
import { ButtonLock } from '../components/ButtonLock.js';
import { formatNumberTo2Decimals, formatNumberToPrecision4 } from '../helpers/adapterNumbers.js';

export const Uav = () => {
  const {
    dirPoints,
    rwPoints,
    size,
    rwLength,
    solution,
    extraFields,
    onUpdatePixelSize,
    onGetUavTransformationMatrix,
  } = useUavSlice();

  // * Estado inicial del formulario
  const methods = useForm({
    defaultValues: {
      uav_lineLength: formatNumberTo2Decimals(rwLength),
      uav_pixelSize: formatNumberToPrecision4(size),
      uav_eastPoint1: rwPoints[0].x,
      uav_eastPoint2: rwPoints[1].x,
      uav_northPoint1: rwPoints[0].y,
      uav_northPoint2: rwPoints[1].y,
      uav_xPoint1: dirPoints.length === 0 ? 0 : dirPoints[0].x,
      uav_xPoint2: dirPoints.length === 0 ? 0 : dirPoints[1].x,
      uav_yPoint1: dirPoints.length === 0 ? 0 : dirPoints[0].y,
      uav_yPoint2: dirPoints.length === 0 ? 0 : dirPoints[1].y,
    },
  });

  const { nextStep } = useWizard();
  const { onSetErrorMessage } = useUiSlice();

  const onSubmit = (_data: FieldValues, event: React.FormEvent<HTMLFormElement>) => {
    const id = (event.nativeEvent as SubmitEvent).submitter?.id;
    if (id === 'solve-pixelsize') {
      event.preventDefault();
      onGetUavTransformationMatrix();
      return;
    }
    nextStep();
  };

  const onError = (error: FieldValues, event: React.FormEvent<HTMLFormElement>) => {
    if (event === undefined) return;

    onSetErrorMessage(error);
  };

  const onChangeExtraFields = () => {
    onUpdatePixelSize({ extraFields: true });
  };

  useEffect(() => {
    methods.reset({
      uav_LINE_LENGTH: formatNumberTo2Decimals(rwLength),
      uav_PIXEL_SIZE: formatNumberToPrecision4(size),
      uav_eastPoint1: rwPoints[0].x,
      uav_eastPoint2: rwPoints[1].x,
      uav_northPoint1: rwPoints[0].y,
      uav_northPoint2: rwPoints[1].y,
      uav_xPoint1: dirPoints.length === 0 ? 0 : dirPoints[0].x,
      uav_xPoint2: dirPoints.length === 0 ? 0 : dirPoints[1].x,
      uav_yPoint1: dirPoints.length === 0 ? 0 : dirPoints[0].y,
      uav_yPoint2: dirPoints.length === 0 ? 0 : dirPoints[1].y,
    });
  }, [dirPoints, rwPoints, size, rwLength, methods]);

  return (
    <div className="regular-page">
      <div className="media-container">
        <ImageUav/>
        <Error />
      </div>
      <div className="form-container">
        <Progress />
        <FormProvider {...methods}>
          <FormUav onSubmit={methods.handleSubmit(onSubmit, onError)} onError={onError} />
        </FormProvider>
        <ButtonLock
          footerElementID="span-footer"
          headerElementID="uav-header"
          disabled={dirPoints.length === 0}
          localExtraFields={extraFields}
          localSetExtraFields={onChangeExtraFields}
        />
        <WizardButtons canFollow={solution?.orthoImage !== undefined} formId="form-pixel-size" />
      </div>
    </div>
  );
};
