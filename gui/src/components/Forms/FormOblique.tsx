import { useFormContext } from 'react-hook-form';
import { useGlobalSlice, useObliqueSlice, useUiSlice } from '../../hooks';
import { FormChild  } from '../../types';
import { getValidationRules } from '../../helpers';
import { useTranslation } from 'react-i18next';
import { OrthoImage } from '../Graphs';
import { DropHereText } from './Components/DropHereText';
import { HardModeOblique } from './Components';
import { KeyboardEvent, FocusEvent } from 'react';

const distancesLabels = ['1-2', '2-3', '3-4', '4-1', '1-3', '2-4'];
const distancesID = ['12', '23', '34', '41', '13', '24'];

export const FormOblique= ({ onSubmit, onError }: FormChild) => {
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

  const { t } = useTranslation();

  const { register, getValues } = useFormContext();

  const validationRules = getValidationRules(t, getValues, 0);

  const handleOnClickImportDistances = () => {
    onGetDistances().catch((error) => onSetErrorMessage(error.message));
  };

  const handleInputBehavior = (
    event: KeyboardEvent<HTMLInputElement> | FocusEvent<HTMLInputElement, Element>,
    nextID: number 
  ): void => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key === 'Enter'){
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
    <>
      <h1 className="form-title"> {t('ControlPoints.title')} </h1>
      <form
        onSubmit={onSubmit}
        onError={onError}
        id="form-control-points"
        className={`form-scroll ${isBackendWorking ? 'disabled' : ''}`}
      >
        <div className="form-base-2">
          <div className="input-container-2">
            <button
              className={`wizard-button button-rectification me-1 ${drawPoints ? 'wizard-button-active' : ''}`}
              id="draw-coordinates"
              type="button"
              onClick={onSetDrawPoints}
            >
              {' '}
              {t('ControlPoints.drawPoints')}{' '}
            </button>
            <button
              className={`wizard-button button-rectification ${isDistancesLoaded ? 'wizard-button-active' : ''}`}
              id="import-distances"
              type="button"
              onClick={handleOnClickImportDistances}
              disabled={drawPoints === false}
            >
              {' '}
              {t('ControlPoints.importDistances')}{' '}
            </button>
          </div>

          <DropHereText text={t('Commons.dropHereText')} show={isDistancesLoaded === false} />

          {
            distancesLabels.map((label, i) => {
              return (
                <div className={`input-container-2 mt-${i > 0 ? 1 : 2}`} key={i}>
                  <label className="read-only-oblique me-1" id={'D' + distancesID[i]}>
                    {label}
                  </label>
                  <input
                    className='input-field-oblique'
                    type='number'
                    id={'distance' + distancesID[i]}
                    disabled={isDefaultCoordinates}
                    {...register('distance' + distancesID[i], validationRules.distances)}
                    step={0.01}
                    onKeyDown={(event) => handleInputBehavior(event, i + 1)}
                    onBlur={(event) => handleInputBehavior(event, i + 1)}
                  />
                </div>
              )
            })
          }
          
            
          {solution && <OrthoImage solution={solution} coordinates={rwCoordinates} />}

          {solution === null && <div className='mb-2 mt-1' id='ortho-image-fake-solution'/>}
        
          
          <button
            className="wizard-button form-button solver-button"
            id="solve-oblique"
            disabled={isDefaultCoordinates}
          >
            {t('Commons.solve')}
          </button>

          <HardModeOblique extraFields={extraFields} />
        </div>
      </form>
    </>
  );
};