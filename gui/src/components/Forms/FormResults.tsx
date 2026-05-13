import { useFormContext } from 'react-hook-form';
import { useDataSlice, useProjectSlice, useSectionSlice, useUiSlice } from '../../hooks';
import { AllInOne } from '../Graphs/AllInOne';
import { Grid } from '../index';
import { useTranslation } from 'react-i18next';
import { LuWand2 } from 'react-icons/lu';
import { UNIT_CONVERSIONS, UNITS } from '../../constants/constants';

interface FormResultProps {
  onSubmit: (data: React.SyntheticEvent<HTMLFormElement, Event>) => void;
  index: number;
}

export const FormResults = ({ onSubmit, index }: FormResultProps) => {
  const { register, setValue } = useFormContext();
  const { sections, activeSection, onUpdateSection } = useSectionSlice();
  const { name, data, numStations, alpha, artificialSeeding } = sections[activeSection];
  const { isBackendWorking } = useDataSlice();
  const { onSetErrorMessage } = useUiSlice();
  const { projectDetails } = useProjectSlice();

  const { t } = useTranslation();

  const isImperial = projectDetails.unitSistem === 'imperial';
  const flowUnit = isImperial ? UNITS.IMPERIAL.FLOW : UNITS.SI.FLOW;
  const displayQ = data?.total_Q != null
    ? isImperial
      ? (data.total_Q * UNIT_CONVERSIONS.M3_TO_FT3).toFixed(3)
      : data.total_Q
    : null;

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = e.target.id;
    if (id === 'artificial-seeding') {
      onUpdateSection({ artificialSeeding: 'artificial-seeding' }, undefined);
    }
  };

  const handleOnChangeInput = (
    event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>
  ) => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key === 'Enter' || event.type === 'blur') {
      event.preventDefault();
      const value = parseFloat((event.target as HTMLInputElement).value);
      const id = (event.target as HTMLInputElement).id;
      switch (id) {
        case 'stations-number':
          if (isNaN(value) === false && value >= 3) {
            if (value !== numStations) {
              onUpdateSection({ numStations: value }, undefined);
            }
          } else {
            setValue(`${name}_STATIONS_NUMBER`, numStations);
            if (typeof value === 'number') {
              onSetErrorMessage('The number of stations must be greater than 2');
            }
          }
          break;
        case 'alpha':
          if (value !== 0 && value !== alpha && isNaN(value) === false) {
            onUpdateSection({ alpha: value }, undefined);
          } else {
            setValue(`${name}_ALPHA`, alpha);
          }
          onUpdateSection({ alpha: value }, undefined);
          break;

        default:
          break;
      }
    }
  };

  return (
    <div id="form-section-div" className={activeSection !== index ? 'hidden' : 'wrapper'}>
      <form
        className={`${isBackendWorking ? 'disabled' : ''}`}
        onSubmit={onSubmit}
        id="form-result"
      >
        <div id="result-info">
          <p id="result-number">{displayQ} <span style={{ fontSize: '0.45em', opacity: 0.7 }}>{flowUnit}</span></p>
          <div>
            <p id="result-measured">
              {' '}
              {((data?.measured_Q ?? 0) * 100).toFixed(1)}% {t('Results.measured')}
            </p>
            <p>
              {' '}
              {((data?.interpolated_Q ?? 0) * 100).toFixed(1)}% {t('Results.interpolated')}{' '}
            </p>
          </div>
        </div>

        <div className="input-container-2 mt-2">
          <label className="read-only me-1" htmlFor="alpha">
            {' '}
            {t('Results.alpha')}{' '}
          </label>
          <div className="input-field-container">
            <input
              className="input-field"
              id="alpha"
              type="number"
              step="any"
              {...register(`${name}_ALPHA`)}
              onKeyDown={handleOnChangeInput}
              onBlur={handleOnChangeInput}
            ></input>
          </div>
        </div>

        <div className="mt-2 all-in-one-container" style={{ width: '100%', height: '720px' }}>
          <AllInOne isReport={false} height={700} />
        </div>

        <div className="switch-container-results">
          <h3 className="field-title me-2 mt-3"> {t('Results.stationNumber')}</h3>
          <input
            className="input-field-little mt-3"
            type="number"
            {...register(`${name}_STATIONS_NUMBER`)}
            id="stations-number"
            onKeyDown={handleOnChangeInput}
            onBlur={handleOnChangeInput}
          ></input>
        </div>

        <div className="switch-container-results mt-2">
          <h3 className="field-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LuWand2 size={15} />
            {t('Processing.artificialSeeding')}
          </h3>
          <label className="switch">
            <input
              type="checkbox"
              {...register(`${name}_ARTIFICIAL_SEEDING`)}
              id="artificial-seeding"
              onChange={handleOnChange}
              defaultChecked={artificialSeeding}
            />
            <span className="slider"></span>
          </label>
        </div>

        <Grid></Grid>
      </form>
    </div>
  );
};
