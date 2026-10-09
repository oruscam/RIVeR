import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import {
  Carousel,
  ModeHint,
  StepAlertList,
  Toast,
  FocusOverlay,
  ImageOblique,
  WizardButtons,
} from '../components';
import { FormOblique } from '../components/Forms';
import {
  useDataSlice,
  useGlobalSlice,
  useObliqueSlice,
  useProjectSlice,
  useUiSlice,
  useFieldImage,
} from '../hooks';
import { useWizard } from 'react-use-wizard';
import { useEffect, useMemo, useState } from 'react';
import { handleDragLeave, handleDragOver } from '../helpers';
import { Point } from '../types';
import { FormHeader } from '../components/Forms/Components';
import { useTranslation } from 'react-i18next';
import { AdvancedToggle } from '../components/AdvancedToggle';
import { StabilizationViewControl } from '../components/StabilizationViewControl';
import { UNIT_CONVERSIONS } from '../constants/constants';

const createDefaultState = (distances: any, coordinates: Point[], rwCoordinates: Point[], unitSistem?: string) => {
  // The store keeps distances and real-world coords in SI (m); the form displays
  // the user's chosen unit. Pixel coords (x/y of `coordinates`) are never converted.
  const toDisplay = (value: number) => (unitSistem === 'imperial' ? value * UNIT_CONVERSIONS.M_TO_FT : value);

  const defaultValues = {
    distance12: toDisplay(distances.d12).toFixed(2),
    distance23: toDisplay(distances.d23).toFixed(2),
    distance34: toDisplay(distances.d34).toFixed(2),
    distance41: toDisplay(distances.d41).toFixed(2),
    distance13: toDisplay(distances.d13).toFixed(2),
    distance24: toDisplay(distances.d24).toFixed(2),
    oblique_xPoint1: coordinates[0].x.toFixed(2),
    oblique_yPoint1: coordinates[0].y.toFixed(2),
    oblique_xPoint2: coordinates[1].x.toFixed(2),
    oblique_yPoint2: coordinates[1].y.toFixed(2),
    oblique_xPoint3: coordinates[2].x.toFixed(2),
    oblique_yPoint3: coordinates[2].y.toFixed(2),
    oblique_xPoint4: coordinates[3].x.toFixed(2),
    oblique_yPoint4: coordinates[3].y.toFixed(2),
    oblique_eastPoint1: toDisplay(rwCoordinates[0].x).toFixed(2),
    oblique_northPoint1: toDisplay(rwCoordinates[0].y).toFixed(2),
    oblique_eastPoint2: toDisplay(rwCoordinates[1].x).toFixed(2),
    oblique_northPoint2: toDisplay(rwCoordinates[1].y).toFixed(2),
    oblique_eastPoint3: toDisplay(rwCoordinates[2].x).toFixed(2),
    oblique_northPoint3: toDisplay(rwCoordinates[2].y).toFixed(2),
    oblique_eastPoint4: toDisplay(rwCoordinates[3].x).toFixed(2),
    oblique_northPoint4: toDisplay(rwCoordinates[3].y).toFixed(2),
  };

  return defaultValues;
};

