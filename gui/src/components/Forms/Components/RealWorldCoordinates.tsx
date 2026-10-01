import { Fragment } from 'react';
import { useFormContext } from 'react-hook-form';
import { getLabelStyle, getPointNames } from '../../../helpers/index';
import { useProjectSlice, useUiSlice } from '../../../hooks/index.ts';
import { useTranslation } from 'react-i18next';
import { UNITS } from '../../../constants/constants';
import { FieldError } from '../../index';

export const RealWorldCoordinates = ({
  section,
  step,
  onSetRealWorld,
  showUnitLabel = false,
}: {
  section?: string;
  step: number;
  onSetRealWorld: (value: number, key: string) => void;
  showUnitLabel?: boolean;
}) => {
  const { register, resetField } = useFormContext();
  const { onSetFieldError, onClearFieldError } = useUiSlice();
  const { type, projectDetails } = useProjectSlice();
  const unitLabel = projectDetails.unitSistem === 'si' ? UNITS.SI.LONGITUDE : UNITS.IMPERIAL.LONGITUDE;

  const modeName = section ? 'CrossSections' : 'PixelSize';

  const fields = type === 'oblique' && step === 3 ? 8 : 4;

  const pointsNames = getPointNames('rw', fields);

  // Scope the field-error key per section so switching tabs doesn't show a
  // stale error from a different section under the same-named field. Uav/Oblique
  // render only one set of coordinates (no `section`), so the key stays bare.
  const fieldErrorName = (id: string) => (section ? `${section}_${id}` : id);

  const { t } = useTranslation();

  const handleInputField = (
    event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>,
    nextFieldId: string
  ) => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key === 'Enter' || event.type === 'blur') {
      event.preventDefault();
      if (event.type !== 'blur') {
        document.getElementById(nextFieldId)?.focus();
      }
      const value = parseFloat((event.target as HTMLInputElement).value);
      const target = event.target as HTMLInputElement;

      if (isNaN(value)) {
        onSetFieldError(fieldErrorName(target.id), `The value ${target.id} must be a number`);
        const fieldName = `${modeName}_${target.id}`;
        resetField(fieldName);
        return;
      }

      onClearFieldError(fieldErrorName(target.id));
      for (let i = 0; i < fields; i++) {
        if (target.id === pointsNames[i]) {
          let position = (i % 2 === 0 ? 'x' : 'y') + `${Math.ceil((i + 1) / 2)}`;
          onSetRealWorld(value, position.toString());
          break;
        }
      }
    }
  };

  return (
    <>
      <p className="panel-group" id="REAL_WORLD">
        {t(`${modeName}.RealWorld.title`)}
      </p>
      {pointsNames.map((name, i) => {
        const style = getLabelStyle(type, step, fields, i);
        const prefix = step === 3 ? type : section;
        const next = `${pointsNames[i === fields - 1 ? i : i + 1]}`;
        return (
          <Fragment key={i}>
            <div className="field-row">
              <label className="field-row-label point-label" htmlFor={name}>
                {style && <span className={`point-dot point-dot-${style}`} aria-hidden="true" />}
                {t(`${modeName}.RealWorld.${name}`)}
              </label>
              <span className="field-with-unit">
                <input
                  type="number"
                  step="any"
                  className="field field-coord"
                  id={`${name}`}
                  {...register(`${prefix}_${name}`)}
                  onKeyDown={(event) => handleInputField(event, next)}
                  onBlur={(event) => handleInputField(event, next)}
                />
                {showUnitLabel && <span className="field-unit">{unitLabel}</span>}
              </span>
            </div>
            <FieldError name={fieldErrorName(pointsNames[i])} />
          </Fragment>
        );
      })}
    </>
  );
};
