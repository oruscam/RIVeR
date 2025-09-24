import { useEffect, useRef } from 'react';
import { factor } from '../../types';
import { useIpcamSlice, useProjectSlice } from '../../hooks';
import { REPORT_IMAGES } from '../../constants/constants';
import * as d3 from 'd3';
import { ipcamSvg } from '../Graphs';
import { useTranslation } from 'react-i18next';

interface IpcamPixelTransformationProps {
  factor: factor;
  vertical?: boolean;
}

export const IpcamPixelTransformation = ({ factor, vertical }: IpcamPixelTransformationProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { firstFramePath } = useProjectSlice();
  const { points, cameraSolution } = useIpcamSlice();

  const { t } = useTranslation();

  if (cameraSolution === null) return null;
  const { meanError, cameraPosition, reprojectionErrors } = cameraSolution;

  const width = vertical ? REPORT_IMAGES.VERTICAL_IMAGES_WIDTH : REPORT_IMAGES.HORIZONTAL_IMAGES_WIDTH;
  const height = vertical ? REPORT_IMAGES.VERTICAL_IMAGES_HEIGHT : REPORT_IMAGES.HORIZONTAL_IMAGES_HEIGHT;

  useEffect(() => {
    d3.select(svgRef.current).selectAll('*').remove();
    if (svgRef.current && points !== null) {
      ipcamSvg({
        factor,
        points,
        svgElement: svgRef.current,
        width: width,
        height: height,
      });
    }
  }, [points]);

  return (
    <div className={`pixel-transformation-with-image${vertical ? '-vertical' : ''}`}>
      <div className="image-and-svg-container">
        <img src={firstFramePath} width={width} height={height} className="image-border-radius" />
        <svg ref={svgRef} className="svg-in-image-container" />
      </div>
      <div id="ipcam-transformation-info">
        <p>
          {' '}
          {t('ControlPoints3d.reprojectionErrors')} {meanError.toFixed(2)}px
        </p>
        <p>
          {' '}
          {t('ControlPoints3d.numberOfPoints')} {reprojectionErrors.length}{' '}
        </p>
        <p>
          {' '}
          {t('ControlPoints3d.cameraHeight')} {cameraPosition[2].toFixed(2)}{' '}
        </p>
      </div>
    </div>
  );
};
