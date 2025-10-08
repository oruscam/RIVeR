import { useFormContext } from 'react-hook-form';
import { useProjectSlice, useUiSlice } from '../../../hooks/index.ts';
import { getLabelStyle, getPointNames } from '../../../helpers/index.ts';
import { useTranslation } from 'react-i18next';

export const PixelCoordinates = ({
  section,
  step,
  onSetDirPoints,
}: {
  section?: string;
  step: number
  onSetDirPoints: (arg1: any, arg2: { value: number; position: string }) => void;
}) => {
  const { register, resetField } = useFormContext();
  const { onSetErrorMessage } = useUiSlice();
  const { type } = useProjectSlice()
  const { t } = useTranslation();

  const modeName = section ? 'CrossSections' : 'PixelSize';


  const fields = type === 'oblique' && step === 3 ? 8 : 4;

  const pointsNames = getPointNames('pixel', fields);

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

      if (value < 0 || isNaN(value)) {
        const error = {
          [target.id]: {
            type: 'required',
            message: `The value ${target.id} must be greater than 0 and can't be empty`,
          },
        };
        onSetErrorMessage(error);
        const fieldName = `${modeName}_${target.id}`;
        resetField(fieldName);
        return;
      }
      
      for (let i = 0; i < fields; i++) {
        if (target.id === pointsNames[i]) {
          let position = (i % 2 === 0 ? 'x' : 'y') + `${Math.ceil((i +1)/2)}`;
          onSetDirPoints(null, { value: value, position: `${position}` });
          break;
        }
      }
    }
  };

  return (
    <>
      <h2 className="form-subtitle mt-2 only-one-item" id="pixel-coordinates">
        {' '}
        {t(`${modeName}.Pixel.title`)}{' '}
      </h2>

      {
        pointsNames.map((name, i) => {
          const style = getLabelStyle(type, step, fields, i) 

          const prefix = step === 3 ? type : section;

          return (
            <div className='input-container-2 mt-1' key={i}>
              <label className={`read-only me-1 ${style}`}>
                {' '}
                {t(`${modeName}.Pixel.${name}`)}{' '}
              </label>
              <input
                type="number"
                step="any"
                className={`input-field ${ i === pointsNames.length -1 ? 'mb-2' : ''}`}
                id={`${name}`}
                {...register(`${prefix}_${name}`)}
                onKeyDown={(event) => handleInputField(event, `${pointsNames[i === fields - 1 ? i : i + 1]}`)}
                onBlur={(event) => handleInputField(event, `${pointsNames[i === fields - 1 ? i : i + 1]}`)}
              />
            </div>
        )})
      }
    </>
  );
};