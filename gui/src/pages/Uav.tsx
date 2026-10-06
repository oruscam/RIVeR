import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import { useWizard } from 'react-use-wizard';
import { FormUav } from '../components/Forms/index';
import { WizardButtons, ModeHint, StepAlertList, Toast, FocusOverlay, Carousel } from '../components/index';
import { useDataSlice, useGlobalSlice, useProjectSlice, useUavSlice, useUiSlice } from '../hooks/index';
import { UNIT_CONVERSIONS } from '../constants/constants';

import './pages.css';
import { useEffect, useMemo, useState } from 'react';
import { formatNumberTo2Decimals, formatNumberToPrecision4 } from '../helpers/adapterNumbers.js';
import { FormHeader } from '../components/Forms/Components/FormHeader.js';
import { useTranslation } from 'react-i18next';
import { Point } from '../types/index.js';
import { ImageUavNew } from '../components/ImageUavNew.js';
import { AdvancedToggle } from '../components/AdvancedToggle';
import { StabilizationViewControl } from '../components/StabilizationViewControl';

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
    drawLine,
    isDraggingPoint,
    onGetUavTransformationMatrix,
    onUpdatePixelSize,
  } = useUavSlice();
  const { t } = useTranslation();
  const { isBackendWorking } = useGlobalSlice();
  const { projectDetails, projectDirectory, video } = useProjectSlice();
  const { unitSistem } = projectDetails;
  const { images } = useDataSlice();
  const [activeFrame, setActiveFrame] = useState<number>(0);
  const [showStabilization, setShowStabilization] = useState<boolean>(false);

  let filePrefix = import.meta.env.VITE_FILE_PREFIX;
  filePrefix = filePrefix === undefined ? '' : filePrefix;

  // sanity_check.jpg is overwritten in place on every re-extraction, so bust the cache
  // whenever a fresh set of frames arrives.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sanityCheckCacheBust = useMemo(() => Date.now(), [images.paths]);
  const sanityCheckPath = `${filePrefix}${projectDirectory}/sanity_check.jpg?t=${sanityCheckCacheBust}`;
  const canToggleStabilization = video.parameters.committedStabilization;

  const activeImageSrc = showStabilization
    ? sanityCheckPath
    : images.paths.length > 0
      ? images.paths[activeFrame]
      : undefined;

  // * Estado inicial del formulario
  const methods = useForm({ defaultValues: createDefaultState(dirPoints, rwPoints, rwLength, size, unitSistem) });

  const { nextStep } = useWizard();
  const { onSetModeHint, onClearModeHint, onAddStepAlert, onClearStepAlert } = useUiSlice();

  const onSubmit = () => {
    onClearStepAlert('uav-form-error');
    console.log(rwPoints);
    nextStep();
  };

  const onError = (errors: FieldValues, event: React.FormEvent<HTMLFormElement>) => {
    if (event === undefined) return;

    const messages = Object.values(errors)
      .map((value) => (value as { message?: string })?.message)
      .filter((message): message is string => Boolean(message));
    onAddStepAlert('uav-form-error', 'error', messages.join(' '));
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

  // Persistent yellow "drawing/modifying line" status while the pixel-size line is being
  // drawn or an already-drawn endpoint pin is being dragged, same behavior as the
  // cross-section direction warning. `drawLine` takes priority since it's also true while
  // the initial draw's own drag is in progress (isDraggingPoint is true then too).
  useEffect(() => {
    if (drawLine) {
      onSetModeHint(t('PixelSize.drawingLineWarning', { defaultValue: 'Drawing line' }));
      return () => onClearModeHint();
    }

    if (isDraggingPoint) {
      onSetModeHint(t('PixelSize.modifyingLineWarning', { defaultValue: 'Modifying line' }));
      return () => onClearModeHint();
    }

    onClearModeHint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawLine, isDraggingPoint]);

  return (
    <div className="regular-page">
      <div className="media-container">
        <ImageUavNew imageSrc={activeImageSrc} />
        {canToggleStabilization && (
          <StabilizationViewControl
            showStabilization={showStabilization}
            onSetShowStabilization={setShowStabilization}
          />
        )}
        {images.paths.length > 0 && (
          <Carousel
            images={images.paths}
            active={activeFrame}
            setActiveImage={setActiveFrame}
            showMedian={showStabilization}
            setShowMedian={setShowStabilization}
            mode="select"
          />
        )}
        <ModeHint />
      </div>
      <div className="form-container">
        <FormHeader title={t('PixelSize.title')} showSections={false} />
        <StepAlertList />

        <FormProvider {...methods}>
          <FormUav onSubmit={methods.handleSubmit(onSubmit, onError)} onError={onError} />
        </FormProvider>

        <div className="footer">
          <div className="processing-run">
            <button
              type="button"
              className="btn btn-lg btn-primary"
              id="solve-pixelsize"
              disabled={dirPoints.length !== 2 || rwLength === 0 || isBackendWorking || solution !== null}
              onClick={onClickSolveButton}
            >
              {t('Commons.solve')}
            </button>
          </div>
          <AdvancedToggle
            footerElementID="span-footer"
            headerElementID="uav-header"
            disabled={dirPoints.length === 0}
            localExtraFields={extraFields}
            setLocalExtraFields={onChangeExtraFields}
          />
          <WizardButtons canFollow={solution?.orthoImage !== undefined} formId="form-pixel-size" />
        </div>
        <FocusOverlay active={drawLine || isDraggingPoint} />
      </div>
      <Toast />
    </div>
  );
};