export const Oblique = () => {
  const {
    solution,
    distances,
    coordinates,
    rwCoordinates,
    extraFields,
    drawPoints,
    isDraggingPoint,
    onChangeExtraFields,
    onGetObliqueTransformationMatrix,
    onGetDistances,
    isDefaultCoordinates,
  } = useObliqueSlice();
  const { isBackendWorking } = useGlobalSlice();
  const { projectDetails, projectDirectory, video } = useProjectSlice();
  const { onAddStepAlert, onClearStepAlert, onSetModeHint, onClearModeHint } = useUiSlice();
  const { nextStep } = useWizard();
  const { t } = useTranslation();
  const { images } = useDataSlice();

  const [dragOver, setDragOver] = useState<boolean>(false);
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

  // Undefined while the check is being painted with the theme's ramp: the
  // canvas keeps a frame up for that instant.
  const stabilizationSrc = useFieldImage(showStabilization ? sanityCheckPath : undefined);

  const activeImageSrc = showStabilization
    ? stabilizationSrc
    : images.paths.length > 0
      ? images.paths[activeFrame]
      : undefined;

  const methods = useForm({
    defaultValues: createDefaultState(distances, coordinates, rwCoordinates, projectDetails.unitSistem),
  });

  const onSubmit = () => {
    onClearStepAlert('oblique-form-error');
    nextStep();
  };

  const onError = (errors: FieldValues) => {
    const messages = Object.values(errors)
      .map((value) => (value as { message?: string })?.message)
      .filter((message): message is string => Boolean(message));
    onAddStepAlert('oblique-form-error', 'error', messages.join(' '));
  };

  const onClickSolveButton = () => {
    onClearStepAlert('oblique-solve');
    onGetObliqueTransformationMatrix(methods.getValues()).catch((error) =>
      onAddStepAlert('oblique-solve', 'error', error.message)
    );
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const path = window.webUtils.getPathForFile(file);

      onClearStepAlert('oblique-import-distances');
      onGetDistances(path).catch((error) => onAddStepAlert('oblique-import-distances', 'error', error.message));
    }
  };

  useEffect(() => {
    methods.reset(createDefaultState(distances, coordinates, rwCoordinates, projectDetails.unitSistem));
  }, [distances, methods, coordinates, rwCoordinates, projectDetails.unitSistem]);

  // Persistent yellow "drawing/modifying points" status while the user is placing the
  // control-points square or dragging an already-placed pin, same behavior as the
  // FocusOverlay dimming above. `drawPoints` alone stays true even after the square is
  // drawn (the button toggles back only on a manual click), so `isDefaultCoordinates` is
  // what actually marks the active drawing session; it takes priority over isDraggingPoint
  // since dragging the square's corner during the initial draw sets both.
  useEffect(() => {
    if (drawPoints && isDefaultCoordinates) {
      onSetModeHint(t('ControlPoints.drawingPointsWarning', { defaultValue: 'Drawing points' }));
      return () => onClearModeHint();
    }

    if (isDraggingPoint) {
      onSetModeHint(t('ControlPoints.modifyingPointsWarning', { defaultValue: 'Modifying points' }));
      return () => onClearModeHint();
    }

    onClearModeHint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawPoints, isDefaultCoordinates, isDraggingPoint]);

  return (
    <div className="regular-page">
      <div className="media-container">
        <ImageOblique imageSrc={activeImageSrc} />
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
      <div
        className={`form-container ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(event) => handleDragOver(event, setDragOver)}
        onDragLeave={(event) => handleDragLeave(event, setDragOver, false)}
        onDrop={handleDrop}
      >
        <FormHeader title={t('ControlPoints.title')} showSections={false} />
        <StepAlertList />

        <FormProvider {...methods}>
          <FormOblique onSubmit={methods.handleSubmit(onSubmit, onError)} onError={onError} />
        </FormProvider>

        <div className="footer">
          <div className="processing-run">
            <button
              type="button"
              className="btn btn-lg btn-primary"
              id="solve-oblique"
              disabled={isDefaultCoordinates || isBackendWorking}
              onClick={onClickSolveButton}
            >
              {t('Commons.solve')}
            </button>
          </div>
          <AdvancedToggle
            footerElementID="span-footer"
            headerElementID="draw-coordinates"
            disabled={coordinates[0].x === 0}
            localExtraFields={extraFields}
            setLocalExtraFields={onChangeExtraFields}
          />
          <WizardButtons formId="form-control-points" canFollow={solution !== null} />
        </div>
        <FocusOverlay active={(drawPoints && isDefaultCoordinates) || isDraggingPoint} />
      </div>
      <Toast />
    </div>
  );
};
