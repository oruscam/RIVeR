import { useFormContext } from 'react-hook-form';
import { useIpcamSlice, useProjectSlice, useSectionSlice, useUiSlice } from '../../hooks';
import { DropHereText, HardModeCrossSections } from './Components/index';
import { Bathimetry } from '../Graphs';
import { useTranslation } from 'react-i18next';
import { UNITS, UNIT_CONVERSIONS } from '../../constants/constants';
import { formatNumberTo2Decimals } from '../../helpers';
interface FormCrossSectionsProps {
  onSubmit: (data: React.SyntheticEvent<HTMLFormElement, Event>) => void;
  name: string;
  index: number;
}

export const FormCrossSections = ({ onSubmit, name, index }: FormCrossSectionsProps) => {
  const { register, setValue } = useFormContext();
  const { sections, activeSection, onUpdateSection, onGetBathimetry, transformationMatrix } = useSectionSlice();
  const { drawLine, bathimetry, extraFields, pixelSize } = sections[activeSection];
  const { onSetErrorMessage } = useUiSlice();
  const { type, projectDetails } = useProjectSlice();
  const { cameraSolution, zLimits: controlPointsZLimits } = useIpcamSlice();

  const { t } = useTranslation();

  const { yMax, yMin, xMin, x1Intersection, leftBank, xMax } = bathimetry;

  const isImperial = projectDetails.unitSistem === 'imperial';
  const toSI = (value: number) => (isImperial ? value * UNIT_CONVERSIONS.FT_TO_M : value);
  const toDisplay = (value: number | undefined) =>
    value === undefined ? value : isImperial ? value * UNIT_CONVERSIONS.M_TO_FT : value;

  const handleKeyDownBathLevel = (
    event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>,
    nextFieldId: string
  ) => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key === 'Enter' || event.type === 'blur') {
      event.preventDefault();

      const rawValue = parseFloat((event.target as HTMLInputElement).value);

      if (isNaN(rawValue)) return;

      const valueInMeters = toSI(rawValue);
      if (valueInMeters === bathimetry.level) return;

      if (yMax !== undefined && yMin !== undefined && valueInMeters <= yMax && valueInMeters >= yMin) {
        onUpdateSection({ level: valueInMeters }, cameraSolution?.cameraMatrix);
        document.getElementById(nextFieldId)?.focus();
      } else {
        setValue(`${name}_LEVEL`, formatNumberTo2Decimals(toDisplay(bathimetry.level)));
        onSetErrorMessage({
          Level: {
            type: 'error',
            message: t('CrossSections.Errors.levelError', {
              yMin: yMin !== undefined ? (toDisplay(yMin) as number).toFixed(2) : undefined,
              yMax: yMax !== undefined ? (toDisplay(yMax) as number).toFixed(2) : undefined,
            }),
          },
        });
      }
    }
  };

  const handleImportBath = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    // When clicking the button, if there is already a bathimetry, clear it
    if (bathimetry.path !== undefined) {
      onUpdateSection({ clearBathimetry: true }, undefined);
      return;
    }

    if (type === 'ipcam') {
      onGetBathimetry({
        cameraMatrix: cameraSolution?.cameraMatrix,
        zLimits: { min: yMin ?? 0, max: yMax ?? 0 },
        controlPointsZLimits,
        unitSistem: projectDetails.unitSistem,
      })
        // First error is when the bathimetry format is correct, but not the values
        .then((error) => {
          if (error?.message) {
            const message = 'CrossSections.Errors.' + error.message;
            const displayLevel =
              error?.value !== undefined ? (toDisplay(error.value) as number).toFixed(2) : error?.value;
            onSetErrorMessage({
              Bathimetry: {
                type: 'error',
                message: t(message, { level: displayLevel }),
              },
            });
          }
        })
        // Second error is when the bathimetry format is incorrect
        .catch((error) => onSetErrorMessage(error.message));
    } else {
      onGetBathimetry({ unitSistem: projectDetails.unitSistem }).catch((error) =>
        onSetErrorMessage(error.message)
      ); // Incorrect format
    }
  };

  const handleLeftBankInput = (
    event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>
  ) => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key === 'Enter' || event.type === 'blur') {
      event.preventDefault();
      const rawValue = parseFloat((event.target as HTMLInputElement).value);
      const valueInMeters = isNaN(rawValue) ? rawValue : toSI(rawValue);

      if (
        !isNaN(valueInMeters) &&
        (x1Intersection ?? 0) + valueInMeters >= (xMin ?? 0) &&
        (x1Intersection ?? 0) + valueInMeters <= (xMax ?? 0)
      ) {
        document.getElementById('wizard-next')?.focus();
        onUpdateSection({ leftBank: valueInMeters }, undefined);
      } else {
        onSetErrorMessage({
          LeftBank: {
            type: 'Error',
            message: t('CrossSections.Errors.leftBank'),
          },
        });
        setValue(`${name}_LEFT_BANK`, leftBank === undefined ? leftBank : toDisplay(leftBank));
      }
    }
  };
  return (
    <div id="form-section-div" className={activeSection !== index ? 'hidden' : ''}>
      <form onSubmit={onSubmit} id="form-cross-section">
        <span id={`${name}-HEADER`} />
        <span id={`${name}-form-cross-section-header`} />
        {type === 'ipcam' ? (
          <>
            <div className="input-container-2 mb-1">
              <input
                type="file"
                id={`${name}_CS_BATHIMETRY`}
                className="hidden-file-input"
                accept=".csv"
                {...register(`${name}_CS_BATHIMETRY`, {
                  validate: (value) => {
                    if (sections[index].bathimetry.path === '' && value.length === 0) {
                      return t('CrossSections.Errors.bathimetryIsRequired', { section_name: name });
                    }
                    return true;
                  },
                })}
              />
              <button
                className={`wizard-button form-button bathimetry-button mt-1 me-1 ${bathimetry.path ? 'wizard-button-active' : ''}`}
                onClick={handleImportBath}
                disabled={
                  transformationMatrix.length === 0 ? false : type === 'ipcam' ? false : pixelSize.rwLength === 0
                }
              >
                {' '}
                {t('CrossSections.importBath')}{' '}
              </button>
              <label className="read-only bg-transparent mt-1">
                {bathimetry.name !== '' ? bathimetry.name : ''}
              </label>
            </div>
            <div className="input-container-2">
              <button
                className={`wizard-button form-button me-1 ${drawLine ? 'wizard-button-active' : ''}`}
                type="button"
                id={`${name}-DRAW_LINE`}
                onClick={() => onUpdateSection({ drawLine: true }, undefined)}
                disabled={transformationMatrix.length === 0}
              >
                {' '}
                {t('CrossSections.drawLine')}{' '}
              </button>
              <span className="read-only bg-transparent"></span>
            </div>
          </>
        ) : (
          <>
            <div className="input-container-2">
              <button
                className={`wizard-button form-button me-1 ${drawLine ? 'wizard-button-active' : ''}`}
                type="button"
                id={`${name}-DRAW_LINE`}
                onClick={() => onUpdateSection({ drawLine: true }, undefined)}
                disabled={transformationMatrix.length === 0}
              >
                {' '}
                {t('CrossSections.drawLine')}{' '}
              </button>
              <span className="read-only bg-transparent"></span>
            </div>

            <div className="input-container-2 mt-1">
              <input
                type="file"
                id={`${name}_CS_BATHIMETRY`}
                className="hidden-file-input"
                {...register(`${name}_CS_BATHIMETRY`, {
                  validate: (value) => {
                    if (sections[index].bathimetry.path === '' && value.length === 0) {
                      return t('CrossSections.Errors.bathimetryIsRequired', { section_name: name });
                    }
                    return true;
                  },
                })}
              />
              <button
                className={`wizard-button form-button bathimetry-button me-1 ${bathimetry.path ? 'wizard-button-active' : ''}`}
                onClick={handleImportBath}
                disabled={
                  transformationMatrix.length === 0 ? false : type === 'ipcam' ? false : pixelSize.rwLength === 0
                }
              >
                {' '}
                {t('CrossSections.importBath')}{' '}
              </button>
              <label className="read-only bg-transparent">{bathimetry.name !== '' ? bathimetry.name : ''}</label>
            </div>
          </>
        )}

        <DropHereText text={t('Commons.dropHereText')} show={bathimetry.path === undefined} />

        <div className="input-container-2 mt-2 mb-1">
          <label className="read-only me-1" htmlFor="LEVEL">
            {t('CrossSections.level')}
          </label>
          <div className="input-field-container">
            <input
              type="number"
              step="any"
              className="input-field"
              {...register(`${name}_LEVEL`, {
                validate: () => bathimetry.level !== 0,
              })}
              id="LEVEL"
              onKeyDown={(event) => handleKeyDownBathLevel(event, 'left-bank-station-input')}
              onBlur={(event) => handleKeyDownBathLevel(event, 'left-bank-station-input')}
            />
            <span className="unit-label">
              {projectDetails.unitSistem === 'si' ? UNITS.SI.LONGITUDE : UNITS.IMPERIAL.LONGITUDE}
            </span>
          </div>
        </div>

        <div className="input-container-2 mb-1">
          <label className="read-only me-1" htmlFor="CS_LENGTH">
            {t('CrossSections.width')}
          </label>
          <div className="input-field-container">
            <input
              type="number"
              className="input-field-read-only"
              disabled={true}
              {...register(`${name}_CS_LENGTH`, {
                validate: (value) => value != 0 || t('CrossSections.Errors.rwLength', { section_name: name }),
              })}
              id="CS_LENGTH"
              readOnly={true}
            />
            <span className="unit-label">
              {projectDetails.unitSistem === 'si' ? UNITS.SI.LONGITUDE : UNITS.IMPERIAL.LONGITUDE}
            </span>
          </div>
        </div>

        <Bathimetry showLeftBank={true} />

        <div className="input-container-2 mb-4" id="left-bank-station-container">
          <label className="read-only me-1" htmlFor="left-bank-station-input" id="left-bank-station-label">
            {t('CrossSections.leftBankStation')}
          </label>
          <div className="input-field-container">
            <input
              type="number"
              className="input-field"
              step="any"
              id="left-bank-station-input"
              {...register(`${name}_LEFT_BANK`)}
              onKeyDown={handleLeftBankInput}
              onBlur={handleLeftBankInput}
            />
            <span className="unit-label">
              {projectDetails.unitSistem === 'si' ? UNITS.SI.LONGITUDE : UNITS.IMPERIAL.LONGITUDE}
            </span>
          </div>
        </div>

        <HardModeCrossSections extraFields={extraFields} name={name} />
      </form>
    </div>
  );
};
