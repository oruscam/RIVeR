import { useFormContext } from 'react-hook-form';
import { useAutoShrinkFont, useGlobalSlice, useObliqueSlice, useUiSlice, useProjectSlice } from '../../hooks';
import { FormChild } from '../../types';
import { getValidationRules } from '../../helpers';
import { useTranslation } from 'react-i18next';
import { OrthoImage } from '../Graphs';
import { DropHereText } from './Components/DropHereText';
import { HardModeOblique } from './Components';
import { KeyboardEvent, FocusEvent } from 'react';
import { UNITS } from '../../constants/constants';

const distancesLabels = ['1-2', '2-3', '3-4', '4-1', '1-3', '2-4'];
const distancesID = ['12', '23', '34', '41', '13', '24'];

export const FormOblique = ({ onSubmit, onError }: FormChild) => {
  const {
    drawPoints,
    isDefaultCoordinates,
    isDistancesLoaded,
    solution,
    rwCoordinates,
    extraFields,
    onSetDrawPoints,
    onGetDistances,
  } = useObliqueSlice();
  const { isBackendWorking } = useGlobalSlice();

  const { onSetErrorMessage } = useUiSlice();

  const { projectDetails } = useProjectSlice();

  const { t } = useTranslation();

  const drawPointsButtonRef = useAutoShrinkFont<HTMLButtonElement>([t]);
  const importDistancesButtonRef = useAutoShrinkFont<HTMLButtonElement>([t]);

  const { register, getValues } = useFormContext();

  const validationRules = getValidationRules(t, getValues, 0);

  const handleOnClickImportDistances = () => {
    onGetDistances().catch((error) => onSetErrorMessage(error.message));
  };

  const handleInputBehavior = (
    event: KeyboardEvent<HTMLInputElement> | FocusEvent<HTMLInputElement, Element>,
    nextID: number
  ): void => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key === 'Enter') {
      event.preventDefault();
      let nextElement: string = '';
      if (nextID === 6) {
        nextElement = 'solve-oblique';
      } else {
        nextElement = 'distance' + distancesID[nextID];
      }

      document.getElementById(nextElement)?.focus();
    }
  };

  return (
    <div className="body">
      <div className="wraper">
        <form
          onSubmit={onSubmit}
          onError={onError}
          id="form-control-points"
          className={`${isBackendWorking ? 'disabled' : ''}`}
        >
          <div className="input-container-2">
            <button
              ref={drawPointsButtonRef}
              className={`wizard-button form-button me-1 ${drawPoints ? 'wizard-button-active' : ''}`}
              id="draw-coordinates"
              type="button"
              onClick={onSetDrawPoints}
            >
              {' '}
              {t('ControlPoints.drawPoints')}{' '}
            </button>
            <span className="read-only bg-transparent" />
          </div>
          <div className="input-container-2 mt-1">
            <button
              ref={importDistancesButtonRef}
              className={`wizard-button form-button me-1 ${isDistancesLoaded ? 'wizard-button-active' : ''}`}
              id="import-distances"
              type="button"
              onClick={handleOnClickImportDistances}
              disabled={drawPoints === false}
            >
              {' '}
              {t('ControlPoints.importDistances')}{' '}
            </button>
            <span className="read-only bg-transparent" />
          </div>

          <DropHereText text={t('Commons.dropHereText')} show={isDistancesLoaded === false} />

          {distancesLabels.map((label, i) => {
            return (
              <div className={`input-container-2 mt-${i > 0 ? 1 : 2}`} key={i}>
                <label className="read-only me-1" id={'D' + distancesID[i]}>
                  {label}
                </label>
                <div className="input-field-container">
                  <input
                    className="input-field-oblique"
                    type="number"
                    id={'distance' + distancesID[i]}
                    disabled={isDefaultCoordinates}
                    {...register('distance' + distancesID[i], validationRules.distances)}
                    step={0.01}
                    onKeyDown={(event) => handleInputBehavior(event, i + 1)}
                    onBlur={(event) => handleInputBehavior(event, i + 1)}
                  />
                  <span className="unit-label">
                    {projectDetails.unitSistem === 'si' ? UNITS.SI.LONGITUDE : UNITS.IMPERIAL.LONGITUDE}
                  </span>
                </div>
              </div>
            );
          })}

          {solution && <OrthoImage solution={solution} coordinates={rwCoordinates} />}

          {solution === null && <span className="mb-2 mt-1" />}

          <HardModeOblique extraFields={extraFields} />
        </form>
      </div>
    </div>
  );
};
