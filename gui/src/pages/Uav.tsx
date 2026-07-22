import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import { useWizard } from 'react-use-wizard';
import { FormUav } from '../components/Forms/index';
import { WizardButtons, Error } from '../components/index';
import { useGlobalSlice, useProjectSlice, useUavSlice, useUiSlice } from '../hooks/index';
import { UNIT_CONVERSIONS } from '../constants/constants';

import './pages.css';
import { useEffect } from 'react';
import { formatNumberTo2Decimals, formatNumberToPrecision4 } from '../helpers/adapterNumbers.js';
import { FormHeader } from '../components/Forms/Components/FormHeader.js';
import { useTranslation } from 'react-i18next';
import { Point } from '../types/index.js';
import { ImageUavNew } from '../components/ImageUavNew.js';
import { LockBtn } from '../components/CustomIcons/LockBtn.js';

const createDefaultState = (
  dirPoints: Point[],
  rwPoints: Point[],
  rwLength: number,
  size: number,
  unitSistem: string
) => {
  const isImperial = unitSistem === 'imperial';
  // The store always holds SI values (metres). Convert to feet for display only.
  const displayLength = isImperial ? rwLength * UNIT_CONVERSIONS.M_TO_FT : rwLength;
  const displaySize = isImperial ? size * UNIT_CONVERSIONS.M_TO_FT : size;

  const defaultValues = {
    uav_lineLength: formatNumberTo2Decimals(displayLength),
    uav_pixelSize: formatNumberToPrecision4(displaySize),
    uav_eastPoint1: isImperial ? rwPoints[0].x * UNIT_CONVERSIONS.M_TO_FT : rwPoints[0].x,
    uav_eastPoint2: isImperial ? rwPoints[1].x * UNIT_CONVERSIONS.M_TO_FT : rwPoints[1].x,
    uav_northPoint1: isImperial ? rwPoints[0].y * UNIT_CONVERSIONS.M_TO_FT : rwPoints[0].y,
    uav_northPoint2: isImperial ? rwPoints[1].y * UNIT_CONVERSIONS.M_TO_FT : rwPoints[1].y,
    uav_xPoint1: dirPoints.length === 0 ? 0 : dirPoints[0].x,
    uav_xPoint2: dirPoints.length === 0 ? 0 : dirPoints[1].x,
    uav_yPoint1: dirPoints.length === 0 ? 0 : dirPoints[0].y,
    uav_yPoint2: dirPoints.length === 0 ? 0 : dirPoints[1].y,
  };

  return defaultValues;
};

export const Uav = () => {
  const {
    dirPoints,
    rwPoints,
    size,
    rwLength,
    solution,
    extraFields,
    onGetUavTransformationMatrix,
    onUpdatePixelSize,
  } = useUavSlice();
  const { t } = useTranslation();
  const { isBackendWorking } = useGlobalSlice();
  const { projectDetails } = useProjectSlice();
  const { unitSistem } = projectDetails;

  // * Estado inicial del formulario
  const methods = useForm({ defaultValues: createDefaultState(dirPoints, rwPoints, rwLength, size, unitSistem) });

  const { nextStep } = useWizard();
  const { onSetErrorMessage } = useUiSlice();

  const onSubmit = () => {
    console.log(rwPoints);
    nextStep();
  };

  const onError = (error: FieldValues, event: React.FormEvent<HTMLFormElement>) => {
    if (event === undefined) return;

    onSetErrorMessage(error);
  };

  const onClickSolveButton = () => {
    onGetUavTransformationMatrix();
  };

  const onChangeExtraFields = () => {
    onUpdatePixelSize({ extraFields: true });
  };

  useEffect(() => {
    methods.reset(createDefaultState(dirPoints, rwPoints, rwLength, size, unitSistem));
  }, [dirPoints, rwPoints, size, rwLength, unitSistem, methods]);

  return (
    <div className="regular-page">
      <div className="media-container">
        <ImageUavNew />
        <Error />
      </div>
      <div className="form-container">
        <FormHeader title={t('PixelSize.title')} showSections={false} />

        <FormProvider {...methods}>
          <FormUav onSubmit={methods.handleSubmit(onSubmit, onError)} onError={onError} />
        </FormProvider>

        <div className="footer">
          <button
            className="wizard-button form-button solver-button"
            id="solve-pixelsize"
            disabled={dirPoints.length !== 2 || rwLength === 0 || isBackendWorking || solution !== null}
            onClick={onClickSolveButton}
          >
            {t('Commons.solve')}
          </button>
          <LockBtn
            footerElementID="span-footer"
            headerElementID="uav-header"
            disabled={dirPoints.length === 0}
            localExtraFields={extraFields}
            setLocalExtraFields={onChangeExtraFields}
          />
          <WizardButtons canFollow={solution?.orthoImage !== undefined} formId="form-pixel-size" />
        </div>
      </div>
    </div>
  );
};
