import './form.css';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import { useGlobalSlice, useProjectSlice, useUavSlice, useUiSlice } from '../../hooks';
import { HardModeUav } from './Components/index';
import { OrthoImage } from '../Graphs';
import { UNITS } from '../../constants/constants';

interface MyFormProps {
  onSubmit: (values: any) => void;
  onError: (errors: any) => void;
}

export const FormUav = ({ onSubmit, onError }: MyFormProps) => {
  const { t } = useTranslation();
  const {
    extraFields,
    dirPoints,
    drawLine,
    solution,
    onUpdatePixelSize,
  } = useUavSlice();
  const { video, projectDetails } = useProjectSlice();
  const { onSetErrorMessage } = useUiSlice();
  const { isBackendWorking } = useGlobalSlice();
  const { width, height } = video.data;
  const { factor: imageReducedFactor } = video.parameters;

  const { register } = useFormContext();

  const handleLineLengthInput = (
    event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>
  ) => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key === 'Enter' || event.type === 'blur') {
      event.preventDefault();
      const value = parseFloat(event.currentTarget.value);
      if (value > 0) {
        onUpdatePixelSize({ length: value });
      } else {
        const error = {
          uav_lineLength: {
            type: 'required',
            message: t('PixelSize.Errors.lineLength'),
          },
        };
        onSetErrorMessage(error);
      }
      (event.target as HTMLInputElement).blur();
    }
  };

  const handlePixelSizeInput = (
    event: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>
  ) => {
    if ((event as React.KeyboardEvent<HTMLInputElement>).key === 'Enter' || event.type === 'blur') {
      event.preventDefault();
      const value = parseFloat((event.target as HTMLInputElement).value);

      if (value > 0) {
        onUpdatePixelSize({
          pixelSize: value,
          imageWidth: width * imageReducedFactor,
          imageHeight: height * imageReducedFactor,
        });
      } else {
        const error = {
          uav_pixelSize: {
            type: 'required',
            message: t('PixelSize.Errors.pixelSize'),
          },
        };
        onSetErrorMessage(error);
      }
    }
  };

  const onClickDrawLine = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onUpdatePixelSize({ drawLine: true });
    return;
  };

  return (
    <div className='body mt-2'>
      <form onSubmit={onSubmit} onError={onError} id="form-pixel-size" className={`${isBackendWorking ? 'disabled' : ''}`}>
        <div className="input-container-2">
          <button
            className={`wizard-button form-button me-1 ${drawLine ? 'wizard-button-active' : ''}`}
            type="button"
            onClick={onClickDrawLine}
            id="draw-line-pixel"
          >
            {t('PixelSize.drawLine')}
          </button>
          <span className="read-only bg-transparent" />
        </div>

        <div className="input-container-2 mt-2">
          <label className="read-only me-1">{t('PixelSize.lineLength')}</label>
          <div className="input-field-container">
            <input
              className="input-field"
              disabled={dirPoints.length === 0}
              type="number"
              step="any"
              id="UAV-LINE_LENGTH"
              {...register('uav_lineLength', {
                required: t('PixelSize.Errors.required'),
                validate: (value: string) => {
                  if (parseFloat(value) <= 0) {
                    return t('PixelSize.Errors.lineLength');
                  }
                  return true;
                },
              })}
              onKeyDown={handleLineLengthInput}
              onBlur={handleLineLengthInput}
            ></input>
            <span className="unit-label">{projectDetails.unitSistem === 'si' ? UNITS.SI.LONGITUDE : UNITS.IMPERIAL.LONGITUDE}</span>
          </div>
        </div>

        <div className="input-container-2 mt-1 mb-2">
          <label className="read-only me-1">{t('PixelSize.pixelSize')}</label>
          <input
            className="input-field"
            {...register('uav_pixelSize')}
            type="number"
            id="UAV-PIXEL_SIZE"
            step="any"
            onKeyDown={handlePixelSizeInput}
            onBlur={handlePixelSizeInput}
          />
        </div>

        {solution !== null && <OrthoImage solution={solution} secondPoint={solution.secondPoint} />}

        {
          extraFields && <HardModeUav />
        }
      </form>
    </div>
  )
};