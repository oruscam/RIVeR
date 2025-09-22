import { useTranslation } from 'react-i18next';
import { REPORT_IMAGES } from '../../constants/constants';
import { formatNumberToPrecision4, getUnit } from '../../helpers';
import { useUavSlice, useProjectSlice} from '../../hooks';
import { factor } from '../../types';
import { IpcamPixelTransformation } from './IpcamPixelTransformation';
import { ObliquePixelTransformation } from './ObliquePixelTransformation';

interface PixelTransformationProps {
  factor: factor;
  videoWidth: number;
  videoHeight: number;
  vertical?: boolean;
}

export const PixelTransformation = ({ factor, videoHeight, videoWidth, vertical }: PixelTransformationProps) => {
  const { t } = useTranslation();
  const { size } = useUavSlice();
  const { projectDetails, type, video } = useProjectSlice();
  const { unitSistem } = projectDetails;

  const factorIpcam = {
    x:
      (videoWidth * video.parameters.factor) /
      (vertical ? REPORT_IMAGES.VERTICAL_IMAGES_IPCAM_WIDTH : REPORT_IMAGES.HORIZONTAL_IMAGES_IPCAM_WIDTH),
    y:
      (videoHeight * video.parameters.factor) /
      (vertical ? REPORT_IMAGES.VERTICAL_IMAGES_IPCAM_HEIGHT : REPORT_IMAGES.HORIZONTAL_IMAGES_IPCAM_HEIGHT),
  };

  return (
    <>
      <h2 className="report-title-field mt-4"> {t('Report.pixelTransformation')} </h2>
      <div id="report-pixel-transformation-container">
        {type === 'uav' ? (
          <>
            <div id="transformation-uav">
              <p> {t('PixelSize.title')} </p>
              <p>
                {' '}
                {formatNumberToPrecision4(size)}
                {getUnit(unitSistem, 'longitude')}{' '}
              </p>
            </div>
            <div id="transformation-uav-last-child"></div>
          </>
        ) : type === 'oblique' ? (
          <ObliquePixelTransformation factor={factor} vertical={vertical} />
        ) : (
          <IpcamPixelTransformation factor={factorIpcam} vertical={vertical} />
        )}
      </div>
    </>
  );
};
