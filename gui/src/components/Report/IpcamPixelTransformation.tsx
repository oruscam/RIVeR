import { useEffect, useRef } from "react";
import { factor } from "../../types";
import { useMatrixSlice, useProjectSlice } from "../../hooks";
import { REPORT_IMAGES } from "../../constants/constants";
import * as d3 from "d3";
import { ipcamSvg } from "../Graphs";
import { useTranslation } from "react-i18next";

interface IpcamPixelTransformationProps {
  factor: factor;
}

export const IpcamPixelTransformation = ({
  factor,
}: IpcamPixelTransformationProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { firstFramePath } = useProjectSlice();
  const { ipcam } = useMatrixSlice();
  const { importedPoints, cameraSolution } = ipcam;
  const { t } = useTranslation();

  if (cameraSolution === undefined) return null;
  const { meanError, cameraPosition, reprojectionErrors } = cameraSolution;

  useEffect(() => {
    d3.select(svgRef.current).selectAll("*").remove();
    if (svgRef.current && importedPoints) {
      ipcamSvg({
        factor,
        importedPoints,
        svgElement: svgRef.current,
        width: REPORT_IMAGES.IMAGES_IPCAM_WIDTH,
        height: REPORT_IMAGES.IMAGES_IPCAM_HEIGHT,
      });
    }
  }, [importedPoints]);

  return (
    <div className="pixel-transformation-with-image">
      <div className="image-and-svg-container">
        <img
          src={firstFramePath}
          width={REPORT_IMAGES.IMAGES_IPCAM_WIDTH}
          height={REPORT_IMAGES.IMAGES_IPCAM_HEIGHT}
          className="image-border-radius"
        />
        <svg ref={svgRef} className="svg-in-image-container" />
      </div>
      <div id="ipcam-transformation-info">
        <p>
          {" "}
          {t("ControlPoints3d.reprojectionErrors")} {meanError.toFixed(2)}px
        </p>
        <p>
          {" "}
          {t("ControlPoints3d.numberOfPoints")} {reprojectionErrors.length}{" "}
        </p>
        <p>
          {" "}
          {t("ControlPoints3d.cameraHeight")}{" "}
          {cameraPosition[2].toFixed(2)}{" "}
        </p>
      </div>
    </div>
  );
};
