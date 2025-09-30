import { useFormContext } from 'react-hook-form';
import { getLabelStyle, getPointNames } from '../../../helpers/index';
import { useProjectSlice, useUiSlice } from '../../../hooks/index.ts';
import { useTranslation } from 'react-i18next';

export const RealWorldCoordinates = ({
  section,
  step,
  onSetRealWorld,
}: {
  section?: string;
  step: number
  onSetRealWorld: (value: number, key: string) => void;
}) => {
  const { register, resetField } = useFormContext();
  const { onSetErrorMessage } = useUiSlice();
  const { type } = useProjectSlice()

  const modeName = section ? 'CrossSections' : 'PixelSize';

  const fields = type === 'oblique' && step === 3 ? 8 : 4;

  const pointsNames = getPointNames('rw', fields);

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
        const error = {
          [target.id]: {
            type: 'required',
            message: `The value ${target.id} must be a number`,
          },
        };

        onSetErrorMessage(error);
        const fieldName = `${modeName}_${target.id}`;
        resetField(fieldName);
        return;
      }

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
      <h2 className="form-subtitle mt-5 only-one-item" id="REAL_WORLD">
        {' '}
        {t(`${modeName}.RealWorld.title`)}
      </h2>

      {pointsNames.map((name, i) => {
        const style = getLabelStyle(type, step, fields, i)
        const prefix = step === 3 ? type : section;

        return (
          <div className='input-container-2 mt-1' key={i}>
            <label className={`read-only me-1 ${style}`}>
              {' '}
              {t(`${modeName}.RealWorld.${name}`)}{' '}
            </label>
            <input
              type="number"
              step="any"
              className="input-field"
              id={`${name}`}
              {...register(`${prefix}_${name}`)}
              onKeyDown={(event) => handleInputField(event, `${pointsNames[i === fields - 1 ? i : i + 1]}`)}
              onBlur={(event) => handleInputField(event, `${pointsNames[i === fields - 1 ? i : i + 1]}`)}
            />
          </div>
        )
      })}
    </>
  );
};
